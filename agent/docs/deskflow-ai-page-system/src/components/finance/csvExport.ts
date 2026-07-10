import type { FinanceTransaction } from './finance-types'

interface CsvLookups {
  categoryName: (id: number) => string
  walletName: (id: number | null) => string
  accountName: (id: number) => string
}

const csvCell = (value: string | number | null | undefined): string => {
  const s = value == null ? '' : String(value)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function exportTransactionsCsv(txns: FinanceTransaction[], lookups: CsvLookups): void {
  const headers = [
    'Date', 'Time', 'Type', 'Amount', 'Description',
    'Category', 'Wallet', 'Account', 'Note', 'Tags',
  ]
  const lines = txns.map((t) =>
    [
      t.date,
      t.time ?? '',
      t.type,
      Math.abs(t.amount).toFixed(2),
      t.description ?? '',
      lookups.categoryName(t.category_id),
      lookups.walletName(t.wallet_id),
      lookups.accountName(t.account_id),
      t.note ?? '',
      t.tags ?? '',
    ]
      .map(csvCell)
      .join(','),
  )

  const csv = [headers.join(','), ...lines].join('\r\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const today = new Date().toISOString().slice(0, 10)

  const a = document.createElement('a')
  a.href = url
  a.download = `finance-export-${today}.csv`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
