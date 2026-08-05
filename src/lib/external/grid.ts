import type { ExternalActivity, ExternalStats } from "@/types/external";

export type ActivityWithSeconds = {
  activity: ExternalActivity;
  seconds: number;
};

export type GridSizeTier = "hero" | "secondary" | "medium" | "small";

export type Hierarchy = "subtle" | "balanced" | "dramatic";

export type ActivityGridCell = {
  activity: ExternalActivity;
  seconds: number;
  gridColumn: string;
  gridRow: string;
  areaFraction: number;
  sizeTier: GridSizeTier;
  cellHeight: number;
};

export type ActivityGridLayout = {
  mainCells: ActivityGridCell[];
  compactActivities: ActivityWithSeconds[];
  gridTemplateColumns: string;
  gridTemplateRows: string;
  aspectRatio: string;
  hasMainGrid: boolean;
};

type TreemapRect = {
  x: number;
  y: number;
  w: number;
  h: number;
};

type TreemapItem = {
  id: string;
  value: number;
};

/**
 * Log-scaled visual weight for an activity's duration.
 * Using raw seconds makes tiny activities invisible next to a dominant one;
 * log1p compresses the range so every tracked activity stays legible while
 * preserving ordering.
 */
function visualWeight(seconds: number): number {
  return Math.log(1 + Math.max(0, seconds));
}

/**
 * Proportional target weights for the mosaic.
 * The old model hardcoded a fixed ladder (hero 0.55 / secondary 0.27 / rest
 * sharing ~0.18) — the user reported the sizes look FIXED, not proportional
 * to actual tracked time. This version derives everything from the data:
 *   1. w_i = log(1 + seconds)  (log1p compresses the range so every tracked
 *      activity stays visible next to a dominant one, preserving ordering)
 *   2. s_i = w_i^gamma         (gamma < 1 flattens → subtle, gamma = 1 pure
 *      proportion, gamma > 1 exaggerates → dramatic)
 *   3. s_i normalized so the fractions sum to 1 → each card's area IS its
 *      share of tracked time. Dominance emerges from the data, not a ladder.
 */
export function buildTargetWeights(sorted: ActivityWithSeconds[], hierarchy: Hierarchy = "balanced"): number[] {
  const n = sorted.length;

  if (n === 0) return [];

  const gammaMap: Record<Hierarchy, number> = {
    subtle: 0.65,
    balanced: 1.0,
    dramatic: 1.55,
  };
  const gamma = gammaMap[hierarchy] ?? 1.0;

  const raw = sorted.map((item) => {
    const w = visualWeight(item.seconds);
    return w > 0 ? Math.pow(w, gamma) : 0;
  });
  const total = raw.reduce((sum, w) => sum + w, 0);

  if (total <= 0) {
    return sorted.map(() => 1 / n);
  }

  return raw.map((w) => w / total);
}

/**
 * Exact worst-aspect for a candidate row laid inside the CURRENT remaining
 * rect. Horizontal rows (w >= h) have thickness sum/w and each item's width is
 * area/thickness; vertical rows mirror that. Using the exact thickness instead
 * of approximating it with the short side is what lets mixed rows form — the
 * old approximation made every single-item row look "ideal", so each item got
 * its own full-width row and the mosaic degenerated into stacked bars.
 */
function rowWorstAspect(candidateRow: number[], w: number, h: number): number {
  if (!candidateRow.length) return Infinity;
  const sum = candidateRow.reduce((a, b) => a + b, 0);
  if (sum <= 0) return Infinity;

  let worst = 0;
  if (w >= h) {
    const thickness = sum / w;
    for (const area of candidateRow) {
      const width = area / thickness;
      worst = Math.max(worst, width / thickness, thickness / width);
    }
  } else {
    const thickness = sum / h;
    for (const area of candidateRow) {
      const height = area / thickness;
      worst = Math.max(worst, height / thickness, thickness / height);
    }
  }
  return worst;
}

