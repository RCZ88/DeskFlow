import { useMemo } from 'react';
import { motion } from 'framer-motion';

/* ──────────────────────────────────────────────
 * FocusGroupVenn — Euler-style SVG for the
 * Daily Recap tab. Renders focus groups as
 * circles (size ∝ today's seconds), highlights
 * overlap regions where two groups share apps,
 * and labels those regions with the shared apps.
 *
 * Focus groups only — categories are excluded
 * because a single app can only have one category,
 * so there is no meaningful overlap to show.
 * ────────────────────────────────────────────── */

interface FocusGroupRecap {
  id: number;
  name: string;
  color: string;
  seconds: number;          // today's seconds in this group
  sessionIds: number[];     // session ids attributed today
  allowedApps: string[];    // from focus_group rows
}

interface FocusGroupVennProps {
  groups: FocusGroupRecap[];
  width?: number;
  height?: number;
  onRegionHover?: (
    region: { type: 'group'; group: FocusGroupRecap } | { type: 'overlap'; groups: FocusGroupRecap[]; apps: string[] } | null
  ) => void;
}

function fmtDur(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m < 60) return s > 0 ? `${m}m ${s}s` : `${m}m`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return s > 0 ? `${h}h ${rem}m ${s}s` : `${h}h ${rem}m`;
}

