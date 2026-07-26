import React from 'react'
import { Minus, Plus, Wand2 } from 'lucide-react'
import { tint, sumDenoms, greedyFill } from './modalUtils'

interface Props {
	accent: string
	currency: string
	denoms: number[]
	counts: Record<number, number>
	onChange: (counts: Record<number, number>) => void
	/** When provided, shows an Auto-fill button that greedily covers this amount. */
	autoFillTarget?: number
	format: (n: number) => string
}

export function DenominationPicker({ accent, denoms, counts, onChange, autoFillTarget, format }: Props) {
	const bump = (d: number, delta: number) => {
		const next = { ...counts, [d]: Math.max(0, (counts[d] ?? 0) + delta) }
		if (next[d] === 0) delete next[d]
		onChange(next)
	}
	const total = sumDenoms(counts)
	return (
		<div className="rounded-lg border border-zinc-700/50 bg-zinc-800/20 p-3 space-y-2">
			<div className="flex items-center justify-between">
				<span className="text-[11px] text-zinc-400">Denominations</span>
				{autoFillTarget != null && autoFillTarget > 0 && (
					<button onClick={() => onChange(greedyFill(autoFillTarget, denoms))}
						className="flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] border min-h-[28px]"
						style={{ background: tint(accent, 0.1), color: accent, borderColor: tint(accent, 0.2) }}>
						<Wand2 size={12} /> Auto-fill
					</button>
				)}
			</div>
			<div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
				{denoms.map((d) => {
					const n = counts[d] ?? 0
					return (
						<div key={d} className="flex items-center gap-2">
							<span className="w-20 text-xs tabular-nums text-zinc-300">{format(d)}</span>
							<button onClick={() => bump(d, -1)} disabled={n === 0} aria-label={`Remove ${d}`}
								className="h-11 w-11 rounded-lg border border-zinc-700/50 bg-zinc-800/50 text-zinc-300
									flex items-center justify-center hover:bg-zinc-800 disabled:opacity-30 transition-colors">
								<Minus size={15} />
							</button>
							<span className="w-8 text-center text-sm tabular-nums text-white">{n}</span>
							<button onClick={() => bump(d, 1)} aria-label={`Add ${d}`}
								className="h-11 w-11 rounded-lg border flex items-center justify-center transition-colors"
								style={{ background: tint(accent, 0.1), color: accent, borderColor: tint(accent, 0.2) }}>
								<Plus size={15} />
							</button>
							<span className="ml-auto text-xs tabular-nums text-zinc-400">{n > 0 ? format(d * n) : '—'}</span>
						</div>
					)
				})}
			</div>
			<div className="flex items-center justify-between border-t border-zinc-700/50 pt-2">
				<span className="text-xs text-zinc-400">Total</span>
				<span className="text-xl font-bold tabular-nums text-white">{format(total)}</span>
			</div>
		</div>
	)
}
