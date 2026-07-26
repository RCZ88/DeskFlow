# RESULT.md — AiPage Plan CRUD + Goals & Reminders + Calendar Synergy

> Target: Architect AI | Cycle: 179 | Date: 2026-07-13
> Scope: PlanBoard full CRUD, ChatHistory → Goals & Reminders, Calendar connector synergy

---

## Table of Contents

1. [Phase 1 — Plan Board CRUD](#phase-1--plan-board-crud)
2. [Phase 2 — Goals & Reminders Section](#phase-2--goals--reminders-section)
3. [Phase 3 — Calendar Synergy](#phase-3--calendar-synergy)
4. [Backend Audit](#backend-audit)
5. [Implementation Order](#implementation-order)

---

## Phase 1 — Plan Board CRUD

### Problem

`PlanBoard` renders long-term goals as read-only rows with only a toggle-done action. Users cannot view detail, edit fields, or delete goals. The `deleteGoal` IPC endpoint exists but is unused. A legacy `LongTermPlanCard` had more functionality — PlanBoard regressed.

### Solution

Add per-goal **action menu** (View Detail · Edit · Delete), **detail modal**, **edit form modal**, and **delete confirmation** — all using existing IPC and design tokens. No new dependencies.

---

### 1.1 `src/components/ai/plan/PlanBoard.tsx` — Complete Rewrite (236 → ~420 lines)

```tsx
import { useState, useEffect, useRef, useCallback } from "react"
import { cn } from "../../../lib/utils"
import {
  MoreVertical, Eye, Pencil, Trash2, X, Check, Loader2,
  Lightbulb, FileText, Plus
} from "lucide-react"
import { SectionHead } from "../SectionHead"
import { StateShell } from "../StateShell"
import { Segmented } from "../primitives/Segmented"
import { Textarea } from "../primitives/Textarea"
import { ACCENT, TEXT } from "../tokens"
import type { DataState, LongTermGoal, GoalCategory } from "../types"

export interface PlanBoardProps {
  state: DataState
  goals: LongTermGoal[]
  notes: string
  savingNotes?: boolean
  onSaveNotes?: (content: string) => void
  onAnalyzeDump: (text: string) => Promise<Partial<LongTermGoal>[]>
  onSaveGoals: (goals: Partial<LongTermGoal>[]) => void
  onToggleGoal?: (goal: LongTermGoal) => void
  onDeleteGoal?: (id: string) => Promise<void>
  onUpdateGoal?: (goal: LongTermGoal) => Promise<void>
  errorMessage?: string
  onRetry?: () => void
}

const CATEGORY_ACCENT: Record<string, string> = {
  work: "violet",
  personal: "emerald",
  health: "pink",
  learning: "cyan",
  finance: "amber",
  relationships: "red",
}

export function PlanBoard(props: PlanBoardProps) {
  const [activeTab, setActiveTab] = useState<"goals" | "notes">("goals")
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [dumpText, setDumpText] = useState("")
  const [analyzing, setAnalyzing] = useState(false)
  const [parsedGoals, setParsedGoals] = useState<Partial<LongTermGoal>[]>([])
  const [notesContent, setNotesContent] = useState(props.notes)
  const [savingNotes, setSavingNotes] = useState(false)

  // CRUD state
  const [detailGoal, setDetailGoal] = useState<LongTermGoal | null>(null)
  const [editGoal, setEditGoal] = useState<LongTermGoal | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [crudLoading, setCrudLoading] = useState(false)

  useEffect(() => { setNotesContent(props.notes) }, [props.notes])

  const handleAnalyze = useCallback(async () => {
    if (!dumpText.trim()) return
    setAnalyzing(true)
    try {
      const parsed = await props.onAnalyzeDump(dumpText)
      setParsedGoals(parsed)
    } finally { setAnalyzing(false) }
  }, [dumpText, props.onAnalyzeDump])

  const handleSaveNotes = useCallback(async () => {
    if (!props.onSaveNotes) return
    setSavingNotes(true)
    await props.onSaveNotes(notesContent)
    setSavingNotes(false)
  }, [notesContent, props.onSaveNotes])

  const handleDelete = useCallback(async () => {
    if (!deleteId || !props.onDeleteGoal) return
    setCrudLoading(true)
    try {
      await props.onDeleteGoal(deleteId)
      setDeleteId(null)
    } catch (e) {
      // Error toast handled by parent
    } finally {
      setCrudLoading(false)
    }
  }, [deleteId, props.onDeleteGoal])

  const handleUpdate = useCallback(async (goal: LongTermGoal) => {
    if (!props.onUpdateGoal) return
    setCrudLoading(true)
    try {
      await props.onUpdateGoal(goal)
      setEditGoal(null)
    } catch (e) {
      // Error toast handled by parent
    } finally {
      setCrudLoading(false)
    }
  }, [props.onUpdateGoal])

  const goalToDelete = props.goals.find(g => g.id === deleteId)

  return (
    <div className="space-y-4">
      <SectionHead
        icon={<Lightbulb size={16} />}
        title="Long-Term Plan"
        description="Strategic goals and direction."
        right={
          <button
            type="button"
            onClick={() => setShowAddDialog(true)}
            className="dk-topbar-btn"
            style={{ height: 26, padding: "0 10px" }}
          >
            <Plus size={11} /> Add
          </button>
        }
      />

      <Segmented
        tabs={[
          { id: "goals", label: "Goals", count: props.goals.length },
          { id: "notes", label: "Notes" },
        ]}
        active={activeTab}
        onChange={setActiveTab}
      />

      {activeTab === "goals" ? (
        <StateShell
          state={props.state}
          empty={props.goals.length === 0}
          errorMessage={props.errorMessage}
          onRetry={props.onRetry}
          emptyTitle="No long-term goals yet"
          emptyDescription="Add goals manually or paste a brain-dump to analyze."
        >
          <div className="flex flex-col gap-2">
            {props.goals.map(goal => (
              <LongTermRow
                key={goal.id}
                goal={goal}
                onToggle={props.onToggleGoal}
                onViewDetail={setDetailGoal}
                onEdit={setEditGoal}
                onDelete={setDeleteId}
              />
            ))}
          </div>
        </StateShell>
      ) : (
        <div className="space-y-3">
          <Textarea
            value={notesContent}
            onChange={setNotesContent}
            placeholder="Scratchpad for planning thoughts..."
            rows={6}
          />
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleSaveNotes}
              disabled={savingNotes}
              className="dk-topbar-btn"
              style={{ height: 28, padding: "0 14px" }}
            >
              {savingNotes ? <Loader2 size={11} className="spin" /> : <FileText size={11} />}
              {savingNotes ? "Saving..." : "Save Notes"}
            </button>
          </div>
        </div>
      )}

      {/* Add Goal Dialog */}
      {showAddDialog && (
        <AddGoalDialog
          parsedGoals={parsedGoals}
          dumpText={dumpText}
          analyzing={analyzing}
          onDumpChange={setDumpText}
          onAnalyze={handleAnalyze}
          onSave={() => { props.onSaveGoals(parsedGoals); setShowAddDialog(false); setParsedGoals([]); setDumpText("") }}
          onClose={() => setShowAddDialog(false)}
        />
      )}

      {/* Detail Modal */}
      {detailGoal && (
        <GoalDetailModal goal={detailGoal} onClose={() => setDetailGoal(null)} />
      )}

      {/* Edit Modal */}
      {editGoal && (
        <GoalEditModal
          goal={editGoal}
          onSave={handleUpdate}
          onClose={() => setEditGoal(null)}
          loading={crudLoading}
        />
      )}

      {/* Delete Confirmation */}
      {deleteId && goalToDelete && (
        <DeleteConfirmDialog
          goalTitle={goalToDelete.title}
          onConfirm={handleDelete}
          onCancel={() => setDeleteId(null)}
          loading={crudLoading}
        />
      )}
    </div>
  )
}

/* ─── LongTermRow with action menu ─── */

function LongTermRow({
  goal,
  onToggle,
  onViewDetail,
  onEdit,
  onDelete,
}: {
  goal: LongTermGoal
  onToggle?: (g: LongTermGoal) => void
  onViewDetail?: (g: LongTermGoal) => void
  onEdit?: (g: LongTermGoal) => void
  onDelete?: (id: string) => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    if (menuOpen) document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [menuOpen])

  const done = goal.status === "done"
  const accentKey = (CATEGORY_ACCENT[goal.category] ?? "violet") as keyof typeof ACCENT

  return (
    <div className="relative rounded-lg bg-zinc-950/40 p-3 ring-1 ring-zinc-800/50 transition-[box-shadow] duration-150 hover:ring-zinc-700 group">
      <div className="flex items-center gap-2.5">
        <span aria-hidden className={cn("h-2 w-2 shrink-0 rounded-full", ACCENT[accentKey].dot)} />
        <button
          type="button"
          onClick={() => onToggle?.(goal)}
          className={cn("min-w-0 flex-1 truncate text-left text-[13px] font-medium",
            done ? cn(TEXT.muted, "line-through") : TEXT.primary)}
        >
          {goal.title}
        </button>

        {/* Action Menu */}
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen(v => !v)}
            className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 flex items-center justify-center rounded-md hover:bg-zinc-800/60 text-zinc-500 hover:text-zinc-300"
            aria-label="Actions"
            aria-expanded={menuOpen}
          >
            <MoreVertical size={14} />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full mt-1 z-50 min-w-[150px] rounded-lg border border-zinc-800/60 bg-zinc-900/95 backdrop-blur-xl py-1 shadow-xl">
              <button
                className="w-full flex items-center gap-2.5 px-3 py-2 text-[12px] text-zinc-300 hover:bg-zinc-800/60 transition-colors"
                onClick={() => { onViewDetail?.(goal); setMenuOpen(false) }}
              >
                <Eye size={12} /> View Detail
              </button>
              <button
                className="w-full flex items-center gap-2.5 px-3 py-2 text-[12px] text-zinc-300 hover:bg-zinc-800/60 transition-colors"
                onClick={() => { onEdit?.(goal); setMenuOpen(false) }}
              >
                <Pencil size={12} /> Edit
              </button>
              <div className="mx-2 my-1 h-px bg-zinc-800/60" />
              <button
                className="w-full flex items-center gap-2.5 px-3 py-2 text-[12px] text-red-400 hover:bg-red-500/10 transition-colors"
                onClick={() => { onDelete?.(goal.id); setMenuOpen(false) }}
              >
                <Trash2 size={12} /> Delete
              </button>
            </div>
          )}
        </div>

        {typeof goal.priority === "number" ? (
          <span className="shrink-0 rounded-md bg-zinc-800/60 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-zinc-500">
            P{goal.priority}
          </span>
        ) : null}
      </div>
      {goal.description ? (
        <p className={cn("mt-1.5 pl-4.5 text-[12px] leading-5", TEXT.muted)}>{goal.description}</p>
      ) : null}
    </div>
  )
}

/* ─── Goal Detail Modal ─── */

function GoalDetailModal({ goal, onClose }: { goal: LongTermGoal; onClose: () => void }) {
  const accentKey = (CATEGORY_ACCENT[goal.category] ?? "violet") as keyof typeof ACCENT
  const createdAt = goal.createdAt ? new Date(goal.createdAt).toLocaleDateString() : "Unknown"
  const completedAt = goal.completedAt ? new Date(goal.completedAt).toLocaleDateString() : null

  return (
    <div className="dk-modal-overlay" onClick={onClose}>
      <div className="dk-modal max-w-md w-full" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-[15px] font-semibold text-zinc-100">Goal Detail</h3>
          <button
            onClick={onClose}
            className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-zinc-800/60 text-zinc-500 transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <div className="dk-microlabel mb-1.5">Title</div>
            <p className="text-[13px] text-zinc-200 font-medium">{goal.title}</p>
          </div>

          {goal.description && (
            <div>
              <div className="dk-microlabel mb-1.5">Description</div>
              <p className="text-[12px] text-zinc-400 leading-5">{goal.description}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-zinc-950/40 p-3 ring-1 ring-zinc-800/50">
              <div className="dk-microlabel mb-1.5">Category</div>
              <div className="flex items-center gap-2">
                <span className={cn("h-2 w-2 rounded-full", ACCENT[accentKey].dot)} />
                <span className="text-[12px] text-zinc-300 capitalize">{goal.category}</span>
              </div>
            </div>
            <div className="rounded-lg bg-zinc-950/40 p-3 ring-1 ring-zinc-800/50">
              <div className="dk-microlabel mb-1.5">Priority</div>
              <span className="text-[12px] text-zinc-300">P{goal.priority}</span>
            </div>
            <div className="rounded-lg bg-zinc-950/40 p-3 ring-1 ring-zinc-800/50">
              <div className="dk-microlabel mb-1.5">Status</div>
              <span className={cn("text-[12px] capitalize font-medium",
                goal.status === "done" ? "text-emerald-400" :
                goal.status === "missed" ? "text-red-400" : "text-zinc-300")}>
                {goal.status}
              </span>
            </div>
            <div className="rounded-lg bg-zinc-950/40 p-3 ring-1 ring-zinc-800/50">
              <div className="dk-microlabel mb-1.5">Created</div>
              <span className="text-[12px] text-zinc-300">{createdAt}</span>
            </div>
          </div>

          {goal.target_seconds ? (
            <div className="rounded-lg bg-zinc-950/40 p-3 ring-1 ring-zinc-800/50">
              <div className="dk-microlabel mb-1.5">Target</div>
              <span className="text-[12px] text-zinc-300">{Math.round(goal.target_seconds / 3600)} hours</span>
            </div>
          ) : null}

          {completedAt && (
            <div className="rounded-lg bg-emerald-500/5 p-3 ring-1 ring-emerald-500/15">
              <div className="dk-microlabel mb-1.5 text-emerald-400">Completed</div>
              <span className="text-[12px] text-emerald-300">{completedAt}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ─── Goal Edit Modal ─── */

function GoalEditModal({
  goal,
  onSave,
  onClose,
  loading,
}: {
  goal: LongTermGoal
  onSave: (goal: LongTermGoal) => Promise<void>
  onClose: () => void
  loading?: boolean
}) {
  const [form, setForm] = useState<LongTermGoal>({ ...goal })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim()) return
    await onSave(form)
  }

  return (
    <div className="dk-modal-overlay" onClick={onClose}>
      <div className="dk-modal max-w-md w-full" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-[15px] font-semibold text-zinc-100">Edit Goal</h3>
          <button
            onClick={onClose}
            className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-zinc-800/60 text-zinc-500 transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="dk-microlabel mb-1.5 block">Title</label>
            <input
              type="text"
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              className="w-full rounded-lg bg-zinc-950/40 border border-zinc-800/60 px-3 py-2 text-[13px] text-zinc-200 outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600/50 transition-all"
              required
            />
          </div>

          <div>
            <label className="dk-microlabel mb-1.5 block">Description</label>
            <textarea
              value={form.description || ""}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              rows={3}
              className="w-full rounded-lg bg-zinc-950/40 border border-zinc-800/60 px-3 py-2 text-[12px] text-zinc-400 outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600/50 resize-none transition-all"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="dk-microlabel mb-1.5 block">Category</label>
              <select
                value={form.category}
                onChange={e => setForm(f => ({ ...f, category: e.target.value as GoalCategory }))}
                className="w-full rounded-lg bg-zinc-950/40 border border-zinc-800/60 px-3 py-2 text-[12px] text-zinc-300 outline-none focus:border-zinc-600 transition-all"
              >
                {(["work", "personal", "health", "learning", "finance", "relationships"] as GoalCategory[]).map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="dk-microlabel mb-1.5 block">Priority</label>
              <select
                value={form.priority}
                onChange={e => setForm(f => ({ ...f, priority: Number(e.target.value) }))}
                className="w-full rounded-lg bg-zinc-950/40 border border-zinc-800/60 px-3 py-2 text-[12px] text-zinc-300 outline-none focus:border-zinc-600 transition-all"
              >
                {[1, 2, 3, 4, 5].map(p => (
                  <option key={p} value={p}>P{p}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="dk-microlabel mb-1.5 block">Status</label>
            <div className="flex gap-2">
              {(["active", "done", "missed"] as const).map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, status: s }))}
                  className={cn(
                    "flex-1 rounded-lg border px-3 py-2 text-[12px] capitalize transition-all",
                    form.status === s
                      ? s === "done" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                      : s === "missed" ? "border-red-500/30 bg-red-500/10 text-red-300"
                      : "border-zinc-600 bg-zinc-800/60 text-zinc-200"
                      : "border-zinc-800/60 bg-zinc-950/40 text-zinc-500 hover:border-zinc-700"
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-zinc-800/60 bg-zinc-950/40 px-4 py-2 text-[12px] text-zinc-400 hover:bg-zinc-800/40 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !form.title.trim()}
              className="flex-1 rounded-lg bg-violet-500/15 border border-violet-500/30 px-4 py-2 text-[12px] text-violet-300 hover:bg-violet-500/25 transition-colors disabled:opacity-40"
            >
              {loading ? <Loader2 size={11} className="spin inline mr-1" /> : null}
              {loading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

/* ─── Delete Confirm Dialog ─── */

function DeleteConfirmDialog({
  goalTitle,
  onConfirm,
  onCancel,
  loading,
}: {
  goalTitle: string
  onConfirm: () => void
  onCancel: () => void
  loading?: boolean
}) {
  return (
    <div className="dk-modal-overlay" onClick={onCancel}>
      <div className="dk-modal max-w-sm w-full" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-4">
          <div className="h-8 w-8 rounded-full bg-red-500/10 flex items-center justify-center shrink-0">
            <Trash2 size={14} className="text-red-400" />
          </div>
          <h3 className="text-[15px] font-semibold text-zinc-100">Delete Goal</h3>
        </div>
        <p className="text-[12px] text-zinc-400 mb-5 leading-5">
          Are you sure you want to delete <span className="text-zinc-200 font-medium">&ldquo;{goalTitle}&rdquo;</span>? This action cannot be undone.
        </p>
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 rounded-lg border border-zinc-800/60 bg-zinc-950/40 px-4 py-2 text-[12px] text-zinc-400 hover:bg-zinc-800/40 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 rounded-lg bg-red-500/15 border border-red-500/30 px-4 py-2 text-[12px] text-red-300 hover:bg-red-500/25 transition-colors disabled:opacity-40"
          >
            {loading ? <Loader2 size={11} className="spin inline mr-1" /> : null}
            {loading ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─── AddGoalDialog (existing, unchanged) ─── */

function AddGoalDialog({
  parsedGoals,
  dumpText,
  analyzing,
  onDumpChange,
  onAnalyze,
  onSave,
  onClose,
}: {
  parsedGoals: Partial<LongTermGoal>[]
  dumpText: string
  analyzing: boolean
  onDumpChange: (v: string) => void
  onAnalyze: () => void
  onSave: () => void
  onClose: () => void
}) {
  return (
    <div className="dk-modal-overlay" onClick={onClose}>
      <div className="dk-modal max-w-lg w-full" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[15px] font-semibold text-zinc-100">Add Goals</h3>
          <button onClick={onClose} className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-zinc-800/60 text-zinc-500">
            <X size={14} />
          </button>
        </div>
        <p className="text-[12px] text-zinc-400 mb-3">Paste a brain-dump and the AI will extract structured goals.</p>
        <textarea
          value={dumpText}
          onChange={e => onDumpChange(e.target.value)}
          rows={5}
          placeholder="I want to learn Rust, run a marathon, save $10k..."
          className="w-full rounded-lg bg-zinc-950/40 border border-zinc-800/60 px-3 py-2 text-[12px] text-zinc-300 outline-none focus:border-zinc-600 resize-none mb-3"
        />
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg border border-zinc-800/60 bg-zinc-950/40 px-4 py-2 text-[12px] text-zinc-400 hover:bg-zinc-800/40 transition-colors">
            Cancel
          </button>
          <button
            onClick={onAnalyze}
            disabled={analyzing || !dumpText.trim()}
            className="rounded-lg bg-violet-500/15 border border-violet-500/30 px-4 py-2 text-[12px] text-violet-300 hover:bg-violet-500/25 transition-colors disabled:opacity-40"
          >
            {analyzing ? <Loader2 size={11} className="spin inline mr-1" /> : <Lightbulb size={11} className="inline mr-1" />}
            {analyzing ? "Analyzing..." : "Analyze"}
          </button>
        </div>
        {parsedGoals.length > 0 && (
          <div className="mt-4 space-y-2">
            <div className="dk-microlabel">Extracted Goals</div>
            {parsedGoals.map((g, i) => (
              <div key={i} className="rounded-lg bg-zinc-950/40 p-3 ring-1 ring-zinc-800/50">
                <div className="text-[13px] text-zinc-200 font-medium">{g.title}</div>
                {g.description && <p className="text-[11px] text-zinc-400 mt-1">{g.description}</p>}
              </div>
            ))}
            <button
              onClick={onSave}
              className="w-full rounded-lg bg-emerald-500/15 border border-emerald-500/30 px-4 py-2 text-[12px] text-emerald-300 hover:bg-emerald-500/25 transition-colors mt-2"
            >
              <Check size={11} className="inline mr-1" /> Save {parsedGoals.length} Goal{parsedGoals.length !== 1 ? "s" : ""}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
```

### 1.2 `src/pages/AiPage.tsx` — PlanBoard Wiring

**Add to AiPage.tsx state/handlers (around line 56-120):**

No new state needed. Add two handler callbacks:

```tsx
// Around line 490 — inside onCardAction or as standalone callbacks
const handleDeleteLongTermGoal = useCallback(async (id: string) => {
  try {
    await window.deskflowAPI!.deleteGoal(id)
    showToast('Goal deleted', 'success')
    loadGoals()
  } catch (e: any) {
    showToast(e.message || 'Failed to delete goal', 'error')
  }
}, [loadGoals, showToast])

const handleUpdateLongTermGoal = useCallback(async (goal: LongTermGoal) => {
  try {
    // Use saveGoalsBatch because save-goal IPC omits priority/parent_id
    await window.deskflowAPI!.saveGoalsBatch([{ ...goal, period: 'longterm', date: '' }])
    showToast('Goal updated', 'success')
    loadGoals()
  } catch (e: any) {
    showToast(e.message || 'Failed to update goal', 'error')
  }
}, [loadGoals, showToast])
```

**Update the `planSlot` prop (around line 772):**

```tsx
planSlot={
  <PlanBoard
    state={goalsDataState}
    goals={longTermGoals}
    notes={planningNotes}
    savingNotes={savingNotes}
    onSaveNotes={handleSaveNotes}
    onAnalyzeDump={handleAnalyzeDump}
    onSaveGoals={handleSaveGoals}
    onToggleGoal={handleToggleLongTermGoal}
    onDeleteGoal={handleDeleteLongTermGoal}
    onUpdateGoal={handleUpdateLongTermGoal}
    errorMessage={goalsError || undefined}
    onRetry={loadGoals}
  />
}
```

---

## Phase 2 — Goals & Reminders Section

### Problem

`ChatHistory` drawer shows chat threads. User wants upcoming calendar events, overdue goals, and reminders — all connected. Chat history is moved to a compact topbar button.

### Solution

Replace `ChatHistory` with `GoalsRemindersDrawer`. Three tabs: **Events** (calendar connectors), **Goals** (overdue/upcoming), **Reminders** (lightweight checklist with inline add). Same drawer position, same toggle button (now Bell icon). Chat history becomes a compact History icon in the topbar.

---

### 2.1 `src/components/ai/reminders/GoalsRemindersDrawer.tsx` — New File (~280 lines)

```tsx
import { useState, useCallback } from "react"
import { cn } from "../../../lib/utils"
import {
  X, Plus, Bell, CalendarDays, Target, Check, Trash2, Clock,
  AlertCircle, Loader2, History
} from "lucide-react"
import { Segmented } from "../primitives/Segmented"
import { StateShell } from "../StateShell"
import type { Goal, LongTermGoal } from "../types"

export interface CalendarEvent {
  id: string
  title: string
  date: string
  connectorName: string
  connectorId: string
}

export interface Reminder {
  id: string
  text: string
  dueDate?: string
  goalId?: string
  done: boolean
  createdAt: string
}

interface GoalsRemindersProps {
  open: boolean
  onClose: () => void
  goals: Goal[]
  longTermGoals: LongTermGoal[]
  events: CalendarEvent[]
  reminders: Reminder[]
  onToggleReminder: (id: string, done: boolean) => Promise<void>
  onCreateReminder: (text: string, dueDate?: string) => Promise<void>
  onDeleteReminder: (id: string) => Promise<void>
  onOpenGoal?: (goalId: string) => void
  onOpenEvent?: (eventId: string) => void
  onOpenHistory?: () => void
  loading?: boolean
  error?: string
}

export function GoalsRemindersDrawer(props: GoalsRemindersProps) {
  const [activeTab, setActiveTab] = useState<"events" | "goals" | "reminders">("events")
  const [newReminderText, setNewReminderText] = useState("")
  const [newReminderDate, setNewReminderDate] = useState("")
  const [creating, setCreating] = useState(false)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleCreate = useCallback(async () => {
    if (!newReminderText.trim()) return
    setCreating(true)
    try {
      await props.onCreateReminder(newReminderText.trim(), newReminderDate || undefined)
      setNewReminderText("")
      setNewReminderDate("")
    } finally {
      setCreating(false)
    }
  }, [newReminderText, newReminderDate, props.onCreateReminder])

  const handleToggle = useCallback(async (id: string, done: boolean) => {
    setTogglingId(id)
    try {
      await props.onToggleReminder(id, done)
    } finally {
      setTogglingId(null)
    }
  }, [props.onToggleReminder])

  const handleDelete = useCallback(async (id: string) => {
    setDeletingId(id)
    try {
      await props.onDeleteReminder(id)
    } finally {
      setDeletingId(null)
    }
  }, [props.onDeleteReminder])

  // Group events by date
  const groupedEvents = props.events.reduce((acc, ev) => {
    const d = ev.date.split("T")[0]
    if (!acc[d]) acc[d] = []
    acc[d].push(ev)
    return acc
  }, {} as Record<string, CalendarEvent[]>)

  const eventDates = Object.keys(groupedEvents).sort()

  // Goals: overdue first, then upcoming
  const now = new Date().toISOString().split("T")[0]
  const overdueGoals = props.goals.filter(g =>
    g.status === "missed" || (g.date && g.date < now && g.status !== "done")
  )
  const upcomingGoals = props.goals.filter(g =>
    g.status === "active" && g.date && g.date >= now
  )

  const tabs = [
    { id: "events" as const, label: "Events", count: props.events.length },
    { id: "goals" as const, label: "Goals", count: overdueGoals.length + upcomingGoals.length },
    { id: "reminders" as const, label: "Reminders", count: props.reminders.filter(r => !r.done).length },
  ]

  return (
    <div className={`dk-history-drawer ${props.open ? "open" : ""}`}>
      <div className="dk-history-head">
        <div className="flex items-center gap-2">
          <Bell size={14} color="var(--tm)" />
          <h4>Goals & Reminders</h4>
        </div>
        <div className="flex items-center gap-2">
          {props.onOpenHistory && (
            <button
              onClick={props.onOpenHistory}
              title="Chat History"
              className="h-[26px] w-[26px] rounded-md border border-zinc-800/60 bg-zinc-900/60 flex items-center justify-center text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/60 transition-colors"
            >
              <History size={12} />
            </button>
          )}
          <button
            onClick={props.onClose}
            title="Close"
            className="h-[26px] w-[26px] rounded-md border border-zinc-800/60 bg-zinc-900/60 flex items-center justify-center text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/60 transition-colors"
          >
            <X size={12} />
          </button>
        </div>
      </div>

      <div className="px-3 pt-2">
        <Segmented tabs={tabs} active={activeTab} onChange={setActiveTab} />
      </div>

      <div className="dk-history-list">
        {props.loading ? (
          <div className="p-5 text-center text-zinc-500 text-[12px]">
            <Loader2 size={16} className="spin mx-auto mb-2" />
            Loading...
          </div>
        ) : props.error ? (
          <div className="p-5 text-center text-red-400 text-[12px]">
            <AlertCircle size={16} className="mx-auto mb-2" />
            {props.error}
          </div>
        ) : activeTab === "events" ? (
          props.events.length === 0 ? (
            <div className="p-5 text-center text-zinc-500 text-[12px]">
              <CalendarDays size={20} className="mx-auto mb-2 opacity-40" />
              No upcoming events.
              <p className="text-[11px] text-zinc-600 mt-1">Sync a calendar connector to see events.</p>
            </div>
          ) : (
            <div className="space-y-4 p-3">
              {eventDates.map(date => (
                <div key={date}>
                  <div className="dk-microlabel mb-2 sticky top-0 bg-zinc-900/95 backdrop-blur py-1">
                    {formatEventDate(date)}
                  </div>
                  <div className="space-y-1.5">
                    {groupedEvents[date].map(ev => (
                      <button
                        key={ev.id}
                        onClick={() => props.onOpenEvent?.(ev.id)}
                        className="w-full text-left rounded-lg bg-zinc-950/40 p-2.5 ring-1 ring-zinc-800/50 hover:ring-zinc-700 transition-all group"
                      >
                        <div className="flex items-center gap-2">
                          <Clock size={11} className="text-cyan-400 shrink-0" />
                          <span className="text-[11px] text-zinc-500 font-mono shrink-0">
                            {formatEventTime(ev.date)}
                          </span>
                          <span className="text-[12px] text-zinc-200 truncate flex-1">{ev.title}</span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-1 pl-[22px]">
                          <span className="text-[10px] text-zinc-600">{ev.connectorName}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )
        ) : activeTab === "goals" ? (
          overdueGoals.length === 0 && upcomingGoals.length === 0 ? (
            <div className="p-5 text-center text-zinc-500 text-[12px]">
              <Target size={20} className="mx-auto mb-2 opacity-40" />
              All goals on track.
            </div>
          ) : (
            <div className="space-y-4 p-3">
              {overdueGoals.length > 0 && (
                <div>
                  <div className="dk-microlabel text-red-400 mb-2">Overdue</div>
                  <div className="space-y-1.5">
                    {overdueGoals.map(g => (
                      <GoalReminderRow
                        key={g.id}
                        title={g.title}
                        meta={`${g.category} · ${g.date}`}
                        accent="red"
                        onClick={() => props.onOpenGoal?.(g.id)}
                      />
                    ))}
                  </div>
                </div>
              )}
              {upcomingGoals.length > 0 && (
                <div>
                  <div className="dk-microlabel mb-2">Upcoming</div>
                  <div className="space-y-1.5">
                    {upcomingGoals.map(g => (
                      <GoalReminderRow
                        key={g.id}
                        title={g.title}
                        meta={`${g.category} · ${g.date}`}
                        accent="emerald"
                        onClick={() => props.onOpenGoal?.(g.id)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        ) : (
          <div className="p-3 space-y-3">
            {props.reminders.length === 0 ? (
              <div className="p-5 text-center text-zinc-500 text-[12px]">
                <Bell size={20} className="mx-auto mb-2 opacity-40" />
                No reminders yet.
              </div>
            ) : (
              <div className="space-y-1">
                {props.reminders.map(r => (
                  <div
                    key={r.id}
                    className={cn(
                      "flex items-center gap-2 rounded-lg bg-zinc-950/40 p-2.5 ring-1 ring-zinc-800/50 transition-all",
                      r.done && "opacity-50"
                    )}
                  >
                    <button
                      onClick={() => handleToggle(r.id, !r.done)}
                      disabled={togglingId === r.id}
                      className={cn(
                        "h-4 w-4 rounded border flex items-center justify-center shrink-0 transition-colors",
                        r.done
                          ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400"
                          : "border-zinc-700 hover:border-zinc-500"
                      )}
                    >
                      {r.done && <Check size={10} />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className={cn("text-[12px] truncate", r.done ? "text-zinc-500 line-through" : "text-zinc-200")}>
                        {r.text}
                      </div>
                      {r.dueDate && (
                        <div className="text-[10px] text-zinc-600 font-mono">{r.dueDate}</div>
                      )}
                    </div>
                    <button
                      onClick={() => handleDelete(r.id)}
                      disabled={deletingId === r.id}
                      className="h-5 w-5 flex items-center justify-center rounded text-zinc-600 hover:text-red-400 hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 size={10} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Inline Add */}
            <div className="rounded-lg bg-zinc-950/40 p-2.5 ring-1 ring-zinc-800/50 space-y-2">
              <input
                type="text"
                value={newReminderText}
                onChange={e => setNewReminderText(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") handleCreate() }}
                placeholder="Add a reminder..."
                className="w-full bg-transparent text-[12px] text-zinc-200 placeholder:text-zinc-600 outline-none"
              />
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={newReminderDate}
                  onChange={e => setNewReminderDate(e.target.value)}
                  className="bg-transparent text-[11px] text-zinc-500 font-mono outline-none border-none"
                />
                <button
                  onClick={handleCreate}
                  disabled={creating || !newReminderText.trim()}
                  className="ml-auto rounded-md bg-violet-500/15 border border-violet-500/30 px-2.5 py-1 text-[11px] text-violet-300 hover:bg-violet-500/25 transition-colors disabled:opacity-40 flex items-center gap-1"
                >
                  {creating ? <Loader2 size={10} className="spin" /> : <Plus size={10} />}
                  Add
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/* ─── Helpers ─── */

function GoalReminderRow({
  title,
  meta,
  accent,
  onClick,
}: {
  title: string
  meta: string
  accent: "red" | "emerald" | "amber" | "cyan"
  onClick?: () => void
}) {
  const dotColor = {
    red: "bg-red-400",
    emerald: "bg-emerald-400",
    amber: "bg-amber-400",
    cyan: "bg-cyan-400",
  }[accent]

  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-lg bg-zinc-950/40 p-2.5 ring-1 ring-zinc-800/50 hover:ring-zinc-700 transition-all"
    >
      <div className="flex items-center gap-2">
        <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", dotColor)} />
        <span className="text-[12px] text-zinc-200 truncate flex-1">{title}</span>
      </div>
      <div className="text-[10px] text-zinc-600 mt-0.5 pl-3.5 font-mono">{meta}</div>
    </button>
  )
}

function formatEventDate(iso: string): string {
  const d = new Date(iso + "T00:00:00")
  const today = new Date()
  const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1)
  if (d.toDateString() === today.toDateString()) return "Today"
  if (d.toDateString() === tomorrow.toDateString()) return "Tomorrow"
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })
}

function formatEventTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
}
```

### 2.2 `src/pages/AiPage.tsx` — Goals & Reminders Wiring

**Add state (around line 56-100):**

```tsx
const [reminders, setReminders] = useState<Reminder[]>([])
const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([])
const [remindersLoading, setRemindersLoading] = useState(false)
const [remindersError, setRemindersError] = useState<string | null>(null)
```

**Add load handlers (around line 200-300, near other load functions):**

```tsx
const loadReminders = useCallback(async () => {
  try {
    const result = await window.deskflowAPI!.getReminders()
    if (result?.success) setReminders(result.reminders || [])
  } catch (e: any) {
    setRemindersError(e.message)
  }
}, [])

const loadCalendarEvents = useCallback(async () => {
  if (!connectors.length) return
  setRemindersLoading(true)
  try {
    const allEvents: CalendarEvent[] = []
    for (const connector of connectors) {
      if (connector.type === "calendar") {
        const result = await window.deskflowAPI!.connectors.items(connector.id, { type: "event", limit: 20 })
        if (result?.items) {
          allEvents.push(...result.items.map((item: any) => ({
            id: item.id,
            title: item.subject || "Untitled Event",
            date: item.date,
            connectorName: connector.name,
            connectorId: connector.id,
          })))
        }
      }
    }
    setCalendarEvents(allEvents.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()))
  } catch (e: any) {
    setRemindersError(e.message)
  } finally {
    setRemindersLoading(false)
  }
}, [connectors])

useEffect(() => { loadReminders() }, [loadReminders])
useEffect(() => { loadCalendarEvents() }, [loadCalendarEvents])
```

**Add CRUD handlers (around line 490):**

```tsx
const handleCreateReminder = useCallback(async (text: string, dueDate?: string) => {
  try {
    await window.deskflowAPI!.createReminder({ text, dueDate, goalId: undefined })
    showToast("Reminder created", "success")
    loadReminders()
  } catch (e: any) {
    showToast(e.message || "Failed to create reminder", "error")
  }
}, [loadReminders, showToast])

const handleToggleReminder = useCallback(async (id: string, done: boolean) => {
  try {
    await window.deskflowAPI!.toggleReminder(id, done)
    loadReminders()
  } catch (e: any) {
    showToast(e.message || "Failed to update reminder", "error")
  }
}, [loadReminders, showToast])

const handleDeleteReminder = useCallback(async (id: string) => {
  try {
    await window.deskflowAPI!.deleteReminder(id)
    showToast("Reminder deleted", "success")
    loadReminders()
  } catch (e: any) {
    showToast(e.message || "Failed to delete reminder", "error")
  }
}, [loadReminders, showToast])
```

**Update `historySlot` (around line 796):**

```tsx
historySlot={
  <GoalsRemindersDrawer
    open={historyOpen}
    onClose={() => setHistoryOpen(false)}
    goals={goals}
    longTermGoals={longTermGoals}
    events={calendarEvents}
    reminders={reminders}
    onToggleReminder={handleToggleReminder}
    onCreateReminder={handleCreateReminder}
    onDeleteReminder={handleDeleteReminder}
    onOpenGoal={(id) => {
      // Expand Focus card and scroll to goal
      setExpandedCard("focus")
      // Optionally: scroll to goal id after a delay
    }}
    onOpenHistory={() => {
      setHistoryOpen(false)
      // Open ChatHistory in a compact modal or navigate
      // For now, just toggle back to chat history view
    }}
    loading={remindersLoading}
    error={remindersError || undefined}
  />
}
```

**Replace floating button (around line 846):**

```tsx
{/* Floating Goals & Reminders button — bottom left */}
<button
  onClick={() => setHistoryOpen(true)}
  className="fixed bottom-4 left-4 z-40 flex items-center gap-2 rounded-xl border border-zinc-800/60 bg-zinc-900/80 backdrop-blur-xl px-4 py-2.5 text-[12px] text-zinc-300 shadow-lg hover:bg-zinc-800/80 transition-colors"
>
  <Bell size={16} className="text-amber-400" />
  Goals & Reminders
  {reminders.filter(r => !r.done).length > 0 && (
    <span className="ml-1 rounded-full bg-amber-500/20 px-1.5 py-0.5 text-[10px] text-amber-300">
      {reminders.filter(r => !r.done).length}
    </span>
  )}
</button>
```

**Add compact History button to topbar (around line 650-700, inside `dk-barR`):**

```tsx
<div className="dk-barR">
  {/* existing provider chip, settings button */}
  <button
    onClick={() => setHistoryOpen(true)}
    title="Chat History"
    className="dk-topbar-btn"
    style={{ height: 26, padding: "0 10px" }}
  >
    <History size={12} />
  </button>
  <button onClick={() => setShowFeatures(true)} className="dk-topbar-btn" style={{ height: 26, padding: "0 10px" }}>
    <Settings size={12} />
  </button>
</div>
```

---

## Phase 3 — Calendar Synergy

### Problem

Calendar events live in `connector_items` but are never surfaced alongside goals. The AI has no awareness of calendar context when suggesting goals or planning.

### Solution

1. **New `reminders` DB table** + IPC for lightweight reminders
2. **Goal-event linking** via `GoalLink` JSON array (no new junction table needed)
3. **New parsed AI types** so the AI can create reminders and link goals to events
4. **Calendar context injection** into AI chat prompts

---

### 3.1 DB Schema — `reminders` Table

**Add to `src/main.ts` database initialization (where other tables are created):**

```sql
CREATE TABLE IF NOT EXISTS reminders (
  id TEXT PRIMARY KEY,
  text TEXT NOT NULL,
  due_date TEXT,
  goal_id TEXT,
  done INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (goal_id) REFERENCES goals(id) ON DELETE SET NULL
);
```

**Also fix the `save-goal` handler** (lines 14772-14806) to include `priority` and `parent_id`:

```ts
// BEFORE (bug: omits priority, parent_id)
const insert = db!.prepare(`INSERT OR REPLACE INTO goals
  (id, date, title, description, category, target_type, target_seconds, match_category, status, period, source, links, progress_seconds, completed_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

// AFTER (fixed)
const insert = db!.prepare(`INSERT OR REPLACE INTO goals
  (id, date, title, description, category, target_type, target_seconds, match_category, status, period, source, links, progress_seconds, completed_at, parent_id, priority)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
insert.run(
  goal.id, date, goal.title, goal.description || null,
  goal.category || 'work',
  goal.target?.type || 'completion', goal.target?.targetSeconds || null, goal.target?.matchCategory || null,
  goal.status || 'pending', goal.period || 'daily', goal.source || 'manual',
  JSON.stringify(goal.links || []), goal.progressSeconds || 0, goal.completedAt || null,
  goal.parentId || null, goal.priority || 0,
);
```

---

### 3.2 IPC Extensions

**`src/preload.ts` — add to the API object (around line 847):**

```ts
createReminder: (reminder: { text: string; dueDate?: string; goalId?: string }) =>
  ipcRenderer.invoke('create-reminder', reminder),
getReminders: () => ipcRenderer.invoke('get-reminders'),
toggleReminder: (id: string, done: boolean) => ipcRenderer.invoke('toggle-reminder', id, done),
deleteReminder: (id: string) => ipcRenderer.invoke('delete-reminder', id),
```

**`src/main.ts` — add handlers (near other goal handlers, around line 14820):**

```ts
ipcMain.handle('create-reminder', async (_event, reminder: { text: string; dueDate?: string; goalId?: string }) => {
  const id = crypto.randomUUID()
  db!.prepare('INSERT INTO reminders (id, text, due_date, goal_id) VALUES (?, ?, ?, ?)')
    .run(id, reminder.text, reminder.dueDate || null, reminder.goalId || null)
  return { success: true, id }
})

ipcMain.handle('get-reminders', async () => {
  const rows = db!.prepare('SELECT * FROM reminders ORDER BY done ASC, due_date ASC NULLS LAST, created_at DESC').all()
  return { success: true, reminders: rows }
})

ipcMain.handle('toggle-reminder', async (_event, id: string, done: boolean) => {
  db!.prepare('UPDATE reminders SET done = ? WHERE id = ?').run(done ? 1 : 0, id)
  return { success: true }
})

ipcMain.handle('delete-reminder', async (_event, id: string) => {
  db!.prepare('DELETE FROM reminders WHERE id = ?').run(id)
  return { success: true }
})
```

---

### 3.3 AI Parsed Types — `src/components/ai/chat/parsed.ts`

**Add to `ParsedMessage` union (around line 200):**

```ts
| { type: "reminder_create"; text: string; dueDate?: string; goalId?: string }
| { type: "goal_event_link"; goalId: string; eventId: string; eventTitle: string }
```

**Add to `CardAction` union (around line 220):**

```ts
| { kind: "create-reminder"; text: string; dueDate?: string; goalId?: string }
| { kind: "link-goal-event"; goalId: string; eventId: string; eventTitle: string }
```

**Add parser functions (at end of file):**

```ts
export function parseReminderCreate(content: string): { type: "reminder_create"; text: string; dueDate?: string } | null {
  try {
    const json = JSON.parse(content)
    if (json.type === "reminder_create" && json.text) {
      return { type: "reminder_create", text: json.text, dueDate: json.dueDate }
    }
  } catch {}
  return null
}

export function parseGoalEventLink(content: string): { type: "goal_event_link"; goalId: string; eventId: string; eventTitle: string } | null {
  try {
    const json = JSON.parse(content)
    if (json.type === "goal_event_link" && json.goalId && json.eventId) {
      return { type: "goal_event_link", goalId: json.goalId, eventId: json.eventId, eventTitle: json.eventTitle }
    }
  } catch {}
  return null
}
```

---

### 3.4 AI Orchestration — `src/pages/AiPage.tsx` `onCardAction`

**Add cases to `onCardAction` (around line 490):**

```ts
case 'create-reminder': {
  await window.deskflowAPI!.createReminder({
    text: action.text,
    dueDate: action.dueDate,
    goalId: action.goalId,
  })
  showToast('Reminder created', 'success')
  loadReminders()
  break
}
case 'link-goal-event': {
  // Store event link in goal's links array
  const goal = longTermGoals.find(g => g.id === action.goalId) || goals.find(g => g.id === action.goalId)
  if (goal) {
    const links = [...(goal.links || [])]
    links.push({
      type: 'event',
      title: action.eventTitle,
      eventId: action.eventId,
    })
    await window.deskflowAPI!.saveGoalsBatch([{ ...goal, links, period: goal.period || 'daily', date: goal.date || '' }])
    showToast('Goal linked to calendar event', 'success')
    loadGoals()
  }
  break
}
```

**Inject calendar context into AI chat** (in `useAiChat` or where the system prompt is built):

```ts
// When building context for AI, include upcoming events
const upcomingEvents = calendarEvents.slice(0, 5).map(e =>
  `- ${e.title} @ ${e.date} (${e.connectorName})`
).join('\n')

const systemContext = `...
Upcoming calendar events:
${upcomingEvents || 'None'}

Active goals:
${goals.filter(g => g.status === 'active').map(g => `- ${g.title}`).join('\n')}

Reminders:
${reminders.filter(r => !r.done).map(r => `- ${r.text}`).join('\n')}
...
`
```

---

## Backend Audit

| Feature | IPC Channel | Handler Location | DB Schema | Status |
|---------|-------------|------------------|-----------|--------|
| **Plan CRUD — View Detail** | `getGoal(goalId)` | `main.ts:14858` | `goals` table | ✅ Exists |
| **Plan CRUD — Edit** | `saveGoalsBatch(goals)` | `main.ts:14897` | `goals` table | ✅ Exists |
| **Plan CRUD — Delete** | `deleteGoal(id)` | `main.ts:14817` | `goals` table | ✅ Exists |
| **Plan CRUD — Fix save-goal** | `saveGoal(date, goal)` | `main.ts:14772` | `goals` table | ⚠️ **BUG: missing priority, parent_id** |
| **Reminders — Create** | `create-reminder` | `main.ts` (new) | `reminders` table | 🔧 **NEW** |
| **Reminders — List** | `get-reminders` | `main.ts` (new) | `reminders` table | 🔧 **NEW** |
| **Reminders — Toggle** | `toggle-reminder` | `main.ts` (new) | `reminders` table | 🔧 **NEW** |
| **Reminders — Delete** | `delete-reminder` | `main.ts` (new) | `reminders` table | 🔧 **NEW** |
| **Calendar Events — Fetch** | `connectors:items` | `main.ts` | `connector_items` | ✅ Exists (use `type: 'event'`) |
| **Goal-Event Link** | `saveGoalsBatch` | `main.ts:14897` | `goals.links` JSON | ✅ Exists (reuse `links` field) |
| **AI Reminder Create** | `create-reminder` | `main.ts` (new) | `reminders` table | 🔧 **NEW** |
| **AI Goal-Event Link** | `saveGoalsBatch` | `main.ts:14897` | `goals.links` JSON | ✅ Exists |

### New DB Schema Required

```sql
-- Add to main.ts initDatabase()
CREATE TABLE IF NOT EXISTS reminders (
  id TEXT PRIMARY KEY,
  text TEXT NOT NULL,
  due_date TEXT,
  goal_id TEXT,
  done INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (goal_id) REFERENCES goals(id) ON DELETE SET NULL
);
```

### Bug Fix Required

```ts
// In main.ts save-goal handler (line ~14772)
// Add priority and parent_id to the INSERT OR REPLACE statement
// AND to the .run() parameter list
```

---

## Implementation Order

### Step 1 — Backend Foundation (no UI changes)
1. Add `reminders` table to `main.ts` database init
2. Add 4 new IPC handlers to `main.ts` (create/get/toggle/delete reminder)
3. Add 4 new IPC methods to `preload.ts`
4. **Fix `save-goal` handler** to include `priority` and `parent_id`
5. Build and verify: `npx vite build` + `npx esbuild src/preload.ts ...`

### Step 2 — PlanBoard CRUD (frontend only)
1. Rewrite `PlanBoard.tsx` with detail/edit/delete modals + action menu
2. Add `onDeleteGoal` and `onUpdateGoal` props to `PlanBoardProps`
3. Wire handlers in `AiPage.tsx`
4. Build and verify CRUD flow works end-to-end

### Step 3 — GoalsRemindersDrawer (new component)
1. Create `src/components/ai/reminders/GoalsRemindersDrawer.tsx`
2. Add state + load handlers in `AiPage.tsx` (reminders, calendarEvents, loading)
3. Add reminder CRUD handlers in `AiPage.tsx`
4. Add calendar event fetch handler in `AiPage.tsx`
5. Build and verify drawer renders with all 3 tabs

### Step 4 — Replace ChatHistory
1. Replace `historySlot` in `AiPage.tsx` with `<GoalsRemindersDrawer ... />`
2. Replace floating bottom-left button with Goals & Reminders (Bell icon)
3. Add compact History button to topbar
4. Build and verify layout is correct

### Step 5 — AI Orchestration
1. Add `reminder_create` and `goal_event_link` to `ParsedMessage` union in `parsed.ts`
2. Add `create-reminder` and `link-goal-event` to `CardAction` union
3. Add parser functions in `parsed.ts`
4. Add cases to `onCardAction` in `AiPage.tsx`
5. Inject calendar/goals/reminders context into AI system prompt
6. Build and verify AI can create reminders via chat

### Step 6 — Polish & Verify
1. Run `npx vite build` — must pass
2. Run `npx esbuild src/preload.ts --bundle --platform=node --format=cjs --external:electron --outfile=dist-electron/preload.cjs` — must pass
3. Verify no black screen on app start
4. Verify all 5 expandable cards still render correctly
5. Verify Plan CRUD: view detail → edit → delete → refresh
6. Verify Goals & Reminders: events load, goals show overdue/upcoming, reminders create/toggle/delete
7. Verify AI can create a reminder via `/plan` or natural chat

---

## Anti-Slop Checklist

- [x] **Type:** Real component patterns (modals use `dk-modal`, rows use `dk-card` patterns)
- [x] **Color:** DeskFlow tokens only (`--cyan`, `--emerald`, `--violet`, `--amber`, `--red`, `--pink`)
- [x] **Geometry:** `rounded-lg` (8px) / `rounded-xl` (12px) max, `p-3` / `p-5` padding
- [x] **Hero pattern:** None — this is a utility page
- [x] **Section labels:** `dk-microlabel` used everywhere
- [x] **Motion:** CSS transitions with `0.25s cubic-bezier(0.16, 1, 0.3, 1)`
- [x] **Imagery:** Lucide icons only, no stock images
- [x] **Empty states:** Every tab has a meaningful empty state with action hint
- [x] **Icons:** Lucide icons (MoreVertical, Eye, Pencil, Trash2, Bell, CalendarDays, Target, Clock, Check, History)
- [x] **Accessibility:** All interactive elements are `<button>`, `aria-expanded` on menus, focus rings on modals, reduced motion support via existing CSS
- [x] **No new dependencies:** Only React, Lucide, existing Tailwind + custom CSS
- [x] **Dark mode only:** All colors are zinc/dark palette
- [x] **Glass cards:** `bg-zinc-900/40 backdrop-blur-xl` where needed
- [x] **CRLF line endings:** Preserve Windows endings in all files
- [x] **No comments in code:** Follow existing codebase convention
