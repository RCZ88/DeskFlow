import React, { useCallback } from 'react'
import { useContentEngine, ContentEngineProvider } from './ContentEngineContext'
import { cn } from '@/lib/utils'
import { Activity, Sparkles, Lightbulb, Clapperboard, Palette, BarChart3, GraduationCap, Layers, BookOpen, BookMarked, Film } from 'lucide-react'
import { BlurFade } from './ui-laminar'

import { AnimatedShinyText } from '@/components/ui/animated-shiny-text'
import { GradientShimmer } from '@/components/ui/gradient-shimmer'
import { ShinyButton } from '@/components/ui/shiny-button'
import { NeonGradientCard } from '@/components/ui/neon-gradient-card'
import { Confetti } from '@/components/ui/confetti'
import { LightRays } from '@/components/ui/light-rays'
import { DotPattern } from '@/components/ui/dot-pattern'

import { BrainstormView } from './components/BrainstormView'
import { IdeasView } from './components/IdeasView'
import { EpisodesView } from './components/EpisodesView'
import { SeriesView } from './components/SeriesView'
import { ThemesView } from './components/ThemesView'
import { AnalyticsView } from './components/AnalyticsView'
import { LessonsView } from './components/LessonsView'
import { FrameworksView } from './components/FrameworksView'
import { ProcessGalleryView } from './components/ProcessGalleryView'
import { PlaybookView } from './components/PlaybookView'

const PIPELINE_STAGES = [
  { id: 'ideas', label: 'Ideas', icon: Lightbulb },
  { id: 'episodes', label: 'Episodes', icon: Clapperboard },
  { id: 'series', label: 'Series', icon: BookOpen },
  { id: 'themes', label: 'Themes', icon: Palette },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'lessons', label: 'Lessons', icon: GraduationCap },
  { id: 'frameworks', label: 'Frameworks', icon: Layers },
  { id: 'process', label: 'Process', icon: Activity },
  { id: 'playbook', label: 'Playbook', icon: BookMarked },
]

function WorkspaceInner() {
  const { view, setView } = useContentEngine()

  const renderView = useCallback(() => {
    switch (view) {
      case 'brainstorm': return <BrainstormView onNavigate={setView} />
      case 'ideas': return <IdeasView />
      case 'episodes': return <EpisodesView />
      case 'series': return <SeriesView />
      case 'themes': return <ThemesView />
      case 'analytics': return <AnalyticsView />
      case 'lessons': return <LessonsView />
      case 'frameworks': return <FrameworksView />
      case 'process': return <ProcessGalleryView />
      case 'playbook': return <PlaybookView />
      default: return <IdeasView />
    }
  }, [view, setView])

  return (
    <div className="flex h-full gap-0 p-3" data-page="content-engine">
      <aside className="flex w-52 shrink-0 flex-col rounded-xl border border-white/[0.08] bg-zinc-900/80 overflow-hidden">
        <div className="px-3 pt-3 pb-1">
          <div className="flex items-center gap-2">
            <Sparkles size={14} className="text-white/70" />
            <AnimatedShinyText className="text-[11px] font-semibold tracking-wider text-zinc-200" shimmerWidth={80}>
              CONTENT ENGINE
            </AnimatedShinyText>
          </div>
          <div className="mt-0.5 text-[9px] text-zinc-500">8-stage pipeline</div>
        </div>
        <div className="flex-1 min-h-0 px-2 py-1 overflow-y-auto">
          <nav className="flex flex-col gap-0.5">
            {PIPELINE_STAGES.map((stage) => {
              const Icon = stage.icon
              const active = view === stage.id
              return (
                <button key={stage.id} onClick={() => setView(stage.id)}
                  className={cn(
                    'flex h-8 items-center gap-2.5 rounded-lg px-2.5 text-[11px] font-medium transition-all duration-200',
                    active ? 'bg-white/[0.06] text-zinc-100' : 'text-zinc-500 hover:bg-white/[0.03] hover:text-zinc-300'
                  )}>
                  <Icon size={13} />
                  <span>{stage.label}</span>
                </button>
              )
            })}
          </nav>
        </div>
        <div className="px-3 py-2 border-t border-white/[0.08]">
          <div className="flex items-center gap-1.5">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[9px] text-zinc-500">Pipeline active</span>
          </div>
        </div>
      </aside>

      <main className="relative min-w-0 flex-1 overflow-hidden rounded-xl border border-white/[0.08] bg-zinc-900/80">
        <DotPattern
          className="absolute inset-0 opacity-[0.03]"
          colors={[{ color: '#8b5cf6', opacity: 0.4 }]}
          radius={1}
          size={16}
          skip={2}
        />
        <div className="relative z-10 h-full overflow-y-auto">
          {renderView()}
        </div>
        <div className="absolute bottom-3 right-3 z-20 flex items-center gap-1.5">
          <span className="text-[9px] text-zinc-500 px-2 py-0.5 rounded-full bg-zinc-900/80 border border-white/[0.08]">
            Stage {PIPELINE_STAGES.findIndex(s => s.id === view) + 1} of {PIPELINE_STAGES.length}
          </span>
        </div>
      </main>
    </div>
  )
}

export function ContentEngineWorkspace() {
  return (
    <ContentEngineProvider>
      <WorkspaceInner />
    </ContentEngineProvider>
  )
}
