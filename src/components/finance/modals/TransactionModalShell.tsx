import React, { useEffect, useRef, useState, useCallback } from 'react'
import { X, Loader2, Check } from 'lucide-react'
import { tint } from './modalUtils'

type Phase = 'idle' | 'submitting' | 'success' | 'error'

export interface ShellRenderProps {
	submit: () => void
	phase: Phase
	setCanSubmit: (v: boolean) => void
}

interface Props {
	accent: string
	icon: React.ReactNode
	typeBadge: string
	title: string
	onClose: () => void
	/** Returns true on success. Throw or return false to surface the error state. */
	onSubmit: () => Promise<boolean>
	/** Called after the success animation completes (form reset / close happen here). */
	onSuccess?: () => void
	children: (rp: ShellRenderProps) => React.ReactNode
}

export function TransactionModalShell({
	accent, icon, typeBadge, title, onClose, onSubmit, onSuccess, children,
}: Props) {
	const [phase, setPhase] = useState<Phase>('idle')
	const [errorMsg, setErrorMsg] = useState<string | null>(null)
	const [canSubmit, setCanSubmit] = useState(false)
	const [mounted, setMounted] = useState(false)
	const dialogRef = useRef<HTMLDivElement>(null)

	useEffect(() => { setMounted(true) }, [])

	const close = useCallback(() => {
		setMounted(false)
		window.setTimeout(onClose, 180)
	}, [onClose])

	const submit = useCallback(async () => {
		if (phase === 'submitting' || !canSubmit) return
		setPhase('submitting'); setErrorMsg(null)
		try {
			const ok = await onSubmit()
			if (!ok) throw new Error('Could not save this transaction.')
			setPhase('success')
			window.setTimeout(() => { onSuccess?.(); close() }, 800)
		} catch (e: any) {
			setPhase('error')
			setErrorMsg(e?.message ?? 'Something went wrong. Please try again.')
		}
	}, [phase, canSubmit, onSubmit, onSuccess, close])

	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') close()
			if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit()
		}
		window.addEventListener('keydown', onKey)
		return () => window.removeEventListener('keydown', onKey)
	}, [close, submit])

	return (
		<div
			className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm
				transition-opacity duration-[180ms] ${mounted ? 'opacity-100' : 'opacity-0'}`}
			onClick={close}
			role="dialog" aria-modal="true" aria-label={`${typeBadge} transaction`}
		>
			<div
				ref={dialogRef}
				onClick={(e) => e.stopPropagation()}
				style={{ transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)' }}
				className={`w-full max-w-md rounded-xl border border-zinc-700/50 bg-zinc-900/95 backdrop-blur-xl p-5
					transition-all duration-[240ms] ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'}
					[&_input:focus-visible]:!shadow-none [&_textarea:focus-visible]:!shadow-none [&_button:focus-visible]:!shadow-none [&_select:focus-visible]:!shadow-none`}
			>
				{/* Header */}
				<div className="flex items-center gap-3 mb-3">
					<span className="flex h-9 w-9 items-center justify-center rounded-lg"
						style={{ background: tint(accent, 0.15), color: accent }}>
						{icon}
					</span>
					<div className="min-w-0">
						<div className="text-[11px] uppercase tracking-wide" style={{ color: accent }}>{typeBadge}</div>
						<h2 className="text-sm font-semibold text-white truncate">{title}</h2>
					</div>
					<button onClick={close} aria-label="Close"
						className="ml-auto flex h-9 w-9 items-center justify-center rounded-lg text-zinc-400
							hover:text-white hover:bg-zinc-800/50 focus-visible:ring-2 focus-visible:ring-offset-2
							focus-visible:ring-offset-zinc-950 transition-colors">
						<X size={18} />
					</button>
				</div>

				{/* Body */}
				<div className="space-y-3">{children({ submit, phase, setCanSubmit })}</div>

				{/* Error */}
				{phase === 'error' && errorMsg && (
					<div className="mt-3 flex items-center gap-2 rounded-lg border px-3 py-2 text-xs"
						style={{ background: tint('#EF4444', 0.08), borderColor: tint('#EF4444', 0.25), color: '#FCA5A5' }}>
						<span>{errorMsg}</span>
						<button onClick={submit} className="ml-auto font-medium underline hover:no-underline">Retry</button>
					</div>
				)}

				{/* Footer */}
				<div className="mt-4 flex gap-2">
					<button onClick={close}
						className="flex-1 min-h-[44px] rounded-lg border border-zinc-700/50 bg-zinc-800/50 text-sm
							text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors">
						Cancel
					</button>
					<button onClick={submit} disabled={!canSubmit || phase === 'submitting' || phase === 'success'}
						className="flex-[2] min-h-[44px] rounded-lg text-sm font-semibold text-white
							flex items-center justify-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
						style={{ background: phase === 'success' ? '#10B981' : accent }}>
						{phase === 'submitting' && <Loader2 size={16} className="animate-spin" />}
						{phase === 'success' && <Check size={16} className="animate-[pop_200ms_ease-out]" />}
						{phase === 'idle' && 'Add transaction'}
						{phase === 'error' && 'Add transaction'}
						{phase === 'submitting' && 'Saving…'}
						{phase === 'success' && 'Transaction added'}
					</button>
				</div>
			</div>
		</div>
	)
}
