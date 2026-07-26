// TableOfContents — a reading-companion outline for a lesson. Lists every node,
// shows its mastery ring, tracks the active node with a scroll-spy, and lets the
// reader jump. This is the "aesthetic table of contents" feature.
//
// Scroll-spy: we observe each node's section element with an IntersectionObserver
// and mark the one nearest the top of the viewport as active. The parent passes a
// map of node id -> section element (the same refs the reader already keeps).

import { useEffect, useMemo, useRef, useState } from 'react';
import { MasteryRing } from './MasteryRing';
import { cn } from '../../lib/utils';
import type { RenderableNode } from '../../shared/learn/types';

export interface TableOfContentsProps {
  nodes: RenderableNode[];
  /** Resolve the scrollable section element for a node id (for scroll-spy). */
  getSectionEl?: (nodeId: string) => HTMLElement | null;
  /** Controlled active node id (optional — falls back to internal scroll-spy). */
  activeNodeId?: string;
  onSelect: (nodeId: string) => void;
  title?: string;
}

export function TableOfContents({
  nodes,
  getSectionEl,
  activeNodeId,
  onSelect,
  title = 'In this lesson',
}: TableOfContentsProps) {
  const [spyActive, setSpyActive] = useState<string | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const active = activeNodeId ?? spyActive ?? nodes[0]?.id ?? null;

  // Lesson-level mastery: average of node levels, expressed 0..5.
  const overall = useMemo(() => {
    if (nodes.length === 0) return 0;
    const total = nodes.reduce((acc, n) => acc + levelToNum(n.progress?.level), 0);
    return total / nodes.length;
  }, [nodes]);

  // Internal scroll-spy when the parent gives us section elements.
  useEffect(() => {
    if (!getSectionEl || activeNodeId) return;
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) {
          const id = (visible[0].target as HTMLElement).dataset.nodeId;
          if (id) setSpyActive(id);
        }
      },
      { rootMargin: '-10% 0px -70% 0px', threshold: [0, 1] },
    );
    for (const n of nodes) {
      const el = getSectionEl(n.id);
      if (el) {
        el.dataset.nodeId = n.id;
        obs.observe(el);
      }
    }
    observerRef.current = obs;
    return () => obs.disconnect();
  }, [nodes, getSectionEl, activeNodeId]);

  if (nodes.length === 0) return null;

  return (
    <nav className="lyceum-toc" aria-label="Table of contents">
      <div className="lyceum-toc-head">
        <MasteryRing level={numToLevel(overall)} size={34} strokeWidth={3} animated />
        <div className="lyceum-toc-head-text">
          <span className="lyceum-toc-title">{title}</span>
          <span className="lyceum-toc-sub">
            {nodes.length} {nodes.length === 1 ? 'concept' : 'concepts'}
          </span>
        </div>
      </div>
      <ol className="lyceum-toc-list">
        {nodes.map((n, i) => {
          const isActive = n.id === active;
          return (
            <li key={n.id}>
              <button
                type="button"
                className={cn('lyceum-toc-item', isActive && 'is-active')}
                aria-current={isActive ? 'true' : undefined}
                onClick={() => onSelect(n.id)}
              >
                <span className="lyceum-toc-rail" aria-hidden="true" />
                <MasteryRing
                  level={n.progress?.level ?? 'L0'}
                  target={n.mastery_target}
                  size={22}
                  strokeWidth={2.5}
                />
                <span className="lyceum-toc-index" aria-hidden="true">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="lyceum-toc-label">{n.title}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function levelToNum(level?: string): number {
  if (!level) return 0;
  const n = Number(level.replace('L', ''));
  return Number.isFinite(n) ? n : 0;
}

function numToLevel(num: number): 'L0' | 'L1' | 'L2' | 'L3' | 'L4' | 'L5' {
  const r = Math.round(num);
  const clamped = Math.max(0, Math.min(5, r));
  return `L${clamped}` as 'L0' | 'L1' | 'L2' | 'L3' | 'L4' | 'L5';
}