/**
 * Minimal squarified treemap implementation.
 * Returns rectangles in the same coordinate space as the input rect.
 */
function squarifyTreemap(items: TreemapItem[], container: TreemapRect): Record<string, TreemapRect> {
  const result: Record<string, TreemapRect> = {};
  if (!items.length) return result;

  const totalValue = items.reduce((sum, item) => sum + Math.max(0.000001, item.value), 0);
  const containerArea = container.w * container.h;

  const scaled = items.map((item) => ({
    id: item.id,
    area: (Math.max(0.000001, item.value) / totalValue) * containerArea,
  }));

  let x = container.x;
  let y = container.y;
  let w = container.w;
  let h = container.h;

  let row: { id: string; area: number }[] = [];

  const layoutRow = () => {
    if (!row.length) return;

    const sum = row.reduce((acc, item) => acc + item.area, 0);

    if (w >= h) {
      const rowHeight = sum / w;
      let currentX = x;

      row.forEach((item, index) => {
        const isLast = index === row.length - 1;
        const rectWidth = isLast
          ? x + w - currentX
          : item.area / rowHeight;

        result[item.id] = {
          x: currentX,
          y,
          w: Math.max(0, rectWidth),
          h: rowHeight,
        };

        currentX += rectWidth;
      });

      y += rowHeight;
      h -= rowHeight;
    } else {
      const rowWidth = sum / h;
      let currentY = y;

      row.forEach((item, index) => {
        const isLast = index === row.length - 1;
        const rectHeight = isLast
          ? y + h - currentY
          : item.area / rowWidth;

        result[item.id] = {
          x,
          y: currentY,
          w: rowWidth,
          h: Math.max(0, rectHeight),
        };

        currentY += rectHeight;
      });

      x += rowWidth;
      w -= rowWidth;
    }

    row = [];
  };

  for (const item of scaled) {
    if (!row.length) {
      row.push(item);
      continue;
    }

    const currentAreas = row.map((r) => r.area);
    const nextAreas = [...currentAreas, item.area];

    const currentWorst = rowWorstAspect(currentAreas, w, h);
    const nextWorst = rowWorstAspect(nextAreas, w, h);

    if (nextWorst <= currentWorst) {
      row.push(item);
    } else {
      layoutRow();
      row.push(item);
    }
  }

  layoutRow();
  return result;
}

function uniqueSortedCoords(values: number[], epsilon: number): number[] {
  const sorted = [...values].sort((a, b) => a - b);
  const out: number[] = [];

  for (const value of sorted) {
    if (!out.length) {
      out.push(value);
      continue;
    }

    const last = out[out.length - 1];
    if (Math.abs(value - last) <= epsilon) {
      // Merge near-equal coordinates to avoid duplicate grid tracks.
      out[out.length - 1] = (last + value) / 2;
    } else {
      out.push(value);
    }
  }

  return out;
}

function findTrackIndex(coords: number[], value: number, epsilon: number): number {
  const exact = coords.findIndex((coord) => Math.abs(coord - value) <= epsilon);
  if (exact >= 0) return exact;

  let nearest = 0;
  let nearestDist = Infinity;

  coords.forEach((coord, index) => {
    const dist = Math.abs(coord - value);
    if (dist < nearestDist) {
      nearestDist = dist;
      nearest = index;
    }
  });

  return nearest;
}

