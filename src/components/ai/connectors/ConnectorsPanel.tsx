import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Plug, Plus, RefreshCw, Shield, Lock, Info, ChevronDown, ChevronUp, ExternalLink, AlertCircle } from "lucide-react"
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
	type?: string
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
	onToast?: (msg: string, type: 'success' | 'error' | 'info') => void
	onRefresh?: () => void
}

const STATUS_TONE = {
	ready: "ready",
	busy: "busy",
	error: "error",
	idle: "idle",
} as const

/**
 * ConnectorsPanel — Human-Centric revamp.
 *
 * Key UX decisions:
 * - Clear explanation of what connectors are and why they matter
 * - Prominent security information (credentials stored locally, not third-party)
 * - Educational empty state with step-by-step setup guidance
 * - Trust indicators throughout (shield icon, security badges)
 * - Progressive disclosure for security details
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
	onToast,
	onRefresh,
}: ConnectorsPanelProps) {
	const m = useMotionProps()
	const [pendingActions, setPendingActions] = useState<Record<string, 'test' | 'disconnect'>>({});
	const [panelError, setPanelError] = useState<string | null>(null);
	const [showSecurityInfo, setShowSecurityInfo] = useState(false);

	const handleTest = async (id: string) => {
		setPendingActions(prev => ({ ...prev, [id]: 'test' }));
		setPanelError(null);
		try {
			const r = await (window.deskflowAPI as any)?.connectorTest?.(id);
			if (r?.success) onToast?.('Connector test succeeded', 'success');
			else onToast?.(r?.error || 'Connector test failed', 'error');
		} catch (err: any) {
			onToast?.(err.message || 'Test failed', 'error');
		} finally {
			setPendingActions(prev => { const n = { ...prev }; delete n[id]; return n; });
		}
	};

	const handleDisconnect = async (id: string) => {
		setPendingActions(prev => ({ ...prev, [id]: 'disconnect' }));
		setPanelError(null);
		try {
			const r = await (window.deskflowAPI as any)?.connectorDelete?.(id);
			if (r?.success === false) {
				setPanelError(r?.error || 'Failed to disconnect');
				onToast?.(r?.error || 'Failed to disconnect', 'error');
			} else {
				onToast?.('Connector disconnected', 'success');
			}
			onRefresh?.();
		} catch (err: any) {
			setPanelError(err.message);
			onToast?.(err.message, 'error');
			onRefresh?.();
		} finally {
			setPendingActions(prev => { const n = { ...prev }; delete n[id]; return n; });
		}
	};

	return (
		<GlassCard accent="cyan" bar>
			<SectionHead
				accent="cyan"
				icon={<Plug size={16} />}
				title="Connectors"
				desc="Synced sources"
				right={<IconButton icon={<Plus size={15} />} label="Add connector" onClick={onAdd} />}
			/>

			{/* Security Trust Badge */}
			<div className="mx-4 mb-3 flex items-center gap-2 rounded-lg bg-emerald-500/5 px-3 py-2 ring-1 ring-emerald-500/10">
				<Shield size={14} className="text-emerald-400 shrink-0" />
				<span className="text-[11px] text-emerald-300/80">
					Credentials stored locally on your device
				</span>
				<button
					type="button"
					onClick={() => setShowSecurityInfo(!showSecurityInfo)}
					className="ml-auto p-0.5 rounded hover:bg-emerald-500/10 transition-colors"
					aria-label={showSecurityInfo ? "Hide security details" : "Show security details"}
				>
					{showSecurityInfo ? (
						<ChevronUp size={12} className="text-emerald-400/60" />
					) : (
						<ChevronDown size={12} className="text-emerald-400/60" />
					)}
				</button>
			</div>

			{/* Expandable Security Details */}
			<AnimatePresence>
				{showSecurityInfo && (
					<motion.div
						initial={{ height: 0, opacity: 0 }}
						animate={{ height: "auto", opacity: 1 }}
						exit={{ height: 0, opacity: 0 }}
						transition={{ duration: 0.2 }}
						className="overflow-hidden"
					>
						<div className="mx-4 mb-3 space-y-2 rounded-lg bg-zinc-800/30 px-3 py-3 ring-1 ring-zinc-700/30">
							<div className="flex items-start gap-2">
								<Lock size={12} className="text-zinc-400 mt-0.5 shrink-0" />
								<p className="text-[11px] text-zinc-400 leading-relaxed">
									Your email/password are stored in your local database and never sent to DeskFlow servers.
									We use IMAP/CalDAV protocols to connect directly to your provider.
								</p>
							</div>
							<div className="flex items-start gap-2">
								<Info size={12} className="text-zinc-400 mt-0.5 shrink-0" />
								<p className="text-[11px] text-zinc-400 leading-relaxed">
									For Gmail, we recommend using an App Password (not your main password).
									This gives DeskFlow read-only access to your email without exposing your account.
								</p>
							</div>
							<a
								href="https://myaccount.google.com/apppasswords"
								target="_blank"
								rel="noopener noreferrer"
								className="inline-flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300 transition-colors"
							>
								How to generate a Gmail App Password
								<ExternalLink size={10} />
							</a>
						</div>
					</motion.div>
				)}
			</AnimatePresence>

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
					<div className="px-4 py-5">
						{/* Educational Empty State */}
						<div className="text-center mb-4">
							<div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-xl bg-cyan-500/10 ring-1 ring-cyan-500/20">
								<Plug size={24} className="text-cyan-400" />
							</div>
							<h3 className="text-sm font-medium text-zinc-200 mb-1">Connect your email & calendar</h3>
							<p className="text-xs text-zinc-500 max-w-[280px] mx-auto leading-relaxed">
								Give DeskFlow context about your meetings, deadlines, and communications
								to power smarter planning and prioritization.
							</p>
						</div>

						{/* What You'll Get */}
						<div className="space-y-2 mb-4">
							<div className="flex items-start gap-2.5 rounded-lg bg-zinc-800/30 px-3 py-2.5">
								<div className="grid h-6 w-6 place-items-center rounded-md bg-pink-500/10 shrink-0">
									<span className="text-[11px]">📧</span>
								</div>
								<div>
									<p className="text-[12px] font-medium text-zinc-300">Email Context</p>
									<p className="text-[11px] text-zinc-500">See important messages and deadlines in your daily plan</p>
								</div>
							</div>
							<div className="flex items-start gap-2.5 rounded-lg bg-zinc-800/30 px-3 py-2.5">
								<div className="grid h-6 w-6 place-items-center rounded-md bg-cyan-500/10 shrink-0">
									<span className="text-[11px]">📅</span>
								</div>
								<div>
									<p className="text-[12px] font-medium text-zinc-300">Calendar Events</p>
									<p className="text-[11px] text-zinc-500">Auto-block focus time around your meetings</p>
								</div>
							</div>
						</div>

						{/* Setup Steps */}
						<div className="rounded-lg bg-zinc-800/20 px-3 py-3 mb-4">
							<p className="text-[11px] font-medium text-zinc-400 mb-2">How it works:</p>
							<div className="space-y-1.5">
								<div className="flex items-center gap-2">
									<span className="flex h-4 w-4 items-center justify-center rounded-full bg-zinc-700 text-[9px] font-medium text-zinc-300">1</span>
									<span className="text-[11px] text-zinc-500">Choose your email or calendar provider</span>
								</div>
								<div className="flex items-center gap-2">
									<span className="flex h-4 w-4 items-center justify-center rounded-full bg-zinc-700 text-[9px] font-medium text-zinc-300">2</span>
									<span className="text-[11px] text-zinc-500">Enter your credentials (stored locally only)</span>
								</div>
								<div className="flex items-center gap-2">
									<span className="flex h-4 w-4 items-center justify-center rounded-full bg-zinc-700 text-[9px] font-medium text-zinc-300">3</span>
									<span className="text-[11px] text-zinc-500">DeskFlow syncs and organizes your data</span>
								</div>
							</div>
						</div>

						{/* CTA */}
						<button
							type="button"
							onClick={onAdd}
							className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-cyan-500/10 px-3 py-2.5 text-[12px] font-medium text-cyan-300 ring-1 ring-cyan-500/20 transition-colors hover:bg-cyan-500/20 hover:ring-cyan-500/30"
						>
							<Plus size={13} /> Add your first connector
						</button>
					</div>
				}
			>
				{panelError && (
					<div className="mx-4 mb-2 flex items-center gap-2 rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-300 ring-1 ring-red-500/20">
						<AlertCircle size={14} className="shrink-0" />
						<span className="flex-1">{panelError}</span>
						<button className="rounded bg-red-500/15 px-2 py-1 font-medium text-red-200 hover:bg-red-500/25 transition-colors" onClick={() => { setPanelError(null); onRefresh?.(); }}>Retry</button>
						<button className="text-red-400 hover:text-red-200 transition-colors" onClick={() => setPanelError(null)}>Dismiss</button>
					</div>
				)}
				<motion.ul variants={m.parent} initial="hidden" animate="show" className="space-y-1">
					{connectors.map((c) => {
						const syncing = syncingId === c.id || c.status === "busy"
						const pending = pendingActions[c.id];
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
									<div className="flex items-center gap-1 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
										{pending === 'test' ? (
											<span className="text-[11px] text-zinc-500">Testing…</span>
										) : pending === 'disconnect' ? (
											<span className="text-[11px] text-red-400">Disconnecting…</span>
										) : (
											<>
												<button
													type="button"
													className="rounded px-1.5 py-1 text-[11px] font-medium text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/60 transition-colors"
													onClick={() => handleTest(c.id)}
												>
													Test
												</button>
												<IconButton
													icon={<RefreshCw size={13} className={syncing ? "animate-spin motion-reduce:animate-none" : ""} />}
													label={"Sync " + c.name}
													onClick={() => onSync?.(c.id)}
												/>
												<button
													type="button"
													className="rounded px-1.5 py-1 text-[11px] font-medium text-red-500/60 hover:text-red-400 hover:bg-red-500/10 transition-colors"
													onClick={() => handleDisconnect(c.id)}
												>
													Disconnect
												</button>
											</>
										)}
									</div>
								</div>
							</motion.li>
						)
					})}
				</motion.ul>
			</StateShell>
		</GlassCard>
	)
}
