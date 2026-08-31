import type { Point } from './types';

export function distance(a: Point, b: Point): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

export function pointInRect(point: Point, rect: { x: number; y: number; width: number; height: number }): boolean {
  return (
    point.x >= rect.x &&
    point.x <= rect.x + rect.width &&
    point.y >= rect.y &&
    point.y <= rect.y + rect.height
  );
}

export function pointsInRect(points: Point[], rect: { x: number; y: number; width: number; height: number }): boolean {
  return points.some(p => pointInRect(p, rect));
}

export function pointInPolygon(point: Point, polygon: Point[]): boolean {
  if (polygon.length < 3) return false;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x;
    const yi = polygon[i].y;
    const xj = polygon[j].x;
    const yj = polygon[j].y;
    if (
      yi > point.y !== yj > point.y &&
      point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi
    ) {
      inside = !inside;
    }
  }
  return inside;
}

export function boundingRect(points: Point[]): { x: number; y: number; width: number; height: number } {
  if (points.length === 0) return { x: 0, y: 0, width: 0, height: 0 };
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of points) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

export function simplifyPath(points: Point[], tolerance: number = 2): Point[] {
  if (points.length <= 2) return points;
  const result: Point[] = [points[0]];
  let lastKept = points[0];
  for (let i = 1; i < points.length - 1; i++) {
    if (distance(lastKept, points[i]) >= tolerance) {
      result.push(points[i]);
      lastKept = points[i];
    }
  }
  result.push(points[points.length - 1]);
  return result;
}

export function rectsOverlap(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number }
): boolean {
  return !(a.x + a.width < b.x || b.x + b.width < a.x || a.y + a.height < b.y || b.y + b.height < a.y);
}

export function rectContains(
  outer: { x: number; y: number; width: number; height: number },
  inner: { x: number; y: number; width: number; height: number }
): boolean {
  return (
    inner.x >= outer.x &&
    inner.y >= outer.y &&
    inner.x + inner.width <= outer.x + outer.width &&
    inner.y + inner.height <= outer.y + outer.height
  );
}

export function canvasPathFromPoints(ctx: CanvasRenderingContext2D, points: Point[]): void {
  if (points.length === 0) return;
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const midX = (prev.x + curr.x) / 2;
    const midY = (prev.y + curr.y) / 2;
    ctx.quadraticCurveTo(prev.x, prev.y, midX, midY);
  }
  const last = points[points.length - 1];
  ctx.lineTo(last.x, last.y);
  ctx.closePath();
}

export function clipCanvasToPath(
  sourceCanvas: HTMLCanvasElement,
  points: Point[]
): HTMLCanvasElement {
  const bbox = boundingRect(points);
  const padded = {
    x: Math.max(0, Math.floor(bbox.x - 2)),
    y: Math.max(0, Math.floor(bbox.y - 2)),
    width: Math.min(sourceCanvas.width - Math.floor(bbox.x - 2), Math.ceil(bbox.width + 4)),
    height: Math.min(sourceCanvas.height - Math.floor(bbox.y - 2), Math.ceil(bbox.height + 4)),
  };
  const out = document.createElement('canvas');
  out.width = padded.width;
  out.height = padded.height;
  const ctx = out.getContext('2d');
  if (!ctx) return out;
  ctx.beginPath();
  const offsetX = -padded.x;
  const offsetY = -padded.y;
  ctx.moveTo(points[0].x + offsetX, points[0].y + offsetY);
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const midX = (prev.x + curr.x) / 2 + offsetX;
    const midY = (prev.y + curr.y) / 2 + offsetY;
    ctx.quadraticCurveTo(prev.x + offsetX, prev.y + offsetY, midX, midY);
  }
  const last = points[points.length - 1];
  ctx.lineTo(last.x + offsetX, last.y + offsetY);
  ctx.closePath();
  ctx.clip();
  ctx.drawImage(
    sourceCanvas,
    padded.x, padded.y, padded.width, padded.height,
    0, 0, padded.width, padded.height
  );
  return out;
}
