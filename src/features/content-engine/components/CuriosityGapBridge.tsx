import { Zap } from 'lucide-react'
import { Chip } from './ui'
import { cn } from '@/lib/utils'

interface CuriosityGapBridgeProps {
  bridgeText: string
  criterion: string
  score: number
}

export function CuriosityGapBridge({ bridgeText, criterion, score }: CuriosityGapBridgeProps) {
  if (!bridgeText) return null

  const scoreColor = score < 0.6 ? 'text-rose-400' : score <= 0.8 ? 'text-[#f5c518]' : 'text-emerald-400'

  return (
    <div className="flex flex-col items-center py-3 max-w-[80%] mx-auto">
      {/* Dashed line */}
      <div className="w-full border-t border-dashed border-white/[0.06]" />

      {/* Bridge text */}
      <p className="mt-2 text-[12px] italic leading-relaxed text-zinc-400 text-center">
        &ldquo;{bridgeText}&rdquo;
      </p>

      {/* Criterion + score */}
      <div className="mt-1.5 flex items-center gap-2">
        <Chip className="border-[#f5c518]/25 bg-[#f5c518]/10 text-[#f5c518] text-[9px]">
          <Zap size={8} className="mr-0.5" />
          {criterion.replace(/_/g, ' ')}
        </Chip>
        <span className={cn('text-[10px] font-mono font-bold', scoreColor)}>
          {score.toFixed(2)}
        </span>
      </div>
    </div>
  )
}
