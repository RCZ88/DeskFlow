export type Priority = 'primary' | 'secondary' | 'tertiary'
export type AccentToken = 'clay' | 'sage' | 'amber' | 'sky' | 'neutral'

export type BlockType =
  | 'text' | 'goal-list' | 'goal-create' | 'goal-delete'
  | 'news-item' | 'data-summary' | 'error' | 'navigation'
  | 'table' | 'confirm' | 'sources'

export interface BlockMeta { priority: Priority; icon?: string; accent?: AccentToken }

export interface Item { checked: boolean; label: string; category?: string }

export type InlineNode =
  | { t: 'text'; v: string }
  | { t: 'bold'; v: string }
  | { t: 'italic'; v: string }
  | { t: 'strike'; v: string }
  | { t: 'code'; v: string }
  | { t: 'metric'; v: string }
  | { t: 'cite'; id: string; v: string }
  | { t: 'link'; v: string; href: string }

export interface WireBlock {
  kind: 'block'
  type: BlockType
  meta: BlockMeta
  fields: Record<string, string>
  items?: Item[]
  prose?: InlineNode[]
  rows?: string[][]
}

export interface WireGroup {
  kind: 'group'
  title?: string
  accent?: AccentToken
  children: WireBlock[]
}

export type WireNode = WireBlock | WireGroup

export interface ParsedResponse {
  version: 1 | 2
  nodes: WireNode[]
  refs: Record<string, { label: string; href?: string }>
}

export const ACCENT: Record<AccentToken, { text: string; border: string; bg: string; dot: string }> = {
  clay:    { text: 'text-clay-300',  border: 'border-clay-400/30',  bg: 'bg-clay-400/10',  dot: 'bg-clay-400' },
  sage:    { text: 'text-sage-400',  border: 'border-sage-400/30',  bg: 'bg-sage-400/10',  dot: 'bg-sage-400' },
  amber:   { text: 'text-amber-400', border: 'border-amber-400/30', bg: 'bg-amber-400/10', dot: 'bg-amber-400' },
  sky:     { text: 'text-sky-400',   border: 'border-sky-400/30',   bg: 'bg-sky-400/10',   dot: 'bg-sky-400' },
  neutral: { text: 'text-stone-300', border: 'border-stone-700/50', bg: 'bg-stone-800/40', dot: 'bg-stone-500' },
}

export const MOTION = {
  entry:   { duration: 0.25, ease: [0.16, 1, 0.3, 1] },
  stagger: 0.08,
  hover:   { duration: 0.15, ease: [0.16, 1, 0.3, 1] },
  cross:   { duration: 0.2,  ease: 'easeInOut' },
} as const

export const messageVariants = {
  hidden:  { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: MOTION.entry },
}
