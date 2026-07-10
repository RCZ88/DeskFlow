export const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  'IDE':             { bg: 'bg-violet-500/15',   text: 'text-violet-400',   border: 'border-violet-500/20' },
  'Browser':         { bg: 'bg-sky-500/15',      text: 'text-sky-400',      border: 'border-sky-500/20' },
  'AI Tools':        { bg: 'bg-pink-500/15',     text: 'text-pink-400',     border: 'border-pink-500/20' },
  'Entertainment':   { bg: 'bg-red-500/15',      text: 'text-red-400',      border: 'border-red-500/20' },
  'Communication':   { bg: 'bg-blue-500/15',     text: 'text-blue-400',     border: 'border-blue-500/20' },
  'Design':          { bg: 'bg-fuchsia-500/15',  text: 'text-fuchsia-400',  border: 'border-fuchsia-500/20' },
  'Productivity':    { bg: 'bg-emerald-500/15',  text: 'text-emerald-400',  border: 'border-emerald-500/20' },
  'Developer Tools': { bg: 'bg-cyan-500/15',     text: 'text-cyan-400',     border: 'border-cyan-500/20' },
  'Tools':           { bg: 'bg-amber-500/15',    text: 'text-amber-400',    border: 'border-amber-500/20' },
  'News':            { bg: 'bg-orange-500/15',   text: 'text-orange-400',   border: 'border-orange-500/20' },
  'Shopping':        { bg: 'bg-rose-500/15',     text: 'text-rose-400',     border: 'border-rose-500/20' },
  'Social Media':    { bg: 'bg-pink-500/15',     text: 'text-pink-400',     border: 'border-pink-500/20' },
  'Uncategorized':   { bg: 'bg-zinc-500/15',     text: 'text-zinc-400',     border: 'border-zinc-500/20' },
  'Other':           { bg: 'bg-zinc-500/15',     text: 'text-zinc-400',     border: 'border-zinc-500/20' },
};

export function getCategoryStyle(category: string) {
  return CATEGORY_COLORS[category] || CATEGORY_COLORS['Other'];
}
