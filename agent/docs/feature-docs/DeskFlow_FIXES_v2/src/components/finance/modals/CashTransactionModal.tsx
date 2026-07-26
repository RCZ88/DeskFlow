import React, { useEffect, useMemo, useState } from 'react'
import { PiggyBank } from 'lucide-react'
import { TransactionModalShell } from './TransactionModalShell'
import { useTransactionForm } from './useTransactionForm'
import { ContextBand, TypeToggle } from './modalParts'
import { CategoryChipGrid } from './CategoryChipGrid'
import { TransferWalletSelect } from './TransferWalletSelect'
import { TransferDestinationPanel } from './TransferDestinationPanel'
import { DenominationPicker } from './DenominationPicker'
import { useCurrencyFormat, parseMeta, sumDenoms, DENOMINATIONS } from './modalUtils'
import type { TxModalProps } from './modalUtils'

const ACCENT = '#EC4899'

export const CashTransactionModal: React.FC<TxModalProps> = (props) => {
	const f = useTransactionForm(props, ['expense', 'income', 'transfer'])
	const meta = parseMeta(props.wallet)
	const { format, symbol } = useCurrencyFormat(props.displayCurrency)
	const denoms = DENOMINATIONS[props.wallet.currency] ?? DENOMINATIONS.IDR
	const [counts, setCounts] = useState<Record<number, number>>({})
	const [destWalletId, setDestWalletId] = useState<number | null>(null)
	const [destMetadata, setDestMetadata] = useState<Record<string, any> | null>(null)

	const destWallet = useMemo(() =>
		props.wallets?.find(w => w.id === destWalletId), [props.wallets, destWalletId])

	const total = sumDenoms(counts)
	const valid = total > 0 && (f.type !== 'transfer' || !!destWalletId)

	return (
		<TransactionModalShell
			accent={ACCENT} icon={<PiggyBank size={18} />} typeBadge="Cash"
			title={props.wallet.name} onClose={props.onClose}
			onSuccess={() => { f.reset(); setCounts({}); setDestWalletId(null); setDestMetadata(null) }}
			onSubmit={async () => {
				f.persistPrefs()
				const extra: Record<string, any> = {
					amount: f.type === 'income' ? total : -total,
					description: f.description.trim() || (f.type === 'transfer'
						? `Transfer to ${destWallet?.name || 'another wallet'}`
						: f.type === 'income' ? 'Cash in' : 'Cash out'),
					metadata: { denominations: counts },
				}
				if (f.type === 'transfer') {
					extra.to_wallet_id = destWalletId
					extra.fromWalletName = props.wallet.name
					extra.toWalletName = destWallet?.name || 'another wallet'
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
								<span className="text-[11px] text-zinc-400">Cash on hand</span>
								<span className="text-xs font-semibold tabular-nums text-white">{format(props.wallet.balance)}</span>
							</div>
						</ContextBand>
						<TypeToggle accent={ACCENT} value={f.type} onChange={f.setType}
							options={[{ id: 'expense', label: 'Cash out' }, { id: 'income', label: 'Cash in' }, { id: 'transfer', label: 'Transfer' }]} />
						<DenominationPicker accent={ACCENT} currency={props.wallet.currency} denoms={denoms}
							counts={counts} onChange={setCounts} format={format} />

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
