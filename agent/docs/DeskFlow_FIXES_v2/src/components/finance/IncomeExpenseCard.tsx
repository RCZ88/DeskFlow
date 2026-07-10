import { motion } from 'framer-motion';
import { ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { formatCurrency as fmtCurrency } from './currency-data';
import { useNumberMask } from '../../context/NumberMaskContext';
import { maskNumber } from '../../utils/maskNumber';
import { useCountUp } from './_fx/useCountUp';
import { GlassSurface } from './_fx/GlassSurface';


interface IncomeExpenseCardProps {
  income: number;
  expense: number;
  currency: string;
}

export function IncomeExpenseCard({ income, expense, currency }: IncomeExpenseCardProps) {
  const { showNumbers, maskMode, maskFixedValue } = useNumberMask();
  const incDisplay = useCountUp(income);
  const expDisplay = useCountUp(expense);
  const symbol = fmtCurrency(0, currency).replace(/[\d,.]/g, '').trim() || '$';
  const max = Math.max(income, expense, 1);
  const incomeShare = (income / max) * 100;
  const expenseShare = (expense / max) * 100;

  const incText = showNumbers ? `${symbol}${incDisplay}` : maskNumber(fmtCurrency(income, currency), maskMode, maskFixedValue);
  const expText = showNumbers ? `${symbol}${expDisplay}` : maskNumber(fmtCurrency(expense, currency), maskMode, maskFixedValue);

  return (
    <GlassSurface className="p-5 flex flex-col gap-4">
      <div>
        <div className="flex items-center gap-2 mb-1.5">
          <ArrowUpRight className="w-4 h-4 text-emerald-400" />
          <span className="text-xs text-zinc-500 font-medium">Income</span>
        </div>
        <p className="text-money text-xl font-bold text-emerald-400">{incText}</p>
        <div className="mt-1.5 h-1.5 rounded-full bg-white/5 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${incomeShare}%` }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="h-full rounded-full bg-[linear-gradient(180deg,#34d399,#059669)]"
          />
        </div>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-1.5">
          <ArrowDownLeft className="w-4 h-4 text-red-400" />
          <span className="text-xs text-zinc-500 font-medium">Expense</span>
        </div>
        <p className="text-money text-xl font-bold text-red-400">{expText}</p>
        <div className="mt-1.5 h-1.5 rounded-full bg-white/5 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${expenseShare}%` }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="h-full rounded-full bg-[linear-gradient(180deg,#fb7185,#e11d48)]"
          />
        </div>
      </div>
    </GlassSurface>
  );
}
