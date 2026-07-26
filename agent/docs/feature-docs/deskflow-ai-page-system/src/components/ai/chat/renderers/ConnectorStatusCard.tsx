import { useState } from "react"
import { Plug, RefreshCw, Loader2 } from "lucide-react"
import { cn } from "../../lib/cn"
import { TEXT } from "../../tokens"
import { CardShell } from "./CardShell"
import type { CardAction, ConnectorStatusItem } from "../parsed"

function dotClass(status: string): string {
	if (status === "connected" || status === "idle") return "bg-emerald-400"
	if (status === "syncing") return "bg-cyan-400"
	if (status === "error") return "bg-red-400"
	return "bg-zinc-500"
}

/**
 * Connector health grid. Each row shows a live status dot, last-sync + item
 * count meta, and a sync button that emits sync-connector for AiPage to run.
 */
export function ConnectorStatusCard({
	connectors,
	onAction,
	syncing,
}: {
	connectors: ConnectorStatusItem[]
	onAction?: (a: CardAction) => void
	syncing?: Record<string, true>
}) {
	const [localSync, setLocalSync] = useState<Record<string, true>>({})
	return (
		<CardShell accent="cyan" icon={<Plug size={14} />} title="Connectors" subtitle={connectors.length + " configured"}>
			<ul className="space-y-1.5">
				{connectors.map((c, i) => {
					const busy = syncing?.[c.name] || localSync[c.name] || c.status === "syncing"
					return (
						<li
							key={(c.id || c.name) + i}
							className="flex items-center gap-3 rounded-lg bg-zinc-900/40 p-3 ring-1 ring-zinc-800/60"
						>
							<span aria-hidden className={cn("h-2 w-2 shrink-0 rounded-full", dotClass(c.status))} />
							<div className="min-w-0 flex-1">
								<p className={cn("truncate text-[13px] font-medium", TEXT.primary)}>{c.name}</p>
								<p className={cn("truncate text-[11px]", TEXT.muted)}>
									{c.status}
									{c.lastSync ? " · synced " + c.lastSync : ""}
									{typeof c.itemsCount === "number" ? " · " + c.itemsCount + " items" : ""}
								</p>
							</div>
							<button
								type="button"
								disabled={Boolean(busy)}
								onClick={() => {
									setLocalSync((p) => ({ ...p, [c.name]: true }))
									onAction?.({ kind: "sync-connector", id: c.id, name: c.name })
								}}
								aria-label={"Sync " + c.name}
								className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-zinc-800/60 hover:text-cyan-300 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/60"
							>
								{busy ? (
									<Loader2 size={14} className="animate-spin motion-reduce:animate-none" />
								) : (
									<RefreshCw size={14} />
								)}
							</button>
						</li>
					)
				})}
			</ul>
		</CardShell>
	)
}
