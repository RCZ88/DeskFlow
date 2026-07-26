import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lightbulb, MessageSquare, Search, ArrowRight } from 'lucide-react';

interface Props {
  onAsk: (text: string, mode: 'explain' | 'ask' | 'simpler' | 'deeper') => void;
}

const MODES = [
  { key: 'explain' as const, label: 'Explain', icon: Lightbulb, shortcut: 'e' },
  { key: 'ask' as const, label: 'Ask…', icon: MessageSquare, shortcut: 'a' },
  { key: 'simpler' as const, label: 'Simpler', icon: Search, shortcut: 's' },
  { key: 'deeper' as const, label: 'Deeper', icon: ArrowRight, shortcut: 'd' },
];

export function SelectionFloatingPill({ onAsk }: Props) {
  const [visible, setVisible] = useState(false);
  const [selectedText, setSelectedText] = useState('');
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleSelection = () => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || !sel.toString().trim()) {
        setVisible(false);
        return;
      }
      const text = sel.toString().trim();
      if (text.length < 2 || text.length > 500) {
        setVisible(false);
        return;
      }
      const range = sel.getRangeAt(0);
      const rect = range.getBoundingClientRect();

      setSelectedText(text);
      setPosition({
        x: rect.left + rect.width / 2,
        y: rect.top - 8,
      });
      setVisible(true);
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setVisible(false);
      }
    };

    document.addEventListener('mouseup', handleSelection);
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mouseup', handleSelection);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleMode = useCallback((mode: 'explain' | 'ask' | 'simpler' | 'deeper') => {
    onAsk(selectedText, mode);
    setVisible(false);
    window.getSelection()?.removeAllRanges();
  }, [selectedText, onAsk]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          ref={containerRef}
          initial={{ opacity: 0, scale: 0.9, y: 0 }}
          animate={{ opacity: 1, scale: 1, y: -4 }}
          exit={{ opacity: 0, scale: 0.9, y: 0 }}
          transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
          className="fixed z-50 pointer-events-auto"
          style={{
            left: position.x,
            top: position.y,
            transform: 'translate(-50%, -100%)',
          }}
        >
          <div className="flex items-center gap-0.5 px-1.5 py-1 rounded-xl bg-zinc-800/95 backdrop-blur-xl border border-zinc-700/50 shadow-lg">
            {MODES.map((mode) => (
              <button
                key={mode.key}
                onClick={() => handleMode(mode.key)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/50 transition whitespace-nowrap"
                title={`${mode.label} (${mode.shortcut})`}
              >
                <mode.icon className="w-3 h-3" />
                {mode.label}
              </button>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
