import { type FC, useState, useEffect } from 'react'

const LABELS = [
  'Reading your goals\u2026',
  'Analyzing activity\u2026',
  'Thinking\u2026',
]

export const ThinkingIndicator: FC = () => {
  const [labelIndex, setLabelIndex] = useState(-1)

  useEffect(() => {
    const showTimer = setTimeout(() => setLabelIndex(0), 1000)
    return () => clearTimeout(showTimer)
  }, [])

  useEffect(() => {
    if (labelIndex < 0) return
    const interval = setInterval(() => {
      setLabelIndex(prev => (prev + 1) % LABELS.length)
    }, 2500)
    return () => clearInterval(interval)
  }, [labelIndex])

  return (
    <div className="flex items-center gap-2 px-1 py-2">
      <div className="flex items-center gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-clay-400/70 animate-[breathe_1.4s_ease-in-out_infinite]" style={{ animationDelay: '0ms' }} />
        <span className="w-1.5 h-1.5 rounded-full bg-clay-400/70 animate-[breathe_1.4s_ease-in-out_infinite]" style={{ animationDelay: '200ms' }} />
        <span className="w-1.5 h-1.5 rounded-full bg-clay-400/70 animate-[breathe_1.4s_ease-in-out_infinite]" style={{ animationDelay: '400ms' }} />
      </div>
      {labelIndex >= 0 && (
        <span
          key={labelIndex}
          className="font-serif text-[13px] text-stone-400 transition-opacity duration-200"
        >
          {LABELS[labelIndex]}
        </span>
      )}
    </div>
  )
}
