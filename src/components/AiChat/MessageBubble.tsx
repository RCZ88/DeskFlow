import { type FC, type ReactNode } from 'react'

type Role = 'user' | 'assistant'

type Props = {
  role: Role
  children: ReactNode
}

export const MessageBubble: FC<Props> = ({ role, children }) => {
  if (role === 'user') {
    return (
      <div className="ml-auto max-w-[85%] rounded-xl rounded-tr-sm bg-pink-500/10 border border-pink-500/20 px-4 py-3 text-zinc-100 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-1.5 duration-200 ease-out">
        {children}
      </div>
    )
  }
  return (
    <div className="max-w-[85%] rounded-xl rounded-tl-sm bg-zinc-900/60 border border-zinc-800/40 backdrop-blur-sm px-4 py-3 text-zinc-100 hover:border-zinc-700/60 transition-colors duration-150 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-1.5 duration-200 ease-out">
      {children}
    </div>
  )
}
