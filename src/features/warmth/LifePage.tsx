"use client"

import * as React from 'react'
import { useCallback, useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion'
import { HeartHandshake, Images, Layers, Map } from 'lucide-react'
import { cn } from '@/lib/utils'

import { RiverMap } from '@/components/life-river/RiverMap'
import { TodayTributary } from '@/components/life-river/TodayTributary'
import { PhaseCard } from '@/components/life-river/PhaseCard'
import { PhaseFormDialog } from '@/components/life-river/phase-form-dialog'
import { MemoryLightbox } from '@/components/life-river/memory-lightbox'
import { LifeRiver } from '@/components/life-river/river'
import CovenantPage from '../../features/covenant/CovenantPage'
import MemoriesPage from '../../features/memories/MemoriesPage'
import GoldPage from '../../features/warmth/gold/GoldPage'
import { confetti } from '../../components/ui/confetti'
import { useLifePhases } from '@/hooks/useLifePhases'
import { useCovenant } from '../../features/covenant/useCovenant'
import { useMemories, type LoadedMemory } from '../../features/memories/useMemories'
import type { Goal, LongTermGoal } from '../../components/dashboard/types'
import type { LTGForm } from '../warmth/gold/GoldPage'

const toStr = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const todayStr = () => toStr(new Date())

type ViewMode = 'pages' | 'river'
type PageTab = 'covenant' | 'memories' | 'gold'

const PAGE_TABS: { key: PageTab; label: string; icon: typeof HeartHandshake; accent: string }[] = [
  { key: 'covenant', label: 'Covenant', icon: HeartHandshake, accent: '#e8866b' },
  { key: 'memories', label: 'Memories', icon: Images, accent: '#6fb38f' },
  { key: 'gold', label: 'Gold', icon: Layers, accent: '#fbbf24' },
]

const crossfade = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.2, ease: [0.16, 1, 0.3, 1] as const },
}

const pillTransition = { type: 'spring' as const, stiffness: 400, damping: 32 }

