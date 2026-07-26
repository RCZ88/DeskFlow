import { CheckCircle, Circle, Target } from 'lucide-react';

interface ChecklistProgressProps {
  items: string[];
  completedIds: string[];
  onToggle: (itemId: string) => void;
  partSlug: string;
  compact?: boolean;
}

export function ChecklistProgress({
  items,
  completedIds,
  onToggle,
  partSlug,
  compact = false,
}: ChecklistProgressProps) {
  const completedCount = items.filter((_, i) =>
    completedIds.includes(`check-${partSlug}-${i}`),
  ).length;
  const total = items.length;
  const pct = total > 0 ? Math.round((completedCount / total) * 100) : 0;

  if (compact) {
    return (
      <div className="lyceum-checklist-compact">
        <div className="lyceum-checklist-compact-header">
          <Target size={14} />
          <span>{completedCount}/{total} skills</span>
        </div>
        <div className="lyceum-checklist-compact-bar">
          <div className="lyceum-checklist-compact-fill" style={{ width: `${pct}%` }} />
        </div>
      </div>
    );
  }

  return (
    <div className="lyceum-checklist">
      <div className="lyceum-checklist-header">
        <Target size={16} />
        <h3 className="lyceum-checklist-title">Competency Checklist</h3>
        <span className="lyceum-checklist-count">
          {completedCount}/{total}
        </span>
      </div>
      <div className="lyceum-checklist-bar">
        <div className="lyceum-checklist-fill" style={{ width: `${pct}%` }} />
      </div>
      <ul className="lyceum-checklist-items">
        {items.map((item, i) => {
          const id = `check-${partSlug}-${i}`;
          const done = completedIds.includes(id);
          return (
            <li key={id} className="lyceum-checklist-item">
              <button
                className={`lyceum-checklist-toggle${done ? ' done' : ''}`}
                onClick={() => onToggle(id)}
                aria-label={done ? `Mark "${item}" incomplete` : `Mark "${item}" complete`}
              >
                {done ? <CheckCircle size={16} /> : <Circle size={16} />}
              </button>
              <span className={`lyceum-checklist-text${done ? ' done' : ''}`}>{item}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
