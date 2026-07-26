import { motion } from "framer-motion";
import { Handshake, TrendingUp, TrendingDown } from "lucide-react";

export interface FollowThroughBreakdown {
  label: string;
  total: number;
  count: number;
}

export interface FollowThroughCardProps {
  currency: string;
  totalThisMonth: number;
  momChangePct: number | null;
  receivable: number;
  breakdown: FollowThroughBreakdown[];
  trend: number[];
}

export function FollowThroughCard({
  currency,
  totalThisMonth,
  momChangePct,
  receivable,
  breakdown,
  trend,
}: FollowThroughCardProps) {
  const fmt = (n: number) =>
    new Intl.NumberFormat(undefined, { style: "currency", currency }).format(n);
  const max = Math.max(1, ...trend);
  const up = (momChangePct ?? 0) >= 0;

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="col-span-4 rounded-xl border border-amber-400/20 bg-zinc-900/80 p-5 backdrop-blur-xl"
    >
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 font-semibold text-zinc-100">
          <Handshake className="h-5 w-5 text-amber-400" aria-hidden />
          Follow Through
        </h3>
        {momChangePct !== null && (
          <span className={`inline-flex items-center gap-1 text-sm ${up ? "text-red-400" : "text-emerald-400"}`}>
            {up ? <TrendingUp className="h-4 w-4" aria-hidden /> : <TrendingDown className="h-4 w-4" aria-hidden />}
            {Math.abs(momChangePct).toFixed(0)}% MoM
          </span>
        )}
      </div>

      {totalThisMonth === 0 && receivable === 0 ? (
        <p className="mt-4 text-sm text-zinc-500">
          No money fronted for others this month. When you pay for someone who'll
          pay you back, mark it "Follow Through" and it shows here — kept out of
          your personal spending.
        </p>
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <div className="text-xs text-zinc-500">This month</div>
            <div className="text-2xl font-bold tabular-nums text-amber-300">{fmt(totalThisMonth)}</div>
          </div>
          <div>
            <div className="flex items-center gap-1 text-xs text-zinc-500">
              <Handshake className="h-3 w-3" aria-hidden /> You'll be repaid
            </div>
            <div className="text-2xl font-bold tabular-nums text-emerald-300">{fmt(receivable)}</div>
          </div>
          {trend.length > 0 && (
            <div className="flex items-end gap-1" aria-hidden>
              {trend.map((v, i) => (
                <div
                  key={i}
                  className="w-full rounded-t bg-amber-400/50"
                  style={{ height: `${Math.max(4, (v / max) * 60)}px` }}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {breakdown.length > 0 && (
        <ul className="mt-4 space-y-1 border-t border-zinc-800/50 pt-3 text-sm">
          {breakdown.map((b) => (
            <li key={b.label} className="flex justify-between text-zinc-300">
              <span>{b.label} <span className="text-zinc-500">({b.count})</span></span>
              <span className="tabular-nums">{fmt(b.total)}</span>
            </li>
          ))}
        </ul>
      )}
    </motion.section>
  );
}
