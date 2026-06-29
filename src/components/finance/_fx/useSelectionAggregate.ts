import { useMemo } from 'react'
import type { FinanceTransaction } from '../finance-types'

export interface CategorySlice {
  categoryId: number
  name: string
  color: string
  icon: string
  total: number
  count: number
  pct: number
}

export interface WalletSlice {
  walletId: number | null
  name: string
  total: number
  count: number
  pct: number
}

export interface DailyPoint {
  date: string
  net: number
}

export interface AggregateData {
  count: number
  inflow: number
  outflow: number
  net: number
  avgExpense: number
  expenseCount: number
  dateRange: { from: string; to: string } | null
  byCategory: CategorySlice[]
  byWallet: WalletSlice[]
  daily: DailyPoint[]
  isMixed: boolean
  totalVisible: number
}

export interface AggregateMeta {
  categoryName: (id: number) => string
  categoryColor: (id: number) => string
  categoryIcon: (id: number) => string
  walletName: (id: number | null) => string
}

export function useSelectionAggregate(
  allTxns: FinanceTransaction[],
  selectedIds: Set<number>,
  meta: AggregateMeta,
  totalVisible: number,
  isMixed: boolean,
): AggregateData {
  return useMemo(() => {
    const rows = allTxns.filter((t) => selectedIds.has(t.id))
    let inflow = 0
    let outflow = 0
    let expenseCount = 0
    const cat = new Map<number, CategorySlice>()
    const wal = new Map<number | null, WalletSlice>()
    const day = new Map<string, number>()

    for (const t of rows) {
      const abs = Math.abs(t.amount)
      if (t.type === 'income') inflow += abs
      else if (t.type === 'expense') {
        outflow += abs
        expenseCount++
      }

      if (t.type === 'expense') {
        const c = cat.get(t.category_id) ?? {
          categoryId: t.category_id,
          name: meta.categoryName(t.category_id),
          color: meta.categoryColor(t.category_id),
          icon: meta.categoryIcon(t.category_id),
          total: 0,
          count: 0,
          pct: 0,
        }
        c.total += abs
        c.count++
        cat.set(t.category_id, c)

        const w = wal.get(t.wallet_id) ?? {
          walletId: t.wallet_id,
          name: meta.walletName(t.wallet_id),
          total: 0,
          count: 0,
          pct: 0,
        }
        w.total += abs
        w.count++
        wal.set(t.wallet_id, w)
      }

      const signed = t.type === 'income' ? abs : t.type === 'expense' ? -abs : 0
      day.set(t.date, (day.get(t.date) ?? 0) + signed)
    }

    const net = inflow - outflow
    const dates = rows.map((r) => r.date).sort()

    return {
      count: rows.length,
      inflow,
      outflow,
      net,
      expenseCount,
      avgExpense: expenseCount ? outflow / expenseCount : 0,
      dateRange: dates.length ? { from: dates[0], to: dates[dates.length - 1] } : null,
      byCategory: [...cat.values()]
        .map((c) => ({ ...c, pct: outflow ? c.total / outflow : 0 }))
        .sort((a, b) => b.total - a.total),
      byWallet: [...wal.values()]
        .map((w) => ({ ...w, pct: outflow ? w.total / outflow : 0 }))
        .sort((a, b) => b.total - a.total),
      daily: [...day.entries()].sort().map(([date, value]) => ({ date, net: value })),
      isMixed,
      totalVisible,
    }
  }, [allTxns, selectedIds, meta, totalVisible, isMixed])
}
