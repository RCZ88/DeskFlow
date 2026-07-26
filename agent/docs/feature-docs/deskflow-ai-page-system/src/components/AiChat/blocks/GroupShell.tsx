import { type FC, type ReactNode } from 'react'
import type { AccentToken } from '../../../services/wireFormat'
import { ACCENT } from '../../../services/wireFormat'

type Props = {
  title?: string
  accent?: AccentToken
  children: ReactNode
}

export const GroupShell: FC<Props> = ({ title, accent, children }) => {
  const t = accent ? ACCENT[accent] : ACCENT.neutral
  return (
    <div className={`rounded-xl border ${t.border} ${t.bg} p-3 space-y-2.5`}>
      {title && (
        <div className="flex items-center gap-2">
          <span className={`w-1.5 h-1.5 rounded-full ${t.dot}`} />
          <span className="text-[13px] font-semibold text-stone-200">{title}</span>
        </div>
      )}
      {children}
    </div>
  )
}
