// ============================================================================
// Presets Tab — Revamped
// Terminal command presets with add/edit/delete/execute.
// Uses WorkspaceCard, shadcn-style inputs, proper states.
// ============================================================================
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Plus, Play, Edit, Trash2, Terminal, Info, X, Check } from 'lucide-react';
import { WorkspaceCard, WorkspaceSection } from './_ds/containers';
import { listContainer, riseItem, expandPanel, DUR, EASE_OUT } from './_ds/motion';
import { WS_BTN_PRIMARY, WS_BTN_SECONDARY, WS_BTN_GHOST, WS_BTN_DANGER, WS_INPUT } from './_ds/forms';
import { EmptyState, Skeleton } from './_ds/primitives';

interface Preset {
  id: string;
  name: string;
  command: string;
  category?: string;
  isBuiltIn?: boolean;
}

interface PresetsTabProps {
  presets: Preset[];
  onAdd: (name: string, command: string, category: string) => void;
  onRemove: (id: string) => void;
  onEdit: (preset: Preset) => void;
  onExecute: (preset: Preset) => void;
}

export function PresetsTab({ presets, onAdd, onRemove, onEdit, onExecute }: PresetsTabProps) {
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCommand, setNewCommand] = useState('');
  const [newCategory, setNewCategory] = useState('');

  const handleAdd = () => {
    if (!newName.trim() || !newCommand.trim()) return;
    onAdd(newName.trim(), newCommand.trim(), newCategory.trim());
    setNewName('');
    setNewCommand('');
    setNewCategory('');
    setShowAdd(false);
  };

  return (
    <div className="flex flex-col gap-4 p-3 min-h-0 overflow-y-auto scrollbar-thin">
      <WorkspaceSection
        title="Command Presets"
        icon={Zap}
        accent="orange"
        action={
          <button onClick={() => setShowAdd(!showAdd)} className={WS_BTN_PRIMARY}>
            <Plus className="w-3 h-3" /> Add
          </button>
        }
      >
        {/* Add Form */}
        <AnimatePresence>
          {showAdd && (
            <motion.div
              variants={expandPanel} initial="hidden" animate="show" exit="exit"
              className="mb-3 overflow-hidden"
            >
              <WorkspaceCard variant="inset">
                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="Name (e.g., Run Tests)"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className={WS_INPUT}
                  />
                  <input
                    type="text"
                    placeholder="Command (e.g., npm test)"
                    value={newCommand}
                    onChange={(e) => setNewCommand(e.target.value)}
                    className={WS_INPUT}
                  />
                  <input
                    type="text"
                    placeholder="Category (optional)"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className={WS_INPUT}
                  />
                  <div className="flex gap-2">
                    <button onClick={handleAdd} className={WS_BTN_PRIMARY}>
                      <Check className="w-3 h-3" /> Save
                    </button>
                    <button onClick={() => { setShowAdd(false); setNewName(''); setNewCommand(''); setNewCategory(''); }} className={WS_BTN_GHOST}>
                      Cancel
                    </button>
                  </div>
                </div>
              </WorkspaceCard>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Preset List */}
        {presets.length === 0 ? (
          <EmptyState
            icon={<Terminal className="w-5 h-5" />}
            title="No presets yet"
            hint="Add a preset to quickly execute commands in your terminal."
            action={
              <button onClick={() => setShowAdd(true)} className="mt-2 text-[11px] text-orange-400 hover:text-orange-300 underline">
                Create your first preset
              </button>
            }
          />
        ) : (
          <motion.div
            className="flex flex-col gap-1.5"
            variants={listContainer} initial="hidden" animate="show"
          >
            {presets.map((preset) => (
              <motion.div key={preset.id} variants={riseItem}>
                <WorkspaceCard variant="interactive" className="!p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      {preset.isBuiltIn && (
                        <span className="text-[9px] font-bold text-blue-400 bg-blue-500/15 px-1.5 py-0.5 rounded shrink-0">
                          SYS
                        </span>
                      )}
                      <span className="text-[12px] font-medium text-zinc-200 truncate">{preset.name}</span>
                    </div>
                    <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => onExecute(preset)}
                        title="Run"
                        className="grid w-6 h-6 place-items-center rounded-md text-zinc-500 hover:text-green-400 hover:bg-green-500/10 transition-colors"
                      >
                        <Play className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => onEdit(preset)}
                        title={preset.isBuiltIn ? 'View' : 'Edit'}
                        className="grid w-6 h-6 place-items-center rounded-md text-zinc-500 hover:text-zinc-200 hover:bg-zinc-700/60 transition-colors"
                      >
                        {preset.isBuiltIn ? <Info className="w-3 h-3" /> : <Edit className="w-3 h-3" />}
                      </button>
                      {!preset.isBuiltIn && (
                        <button
                          onClick={() => onRemove(preset.id)}
                          title="Delete"
                          className="grid w-6 h-6 place-items-center rounded-md text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="text-[11px] text-zinc-500 font-mono truncate mt-1">
                    {preset.command || 'Re-inject context snapshot into active terminal'}
                  </div>
                </WorkspaceCard>
              </motion.div>
            ))}
          </motion.div>
        )}
      </WorkspaceSection>
    </div>
  );
}
