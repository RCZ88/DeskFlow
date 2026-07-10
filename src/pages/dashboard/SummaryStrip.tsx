import { motion, useReducedMotion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { SummaryCard } from '../../components/insights/SummaryCard'
import { Sparkline } from './Sparkline'
import { BarChart, Wallet, GraduationCap, ExternalLink } from 'lucide-react'

interface HomeSummary {
  focusMinutes: number
  walletCount: number
  totalBalance: number
  dueReviews: number
  sleepSeconds: number
  financeLocked: boolean
  trends?: {
    focus?: number[]
    balance?: number[]
    reviews?: number[]
    sleep?: number[]
  }
}

interface SummaryStripProps {
  summary: HomeSummary | null
  loading: boolean
  error: string | null
  onRefresh: () => void
}

function fmtMin(min: number): string {
  if (!min || min < 0) return '0min'
  if (min < 60) return `${Math.round(min)}min`
  const h = Math.floor(min / 60)
  const m = Math.round(min % 60)
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

function fmtCurr(n: number): string {
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function fmtDur(sec: number): string {
  if (!sec || sec < 0) return '0m'
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

function trendInfo(data: number[] | undefined): { direction: 'up' | 'down' | 'flat'; label: string } | undefined {
  if (!data || data.length < 2) return undefined
  const last = data[data.length - 1]
  const first = data[0]
  const diff = last - first
  const dir = diff > 0.05 ? 'up' : diff < -0.05 ? 'down' : 'flat'
  const pct = first > 0 ? Math.abs(Math.round((diff / first) * 100)) : Math.abs(Math.round(diff))
  return { direction: dir, label: `${pct}%` }
}

export function SummaryStrip({ summary, loading, error, onRefresh }: SummaryStripProps) {
  const navigate = useNavigate()
  const reduce = useReducedMotion()

  if (error) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="rounded-xl border border-zinc-800/50 bg-zinc-900/40 p-4">
            <div className="text-xs text-zinc-500">Couldn't load</div>
            <button onClick={onRefresh} className="text-xs text-pink-400 hover:text-pink-300 mt-2">Retry</button>
          </div>
        ))}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="rounded-xl border border-zinc-800/50 bg-zinc-900/40 p-4 animate-pulse">
            <div className="h-4 w-20 bg-zinc-800 rounded mb-3" />
            <div className="h-6 w-24 bg-zinc-800 rounded mb-2" />
            <div className="h-3 w-16 bg-zinc-800/50 rounded" />
          </div>
        ))}
      </div>
    )
  }

  const s = summary
  const focusTrend = trendInfo(s?.trends?.focus)
  const balanceTrend = trendInfo(s?.trends?.balance)
  const reviewsTrend = trendInfo(s?.trends?.reviews)
  const sleepTrend = trendInfo(s?.trends?.sleep)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1, duration: reduce ? 0 : 0.25, ease: [0.16, 1, 0.3, 1] }}
      className="grid grid-cols-2 lg:grid-cols-4 gap-5"
    >
      <SummaryCard
        title="Activity"
        value={s ? fmtMin(s.focusMinutes) : '—'}
        subtitle={s ? `${fmtMin(s.focusMinutes)} focus` : 'No activity data yet'}
        icon={<BarChart className="w-4 h-4 text-emerald-400" />}
        accentColor="from-emerald-500/10 to-emerald-600/5"
        onClick={() => navigate('/activity')}
        trend={focusTrend}
        sparkline={s?.trends?.focus && s.trends.focus.length >= 2 ? (
          <Sparkline data={s.trends.focus} color="#34d399" width={80} height={24} />
        ) : undefined}
      />

      <SummaryCard
        title="Finance"
        value={s?.financeLocked ? '••••' : s ? fmtCurr(s.totalBalance) : '—'}
        subtitle={s ? `${s.walletCount} wallet${s.walletCount !== 1 ? 's' : ''}` : 'No finance data yet'}
        icon={<Wallet className="w-4 h-4 text-amber-400" />}
        accentColor="from-amber-500/10 to-amber-600/5"
        onClick={() => navigate('/finance')}
        masked={s?.financeLocked}
        trend={s?.financeLocked ? undefined : balanceTrend}
        sparkline={!s?.financeLocked && s?.trends?.balance && s.trends.balance.length >= 2 ? (
          <Sparkline data={s.trends.balance} color="#fbbf24" width={80} height={24} />
        ) : undefined}
      />

      <SummaryCard
        title="Learn"
        value={s ? (s.dueReviews > 0 ? `${s.dueReviews} due` : '✓ All caught up') : '—'}
        subtitle={s ? (s.dueReviews > 0 ? `${s.dueReviews} review${s.dueReviews !== 1 ? 's' : ''} pending` : 'No reviews due') : 'No learn data yet'}
        icon={<GraduationCap className="w-4 h-4 text-cyan-400" />}
        accentColor="from-cyan-500/10 to-cyan-600/5"
        onClick={() => navigate('/learn')}
        trend={reviewsTrend}
        sparkline={s?.trends?.reviews && s.trends.reviews.length >= 2 ? (
          <Sparkline data={s.trends.reviews} color="#22d3ee" width={80} height={24} />
        ) : undefined}
      />

      <SummaryCard
        title="External"
        value={s ? (s.sleepSeconds > 0 ? fmtDur(s.sleepSeconds) : 'No sleep logged') : '—'}
        subtitle={s ? (s.sleepSeconds > 0 ? `${Math.round(s.sleepSeconds / 3600)}h sleep` : 'Log sleep in External') : 'No external data yet'}
        icon={<ExternalLink className="w-4 h-4 text-violet-400" />}
        accentColor="from-violet-500/10 to-violet-600/5"
        onClick={() => navigate('/external')}
        trend={sleepTrend}
        sparkline={s?.trends?.sleep && s.trends.sleep.length >= 2 ? (
          <Sparkline data={s.trends.sleep.map(v => Math.round(v / 60))} color="#a78bfa" width={80} height={24} />
        ) : undefined}
      />
    </motion.div>
  )
}
