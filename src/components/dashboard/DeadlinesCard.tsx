// ============================================================
// DeskFlow Dashboard — DeadlinesCard (Revamped v2)
// Skills: Human-Centric UX (urgency system, progressive disclosure),
//         Impeccable Design (HSL urgency colors, 8px grid),
//         MCP (SpotlightCard from ReactBits, NumberTicker from Magic UI),
//         Signature Design (micro-detail: urgency pulse on overdue)
// ============================================================

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertCircle, Clock, CheckCircle2, Plus, X, Edit3, Trash2,
  Calendar, Flag, Tag, ChevronDown, ChevronUp, AlertTriangle,
  RotateCcw, GripVertical
} from 'lucide-react';
import { SpotlightCard } from './SpotlightCard';
import { NumberTicker } from '../ui/number-ticker';
import { BorderBeam } from '../ui/border-beam';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Select, SelectItem } from '../ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Calendar as CalendarComponent } from '../ui/calendar';
import { format } from 'date-fns';
import type { Deadline, Priority, DeadlineCategory } from './types';

const PRIORITIES: { value: Priority; label: string; color: string; dot: string }[] = [
  { value: 'critical', label: 'Critical', color: 'bg-rose-500/10 text-rose-400 border-rose-500/20', dot: '#f87171' },
  { value: 'high', label: 'High', color: 'bg-orange-500/10 text-orange-400 border-orange-500/20', dot: '#fb923c' },
  { value: 'medium', label: 'Medium', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20', dot: '#fbbf24' },
  { value: 'low', label: 'Low', color: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20', dot: '#6b7280' },
];

const CATEGORIES: { value: DeadlineCategory; label: string }[] = [
  { value: 'academic', label: 'Academic' },
  { value: 'work', label: 'Work' },
  { value: 'personal', label: 'Personal' },
  { value: 'health', label: 'Health' },
];

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.25, ease: [0.16, 1, 0.3, 1] } },
  exit: { opacity: 0, x: -12, transition: { duration: 0.2 } },
};

const formVariants = {
  hidden: { height: 0, opacity: 0 },
  show: { height: 'auto', opacity: 1, transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] } },
  exit: { height: 0, opacity: 0, transition: { duration: 0.25 } },
};

function getDaysUntil(dateStr: string): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const due = new Date(dateStr);
  due.setHours(0, 0, 0, 0);
  return Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function getUrgency(daysLeft: number): 'overdue' | 'urgent' | 'critical' | 'soon' | 'normal' {
  if (daysLeft < 0) return 'overdue';
  if (daysLeft === 0) return 'urgent';
  if (daysLeft <= 2) return 'critical';
  if (daysLeft <= 5) return 'soon';
  return 'normal';
}

