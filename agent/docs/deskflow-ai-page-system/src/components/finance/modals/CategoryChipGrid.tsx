import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus } from 'lucide-react';
import type { FinanceCategory } from '../finance-types';

interface CategoryChipGridProps {
  categories: FinanceCategory[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  accent: string;
  onCreateCategory: (data: { name: string; type: string; icon?: string; color?: string }) => Promise<boolean>;
  /** The transaction type context (income/expense/transfer) so new categories are auto-typed. */
  categoryType: string;
}

export function CategoryChipGrid({ categories, selectedId, onSelect, accent, onCreateCategory, categoryType }: CategoryChipGridProps) {
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    const ok = await onCreateCategory({ name: newName.trim(), type: categoryType });
    setCreating(false);
    if (ok) { setNewName(''); setShowCreate(false); }
  };

  return (
    <div className="flex flex-wrap gap-1.5">
      {categories.map(cat => (
        <button key={cat.id} onClick={() => onSelect(cat.id)}
          className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
            selectedId === cat.id ? 'bg-zinc-700/60 text-white ring-1 ring-zinc-500/50' : 'bg-zinc-800/60 text-zinc-400 hover:text-zinc-200 border border-transparent'
          }`}
          style={selectedId === cat.id ? { backgroundColor: `${accent}20`, color: accent, borderColor: `${accent}30` } : undefined}>
          {cat.name}
        </button>
      ))}

      <AnimatePresence>
        {showCreate ? (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
            className="flex items-center gap-1">
            <input
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="Category name"
              onKeyDown={e => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') setShowCreate(false); }}
              autoFocus
              className="w-28 bg-zinc-800/80 border border-zinc-700/50 rounded-lg px-2 py-1 text-[11px] text-white placeholder-zinc-500 focus:outline-none focus:ring-1"
              style={{ boxShadow: `0 0 0 1px ${accent}40` }}
            />
            <button onClick={handleCreate} disabled={creating || !newName.trim()}
              className="px-2 py-1 rounded text-[11px] font-medium text-white disabled:opacity-40 transition-colors"
              style={{ backgroundColor: accent }}>Add</button>
            <button onClick={() => setShowCreate(false)} className="px-1.5 py-1 rounded text-[11px] text-zinc-500 hover:text-zinc-300">×</button>
          </motion.div>
        ) : (
          <motion.button
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            onClick={() => setShowCreate(true)}
            className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-zinc-800/60 text-zinc-500 hover:text-zinc-300 border border-dashed border-zinc-700/50 transition-colors flex items-center gap-1">
            <Plus className="w-3 h-3" /> New
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