export default function LifePage() {
  const { phases, loading, error, savePhase, reflect } = useLifePhases()
  const covenant = useCovenant()
  const memories = useMemories()

  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    try { return (localStorage.getItem('life-view-mode') as ViewMode) || 'river' } catch { return 'river' }
  })
  const [pageTab, setPageTab] = useState<PageTab>('covenant')

  const [zoomStop, setZoomStop] = useState('Life')
  const [activePhaseId, setActivePhaseId] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [goals, setGoals] = useState<Goal[]>([])
  const [ltgs, setLtgs] = useState<LongTermGoal[]>([])
  const [viewing, setViewing] = useState<LoadedMemory | null>(null)

  const feedRef = useRef<HTMLDivElement>(null)
  const { scrollY } = useScroll({ container: feedRef })
  const mapOpacity = useTransform(scrollY, [0, 200], [1, 0.85])
  const mapScale = useTransform(scrollY, [0, 300], [1, 0.97])

  const setMode = useCallback((m: ViewMode) => {
    setViewMode(m)
    try { localStorage.setItem('life-view-mode', m) } catch { /* ignore */ }
  }, [])

  const reloadGoals = useCallback(async () => {
    try {
      const gRes = await (window as any).deskflowAPI.getGoals(todayStr())
      if (gRes?.goals) setGoals(gRes.goals)
    } catch { /* non-critical */ }
  }, [])

  const reloadLtgs = useCallback(async () => {
    try {
      const lRes = await (window as any).deskflowAPI.getLongtermGoals()
      if (lRes?.goals) setLtgs(lRes.goals)
    } catch { /* non-critical */ }
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const [gRes, lRes] = await Promise.all([
          (window as any).deskflowAPI.getGoals(todayStr()),
          (window as any).deskflowAPI.getLongtermGoals(),
        ])
        if (cancelled) return
        if (gRes?.goals) setGoals(gRes.goals)
        if (lRes?.goals) setLtgs(lRes.goals)
      } catch { /* non-critical */ }
    })()
    return () => { cancelled = true }
  }, [])

  const scrollToPhase = useCallback((id: string) => {
    setActivePhaseId(id)
    try {
      document.getElementById(`phase-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    } catch { /* ignore */ }
  }, [])

  const toggleGoal = useCallback(
    async (goal: Goal) => {
      const newStatus = goal.status === 'done' ? 'active' : 'done'
      const completedAt = newStatus === 'done' ? new Date().toISOString() : undefined
      setGoals(prev => prev.map(g => (g.id === goal.id ? { ...g, status: newStatus as any, completedAt } : g)))
      if (newStatus === 'done') confetti({ particleCount: 60, spread: 90, startVelocity: 40, colors: ['#8b5cf6', '#a78bfa', '#34d399', '#fbbf24'] })
      try {
        await (window as any).deskflowAPI.saveGoal(todayStr(), { ...goal, status: newStatus, completedAt })
      } catch {
        setGoals(prev => prev.map(g => (g.id === goal.id ? goal : g)))
      }
    },
    []
  )

  const handleAddGoal = useCallback(
    async (goal: Goal) => {
      setGoals(prev => [...prev, goal])
      try {
        await (window as any).deskflowAPI.saveGoal(todayStr(), goal)
        confetti({ particleCount: 50, spread: 80, startVelocity: 35, colors: ['#fbbf24', '#f59e0b', '#34d399', '#a78bfa'] })
        await reloadGoals()
      } catch {
        setGoals(prev => prev.filter(g => g.id !== goal.id))
      }
    },
    [reloadGoals]
  )

  const handleAddLTG = useCallback(
    async (form: LTGForm): Promise<boolean> => {
      try {
        const res = await (window as any).deskflowAPI.saveGoalsBatch([{
          id: `ltg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          title: form.title.trim(),
          description: form.description.trim() || null,
          category: form.category,
          priority: form.priority,
          deadline: form.deadline || null,
          status: 'active',
          period: 'longterm',
          date: '2000-01-01',
          source: 'manual',
          links: [],
        }])
        if (res?.success) { await reloadLtgs(); return true }
        return false
      } catch { return false }
    },
    [reloadLtgs]
  )

  const handleKeepReflection = useCallback(
    (phase: Parameters<typeof reflect>[0], text: string) => {
      savePhase({ ...phase, reflection: text }, { silent: true })
    },
    [savePhase]
  )

  if (loading && phases.length === 0) {
    return (
      <div className="flex flex-col gap-4 p-5" data-page="life">
        <div className="h-64 animate-pulse rounded-xl border border-zinc-800/50 bg-zinc-900/40" />
        <div className="h-40 animate-pulse rounded-xl border border-zinc-800/50 bg-zinc-900/40" />
        <div className="h-40 animate-pulse rounded-xl border border-zinc-800/50 bg-zinc-900/40" />
      </div>
    )
  }

  if (error && phases.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 p-10 text-center" data-page="life">
        <p className="text-[13px] text-zinc-400">Could not load the river.</p>
        <p className="text-[12px] text-zinc-600">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="rounded-lg border border-zinc-700/60 bg-zinc-800/40 px-3 py-1.5 text-[12px] text-zinc-300 hover:bg-zinc-800/70"
        >
          Reload
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full" data-page="life">
      {/* ── Mode Toggle ── */}
      <div className="sticky top-0 z-40 -mx-5 px-5 bg-zinc-900/20 backdrop-blur-md border-b border-zinc-800/50">
        <div className="flex items-center gap-2 py-2">
          <span className="text-[15px] font-semibold mr-2 text-[var(--text-primary)]">Life</span>

          {/* View mode toggle */}
          <div className="flex gap-1 bg-zinc-800/50 p-0.5 rounded-lg">
            {([
              { key: 'pages' as ViewMode, label: 'Pages', icon: Map },
              { key: 'river' as ViewMode, label: 'River', icon: Layers },
            ]).map(mode => (
              <button
                key={mode.key}
                onClick={() => setMode(mode.key)}
                className={`relative px-3 py-1.5 text-xs rounded-md transition-colors min-h-[36px] flex items-center gap-1.5 ${
                  viewMode === mode.key ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {viewMode === mode.key && (
                  <motion.div
                    layoutId="life-mode-pill"
                    className="absolute inset-0 rounded-md bg-zinc-700/80 border border-white/10"
                    transition={pillTransition}
                  />
                )}
                <mode.icon className="w-3.5 h-3.5 relative z-10" />
                <span className="relative z-10 font-medium">{mode.label}</span>
              </button>
            ))}
          </div>

          {/* Page sub-tabs (only in pages mode) */}
          {viewMode === 'pages' && (
            <motion.div
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex gap-1 ml-2 bg-zinc-800/50 p-0.5 rounded-lg"
            >
              {PAGE_TABS.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setPageTab(tab.key)}
                  className={`relative px-3 py-1.5 text-xs rounded-md transition-colors min-h-[36px] flex items-center gap-1.5 ${
                    pageTab === tab.key ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  {pageTab === tab.key && (
                    <motion.div
                      layoutId="life-page-pill"
                      className="absolute inset-0 rounded-md"
                      style={{ background: `${tab.accent}22`, border: `1px solid ${tab.accent}40` }}
                      transition={pillTransition}
                    />
                  )}
                  <tab.icon className="w-3.5 h-3.5 relative z-10" style={pageTab === tab.key ? { color: tab.accent } : undefined} />
                  <span className="relative z-10 font-medium">{tab.label}</span>
                </button>
              ))}
            </motion.div>
          )}
        </div>
      </div>

      {/* ── Content ── */}
      {viewMode === 'pages' ? (
        /* ═══ OLD 3-TAB MODE ═══ */
        <div className="flex-1 min-h-0 overflow-auto p-5">
          <AnimatePresence mode="wait">
            {pageTab === 'covenant' && (
              <motion.div key="covenant" {...crossfade} className="max-w-3xl mx-auto">
                <CovenantPage embedded />
              </motion.div>
            )}
            {pageTab === 'memories' && (
              <motion.div key="memories" {...crossfade} className="max-w-4xl mx-auto">
                <MemoriesPage embedded />
              </motion.div>
            )}
            {pageTab === 'gold' && (
              <motion.div key="gold" {...crossfade} className="max-w-5xl mx-auto">
                <GoldPage />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ) : (
        /* ═══ NEW RIVER MODE ═══ */
        <div className="flex flex-col flex-1 min-h-0 relative" ref={feedRef}>
          {/* Vital Thread — continuous glowing line */}
          <div className="absolute left-1/2 top-0 bottom-0 w-px -translate-x-1/2 pointer-events-none z-0"
            style={{
              background: 'linear-gradient(to bottom, rgba(251,191,36,0.25) 0%, rgba(111,179,143,0.2) 40%, rgba(56,189,248,0.15) 80%, transparent 100%)',
              filter: 'blur(0.5px)',
            }}
          />

          {/* Apex Map (sticky with scroll parallax) */}
          <motion.div style={{ opacity: mapOpacity, scale: mapScale }}>
            <RiverMap
              phases={phases}
              zoomStop={zoomStop}
              onZoomChange={setZoomStop}
              activePhaseId={activePhaseId}
              onPhaseClick={scrollToPhase}
              onAddPhase={() => setAdding(true)}
            />
          </motion.div>

          <div className="flex-1 min-h-0 overflow-auto p-5 ws-scroll relative z-10">
            <div className="mx-auto max-w-5xl space-y-8">
              <motion.div
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              >
                <TodayTributary
                  covenant={covenant}
                  memories={memories}
                  goals={goals}
                  longTermGoals={ltgs}
                  onToggleGoal={toggleGoal}
                  onAddGoal={handleAddGoal}
                  onAddLTG={handleAddLTG}
                />
              </motion.div>

              {phases.length === 0 ? (
                <div className="rounded-xl border border-dashed border-zinc-800 py-10 text-center">
                  <p className="text-[12.5px] text-zinc-600">
                    Add your first phase above and it will flow into the river.
                  </p>
                </div>
              ) : (
                phases.map((phase, i) => (
                  <motion.div
                    key={phase.id}
                    id={`phase-${phase.id}`}
                    className="scroll-mt-32"
                    initial={{ opacity: 0, y: 50 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-100px' }}
                    transition={{ duration: 0.5, delay: i * 0.05, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <PhaseCard
                      phase={phase}
                      active={activePhaseId === phase.id}
                      memories={memories.items}
                      longTermGoals={ltgs}
                      onActiveChange={setActivePhaseId}
                      onSave={p => { savePhase(p) }}
                      onReflect={(p, answers) => reflect(p, answers)}
                      onKeepReflection={handleKeepReflection}
                      onOpenMemory={setViewing}
                    />
                  </motion.div>
                ))
              )}
            </div>
          </div>

          <PhaseFormDialog
            open={adding}
            onOpenChange={setAdding}
            onSave={p => {
              savePhase(p)
              setAdding(false)
            }}
          />

          {viewing && <MemoryLightbox memory={viewing} onClose={() => setViewing(null)} />}
        </div>
      )}
    </div>
  )
}
