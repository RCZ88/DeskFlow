import { useState, useCallback } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent, DragOverEvent } from '@dnd-kit/core';
import type { PaneNode } from './TerminalWindow';

interface TerminalMiniMapProps {
  layout: PaneNode | null;
  activeTerminalId: string | null;
  onTerminalSelect: (id: string) => void;
  onTerminalMove: (fromId: string, toId: string) => void;
  onSplit: (terminalId: string, direction: 'horizontal' | 'vertical') => void;
}

interface FlattenedItem {
  id: string;
  terminalId?: string;
  index: number;
}

function flattenLayout(node: PaneNode): FlattenedItem[] {
  const result: FlattenedItem[] = [];
  let index = 0;

  function traverse(n: PaneNode) {
    if (n.type === 'leaf') {
      result.push({
        id: n.terminalId || `pane-${index}`,
        terminalId: n.terminalId,
        index,
      });
      index++;
    } else if (n.children) {
      n.children.forEach(traverse);
    }
  }

  traverse(node);
  return result;
}

export function TerminalMiniMap({
  layout,
  activeTerminalId,
  onTerminalSelect,
  onTerminalMove,
  onSplit,
}: TerminalMiniMapProps) {
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dropMode, setDropMode] = useState<'swap' | 'split-h' | 'split-v' | null>(null);

  const terminals = layout ? flattenLayout(layout) : [];

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setDraggedId(event.active.id as string);
  }, []);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    if (event.over) {
      const element = document.getElementById(event.over.id as string);
      if (!element) { setDropMode(null); return; }

      const rect = element.getBoundingClientRect();
      const delta = event.delta || { x: 0, y: 0 };
      const active = event.active;

      const pointerX = (active?.rect?.current?.initial?.left || 0) + delta.x + (active?.rect?.current?.initial?.width || 0) / 2;
      const pointerY = (active?.rect?.current?.initial?.top || 0) + delta.y + (active?.rect?.current?.initial?.height || 0) / 2;

      const relX = (pointerX - rect.left) / rect.width;
      const relY = (pointerY - rect.top) / rect.height;

      if (relY < 0.25) setDropMode('split-h');
      else if (relY > 0.75) setDropMode('split-h');
      else if (relX < 0.25) setDropMode('split-v');
      else if (relX > 0.75) setDropMode('split-v');
      else setDropMode('swap');
    } else {
      setDropMode(null);
    }
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;

      if (over && active.id !== over.id) {
        const sourceId = active.id as string;
        const targetId = over.id as string;

        if (dropMode === 'swap') {
          onTerminalMove(sourceId, targetId);
        } else if (dropMode === 'split-h') {
          onSplit(targetId, 'horizontal');
        } else if (dropMode === 'split-v') {
          onSplit(targetId, 'vertical');
        }
      }

      setDraggedId(null);
      setDropMode(null);
    },
    [dropMode, onTerminalMove, onSplit]
  );

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="relative w-full aspect-square bg-zinc-900 rounded border border-zinc-700 overflow-hidden">
        <div className="absolute inset-2 grid grid-cols-2 gap-1">
          {terminals.map((term, index) => (
            <TerminalMiniMapItem
              key={term.id}
              id={term.id}
              label={`T${index + 1}`}
              isActive={term.terminalId === activeTerminalId}
              isDropTarget={dropMode !== null}
              onClick={() => onTerminalSelect(term.terminalId || term.id)}
            />
          ))}
        </div>
        {dropMode && (
          <div className={`absolute inset-0 pointer-events-none z-10 transition-opacity ${
            dropMode === 'swap' ? 'bg-blue-500/10 border-2 border-dashed border-blue-400' :
            dropMode === 'split-v' ? 'bg-gradient-to-r from-transparent via-green-500/20 to-transparent border-x-2 border-dashed border-green-500' :
            'bg-gradient-to-b from-transparent via-green-500/20 to-transparent border-y-2 border-dashed border-green-500'
          }`} />
        )}
        <div className="absolute bottom-1 left-1 right-1 flex justify-center">
          {dropMode === 'swap' && <span className="text-[9px] text-blue-400 bg-zinc-900/80 px-2 py-0.5 rounded">Swap</span>}
          {dropMode === 'split-v' && <span className="text-[9px] text-green-400 bg-zinc-900/80 px-2 py-0.5 rounded">Split Vertically</span>}
          {dropMode === 'split-h' && <span className="text-[9px] text-green-400 bg-zinc-900/80 px-2 py-0.5 rounded">Split Horizontally</span>}
        </div>
      </div>
      <DragOverlay>
        {draggedId && (
          <div className="bg-blue-600/80 rounded border border-blue-500 shadow-lg p-2 text-xs text-white">
            {terminals.find(t => t.id === draggedId) ? `T${terminals.findIndex(t => t.id === draggedId) + 1}` : draggedId}
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}

function TerminalMiniMapItem({
  id,
  label,
  isActive,
  isDropTarget,
  onClick,
}: {
  id: string;
  label: string;
  isActive: boolean;
  isDropTarget: boolean;
  onClick: () => void;
}) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      id={id}
      draggable
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
      className={`relative bg-zinc-800 rounded border cursor-pointer transition-all ${
        isDropTarget ? 'ring-2 ring-green-500' :
        isActive
          ? 'border-green-500 bg-zinc-700'
          : isHovered
          ? 'border-zinc-500 bg-zinc-700/50'
          : 'border-zinc-700'
      }`}
    >
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={`text-[10px] font-semibold ${
          isActive ? 'text-green-400' : 'text-zinc-500'
        }`}>
          {label}
        </span>
      </div>
    </div>
  );
}

export default TerminalMiniMap;
