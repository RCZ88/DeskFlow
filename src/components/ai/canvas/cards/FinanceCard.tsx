import type { CanvasCard } from '../../../../types/canvas'
import { StateView, type ViewState } from '../shared/StateView'
import { Wallet } from 'lucide-react'

interface FinanceCardProps {
  card: CanvasCard
  summary?: any
  loading?: boolean
  error?: string
}

export function FinanceCard({ card, summary, loading, error }: FinanceCardProps) {
  const data = card.data || {}
  const transactions = data.transactions || []

  const state: ViewState = loading ? 'loading' : error ? 'error' : transactions.length === 0 ? 'empty' : 'populated'

  const balance = data.balance ?? summary?.totalBalance ?? 0
  const income = data.income ?? summary?.totalIncome ?? 0
  const expense = data.expense ?? summary?.totalExpense ?? 0
  const currency = data.currency ?? 'Rp'

  return (
    <StateView
      state={state}
      loadingType="chart"
      emptyProps={{
        icon: Wallet,
        title: 'No transactions',
        description: 'Add your first transaction in Finance to see a summary here.',
        ctaLabel: 'Add Transaction',
      }}
      errorProps={{ message: error || 'Sync failed' }}
    >
      <div className="card-finance">
        <div className="card-finance-balance">
          <span className="card-finance-label">Balance</span>
          <span className="card-finance-amount">{currency} {balance.toLocaleString()}</span>
        </div>
        <div className="card-finance-row">
          <div className="card-finance-stat">
            <span className="card-finance-label">Income</span>
            <span className="card-finance-positive">+{currency} {income.toLocaleString()}</span>
          </div>
          <div className="card-finance-stat">
            <span className="card-finance-label">Expense</span>
            <span className="card-finance-negative">-{currency} {expense.toLocaleString()}</span>
          </div>
        </div>
        {data.subscriptions && (
          <div className="card-finance-sub">
            <span className="card-finance-label">{data.subscriptions} active subscriptions</span>
          </div>
        )}
      </div>
    </StateView>
  )
}