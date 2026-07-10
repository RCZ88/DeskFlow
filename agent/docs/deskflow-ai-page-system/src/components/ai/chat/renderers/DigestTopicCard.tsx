import { useState } from "react"
import { Newspaper, ExternalLink } from "lucide-react"
import { cn } from "../../lib/cn"
import { TEXT } from "../../tokens"
import { CardShell } from "./CardShell"
import { Collapsible } from "../../primitives/Collapsible"
import type { CardAction, SourceLink } from "../parsed"

/**
 * A single digest topic delivered inside chat. Summary is always visible;
 * sources collapse/expand. Source clicks emit open-url so AiPage can route them
 * to the system browser instead of navigating the app shell.
 */
export function DigestTopicCard({
	topic,
	summary,
	sources,
	onAction,
}: {
	topic: string
	summary: string
	sources?: SourceLink[]
	onAction?: (a: CardAction) => void
}) {
	const [open, setOpen] = useState(false)
	const hasSources = Boolean(sources && sources.length > 0)
	return (
		<CardShell accent="cyan" icon={<Newspaper size={14} />} title={topic} subtitle="Daily digest">
			<p className={cn("text-[13px] leading-6", TEXT.secondary)}>{summary}</p>
			{hasSources ? (
				<div className="mt-3">
					<Collapsible
						open={open}
						onToggle={() => setOpen((o) => !o)}
						headerClassName="py-1"
						header={
							<span className={cn("text-[11px] font-medium uppercase tracking-wide", TEXT.muted)}>
								{sources!.length} source{sources!.length === 1 ? "" : "s"}
							</span>
						}
					>
						<ul className="mt-2 space-y-1">
							{sources!.map((s, i) => (
								<li key={s.url + i}>
									<button
										type="button"
										onClick={() => onAction?.({ kind: "open-url", url: s.url })}
										className="group flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-zinc-800/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/60"
									>
										<ExternalLink size={12} className="shrink-0 text-cyan-400" />
										<span className={cn("truncate text-[12px]", TEXT.secondary)}>{s.title || s.url}</span>
									</button>
								</li>
							))}
						</ul>
					</Collapsible>
				</div>
			) : null}
		</CardShell>
	)
}
