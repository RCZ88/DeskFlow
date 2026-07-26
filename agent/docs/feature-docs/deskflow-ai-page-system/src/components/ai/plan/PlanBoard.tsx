import { useState } from "react"
import { motion } from "framer-motion"
import { Flag, FileText, Plus, Save, Target } from "lucide-react"
import { GlassCard } from "../GlassCard"
import { SectionHead } from "../SectionHead"
import { Segmented } from "../primitives/Segmented"
import { Progress } from "../primitives/Progress"
import { StateShell, EmptyState } from "../StateShell"
import { SkeletonRow } from "../primitives/Skeleton"
import { BulkImportDialog } from "./BulkImportDialog"
import { useMotionProps } from "../lib/motion"
import { cn } from "../lib/cn"
import { ACCENT, TEXT } from "../tokens"
import { CATEGORY_ACCENT, type DataState, type LongTermGoal } from "../types"

export interface PlanBoardProps {
	state: DataState
	goals: LongTermGoal[]
	notes: string
	savingNotes?: boolean
	onSaveNotes?: (content: string) => void
	onAnalyzeDump: (text: string) => Promise<Partial<LongTermGoal>[]>
	onSaveGoals: (goals: Partial<LongTermGoal>[]) => void
	onToggleGoal?: (goal: LongTermGoal) => void
	errorMessage?: string
	onRetry?: () => void
}

type Pane = "goals" | "notes"

/**
 * PlanBoard merges long-term goals and the planning scratchpad behind one
 * segmented switch, so the two former cards share a frame instead of stacking.
 */
export function PlanBoard(props: PlanBoardProps) {
	const { state, goals, notes } = props
	const [pane, setPane] = useState<Pane>("goals")
	const [importOpen, setImportOpen] = useState(false)
	const [draft, setDraft] = useState(notes)
	const m = useMotionProps()

	const active = goals.filter((g) => g.status !== "done").length
	const dirty = draft !== notes

	return (
		<GlassCard accent="violet" bar className="flex flex-col">
			<SectionHead
				accent="violet"
				icon={<Flag size={16} />}
				title="Plan"
				desc="Long-term goals & planning notes"
				right={
					<Segmented
						value={pane}
						onChange={setPane}
						aria-label="Plan view"
						options={[
							{ value: "goals", label: "Goals", count: goals.length },
							{ value: "notes", label: "Notes" },
						]}
					/>
				}
			/>

			{pane === "goals" ? (
				<StateShell
					state={state}
					errorMessage={props.errorMessage}
					onRetry={props.onRetry}
					loading={
						<div className="space-y-2">
							{[0, 1, 2].map((i) => (
								<SkeletonRow key={i} />
							))}
						</div>
					}
					empty={
						<EmptyState
							icon={<Target size={20} />}
							title="No long-term goals yet"
							message="Add a few goals to steer your daily focus."
							cta={
								<button
									type="button"
								onClick={() => setImportOpen(true)}
								className={cn(
									"inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-medium",
									ACCENT.violet.pill,
								)}
							>
								<Plus size={13} /> Add goals
							</button>
							}
						/>
					}
				>
					<div className="space-y-3">
						<div className="flex items-center justify-between">
							<span className={cn("text-[12px]", TEXT.muted)}>
								<span className="tabular-nums text-zinc-300">{active}</span> active
							</span>
							<button
								type="button"
								onClick={() => setImportOpen(true)}
								className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[12px] font-medium text-violet-300 transition-colors hover:bg-violet-500/10"
							>
								<Plus size={13} /> Add
							</button>
						</div>
						<motion.div variants={m.parent} initial="hidden" animate="show" className="space-y-1.5">
							{goals.map((g) => (
								<motion.div key={g.id} variants={m.item}>
									<LongTermRow goal={g} onToggle={props.onToggleGoal} />
								</motion.div>
							))}
						</motion.div>
					</div>
				</StateShell>
			) : (
				<div className="space-y-3">
					<div className="flex items-center gap-2 text-[12px] text-zinc-500">
						<FileText size={13} /> Markdown · saved to your planning file
					</div>
					<textarea
						value={draft}
						onChange={(e) => setDraft(e.target.value)}
						rows={12}
						spellCheck={false}
						placeholder="# This week\n- …"
						className="w-full resize-none rounded-lg bg-zinc-950/60 p-3 text-[13px] leading-6 text-zinc-100 placeholder:text-zinc-600 ring-1 ring-zinc-800/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500/60"
						style={ { fontFamily: "'JetBrains Mono', ui-monospace, monospace" } }
					/>
					<div className="flex items-center justify-between">
						<span className="text-[11px] text-zinc-600">
							{dirty ? "Unsaved changes" : "All changes saved"}
						</span>
						<button
							type="button"
							onClick={() => props.onSaveNotes?.(draft)}
							disabled={!dirty || props.savingNotes}
							className={cn(
								"inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-medium disabled:opacity-40",
								ACCENT.violet.pill,
							)}
						>
							<Save size={13} /> {props.savingNotes ? "Saving…" : "Save notes"}
						</button>
					</div>
				</div>
			)}

			<BulkImportDialog
				open={importOpen}
				onClose={() => setImportOpen(false)}
				onAnalyze={props.onAnalyzeDump}
				onSave={props.onSaveGoals}
			/>
		</GlassCard>
	)
}

function LongTermRow({
	goal,
	onToggle,
}: {
	goal: LongTermGoal
	onToggle?: (g: LongTermGoal) => void
}) {
	const done = goal.status === "done"
	const accentKey = (CATEGORY_ACCENT[goal.category] ?? "violet") as keyof typeof ACCENT
	return (
		<div className="rounded-lg bg-zinc-950/40 p-3 ring-1 ring-zinc-800/50 transition-[box-shadow] duration-150 hover:ring-zinc-700">
			<div className="flex items-center gap-2.5">
				<span aria-hidden className={cn("h-2 w-2 shrink-0 rounded-full", ACCENT[accentKey].dot)} />
				<button
					type="button"
					onClick={() => onToggle?.(goal)}
					className={cn(
						"min-w-0 flex-1 truncate text-left text-[13px] font-medium",
						done ? cn(TEXT.muted, "line-through") : TEXT.primary,
					)}
				>
					{goal.title}
				</button>
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
