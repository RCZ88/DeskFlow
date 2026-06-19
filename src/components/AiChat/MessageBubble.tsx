import { type FC, type ReactNode } from 'react'
import { Sparkles } from 'lucide-react'

type Role = 'user' | 'assistant'

type Props = {
  role: Role
  children: ReactNode
}

export const MessageBubble: FC<Props> = ({ role, children }) => {
  if (role === 'user') {
    return (
      <div className="flex items-start gap-2 justify-end">
        <div className="ml-auto max-w-[80%] rounded-2xl rounded-tr-md bg-clay-400/12 border border-clay-400/25 px-4 py-3 text-stone-200 font-mono text-[13px]">
          {children}
        </div>
        <div className="w-5 h-5 rounded-full bg-stone-800/70 border border-stone-700/40 grid place-items-center shrink-0 mt-2">
          <span className="text-[9px] font-mono text-stone-400">U</span>
        </div>
      </div>
    )
  }
  return (
    <div className="flex items-start gap-2">
      <div className="w-5 h-5 rounded-full bg-stone-800/70 border border-stone-700/40 grid place-items-center shrink-0 mt-2">
        <Sparkles className="w-3 h-3 text-clay-300" />
      </div>
      <div
        className="max-w-[88%] rounded-2xl rounded-tl-md bg-stone-900/60 backdrop-blur-xl border border-stone-800/50 px-4 py-3 text-stone-100 font-serif"
        style={{
          background: 'linear-gradient(180deg, rgba(247,243,238,0.06), transparent 40%), rgba(28,25,23,0.6)',
        }}
      >
        {children}
      </div>
    </div>
  )
}
