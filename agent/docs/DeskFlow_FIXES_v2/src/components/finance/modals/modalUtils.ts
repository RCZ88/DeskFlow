import type { FinanceWallet, FinanceAccount } from '../finance-types'
import { getCurrencyInfo } from '../currency-data'
import { useCallback } from 'react'

/** hex (#RRGGBB) + alpha 0..1 -> rgba() string. The reason accents finally render. */
export function tint(hex: string, alpha: number): string {
	const h = hex.replace('#', '')
	const r = parseInt(h.slice(0, 2), 16)
	const g = parseInt(h.slice(2, 4), 16)
	const b = parseInt(h.slice(4, 6), 16)
	return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

/** Threshold color for utilization / daily-limit bars (color + meaning, never color alone). */
export function thresholdColor(pct: number): { hex: string; label: string } {
	if (pct < 50) return { hex: '#10B981', label: 'Healthy' }
	if (pct <= 80) return { hex: '#F59E0B', label: 'Watch' }
	return { hex: '#EF4444', label: 'High' }
}

/** metadata may arrive as a JSON string or an object. Normalize once. */
export function parseMeta(wallet: FinanceWallet): Record<string, any> {
	const m = wallet.metadata
	if (!m) return {}
	if (typeof m === 'string') { try { return JSON.parse(m) } catch { return {} } }
	return m
}

/** Default denominations by currency — real-world banknote face values. */
export const DENOMINATIONS: Record<string, number[]> = {
	IDR: [100000, 50000, 20000, 10000, 5000, 2000, 1000, 500, 200, 100],
	USD: [100, 50, 20, 10, 5, 1],
	EUR: [200, 100, 50, 20, 10, 5],
	GBP: [50, 20, 10, 5, 2, 1],
	JPY: [10000, 5000, 2000, 1000, 500, 100, 50, 10, 5, 1],
	CNY: [100, 50, 20, 10, 5, 1],
	SGD: [100, 50, 20, 10, 5, 2, 1],
	KRW: [50000, 10000, 5000, 1000, 500, 100, 50, 10],
	INR: [2000, 500, 200, 100, 50, 20, 10, 5, 2, 1],
	AUD: [100, 50, 20, 10, 5, 2, 1],
	CAD: [100, 50, 20, 10, 5, 2, 1],
	CHF: [1000, 200, 100, 50, 20, 10, 5, 2, 1],
	MYR: [100, 50, 20, 10, 5, 1],
	PHP: [1000, 500, 200, 100, 50, 20, 10, 5, 1],
	THB: [1000, 500, 100, 50, 20, 10, 5, 2, 1],
	VND: [500000, 200000, 100000, 50000, 20000, 10000, 5000, 2000, 1000],
	BRL: [200, 100, 50, 20, 10, 5, 2, 1],
}

/** Greedy largest-first auto-fill: how many of each note to cover `amount`. */
export function greedyFill(amount: number, denoms: number[]): Record<number, number> {
	const out: Record<number, number> = {}
	let remaining = Math.round(amount)
	for (const d of [...denoms].sort((a, b) => b - a)) {
		const n = Math.floor(remaining / d)
		if (n > 0) { out[d] = n; remaining -= n * d }
	}
	return out
}

export const sumDenoms = (counts: Record<number, number>) =>
	Object.entries(counts).reduce((s, [d, n]) => s + Number(d) * n, 0)

export type TxType = 'income' | 'expense' | 'transfer'

export interface TxModalProps {
	wallet: FinanceWallet
	categories: Array<{ id: number; name: string; type: TxType; icon?: string }>
	wallets?: FinanceWallet[]
	accounts?: FinanceAccount[]
	displayCurrency: string
	baseCurrency: string
	/** Optional: today's spend for this wallet, used by Debit daily-limit band. */
	todaySpent?: number
	onSubmit: (data: Record<string, any>) => Promise<{ id: number } | null>
	onClose: () => void
}

/** Currency formatting hook — returns { format(number), symbol } for the display currency. */
export function useCurrencyFormat(displayCurrency: string) {
	const { symbol, locale } = getCurrencyInfo(displayCurrency)
	const isZeroDec = ['IDR', 'VND', 'KRW', 'JPY'].includes(displayCurrency)
	const format = useCallback((val: number) => {
		if (isZeroDec) return `${symbol}${Math.round(val).toLocaleString(locale)}`
		return `${symbol}${val.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
	}, [symbol, locale, isZeroDec])
	return { format, symbol }
}
