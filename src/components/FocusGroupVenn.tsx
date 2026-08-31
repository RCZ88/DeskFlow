import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';

/* ──────────────────────────────────────────────
 * FocusGroupVenn — Euler-style SVG of today's
 * focus-group activity. Circle area ∝ seconds in
 * that group; overlap regions show apps/domains
 * that belong to multiple groups, labelled with
 * name + seconds.
 *
 * "Euler" rather than strict Venn: we only draw
 * as many overlap zones as actually exist in the
 * data, not all 2^N intersections.
 * ────────────────────────────────────────────── */

interface FocusGroupRecap {
  id: number;
  name: string;
  color: string;
  seconds: number;     // today's seconds attributed to this group
  appSeconds: Record<string, number>; // app/domain → seconds today
}

interface FocusGroupVennProps {
  groups: FocusGroupRecap[];
  width?: number;
  height?: number;
  onRegionHover?: (region: { type: 'group' | 'overlap'; id?: number; names: string[]; seconds: number } | null) => void;
}

// ── Layout helpers ──────────────────────────────────

function packCircles(items: { r: number; color: string; id: number; name: string }[]): { x: number; y: number }[] {
  // Simple force-directed circle packing in a unit box, then scale.
  // Start at random-ish positions, run a few iterations of repulsion + containment.
  const n = items.length;
  if (n === 0) return [];
  if (n === 1) return [{ x: 0.5, y: 0.5 }];
  if (n === 2) {
    const r0 = items[0].r, r1 = items[1].r;
    const sep = r0 + r1 + 0.02; // small gap
    const cx0 = 0.5 - (r1 / (r0 + r1)) * sep * 0.5;
    const cx1 = 0.5 + (r0 / (r0 + r1)) * sep * 0.5;
    return [{ x: cx0, y: 0.5 }, { x: cx1, y: 0.5 }];
  }
  // N >= 3: initial hex-like cluster, then relax
  const positions: { x: number; y: number; vx: number; vy: number }[] = items.map((_, i) => {
    const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
    return { x: 0.5 + 0.18 * Math.cos(angle), y: 0.5 + 0.18 * Math.sin(angle), vx: 0, vy: 0 };
  });
  const radii = items.map(it => it.r + 0.012);

  for (let iter = 0; iter < 80; iter++) {
    // repulsion between overlapping circles
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const dx = positions[j].x - positions[i].x;
        const dy = positions[j].y - positions[i].y;
        const d = Math.hypot(dx, dy) || 0.0001;
        const overlap = radii[i] + radii[j] - d;
        if (overlap > 0) {
          const force = overlap * 0.5;
          const nx = dx / d, ny = dy / d;
          positions[i].vx -= nx * force;
          positions[i].vy -= ny * force;
          positions[j].vx += nx * force;
          positions[j].vy += ny * force;
        }
      }
    }
    // containment: pull toward center when too far from [0.12, 0.88] box
    for (let i = 0; i < n; i++) {
      const cx = positions[i].x - 0.5;
      const cy = positions[i].y - 0.5;
      const dist = Math.hypot(cx, cy);
      const maxR = 0.38 - radii[i];
      if (dist > maxR && dist > 0.001) {
        const pull = (dist - maxR) * 0.15;
        positions[i].vx -= (cx / dist) * pull;
        positions[i].vy -= (cy / dist) * pull;
      }
    }
    // damping
    for (let i = 0; i < n; i++) {
      positions[i].x += positions[i].vx * 0.5;
      positions[i].y += positions[i].vy * 0.5;
      positions[i].vx *= 0.7;
      positions[i].vy *= 0.7;
      // clamp
      positions[i].x = Math.max(0.05, Math.min(0.95, positions[i].x));
      positions[i].y = Math.max(0.05, Math.min(0.95, positions[i].y));
    }
  }
  return positions.map(p => ({ x: p.x, y: p.y }));
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m < 60) return s > 0 ? `${m}m ${s}s` : `${m}m`;
  const h = Math.floor(m / 60);
  const remM = m % 60;
  return s > 0 ? `${h}h ${remM}m ${s}s` : `${h}h ${remM}m`;
}

