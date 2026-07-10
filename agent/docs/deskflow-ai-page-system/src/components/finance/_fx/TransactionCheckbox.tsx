import { useCallback } from 'react'
import { Check, Minus } from 'lucide-react'

type CheckState = boolean | 'indeterminate'

interface Props {
  checked: CheckState
  onToggle: (e: React.MouseEvent | React.KeyboardEvent) => void
  forceVisible?: boolean
  ariaLabel?: string
}

export function TransactionCheckbox({ checked, onToggle, forceVisible, ariaLabel }: Props) {
  const isOn = checked === true
  const isMixed = checked === 'indeterminate'

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    onToggle(e)
  }, [onToggle])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault()
      e.stopPropagation()
      onToggle(e)
    }
  }, [onToggle])

  const visible = forceVisible || isOn || isMixed

  return (
    <div
      role="checkbox"
      aria-checked={isMixed ? 'mixed' : isOn}
      aria-label={ariaLabel ?? 'Select transaction'}
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onPointerDown={(e) => e.stopPropagation()}
      className={[
        'flex items-center justify-center w-7 h-7 shrink-0 rounded-md cursor-pointer',
        'transition-all duration-150 ease-[cubic-bezier(0.16,1,0.3,1)]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900',
        visible
          ? 'opacity-100 bg-zinc-800/80 hover:bg-zinc-700/80'
          : 'opacity-0 group-hover:opacity-100 hover:bg-zinc-800/60',
      ].join(' ')}
    >
      <span className={[
        'flex items-center justify-center w-4 h-4 rounded-[3px] border transition-colors duration-150',
        isOn
          ? 'bg-emerald-500 border-emerald-500'
          : isMixed
            ? 'bg-emerald-500/20 border-emerald-500'
            : 'border-zinc-500',
      ].join(' ')}>
        {isOn && <Check className="w-3 h-3 text-zinc-950" strokeWidth={3} />}
        {isMixed && <Minus className="w-3 h-3 text-emerald-400" strokeWidth={3} />}
      </span>
    </div>
  )
}
