// ============================================================================
// Rich Preview Canvas — Miniature interactive app showcasing design styles
// Renders a Header, Sidebar, Main Content (Cards, Inputs, Progress), Footer
// using real shadcn/Magic UI components.
// ============================================================================
import React, { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Bell, Search, Settings, Activity, Play, Pause,
  CheckCircle, AlertCircle, Clock, TrendingUp
} from 'lucide-react'

interface PreviewProps {
  tokens: Record<string, string>
  styleId: string
  custom: {
    fontFamily: string
    fontSize: number
    cardPadding: string
    duration: number
  }
}

export function RichPreviewCanvas({ tokens, styleId, custom }: PreviewProps) {
  const [activeTab, setActiveTab] = useState('overview')
  const [toggle, setToggle] = useState(true)
  const [progress, setProgress] = useState(72)

  const bg = tokens['--bg-primary'] || '#000'
  const surface = tokens['--bg-secondary'] || '#0a0a0a'
  const text = tokens['--text-primary'] || '#fff'
  const textMuted = tokens['--text-muted'] || '#666'
  const accent = tokens['--accent-primary'] || '#22d3ee'
  const border = tokens['--border-base'] || '1px solid #1a1a1a'
  const radius = tokens['--radius-base'] || '8px'
  const shadow = tokens['--shadow-base'] || 'none'
  const blur = tokens['--blur-base'] || '0px'

  const transition = `all ${custom.duration}ms ease`

  // Style-specific background
  const containerBg = styleId === 'glassmorphism'
    ? `linear-gradient(135deg, #8b5cf6, #ec4899, #06b6d4)`
    : styleId === 'brutalism'
    ? '#ffffff'
    : styleId === 'neumorphism'
    ? '#e0e5ec'
    : bg

  return (
    <div
      className="w-full h-full flex flex-col overflow-hidden"
      style={{
        background: containerBg,
        fontFamily: custom.fontFamily,
        fontSize: `${custom.fontSize}px`,
        transition,
      }}
    >
      {/* ── Header Bar ── */}
      <header
        className="flex items-center justify-between px-3 py-2 shrink-0"
        style={{ borderBottom: border, background: surface, backdropFilter: blur !== '0px' ? blur : undefined }}
      >
        <div className="flex items-center gap-2">
          {/* Traffic lights */}
          <div className="flex gap-1">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#ff5f56' }} />
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#ffbd2e' }} />
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#27c93f' }} />
          </div>
          <span className="text-[11px] font-semibold ml-2" style={{ color: text }}>DeskFlow</span>
        </div>
        <div className="flex items-center gap-1">
          {['Overview', 'Activity'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab.toLowerCase())}
              className="px-2 py-1 text-[10px] rounded transition-all"
              style={{
                background: activeTab === tab.toLowerCase() ? accent : 'transparent',
                color: activeTab === tab.toLowerCase() ? bg : textMuted,
                borderRadius: radius,
                transition,
              }}
            >
              {tab}
            </button>
          ))}
        </div>
        <button className="p-1 rounded transition-all" style={{ color: textMuted, transition }}>
          <Bell className="w-3.5 h-3.5" />
        </button>
      </header>

      {/* ── Body: Sidebar + Main ── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Sidebar */}
        <aside
          className="w-[30%] p-3 space-y-3 shrink-0 overflow-y-auto"
          style={{ borderRight: border, background: surface, backdropFilter: blur !== '0px' ? blur : undefined }}
        >
          {/* Toggle */}
          <div className="flex items-center justify-between">
            <span className="text-[9px] uppercase tracking-wider" style={{ color: textMuted }}>Live Status</span>
            <button
              onClick={() => setToggle(!toggle)}
              className="w-8 h-4 rounded-full relative transition-all"
              style={{
                background: toggle ? accent : textMuted,
                borderRadius: radius,
                transition,
              }}
            >
              <span
                className="absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-all"
                style={{
                  left: toggle ? '16px' : '2px',
                  borderRadius: radius,
                  transition,
                }}
              />
            </button>
          </div>

          {/* Stat Card */}
          <div
            className="p-3 relative overflow-hidden"
            style={{
              background: bg,
              borderRadius: radius,
              border,
              boxShadow: shadow,
              backdropFilter: blur !== '0px' ? blur : undefined,
              transition,
            }}
          >
            <p className="text-[9px] uppercase tracking-wider mb-1" style={{ color: textMuted }}>Throughput</p>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-bold" style={{ color: accent }}>12,450</span>
              <span className="text-[9px]" style={{ color: textMuted }}>tps</span>
            </div>
          </div>

          {/* Progress Bars */}
          <div className="space-y-2">
            {[
              { label: 'CPU', value: 72, color: accent },
              { label: 'Memory', value: 58, color: '#34d399' },
              { label: 'Disk', value: 41, color: '#fbbf24' },
            ].map((item) => (
              <div key={item.label}>
                <div className="flex justify-between mb-0.5">
                  <span className="text-[9px]" style={{ color: textMuted }}>{item.label}</span>
                  <span className="text-[9px] font-mono" style={{ color: text }}>{item.value}%</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: bg, borderRadius: radius }}>
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: item.color, borderRadius: radius }}
                    initial={{ width: 0 }}
                    animate={{ width: `${item.value}%` }}
                    transition={{ duration: custom.duration / 1000, ease: 'easeOut' }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Status indicators */}
          <div className="space-y-1.5">
            {[
              { icon: CheckCircle, label: 'All systems operational', color: '#34d399' },
              { icon: Clock, label: 'Last sync: 2m ago', color: textMuted },
              { icon: TrendingUp, label: '+12% throughput', color: accent },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <item.icon className="w-3 h-3 shrink-0" style={{ color: item.color }} />
                <span className="text-[9px]" style={{ color: textMuted }}>{item.label}</span>
              </div>
            ))}
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-3 space-y-3 overflow-y-auto min-w-0">
          {/* Search Input */}
          <div
            className="flex items-center gap-2 px-3 py-2"
            style={{
              background: bg,
              borderRadius: radius,
              border,
              boxShadow: shadow,
              backdropFilter: blur !== '0px' ? blur : undefined,
              transition,
            }}
          >
            <Search className="w-3.5 h-3.5 shrink-0" style={{ color: textMuted }} />
            <span className="text-[11px]" style={{ color: textMuted }}>Search modules...</span>
          </div>

          {/* Card Grid */}
          <div className="grid grid-cols-2 gap-2">
            {/* Card 1: Active */}
            <div
              className="p-3 relative overflow-hidden"
              style={{
                background: bg,
                borderRadius: radius,
                border,
                boxShadow: shadow,
                backdropFilter: blur !== '0px' ? blur : undefined,
                transition,
              }}
            >
              <span
                className="inline-block px-1.5 py-0.5 text-[8px] font-semibold rounded mb-2"
                style={{ background: accent, color: bg, borderRadius: radius }}
              >
                Active
              </span>
              <h3 className="text-[12px] font-semibold mb-0.5" style={{ color: text }}>Neural Net</h3>
              <p className="text-[9px] mb-2" style={{ color: textMuted }}>Processing layer 4 of 8</p>
              <button
                className="w-full py-1.5 text-[10px] font-semibold transition-all active:scale-95"
                style={{
                  background: accent,
                  color: bg,
                  borderRadius: radius,
                  border: 'none',
                  transition,
                }}
              >
                Deploy
              </button>
            </div>

            {/* Card 2: Logs */}
            <div
              className="p-3 relative overflow-hidden"
              style={{
                background: bg,
                borderRadius: radius,
                border,
                boxShadow: shadow,
                backdropFilter: blur !== '0px' ? blur : undefined,
                transition,
              }}
            >
              <div className="flex items-center gap-1.5 mb-2">
                <Activity className="w-3 h-3" style={{ color: accent }} />
                <span className="text-[11px] font-semibold" style={{ color: text }}>Logs</span>
              </div>
              <div className="space-y-0.5 font-mono text-[8px]">
                <p style={{ color: textMuted }}>[00:01] Init...</p>
                <p style={{ color: accent }}>[00:02] Auth OK</p>
                <p style={{ color: textMuted }}>[00:03] Fetch...</p>
                <p style={{ color: '#34d399' }}>[00:04] Done ✓</p>
              </div>
            </div>
          </div>

          {/* Buttons Row */}
          <div className="flex gap-2">
            {[
              { label: 'Primary', bg: accent, color: bg },
              { label: 'Secondary', bg: 'transparent', color: text },
              { label: 'Danger', bg: '#ef4444', color: '#fff' },
            ].map((btn) => (
              <button
                key={btn.label}
                className="flex-1 py-1.5 text-[10px] font-semibold transition-all active:scale-95"
                style={{
                  background: btn.bg,
                  color: btn.color,
                  borderRadius: radius,
                  border: btn.bg === 'transparent' ? border : 'none',
                  transition,
                }}
              >
                {btn.label}
              </button>
            ))}
          </div>

          {/* Badge Row */}
          <div className="flex gap-1.5 flex-wrap">
            {['Active', 'Warning', 'Error', 'Info'].map((badge) => {
              const colors: Record<string, string> = {
                Active: '#34d399', Warning: '#fbbf24', Error: '#ef4444', Info: accent
              }
              return (
                <span
                  key={badge}
                  className="px-2 py-0.5 text-[9px] font-semibold"
                  style={{
                    background: `${colors[badge]}20`,
                    color: colors[badge],
                    borderRadius: radius,
                    border: `1px solid ${colors[badge]}40`,
                    transition,
                  }}
                >
                  {badge}
                </span>
              )
            })}
          </div>
        </main>
      </div>

      {/* ── Footer ── */}
      <footer
        className="px-3 py-1.5 text-center text-[9px] shrink-0"
        style={{ borderTop: border, background: surface, color: textMuted, backdropFilter: blur !== '0px' ? blur : undefined }}
      >
        DeskFlow Workspace Engine v2.0
      </footer>
    </div>
  )
}