export default function FocusGroupVenn({ groups, width = 340, height = 300, onRegionHover }: FocusGroupVennProps) {
  // Filter to groups with meaningful time
  const significant = useMemo(() => groups.filter(g => g.seconds > 60), [groups]);
  const hasData = significant.length > 0;

  // Circle radii proportional to sqrt(seconds)
  const unitItems = useMemo(() => {
    if (!hasData) return [];
    const maxSec = Math.max(...significant.map(g => g.seconds));
    const scale = maxSec > 0 ? 0.16 * Math.sqrt(maxSec / 1200) : 0.06;
    return significant.map(g => ({
      r: Math.max(0.035, Math.sqrt(g.seconds / maxSec) * 0.14 * (scale / 0.06)),
      color: g.color || '#6366f1',
      id: g.id,
      name: g.name,
    }));
  }, [significant]);

  const positions = useMemo(() => packCircles(unitItems), [unitItems]);

  // Overlap detection: for each pair of circles, if they intersect,
  // find apps that belong to BOTH groups and report a labelled region.
  const overlaps = useMemo(() => {
    const result: {
      x: number; y: number;
      label: string;
      sublabel: string;
      color: string;
      groupIds: number[];
    }[] = [];
    if (!hasData || positions.length < 2) return result;

    for (let i = 0; i < significant.length; i++) {
      for (let j = i + 1; j < significant.length; j++) {
        const gi = significant[i], gj = significant[j];
        const pi = positions[i], pj = positions[j];
        const piu = { x: pi.x, y: pi.y }, pjv = { x: pj.x, y: pj.y };
        const ri = unitItems[i].r, rj = unitItems[j].r;
        const dx = pjv.x - piu.x, dy = pjv.y - piu.y;
        const d = Math.hypot(dx, dy);
        if (d >= ri + rj || d <= Math.abs(ri - rj)) continue; // no overlap
        // apps present in both groups
        const commonApps = Object.keys(gi.appSeconds)
          .filter(a => a in gj.appSeconds)
          .sort((a, b) => (gj.appSeconds[b] || 0) - (gj.appSeconds[a] || 0));
        if (commonApps.length === 0) continue;
        const totalOverlapSec = commonApps.reduce((s, a) => s + (gi.appSeconds[a] || 0) + (gj.appSeconds[a] || 0), 0);
        if (totalOverlapSec < 60) continue; // ignore tiny overlaps
        const midX = (piu.x + pjv.x) / 2;
        const midY = (piu.y + pjv.y) / 2;
        // pick a blend color (lighter)
        const c1 = gi.color || '#6366f1', c2 = gj.color || '#10b981';
        const blend = blendColor(c1, c2);
        result.push({
          x: midX,
          y: midY,
          label: commonApps.slice(0, 3).join(', '),
          sublabel: formatDuration(totalOverlapSec),
          color: blend,
          groupIds: [gi.id, gj.id],
        });
      }
    }
    return result;
  }, [significant, positions, unitItems]);

  if (!hasData) {
    return (
      <div className="flex flex-col items-center justify-center py-14 gap-2 text-zinc-500">
        <svg width={48} height={48} viewBox="0 0 24 24" className="opacity-30">
          <circle cx={12} cy={12} r={10} fill="none" stroke="currentColor" strokeWidth={1.5} strokeDasharray="4 3" />
          <path d="M12 8v8M8 12h8" stroke="currentColor" strokeWidth={1.5} />
        </svg>
        <p className="text-sm font-medium text-zinc-400">No focus group activity today</p>
        <p className="text-xs text-zinc-600 text-center max-w-[240px]">
          Start a focus session assigned to a group to see today&apos;s overlap map here.
        </p>
      </div>
    );
  }

  return (
    <div
      className="relative select-none"
      onMouseLeave={() => onRegionHover?.(null)}
    >
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="overflow-visible"
        role="img"
        aria-label="Focus groups overlap map"
      >
        <defs>
          <filter id="venn-shadow" x="-10%" y="-10%" width="130%" height="130%">
            <feDropShadow dx={0} dy={1} stdDeviation={2.5} floodColor="rgba(0,0,0,0.45)" />
          </filter>
        </defs>

        {/* Background hint circles */}
        {unitItems.map((item, i) => (
          <circle
            key={`hint-${item.id}`}
            cx={positions[i].x * width}
            cy={positions[i].y * height}
            r={item.r * width}
            fill={`${item.color}12`}
            stroke={`${item.color}22`}
            strokeWidth={0.6}
          />
        ))}

        {/* Group circles */}
        {unitItems.map((item, i) => (
          <g
            key={`group-${item.id}`}
            onMouseEnter={() => onRegionHover?.({
              type: 'group',
              id: item.id,
              names: [item.name],
              seconds: significant[i].seconds,
            })}
            onMouseLeave={() => onRegionHover?.(null)}
            className="transition-opacity duration-150"
            style={{ cursor: 'pointer' }}
          >
            <circle
              cx={positions[i].x * width}
              cy={positions[i].y * height}
              r={item.r * width}
              fill={`${item.color}35`}
              stroke={item.color}
              strokeWidth={1.6}
              filter="url(#venn-shadow)"
              className="transition-all duration-150 hover:fill-opacity-40"
            />
            {/* Label */}
            <text
              x={positions[i].x * width}
              y={positions[i].y * height - item.r * width * 0.35}
              textAnchor="middle"
              fill={item.color}
              fontSize={10}
              fontWeight={600}
              className="font-sans"
            >
              {item.name}
            </text>
            <text
              x={positions[i].x * width}
              y={positions[i].y * height + item.r * width * 0.25 + 10}
              textAnchor="middle"
              fill="#a1a1aa"
              fontSize={9}
              className="font-mono"
            >
              {formatDuration(significant[i].seconds)}
            </text>
          </g>
        ))}

        {/* Overlap labels */}
        {overlaps.map((o, idx) => (
          <g key={`overlap-${idx}`}>
            <circle
              cx={o.x * width}
              cy={o.y * height}
              r={Math.min(14, Math.max(6, o.label.length * 2.5))}
              fill={o.color + '35'}
              stroke={o.color}
              strokeWidth={1}
              className="transition-all duration-150 hover:fill-opacity-50"
              onMouseEnter={() => onRegionHover?.({
                type: 'overlap',
                names: o.label.split(', '),
                seconds: parseFloat(o.sublabel),
              })}
              onMouseLeave={() => onRegionHover?.(null)}
              style={{ cursor: 'pointer' }}
            />
            <text
              x={o.x * width}
              y={o.y * height - 2}
              textAnchor="middle"
              fill="#e4e4e7"
              fontSize={7.5}
              className="font-sans"
              style={{
                pointerEvents: 'none',
                textShadow: '0 1px 2px rgba(0,0,0,0.6)',
              }}
            >
              {o.label}
            </text>
            <text
              x={o.x * width}
              y={o.y * height + 9}
              textAnchor="middle"
              fill="#9ca3af"
              fontSize={6.5}
              className="font-mono"
              style={{ pointerEvents: 'none' }}
            >
              {o.sublabel}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

/** Blend two hex colors (average RGB). */
function blendColor(a: string, b: string): string {
  const pa = parseHex(a), pb = parseHex(b);
  if (!pa || !pb) return '#8b5cf6';
  const r = Math.round((pa.r + pb.r) / 2);
  const g = Math.round((pa.g + pb.g) / 2);
  const bl = Math.round((pa.b + pb.b) / 2);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${bl.toString(16).padStart(2, '0')}`;
}

function parseHex(hex: string): { r: number; g: number; b: number } | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const v = parseInt(m[1], 16);
  return { r: (v >> 16) & 255, g: (v >> 8) & 255, b: v & 255 };
}