/** blur-free color mix (hex strings) for overlap swatches */
function mixColor(a: string, b: string): string {
  const pa = parseHex(a), pb = parseHex(b);
  if (!pa || !pb) return '#7c3aed';
  const r = Math.round((pa.r + pb.r) / 2);
  const g = Math.round((pa.g + pb.g) / 2);
  const bl = Math.round((pa.b + pb.b) / 2);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${bl.toString(16).padStart(2, '0')}`;
}
function parseHex(hex: string): { r: number; g: number; b: number } | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim().replace(/^#/, ''));
  if (!m) return null;
  const v = parseInt(m[1], 16);
  return { r: (v >> 16) & 255, g: (v >> 8) & 255, b: v & 255 };
}

export default function FocusGroupVenn({ groups, width = 340, height = 280, onRegionHover }: FocusGroupVennProps) {
  const layout = useMemo(() => {
    // Only render groups with meaningful activity (>60s)
    const active = groups.filter(g => g.seconds > 60);
    if (active.length === 0) return { type: 'empty' as const, data: null };

    const maxSec = Math.max(...active.map(g => g.seconds));
    // radius ∝ sqrt(seconds), scaled so biggest ≈ 90px
    const scale = 90 / Math.sqrt(maxSec);
    const circles: { cx: number; cy: number; r: number; g: FocusGroupRecap }[] = [];

    if (active.length === 1) {
      circles.push({ cx: width / 2, cy: height / 2, r: Math.sqrt(active[0].seconds) * scale, g: active[0] });
    } else if (active.length === 2) {
      const r0 = Math.sqrt(active[0].seconds) * scale;
      const r1 = Math.sqrt(active[1].seconds) * scale;
      const sep = Math.max(r0, r1) * 0.7;
      circles.push({ cx: width / 2 - sep / 2, cy: height / 2, r: r0, g: active[0] });
      circles.push({ cx: width / 2 + sep / 2, cy: height / 2, r: r1, g: active[1] });
    } else {
      // 3+ groups: triangle layout, keep top 3 visual + note rest
      const top = active.slice(0, 3);
      const r0 = Math.sqrt(top[0].seconds) * scale;
      const r1 = Math.sqrt(top[1].seconds) * scale;
      const r2 = Math.sqrt(top[2].seconds) * scale;
      const cx = width / 2, cy = height / 2 - 10;
      const dist = Math.max(r0, r1, r2) * 0.95;
      circles.push({ cx: cx - dist * 0.6, cy: cy + dist * 0.5, r: r0, g: top[0] });
      circles.push({ cx: cx + dist * 0.6, cy: cy + dist * 0.5, r: r1, g: top[1] });
      circles.push({ cx: cx, cy: cy - dist * 0.5, r: r2, g: top[2] });
    }
    return { type: 'circles' as const, data: circles, extra: active.length > 3 ? active.length - 3 : 0 };
  }, [groups, width, height]);

  const overlaps = useMemo(() => {
    const active = groups.filter(g => g.seconds > 60);
    const result: { g1: FocusGroupRecap; g2: FocusGroupRecap; apps: string[]; domains: string[]; color: string }[] = [];
    for (let i = 0; i < active.length; i++) {
      for (let j = i + 1; j < active.length; j++) {
        const a1 = new Set(active[i].allowedApps);
        const a2 = new Set(active[j].allowedApps);
        const commonApps = [...a1].filter(a => a2.has(a));
        const d1 = new Set(active[i].allowedApps.filter(a => active[i].allowedApps.includes(a))); // placeholder
        // domains overlap (if tracked)
        const d1s = new Set(active[i].allowedApps); // reuse apps as proxy; domains would be separate field
        const d2s = new Set(active[j].allowedApps);
        const commonDomains = [...d1s].filter(d => d2s.has(d) && !commonApps.includes(d));
        if (commonApps.length > 0 || commonDomains.length > 0) {
          result.push({
            g1: active[i],
            g2: active[j],
            apps: commonApps,
            domains: commonDomains,
            color: mixColor(active[i].color, active[j].color),
          });
        }
      }
    }
    return result;
  }, [groups]);

  if (layout.type === 'empty') {
    return (
      <div className="flex flex-col items-center justify-center py-14 gap-2 text-zinc-500 select-none">
        <svg width={44} height={44} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.3} className="opacity-30">
          <circle cx={12} cy={12} r={9} strokeDasharray="3 3" />
          <path d="M12 8v8M8 12h8" />
        </svg>
        <p className="text-sm font-medium text-zinc-400">No focus group activity today</p>
        <p className="text-xs text-zinc-600 text-center max-w-[240px]">
          Start a focus session tied to a group to see how your groups overlap.
        </p>
      </div>
    );
  }

  const { data: circles, extra } = layout.data!;

  return (
    <div className="relative select-none" onMouseLeave={() => onRegionHover?.(null)}>
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="overflow-visible"
        role="img"
        aria-label="Focus groups overlap map"
      >
        <defs>
          <filter id="venn-shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx={0} dy={1} stdDeviation={2.5} floodColor="rgba(0,0,0,0.5)" />
          </filter>
        </defs>

        {/* Circle backgrounds (soft fill) */}
        {circles.map((c, i) => (
          <circle
            key={`bg-${c.g.id}`}
            cx={c.cx}
            cy={c.cy}
            r={c.r}
            fill={`${c.g.color}18`}
            stroke={`${c.g.color}44`}
            strokeWidth={1}
            className="transition-all duration-200"
          />
        ))}

        {/* Circle strokes */}
        {circles.map((c, i) => (
          <g
            key={`stroke-${c.g.id}`}
            onMouseEnter={() => onRegionHover?.({ type: 'group', group: c.g })}
            onMouseLeave={() => onRegionHover?.(null)}
            style={{ cursor: 'pointer' }}
            className="transition-all duration-200"
          >
            <circle
              cx={c.cx}
              cy={c.cy}
              r={c.r}
              fill={`${c.g.color}22`}
              stroke={c.g.color}
              strokeWidth={1.8}
              filter="url(#venn-shadow)"
              className="hover:stroke-opacity-90"
            />
            {/* Label: group name */}
            <text
              x={c.cx}
              y={c.cy - c.r * 0.4}
              textAnchor="middle"
              fill={c.g.color}
              fontSize={11}
              fontWeight={600}
              fontFamily="'Inter', 'Geist', system-ui, sans-serif"
              className="pointer-events-none"
            >
              {c.g.name}
            </text>
            {/* Label: time */}
            <text
              x={c.cx}
              y={c.cy + c.r * 0.5 + 13}
              textAnchor="middle"
              fill="#a1a1aa"
              fontSize={10}
              fontFamily="'JetBrains Mono', 'Geist Mono', monospace"
              className="pointer-events-none"
            >
              {fmtDur(c.g.seconds)}
            </text>
          </g>
        ))}

        {/* Overlap regions — drawn as labelled pills on top */}
        {overlaps.map((ov, idx) => {
          // Find the two circles
          const c1 = circles.find(c => c.g.id === ov.g1.id);
          const c2 = circles.find(c => c.g.id === ov.g2.id);
          if (!c1 || !c2) return null;
          const mx = (c1.cx + c2.cx) / 2;
          const my = (c1.cy + c2.cy) / 2;
          const label = [...ov.apps, ...ov.domains].slice(0, 3).join(', ');
          return (
            <g key={`overlap-${idx}`}>
              <circle
                cx={mx}
                cy={my}
                r={Math.min(18, Math.max(8, label.length * 2.2))}
                fill={ov.color + '44'}
                stroke={ov.color}
                strokeWidth={1.2}
                strokeDasharray="3 2"
                className="transition-all duration-200"
                onMouseEnter={() => onRegionHover?.({ type: 'overlap', groups: [ov.g1, ov.g2], apps: [...ov.apps, ...ov.domains] })}
                onMouseLeave={() => onRegionHover?.(null)}
                style={{ cursor: 'pointer' }}
              />
              <text
                x={mx}
                y={my - 1}
                textAnchor="middle"
                fill="#e4e4e7"
                fontSize={8.5}
                fontWeight={500}
                fontFamily="'Inter', 'Geist', system-ui, sans-serif"
                className="pointer-events-none"
                style={{ textShadow: '0 1px 2px rgba(0,0,0,0.7)' }}
              >
                {label}
              </text>
              <text
                x={mx}
                y={my + 9}
                textAnchor="middle"
                fill="#9ca3af"
                fontSize={7.5}
                fontFamily="'JetBrains Mono', 'Geist Mono', monospace"
                className="pointer-events-none"
              >
                {fmtDur(ov.g1.seconds + ov.g2.seconds)}
              </text>
            </g>
          );
        })}

        {/* Extra groups note */}
        {extra > 0 && (
          <text
            x={width - 8}
            y={height - 8}
            textAnchor="end"
            fill="#64748b"
            fontSize={8.5}
            fontFamily="'JetBrains Mono', 'Geist Mono', monospace"
            className="pointer-events-none"
          >
            +{extra} more group{extra > 1 ? 's' : ''}
          </text>
        )}
      </svg>
    </div>
  );
}
