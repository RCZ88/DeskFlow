import React, { useEffect, useMemo, useState } from 'react'
import { WalletCards } from 'lucide-react'
import { TransactionModalShell } from './TransactionModalShell'
import { useTransactionForm } from './useTransactionForm'
import { ContextBand, TypeToggle, AmountInput } from './modalParts'
import { CategoryChipGrid } from './CategoryChipGrid'
import { TransferWalletSelect } from './TransferWalletSelect'
import { TransferDestinationPanel } from './TransferDestinationPanel'
import { DenominationPicker } from './DenominationPicker'
import { useCurrencyFormat, parseMeta, sumDenoms, DENOMINATIONS } from './modalUtils'
import type { TxModalProps } from './modalUtils'

const ACCENT = '#F97316'

export const PhysicalTransactionModal: React.FC<TxModalProps> = (props) => {
	const f = useTransactionForm(props, ['expense', 'income', 'transfer'])
	const meta = parseMeta(props.wallet)
	const { format, symbol } = useCurrencyFormat(props.displayCurrency)
	const denoms = DENOMINATIONS[props.wallet.currency] ?? DENOMINATIONS.IDR
	const [destWalletId, setDestWalletId] = useState<number | null>(null)
	const [destMetadata, setDestMetadata] = useState<Record<string, any> | null>(null)

	const destWallet = useMemo(() =>
		props.wallets?.find(w => w.id === destWalletId), [props.wallets, destWalletId])

	const onHand: Record<number, number> = useMemo(() => meta.denominations ?? {}, [meta])
	const [counts, setCounts] = useState<Record<number, number>>({})

	const tendered = sumDenoms(counts)
	const effectiveAmt = f.type === 'income' ? f.numericAmount : Math.abs(f.numericAmount || tendered)
	const change = (f.type === 'expense' || f.type === 'transfer') ? Math.max(0, tendered - effectiveAmt) : 0
	const validSpend = f.type === 'income' ? f.numericAmount > 0 : f.numericAmount > 0 && tendered >= f.numericAmount
	const valid = f.type === 'transfer'
		? f.numericAmount > 0 && tendered >= f.numericAmount && !!destWalletId
		: validSpend

	return (
		<TransactionModalShell
			accent={ACCENT} icon={<WalletCards size={18} />} typeBadge="Physical"
			title={props.wallet.name} onClose={props.onClose}
			onSuccess={() => { f.reset(); setCounts({}); setDestWalletId(null); setDestMetadata(null) }}
			onSubmit={async () => {
				f.persistPrefs()
				const next: Record<number, number> = { ...onHand }
				if (f.type === 'expense' || f.type === 'transfer') {
					for (const [d, n] of Object.entries(counts)) next[+d] = (next[+d] ?? 0) - n
				} else {
					for (const [d, n] of Object.entries(counts)) next[+d] = (next[+d] ?? 0) + n
				}
				const extra: Record<string, any> = {
					amount: f.type === 'income' ? f.numericAmount : -effectiveAmt,
					metadata: { denominations: counts, change_kept: change, denomination_after: next },
				}
				if (f.type === 'transfer') {
					extra.to_wallet_id = destWalletId
					extra.fromWalletName = props.wallet.name
					extra.toWalletName = destWallet?.name || 'another wallet'
					extra.description = f.description.trim() || `Transfer to ${destWallet?.name || 'another wallet'}`
					extra.dest_metadata = destMetadata
				}
				return !!(await props.onSubmit(f.buildPayload(extra)))
			}}
		>
			{({ setCanSubmit }) => {
				useEffect(() => setCanSubmit(valid), [valid, setCanSubmit])
				return (
					<>
						<ContextBand accent={ACCENT}>
							<div className="flex items-center justify-between">
								<span className="text-[11px] text-zinc-400">Wallet total</span>
								<span className="text-xs font-semibold tabular-nums text-white">{format(props.wallet.balance)}</span>
							</div>
							{meta.description && <div className="mt-0.5 text-[11px] text-zinc-500">{meta.description}</div>}
							<div className="mt-0.5 text-[11px] text-zinc-500">
								{Object.entries(onHand).filter(([, n]) => n > 0).map(([d, n]) => `${format(+d)}×${n}`).join('  ·  ') || 'No notes recorded'}
							</div>
						</ContextBand>

						<TypeToggle accent={ACCENT} value={f.type} onChange={f.setType}
							options={[{ id: 'expense', label: 'Spend' }, { id: 'income', label: 'Deposit' }, { id: 'transfer', label: 'Transfer' }]} />
						<AmountInput accent={ACCENT} value={f.amount} onChange={f.setAmount} symbol={symbol} autoFocus />

						<DenominationPicker accent={ACCENT} currency={props.wallet.currency} denoms={denoms}
							counts={counts} onChange={setCounts} format={format}
							autoFillTarget={f.type !== 'income' ? f.numericAmount : undefined} />

						{f.type !== 'income' && (
							<div className="flex items-center justify-between text-xs">
								<span className="text-zinc-400">Change kept</span>
								<span className="tabular-nums font-medium" style={{ color: tendered < f.numericAmount ? '#EF4444' : '#10B981' }}>
									{tendered < f.numericAmount ? 'Insufficient notes selected' : format(change)}
								</span>
							</div>
						)}

						{f.type === 'transfer' ? (
							<>
								<TransferWalletSelect
									wallets={props.wallets || []}
									accounts={props.accounts || []}
									excludeWalletId={props.wallet.id}
									selectedWalletId={destWalletId}
									onSelect={setDestWalletId}
									displayCurrency={props.displayCurrency}
								/>
								<TransferDestinationPanel
									destWallet={destWallet}
									accent={ACCENT}
									format={format}
									onMetadataChange={setDestMetadata}
								/>
							</>
						) : (
							<CategoryChipGrid accent={ACCENT} categories={f.categoriesForType} selectedId={f.categoryId} onSelect={f.setCategoryId}
								onCreateCategory={async () => false} categoryType={f.type} />
						)}
					</>
				)
			}}
		</TransactionModalShell>
	)
}
