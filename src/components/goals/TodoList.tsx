import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Plus, X, Flame, Clock, Trash2 } from 'lucide-react';

interface Todo {
  id: string;
  text: string;
  done: boolean;
  createdAt: string;
  goalId?: string;
}

interface TodoListProps {
  todos: Todo[];
  onAdd: (text: string) => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}

export function TodoList({ todos, onAdd, onToggle, onDelete }: TodoListProps) {
  const [newText, setNewText] = useState('');
  const [showAll, setShowAll] = useState(false);

  const pending = useMemo(() => todos.filter(t => !t.done), [todos]);
  const done = useMemo(() => todos.filter(t => t.done), [todos]);
  const displayTodos = showAll ? todos : pending;

  const handleAdd = () => {
    if (!newText.trim()) return;
    onAdd(newText.trim());
    setNewText('');
  };

  return (
    <div className="bg-[rgba(24,24,27,0.60)] backdrop-blur-xl border border-[rgba(63,63,70,0.40)] rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <CheckCircle2 size={14} className="text-cyan-400" />
          <span className="text-[13px] font-semibold text-zinc-200">Quick Todos</span>
          <span className="text-[10px] text-zinc-500 tabular-nums">{pending.length} pending</span>
        </div>
        {done.length > 0 && (
          <button
            onClick={() => setShowAll(!showAll)}
            className="text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            {showAll ? 'Hide done' : `Show ${done.length} done`}
          </button>
        )}
      </div>

      {/* Add input */}
      <div className="flex items-center gap-2 mb-3">
        <input
          value={newText}
          onChange={e => setNewText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
          placeholder="Add a quick task..."
          className="flex-1 px-3 py-2 rounded-lg bg-zinc-900/80 border border-zinc-700/50 text-[12px] text-zinc-200 placeholder:text-zinc-600 outline-none focus:border-cyan-500/50 transition-colors"
        />
        <button
          onClick={handleAdd}
          disabled={!newText.trim()}
          className="px-3 py-2 rounded-lg bg-cyan-500/15 text-cyan-300 border border-cyan-500/25 hover:bg-cyan-500/25 disabled:opacity-30 text-[11px] font-medium transition-colors"
        >
          <Plus size={12} />
        </button>
      </div>

      {/* Todo list */}
      {displayTodos.length === 0 ? (
        <p className="text-[11px] text-zinc-600 text-center py-3">
          {todos.length === 0 ? 'No tasks yet — add one above' : 'All done! Nice work.'}
        </p>
      ) : (
        <div className="space-y-1">
          <AnimatePresence>
            {displayTodos.map(todo => (
              <motion.div
                key={todo.id}
                layout
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 8 }}
                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg transition-colors ${
                  todo.done
                    ? 'bg-emerald-500/5 border border-emerald-500/10'
                    : 'bg-zinc-900/30 border border-zinc-800/30 hover:border-zinc-700/40'
                }`}
              >
                <button
                  onClick={() => onToggle(todo.id)}
                  className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                    todo.done
                      ? 'bg-emerald-500 border-emerald-500'
                      : 'border-zinc-600 hover:border-cyan-400/60'
                  }`}
                >
                  {todo.done && <CheckCircle2 size={10} className="text-white" />}
                </button>
                <span className={`text-[12px] flex-1 truncate ${
                  todo.done ? 'text-zinc-500 line-through' : 'text-zinc-300'
                }`}>
                  {todo.text}
                </span>
                {todo.goalId && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/20">
                    linked
                  </span>
                )}
                <button
                  onClick={() => onDelete(todo.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 text-zinc-600 hover:text-red-400 transition-all"
                >
                  <Trash2 size={10} />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
