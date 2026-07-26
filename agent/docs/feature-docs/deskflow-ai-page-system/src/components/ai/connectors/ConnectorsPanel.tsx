import { motion } from "framer-motion"
import { Plug, Plus, RefreshCw } from "lucide-react"
import { GlassCard } from "../GlassCard"
import { SectionHead } from "../SectionHead"
import { StatusDot } from "../StatusDot"
import { IconButton } from "../IconButton"
import { StateShell, EmptyState } from "../StateShell"
import { SkeletonRow } from "../primitives/Skeleton"
import { useMotionProps } from "../lib/motion"
import { cn } from "../lib/cn"
import { TEXT } from "../tokens"
import type { DataState } from "../types"

export interface Connector {
	id: string
	name: string
	status: "ready" | "busy" | "error" | "idle"
	detail?: string
	itemCount?: number
	iconUrl?: string
}

export interface ConnectorsPanelProps {
	state: DataState
	connectors: Connector[]
	syncingId?: string
	onAdd?: () => void
	onSync?: (id: string) => void
	onOpen?: (id: string) => void
	errorMessage?: string
	onRetry?: () => void
}

const STATUS_TONE = {
	ready: "ready",
	busy: "busy",
	error: "error",
	idle: "idle",
} as const

/**
 * Compact connectors list for the context rail. Each row: source icon/status,
 * name, item count, and a hover-revealed sync action. Live sync uses the busy
 * StatusDot pulse so state is always legible (Human-Centric).
 */
export function ConnectorsPanel({
	state,
	connectors,
	syncingId,
	onAdd,
	onSync,
	onOpen,
	errorMessage,
	onRetry,
}: ConnectorsPanelProps) {
	const m = useMotionProps()
	return (
		<GlassCard accent="cyan" bar>
			<SectionHead
				accent="cyan"
				icon={<Plug size={16} />}
				title="Connectors"
				desc="Synced sources"
				right={<IconButton icon={<Plus size={15} />} label="Add connector" onClick={onAdd} />}
			/>
			<StateShell
				state={state}
				errorMessage={errorMessage}
				onRetry={onRetry}
				loading={
					<div className="space-y-2">
						{[0, 1].map((i) => (
							<SkeletonRow key={i} />
						))}
					</div>
				}
				empty={
					<EmptyState
						icon={<Plug size={20} />}
						title="No connectors yet"
						message="Connect a source to give DeskFlow more context."
						cta={
							<button
								type="button"
								onClick={onAdd}
								className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-800/60 px-3 py-1.5 text-[12px] font-medium text-zinc-200 ring-1 ring-zinc-700 transition-colors hover:bg-zinc-800"
							>
								<Plus size={13} /> Add connector
							</button>
						}
					/>
				}
			>
				<motion.ul variants={m.parent} initial="hidden" animate="show" className="space-y-1">
					{connectors.map((c) => {
						const syncing = syncingId === c.id || c.status === "busy"
						return (
							<motion.li key={c.id} variants={m.item}>
								<div className="group flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors duration-150 hover:bg-zinc-800/30">
									<StatusDot tone={STATUS_TONE[c.status]} />
									<button
										type="button"
										onClick={() => onOpen?.(c.id)}
										className="flex min-w-0 flex-1 flex-col text-left"
									>
										<span className={cn("truncate text-[13px] font-medium", TEXT.primary)}>
											{c.name}
										</span>
										{c.detail ? (
											<span className={cn("truncate text-[11px]", TEXT.muted)}>{c.detail}</span>
										) : null}
									</button>
									{typeof c.itemCount === "number" ? (
										<span className="tabular-nums text-[11px] text-zinc-500">{c.itemCount}</span>
									) : null}
									<span className="opacity-0 transition-opacity duration-150 group-hover:opacity-100">
										<IconButton
											icon={<RefreshCw size={13} className={syncing ? "animate-spin motion-reduce:animate-none" : ""} />}
											label={"Sync " + c.name}
											onClick={() => onSync?.(c.id)}
										/>
									</span>
								</div>
							</motion.li>
						)
					})}
				</motion.ul>
			</StateShell>
		</GlassCard>
	)
}
