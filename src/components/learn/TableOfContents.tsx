import { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronDown, ChevronRight, FileText, CheckCircle, Circle } from 'lucide-react';
import type { CurriculumTopic } from '../../services/learn/curriculum';

interface TOCHeading {
  id: string;
  text: string;
  level: number;
}

interface TableOfContentsProps {
  part: CurriculumTopic;
  headings: TOCHeading[];
  completedItems: string[];
  onNavigate: (headingId: string) => void;
  activeId?: string;
}

export function TableOfContents({
  part,
  headings,
  completedItems,
  onNavigate,
  activeId,
}: TableOfContentsProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <nav className="lyceum-toc">
      <button
        className="lyceum-toc-header"
        onClick={() => setCollapsed(!collapsed)}
        aria-expanded={!collapsed}
      >
        <span className="lyceum-toc-title">
          <FileText size={14} />
          {part.title}
        </span>
        {collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
      </button>

      {!collapsed && (
        <ul className="lyceum-toc-list">
          {headings.map((h) => {
            const isComplete = completedItems.includes(h.id);
            const isActive = activeId === h.id;
            return (
              <li
                key={h.id}
                className={`lyceum-toc-item lyceum-toc-level-${h.level}${isActive ? ' active' : ''}`}
                style={{ paddingLeft: `${(h.level - 1) * 12}px` }}
              >
                {isActive && (
                  <motion.div
                    layoutId="active-bar"
                    className="absolute left-0 top-1 bottom-1 w-0.5 rounded-r-full"
                    style={{ backgroundColor: '#c2553a' }}
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  />
                )}
                <button
                  onClick={() => onNavigate(h.id)}
                  className="lyceum-toc-link relative"
                >
                  {isComplete ? (
                    <CheckCircle size={12} className="toc-check-complete" />
                  ) : (
                    <Circle size={12} className="toc-check-pending" />
                  )}
                  <span>{h.text}</span>
                </button>
              </li>
            );
          })}

          {/* Checklist items */}
          {part.checklist.length > 0 && (
            <li className="lyceum-toc-divider">
              <span className="lyceum-toc-section-label">Checklist</span>
              {part.checklist.map((item, i) => {
                const itemId = `check-${part.slug}-${i}`;
                const isComplete = completedItems.includes(itemId);
                return (
                  <button
                    key={itemId}
                    className="lyceum-toc-link lyceum-toc-checklist-item"
                    onClick={() => onNavigate(itemId)}
                  >
                    {isComplete ? (
                      <CheckCircle size={12} className="toc-check-complete" />
                    ) : (
                      <Circle size={12} className="toc-check-pending" />
                    )}
                    <span className="lyceum-toc-checklist-text">{item}</span>
                  </button>
                );
              })}
            </li>
          )}
        </ul>
      )}
    </nav>
  );
}

export type { TOCHeading };
