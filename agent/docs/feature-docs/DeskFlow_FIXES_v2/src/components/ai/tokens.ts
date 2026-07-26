export const SURFACE = {
  base:     'bg-zinc-950',
  card:     'bg-zinc-900/40',
  cardHi:   'bg-zinc-900/60',
  inset:    'bg-zinc-950/60',
} as const

export const RING = {
  base:   'ring-1 ring-zinc-800/60',
  hover:  'ring-zinc-700',
  active: 'ring-zinc-600',
  focus:  'focus-visible:ring-2 focus-visible:ring-pink-500/60 focus-visible:outline-none',
} as const

export const TEXT = {
  primary:   'text-zinc-100',
  secondary: 'text-zinc-400',
  muted:     'text-zinc-500',
  disabled:  'text-zinc-600',
} as const

export const ACCENT = {
  pink:    { dot:'bg-pink-400',    bar:'bg-pink-500',    pill:'bg-pink-500/10 text-pink-300 ring-pink-500/20',    hex:'#f472b6' },
  emerald: { dot:'bg-emerald-400', bar:'bg-emerald-500', pill:'bg-emerald-500/10 text-emerald-300 ring-emerald-500/20', hex:'#10b981' },
  amber:   { dot:'bg-amber-400',   bar:'bg-amber-500',   pill:'bg-amber-500/10 text-amber-300 ring-amber-500/20',   hex:'#f59e0b' },
  violet:  { dot:'bg-violet-400',  bar:'bg-violet-500',  pill:'bg-violet-500/10 text-violet-300 ring-violet-500/20', hex:'#a78bfa' },
  red:     { dot:'bg-red-400',     bar:'bg-red-500',     pill:'bg-red-500/10 text-red-300 ring-red-500/20',       hex:'#f87171' },
} as const

export const MOTION = {
  fast: 0.15, normal: 0.25, slow: 0.40,
  ease: [0.16, 1, 0.3, 1] as const,
  easeInOut: [0.4, 0, 0.2, 1] as const,
  stagger: 0.05,
} as const
