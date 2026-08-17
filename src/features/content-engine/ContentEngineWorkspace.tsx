import { useState } from 'react'
import { Activity, Sparkles, Lightbulb, Clapperboard, Palette, BarChart3, GraduationCap, Layers } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ToastHost } from './components/ui'
import { BrainstormView } from './components/BrainstormView'
import { IdeasView } from './components/IdeasView'
import { EpisodesView } from './components/EpisodesView'
import { ThemesView } from './components/ThemesView'
import { AnalyticsView } from './components/AnalyticsView'
import { LessonsView } from './components/LessonsView'
import { FrameworksView } from './components/FrameworksView'
import { ProcessGalleryView } from './components/ProcessGalleryView'

console.log('%c[ContentEngine] v3.0 loaded', 'color:#f5c518;font-weight:bold')

const VIEWS = [
  { id: 'brainstorm', label: 'Brainstorm', icon: Sparkles },
  { id: 'ideas', label: 'Ideas', icon: Lightbulb },
  { id: 'episodes', label: 'Episodes', icon: Clapperboard },
  { id: 'themes', label: 'Themes', icon: Palette },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'lessons', label: 'Lessons', icon: GraduationCap },
  { id: 'frameworks', label: 'Frameworks', icon: Layers },
  { id: 'process', label: 'Process', icon: Activity },
]

export function ContentEngineWorkspace() {
  const [view, setView] = useState<string>('brainstorm')

  return (
    <div className="flex h-full gap-3 p-3" data-page="content-engine">
      <nav className="flex w-44 shrink-0 flex-col gap-1 rounded-xl border border-white/[0.06] bg-[rgba(24,24,27,0.60)] p-2 backdrop-blur-xl">
        <div className="px-2 pt-1 pb-2">
          <div className="text-[10px] font-semibold tracking-wider text-[#f5c518] uppercase">Content Engine</div>
          <div className="text-[9px] text-zinc-600">8-stage pipeline</div>
        </div>
        {VIEWS.map((v) => {
          const Icon = v.icon
          const active = view === v.id
          return (
            <button
              key={v.id}
              onClick={() => setView(v.id)}
              className={cn(
                'flex h-8 items-center gap-2 rounded-lg px-2.5 text-xs font-medium transition-colors',
                active ? 'bg-[#f5c518]/10 text-[#f5c518]' : 'text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200',
              )}
            >
              <Icon size={13} />
              <span>{v.label}</span>
            </button>
          )
        })}
      </nav>
      <main className="min-w-0 flex-1 overflow-y-auto rounded-xl border border-white/[0.06] bg-[rgba(24,24,27,0.60)] backdrop-blur-xl">
        <div className="space-y-6 p-6">
          {view === 'brainstorm' && <BrainstormView onNavigate={setView} />}
          {view === 'ideas' && <IdeasView />}
          {view === 'episodes' && <EpisodesView />}
          {view === 'themes' && <ThemesView />}
          {view === 'analytics' && <AnalyticsView />}
          {view === 'lessons' && <LessonsView />}
          {view === 'frameworks' && <FrameworksView />}
          {view === 'process' && <ProcessGalleryView />}
        </div>
      </main>
      <ToastHost />
    </div>
  )
}