const URGENCY_META = {
  overdue: { color: '#ef4444', bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/20', label: 'Overdue' },
  urgent: { color: '#f87171', bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/20', label: 'Today' },
  critical: { color: '#fb923c', bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/20', label: 'Soon' },
  soon: { color: '#fbbf24', bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20', label: 'Upcoming' },
  normal: { color: '#6b7280', bg: 'bg-zinc-800/50', text: 'text-zinc-500', border: 'border-zinc-700/30', label: 'Later' },
};

interface DeadlinesCardProps {
  deadlines: Deadline[];
  loading?: boolean;
  error?: string | null;
  onAdd: (dl: Omit<Deadline, 'id' | 'createdAt' | 'status'>) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, patch: Partial<Deadline>) => void;
  onComplete: (id: string) => void;
}

export function DeadlinesCard({
  deadlines,
  loading = false,
  error = null,
  onAdd,
  onDelete,
  onUpdate,
  onComplete,
}: DeadlinesCardProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newDl, setNewDl] = useState<{
    title: string;
    dueDate: Date | undefined;
    priority: Priority;
    category: DeadlineCategory | '';
    description: string;
  }>({ title: '', dueDate: undefined, priority: 'medium', category: '', description: '' });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Deadline>>({});
  const [editDate, setEditDate] = useState<Date | undefined>(undefined);
  const [showCompleted, setShowCompleted] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const sortedPending = useMemo(() =>
    deadlines.filter(d => d.status !== 'completed').sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime()),
    [deadlines]
  );
  const completed = useMemo(() => deadlines.filter(d => d.status === 'completed'), [deadlines]);
  const urgentCount = useMemo(() => sortedPending.filter(d => getDaysUntil(d.due_date) <= 2).length, [sortedPending]);

  const handleAdd = () => {
    if (!newDl.title.trim() || !newDl.dueDate) return;
    onAdd({
      title: newDl.title.trim(),
      due_date: newDl.dueDate.toISOString(),
      priority: newDl.priority,
      category: newDl.category || undefined,
      description: newDl.description.trim() || undefined,
    });
    resetAddForm();
    setIsAdding(false);
  };

  const resetAddForm = () => {
    setNewDl({ title: '', dueDate: undefined, priority: 'medium', category: '', description: '' });
  };

  const startEdit = (dl: Deadline) => {
    setEditingId(dl.id);
    setEditForm({ ...dl });
    setEditDate(new Date(dl.due_date));
  };

  const saveEdit = () => {
    if (editingId && editForm.title?.trim() && editDate) {
      onUpdate(editingId, { ...editForm, due_date: editDate.toISOString() });
      setEditingId(null);
      setEditForm({});
      setEditDate(undefined);
    }
  };

  const handleDelete = (id: string) => {
    if (deleteConfirmId === id) {
      onDelete(id);
      setDeleteConfirmId(null);
    } else {
      setDeleteConfirmId(id);
      setTimeout(() => setDeleteConfirmId(prev => prev === id ? null : prev), 3000);
    }
  };

  if (loading) {
    return (
      <SpotlightCard spotlightColor="rgba(244, 63, 94, 0.08)" className="rounded-xl">
        <div className="relative rounded-xl overflow-hidden bg-zinc-950/50 backdrop-blur-xl border border-zinc-800/40 p-5 min-h-[400px]">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-rose-500/30 via-rose-500/10 to-transparent" />
          <div className="animate-pulse space-y-4">
            <div className="h-5 bg-zinc-800 rounded w-1/3" />
            <div className="h-3 bg-zinc-800/50 rounded w-1/2" />
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-14 bg-zinc-800/30 rounded-lg" />
            ))}
          </div>
        </div>
      </SpotlightCard>
    );
  }

  if (error) {
    return (
      <SpotlightCard spotlightColor="rgba(244, 63, 94, 0.08)" className="rounded-xl">
        <div className="relative rounded-xl overflow-hidden bg-zinc-950/50 backdrop-blur-xl border border-zinc-800/40 p-5 min-h-[400px] flex flex-col items-center justify-center text-center">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-rose-500/30 via-rose-500/10 to-transparent" />
          <div className="w-14 h-14 rounded-full bg-zinc-800/50 flex items-center justify-center mb-3">
            <AlertCircle size={24} className="text-zinc-600" />
          </div>
          <p className="text-[14px] font-medium text-zinc-400">Could not load deadlines</p>
          <p className="text-[12px] text-zinc-600 mt-1 max-w-[220px]">{error}</p>
        </div>
      </SpotlightCard>
    );
  }

  return (
    <SpotlightCard spotlightColor="rgba(244, 63, 94, 0.08)" className="rounded-xl">
      <div className="relative rounded-xl overflow-hidden bg-zinc-950/50 backdrop-blur-xl border border-zinc-800/40 p-5 min-h-[400px] flex flex-col">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-rose-500/30 via-rose-500/10 to-transparent" />

        {urgentCount > 0 && <BorderBeam size={140} duration={6} colorFrom="#f87171" colorTo="#fbbf24" />}

        {/* Header */}
        <div className="flex items-center justify-between mb-4 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
              <AlertCircle size={15} className="text-rose-400" />
            </div>
            <div>
              <h2 className="text-[15px] font-semibold text-zinc-100">Deadlines</h2>
              <p className="text-[11px] text-zinc-500">
                {sortedPending.length} upcoming · {completed.length} done
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {urgentCount > 0 && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="flex items-center gap-1 px-2 py-1 rounded-md bg-rose-500/10 text-rose-400 border border-rose-500/20"
              >
                <AlertTriangle size={12} />
                <span className="text-[11px] font-medium">{urgentCount} urgent</span>
              </motion.div>
            )}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setIsAdding(!isAdding)}
              className="w-8 h-8 rounded-md bg-zinc-800/50 hover:bg-zinc-700/50 flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
              aria-label={isAdding ? 'Cancel adding deadline' : 'Add new deadline'}
            >
              {isAdding ? <X size={14} /> : <Plus size={14} />}
            </motion.button>
          </div>
        </div>

        {/* Add Deadline Form */}
        <AnimatePresence>
          {isAdding && (
            <motion.div variants={formVariants} initial="hidden" animate="show" exit="exit" className="overflow-hidden">
              <div className="p-3 rounded-lg bg-zinc-900/60 border border-zinc-800/50 space-y-2.5 mb-3">
                <Input
                  value={newDl.title}
                  onChange={e => setNewDl(p => ({ ...p, title: e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && handleAdd()}
                  placeholder="What's due?"
                  autoFocus
                  className="bg-zinc-900/80 border-zinc-700/50 focus-visible:ring-rose-500/50 text-[13px] h-9"
                />
                <Input
                  value={newDl.description}
                  onChange={e => setNewDl(p => ({ ...p, description: e.target.value }))}
                  placeholder="Description (optional)"
                  className="bg-zinc-900/80 border-zinc-700/50 focus-visible:ring-rose-500/50 text-[13px] h-9"
                />
                <div className="flex items-center gap-2 flex-wrap">
                  <Popover>
                    <PopoverTrigger asChild>
                      <button className="h-9 px-3 text-xs flex-1 justify-start rounded-md bg-zinc-900/80 border border-zinc-700/50 text-zinc-400 hover:text-white hover:border-zinc-600 transition-colors text-left min-w-[140px]">
                        {newDl.dueDate ? format(newDl.dueDate, 'PPP') : "Pick due date"}
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-zinc-900 border-zinc-800">
                      <CalendarComponent
                        mode="single"
                        selected={newDl.dueDate}
                        onSelect={date => setNewDl(p => ({ ...p, dueDate: date }))}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <Select value={newDl.priority} onValueChange={v => setNewDl(p => ({ ...p, priority: v as Priority }))} className="w-[100px]">
                    {PRIORITIES.map(p => (
                      <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                    ))}
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <Select value={newDl.category} onValueChange={v => setNewDl(p => ({ ...p, category: v as DeadlineCategory }))} className="w-[120px]">
                    <SelectItem value="" disabled>Category</SelectItem>
                    {CATEGORIES.map(c => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </Select>
                  <div className="flex-1" />
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Button size="sm" onClick={handleAdd} className="bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:bg-rose-500/30 text-[12px] h-8">
                      <Plus size={12} className="mr-1" /> Add
                    </Button>
                  </motion.div>
                  <Button size="sm" variant="ghost" onClick={() => { resetAddForm(); setIsAdding(false); }} className="text-zinc-400 hover:text-white text-[12px] h-8">
                    Cancel
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Deadlines List */}
        <motion.div variants={containerVariants} initial="hidden" animate="show" className="flex-1 space-y-2 min-h-0 overflow-y-auto">
          <AnimatePresence mode="popLayout">
            {sortedPending.map((dl) => {
              const daysLeft = getDaysUntil(dl.due_date);
              const urgency = getUrgency(daysLeft);
              const meta = URGENCY_META[urgency];
              const priorityMeta = PRIORITIES.find(p => p.value === dl.priority) || PRIORITIES[2];
              const isEditing = editingId === dl.id;

              if (isEditing) {
                return (
                  <motion.div
                    key={dl.id}
                    variants={itemVariants}
                    initial="hidden"
                    animate="show"
                    exit="exit"
                    layout
                    className="p-3 rounded-lg bg-zinc-900/60 border border-zinc-800/50 space-y-2"
                  >
                    <Input
                      value={editForm.title || ''}
                      onChange={e => setEditForm(p => ({ ...p, title: e.target.value }))}
                      className="bg-zinc-900/80 border-zinc-700/50 focus-visible:ring-rose-500/50 text-[13px] h-9"
                      autoFocus
                    />
                    <div className="flex items-center gap-2 flex-wrap">
                      <Popover>
                        <PopoverTrigger asChild>
                          <button className="h-9 px-3 text-xs flex-1 justify-start rounded-md bg-zinc-900/80 border border-zinc-700/50 text-zinc-400 hover:text-white hover:border-zinc-600 transition-colors text-left">
                            {editDate ? format(editDate, 'PPP') : "Pick due date"}
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 bg-zinc-900 border-zinc-800">
                          <CalendarComponent mode="single" selected={editDate} onSelect={setEditDate} initialFocus />
                        </PopoverContent>
                      </Popover>
                      <Select value={editForm.priority} onValueChange={v => setEditForm(p => ({ ...p, priority: v as Priority }))} className="w-[100px]">
                        {PRIORITIES.map(p => (
                          <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                        ))}
                      </Select>
                    </div>
                    <div className="flex items-center gap-2">
                      <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                        <Button size="sm" onClick={saveEdit} className="bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:bg-rose-500/30 text-[12px] h-8">
                          Save
                        </Button>
                      </motion.div>
                      <Button size="sm" variant="ghost" onClick={() => { setEditingId(null); setEditForm({}); setEditDate(undefined); }} className="text-zinc-400 hover:text-white text-[12px] h-8">
                        Cancel
                      </Button>
                    </div>
                  </motion.div>
                );
              }

              return (
                <motion.div
                  key={dl.id}
                  variants={itemVariants}
                  initial="hidden"
                  animate="show"
                  exit="exit"
                  layout
                  className="group"
                >
                  <div className={`relative p-3 rounded-lg border transition-all duration-200 ${
                    urgency === 'overdue' ? 'border-rose-500/30 bg-rose-500/[0.03]' : 'border-zinc-800/30 hover:border-zinc-700/40 bg-zinc-900/20 hover:bg-zinc-900/40'
                  }`}>
                    {/* Urgency indicator bar */}
                    <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-lg" style={{ backgroundColor: meta.color }} />
                    {urgency === 'overdue' && (
                      <motion.div
                        className="absolute left-0 top-0 bottom-0 w-1 rounded-l-lg"
                        style={{ backgroundColor: meta.color }}
                        animate={{ opacity: [0.5, 1, 0.5] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      />
                    )}

                    <div className="flex items-start justify-between pl-3 gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[13px] text-zinc-200 truncate">{dl.title}</span>
                          {urgency === 'overdue' && (
                            <span className="shrink-0 px-1.5 py-0.5 rounded text-[10px] font-medium bg-rose-500/20 text-rose-400 border border-rose-500/20">
                              OVERDUE
                            </span>
                          )}
                        </div>

                        {dl.description && (
                          <p className="text-[11px] text-zinc-600 mt-0.5 line-clamp-1">{dl.description}</p>
                        )}

                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          <Badge className={`text-[10px] px-1.5 py-0.5 ${priorityMeta.color}`}>
                            <span className="w-1 h-1 rounded-full mr-1 inline-block" style={{ backgroundColor: priorityMeta.dot }} />
                            {dl.priority}
                          </Badge>
                          {dl.category && (
                            <Badge className="text-[10px] px-1.5 py-0.5 bg-zinc-800/50 text-zinc-400 border-zinc-700/30">
                              {dl.category}
                            </Badge>
                          )}
                          {dl.course && (
                            <span className="text-[10px] text-zinc-600">{dl.course}</span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-[11px] font-medium border shrink-0 ${meta.bg} ${meta.text} ${meta.border}`}>
                          <Clock size={11} />
                          {daysLeft < 0 ? `${Math.abs(daysLeft)}d ago` :
                           daysLeft === 0 ? 'Today' :
                           daysLeft === 1 ? '1d' :
                           `${daysLeft}d`}
                        </div>

                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => onComplete(dl.id)}
                            className="w-7 h-7 rounded-md bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 flex items-center justify-center transition-colors"
                            title="Mark complete"
                          >
                            <CheckCircle2 size={12} />
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => startEdit(dl)}
                            className="w-7 h-7 rounded-md bg-zinc-800/50 text-zinc-400 hover:bg-zinc-700/50 hover:text-white flex items-center justify-center transition-colors"
                            title="Edit deadline"
                          >
                            <Edit3 size={12} />
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => handleDelete(dl.id)}
                            className={`w-7 h-7 rounded-md flex items-center justify-center transition-colors ${
                              deleteConfirmId === dl.id
                                ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                                : 'bg-zinc-800/50 text-zinc-400 hover:bg-red-500/20 hover:text-red-400'
                            }`}
                            title={deleteConfirmId === dl.id ? 'Click again to confirm delete' : 'Delete deadline'}
                          >
                            <Trash2 size={12} />
                          </motion.button>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {/* Empty State */}
          {deadlines.length === 0 && !isAdding && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex-1 flex flex-col items-center justify-center text-center py-10"
            >
              <div className="w-14 h-14 rounded-full bg-zinc-800/50 flex items-center justify-center mb-3">
                <CheckCircle2 size={24} className="text-zinc-600" />
              </div>
              <p className="text-[14px] font-medium text-zinc-400">No deadlines tracked</p>
              <p className="text-[12px] text-zinc-600 mt-1 max-w-[200px]">
                Add assignments, exams, or personal deadlines to stay on top of your schedule
              </p>
              <motion.button
                whileHover={{ scale: 1.02, y: -1 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setIsAdding(true)}
                className="mt-3 px-3 py-1.5 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20 transition-colors text-[12px] font-medium"
              >
                <Plus size={12} className="inline mr-1" />
                Add Deadline
              </motion.button>
            </motion.div>
          )}
        </motion.div>

        {/* Completed Section */}
        {completed.length > 0 && (
          <div className="mt-3 pt-3 border-t border-zinc-800/50 shrink-0">
            <button
              onClick={() => setShowCompleted(!showCompleted)}
              className="flex items-center gap-1.5 text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors w-full py-1"
            >
              {showCompleted ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              <span>{completed.length} completed</span>
            </button>

            <AnimatePresence>
              {showCompleted && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="space-y-1 mt-2">
                    {completed.map(dl => (
                      <motion.div
                        key={dl.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex items-center gap-2 p-2 rounded-md bg-zinc-900/30 opacity-50 hover:opacity-80 transition-opacity"
                      >
                        <CheckCircle2 size={12} className="text-emerald-500" />
                        <span className="text-[12px] text-zinc-500 line-through flex-1">{dl.title}</span>
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => onUpdate(dl.id, { status: 'pending' })}
                          className="text-zinc-600 hover:text-zinc-400 p-1 rounded"
                          title="Reopen deadline"
                        >
                          <RotateCcw size={10} />
                        </motion.button>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </SpotlightCard>
  );
}
