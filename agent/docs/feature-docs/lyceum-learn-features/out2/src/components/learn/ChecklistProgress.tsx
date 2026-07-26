// ChecklistProgress — renders a curriculum part's "things to learn" as a checkable
// list with a progress ring. Used both in the curriculum showcase (compact) and in
// the reader sidebar (full). State is controlled: the parent owns which items are
// done (persist to localStorage or SQLite) and passes a toggle handler.

import { useMemo } from 'react';
import { cn } from '../../lib/utils';

export interface ChecklistProgressProps {
  items: string[];
  /** Indices of completed items. */
  done: number[];
  onToggle?: (index: number) => void;
  /** Compact hides labels and shows only the ring + count. */
  compact?: boolean;
  label?: string;
}

export function ChecklistProgress({
  items,
  done,
  onToggle,
  compact = false,
  label = 'Checklist',
}: ChecklistProgressProps) {
  const doneSet = useMemo(() => new Set(done), [done]);
  const total = items.length;
  const completed = items.reduce((acc, _, i) => acc + (doneSet.has(i) ? 1 : 0), 0);
  const pct = total === 0 ? 0 : Math.round((completed / total) * 100);

  const ring = <ProgressRing pct={pct} />;

  if (compact) {
    return (
      <div className="lyceum-checklist-compact" title={`${completed}/${total} complete`}>
        {ring}
        <span className="lyceum-checklist-count">
          {completed}/{total}
        </span>
      </div>
    );
  }

  return (
    <section className="lyceum-checklist" aria-label={label}>
      <header className="lyceum-checklist-head">
        {ring}
        <div>
          <div className="lyceum-checklist-label">{label}</div>
          <div className="lyceum-checklist-sub">
            {completed} of {total} mastered
          </div>
        </div>
      </header>
      <ul className="lyceum-checklist-items">
        {items.map((item, i) => {
          const checked = doneSet.has(i);
          return (
            <li key={i}>
              <button
                type="button"
                className={cn('lyceum-checklist-item', checked && 'is-done')}
                aria-pressed={checked}
                disabled={!onToggle}
                onClick={() => onToggle?.(i)}
              >
                <span className="lyceum-checklist-box" aria-hidden="true">
                  {checked ? '✓' : ''}
                </span>
                <span className="lyceum-checklist-text">{item}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function ProgressRing({ pct }: { pct: number }) {
  const size = 36;
  const stroke = 4;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - pct / 100);
  const center = size / 2;
  return (
    <svg width={size} height={size} className="lyceum-checklist-ring" aria-hidden="true">
      <circle cx={center} cy={center} r={r} fill="none" stroke="currentColor" strokeWidth={stroke} className="lyceum-checklist-ring-track" />
      <circle
        cx={center}
        cy={center}
        r={r}
        fill="none"
        stroke="currentColor"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        className="lyceum-checklist-ring-fill"
        transform={`rotate(-90 ${center} ${center})`}
      />
      <text x="50%" y="52%" textAnchor="middle" dominantBaseline="middle" className="lyceum-checklist-ring-text">
        {pct}
      </text>
    </svg>
  );
}
