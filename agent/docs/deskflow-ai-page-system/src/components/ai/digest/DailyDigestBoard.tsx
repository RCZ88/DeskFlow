import { useState } from "react"
import { BookOpen, Calendar, RefreshCw, Settings2, Sparkles } from "lucide-react"
import { GlassCard } from "../GlassCard"
import { SectionHead } from "../SectionHead"
import { IconButton } from "../IconButton"
import { StateShell, EmptyState } from "../StateShell"
import { Collapsible } from "../primitives/Collapsible"
import { Skeleton } from "../primitives/Skeleton"
import { cn } from "../lib/cn"
import { ACCENT, TEXT } from "../tokens"
import type { DataState, TopicDigestItem } from "../types"

export interface DailyDigestBoardProps {
	state: DataState
	topics: TopicDigestItem[]
	generating?: boolean
	provider?: string
	/** True when interest topics exist but no digest is generated yet. */
	readyToGenerate?: boolean
	onRefresh?: () => void
	onConfigure?: () => void
	onGenerate?: () => void
	errorMessage?: string
}

/**
 * HERO section (promoted from buried-in-Reflect). Widest header treatment on
 * the page. Collapsible topic cards with summary + sources. Two distinct empty
 * states: no-topics-configured vs ready-to-generate.
 */
export function DailyDigestBoard({
	state,
	topics,
	generating,
	provider,
	readyToGenerate,
	onRefresh,
	onConfigure,
	onGenerate,
	errorMessage,
}: DailyDigestBoardProps) {
	return (
		<GlassCard accent="cyan" bar variant="elevated">
			<SectionHead
				hero
				accent="cyan"
				icon={<Calendar size={16} />}
				title="Daily Digest"
				desc="AI-curated from the topics you follow"
				right={
					<>
						<span
							className={cn(
								"hidden items-center gap-1 rounded-md px-2 py-1 text-[11px] sm:inline-flex",
								ACCENT.cyan.pill,
							)}
						>
							<Sparkles size={11} /> AI-curated
						</span>
						{provider ? (
							<span className="hidden rounded-md bg-zinc-800/60 px-2 py-1 text-[11px] text-zinc-400 md:inline-block">
								{provider}
							</span>
						) : null}
						<IconButton
							icon={<RefreshCw size={15} className={generating ? "animate-spin motion-reduce:animate-none" : ""} />}
							label="Refresh digest"
							onClick={onRefresh}
							disabled={generating}
						/>
						<IconButton icon={<Settings2 size={15} />} label="Configure topics" onClick={onConfigure} />
					</>
				}
			/>

			<StateShell
				state={state}
				errorMessage={errorMessage}
				onRetry={onRefresh}
				loading={
					<div className="space-y-2">
						{[0, 1, 2].map((i) => (
							<div key={i} className="rounded-xl bg-zinc-950/40 p-4 ring-1 ring-zinc-800/40">
								<Skeleton className="mb-2 h-3.5 w-1/3" />
								<Skeleton className="h-3 w-full" />
						</div>
						))}
					</div>
				}
				empty={
					readyToGenerate ? (
						<EmptyState
							icon={<Sparkles size={20} />}
							title="Ready to generate today's digest"
							message="Pull the latest on the topics you follow."
							cta={
								<button
									type="button"
								onClick={onGenerate}
								className={cn(
									"inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-medium",
									ACCENT.cyan.pill,
								)}
							>
								<Sparkles size={13} /> Generate digest
							</button>
						}
					/>
					) : (
						<EmptyState
							icon={<BookOpen size={20} />}
							title="No topics configured"
							message="Add interest topics and DeskFlow will curate a daily digest."
							cta={
								<button
									type="button"
								onClick={onConfigure}
								className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-800/60 px-3 py-1.5 text-[12px] font-medium text-zinc-200 ring-1 ring-zinc-700 transition-colors hover:bg-zinc-800"
								>
								<Settings2 size={13} /> Add topics
							</button>
							}
						/>
					)
				}
			>
				<div className="space-y-2">
					{topics.map((t, i) => (
						<TopicCard key={t.topic + i} item={t} />
					))}
				</div>
			</StateShell>
		</GlassCard>
	)
}

function TopicCard({ item }: { item: TopicDigestItem }) {
	const [open, setOpen] = useState(false)
	const sourceCount = item.sources?.length ?? 0
	return (
		<div className="rounded-xl bg-zinc-950/40 p-4 ring-1 ring-zinc-800/40 transition-[box-shadow] duration-150 hover:ring-zinc-700">
			<Collapsible
				open={open}
				onToggle={() => setOpen((v) => !v)}
				header={
					<div className="flex items-center gap-2">
						<span className={cn("text-[13px] font-semibold", TEXT.primary)}>{item.topic}</span>
						{sourceCount > 0 ? (
							<span className="rounded-md bg-zinc-800/60 px-1.5 py-0.5 text-[10px] tabular-nums text-zinc-400">
								{sourceCount} source{sourceCount === 1 ? "" : "s"}
							</span>
						) : null}
					</div>
				}
			>
				<div className="pt-2">
					<p className={cn("text-[13px] leading-5", TEXT.secondary)}>{item.summary}</p>
					{item.sources && item.sources.length > 0 ? (
						<ul className="mt-3 space-y-1">
							{item.sources.map((s) => (
								<li key={s.url}>
									<a
										href={s.url}
									target="_blank"
									rel="noreferrer"
									className="flex items-center gap-2 rounded-md px-2 py-1 text-[12px] text-cyan-300/90 transition-colors hover:bg-zinc-800/40"
									>
									<span className="h-1 w-1 rounded-full bg-cyan-400" />
									<span className="truncate">{s.title}</span>
								</a>
							</li>
						))}
						</ul>
					) : null}
				</div>
			</Collapsible>
		</div>
	)
}