export function computeActivityGridLayout(options: {
  activities: ExternalActivity[];
  stats: ExternalStats;
  aspect?: number;
  width?: number;
  hierarchy?: Hierarchy;
  minCellAreaFraction?: number;
}): ActivityGridLayout {
  const {
    activities,
    stats,
    aspect = 16 / 9,
    width = 1200,
    hierarchy = "balanced",
    minCellAreaFraction = 0.04,
  } = options;

  const height = Math.max(320, width / aspect);

  const orderIndex = new Map(activities.map((activity, index) => [activity.id, index]));

  const all = activities.map((activity) => ({
    activity,
    seconds: stats.byActivity[activity.name]?.total_seconds ?? 0,
  }));

  const main = all
    .filter((item) => item.activity.type !== "sleep")
    .filter((item) => item.seconds > 0)
    .sort((a, b) => {
      if (b.seconds !== a.seconds) return b.seconds - a.seconds;
      return (orderIndex.get(a.activity.id) ?? 0) - (orderIndex.get(b.activity.id) ?? 0);
    });

  const compactActivities: ActivityWithSeconds[] = all
    .filter((item) => item.activity.type === "sleep" || item.seconds === 0)
    .sort((a, b) => {
      return (orderIndex.get(a.activity.id) ?? 0) - (orderIndex.get(b.activity.id) ?? 0);
    });

  if (!main.length) {
    return {
      mainCells: [],
      compactActivities,
      gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
      gridTemplateRows: "auto",
      aspectRatio: String(aspect),
      hasMainGrid: false,
    };
  }

  const fractions = buildTargetWeights(main, hierarchy);

  // K-cap: any activity whose share falls below the readable floor is dropped
  // from the main grid (its weight can't fill a readable cell) and overflowed
  // into the compact row instead of squashing it into an unreadable sliver.
  const readableMain: ActivityWithSeconds[] = [];
  const overflow: ActivityWithSeconds[] = [];
  main.forEach((item, index) => {
    if ((fractions[index] ?? 0) >= minCellAreaFraction) {
      readableMain.push(item);
    } else {
      overflow.push(item);
    }
  });

  const treemapInput: TreemapItem[] = readableMain.map((item, index) => ({
    id: item.activity.id,
    value: fractions[index] ?? 0.000001,
  }));

  const rects = squarifyTreemap(treemapInput, {
    x: 0,
    y: 0,
    w: width,
    h: height,
  });

  const epsilon = Math.max(width, height) / 2500;

  const xCoords = uniqueSortedCoords(
    Object.values(rects).flatMap((rect) => [rect.x, rect.x + rect.w]),
    epsilon
  );

  const yCoords = uniqueSortedCoords(
    Object.values(rects).flatMap((rect) => [rect.y, rect.y + rect.h]),
    epsilon
  );

  const gridTemplateColumns = xCoords
    .slice(1)
    .map((coord, index) => `${Math.max(0.0001, coord - xCoords[index])}fr`)
    .join(" ");

  const gridTemplateRows = yCoords
    .slice(1)
    .map((coord, index) => `${Math.max(0.0001, coord - yCoords[index])}fr`)
    .join(" ");

  const containerArea = width * height;

  const mainCells: ActivityGridCell[] = readableMain.map((item, index) => {
    const rect = rects[item.activity.id];

    const x1 = findTrackIndex(xCoords, rect.x, epsilon);
    const x2 = findTrackIndex(xCoords, rect.x + rect.w, epsilon);
    const y1 = findTrackIndex(yCoords, rect.y, epsilon);
    const y2 = findTrackIndex(yCoords, rect.y + rect.h, epsilon);

    const safeX2 = Math.max(x2, x1 + 1);
    const safeY2 = Math.max(y2, y1 + 1);

    const areaFraction = (rect.w * rect.h) / containerArea;

    const sizeTier: GridSizeTier =
      areaFraction > 0.2
        ? "hero"
        : areaFraction > 0.12
          ? "secondary"
          : areaFraction > 0.06
            ? "medium"
            : "small";

    return {
      activity: item.activity,
      seconds: item.seconds,
      gridColumn: `${x1 + 1} / ${safeX2 + 1}`,
      gridRow: `${y1 + 1} / ${safeY2 + 1}`,
      areaFraction,
      sizeTier,
      cellHeight: Math.max(0, rect.h),
    };
  });

  return {
    mainCells,
    compactActivities: [...compactActivities, ...overflow],
    gridTemplateColumns,
    gridTemplateRows,
    aspectRatio: String(aspect),
    hasMainGrid: true,
  };
}
