// ============================================================================
// Design Studio Tab — Visual gallery, live preview, style options
// Users browse 7 design styles, see live preview, select options, apply.
// ============================================================================
import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Palette, Check, MousePointerClick, Square, Zap,
  Monitor, Terminal, Send, Settings, Save, ChevronRight
} from 'lucide-react'
import { UI_STYLES, DesignStyle, resolveTokens, applyTokensToElement } from '../../lib/designPresets'
import { WorkspaceCard, WorkspaceSection } from './_ds/containers'
import { listContainer, riseItem } from './_ds/motion'

// ---- Live Preview Canvas ---------------------------------------------------
function LivePreviewCanvas({ tokens }: { tokens: Record<string, string> }) {
  const bg = tokens['--bg-primary'] || '#000'
  const surface = tokens['--bg-secondary'] || '#0a0a0a'
  const text = tokens['--text-primary'] || '#fff'
  const textSec = tokens['--text-secondary'] || '#999'
  const accent = tokens['--accent-primary'] || '#22d3ee'
  const radius = tokens['--radius-base'] || '0px'
  const shadow = tokens['--shadow-base'] || 'none'
  const border = tokens['--border-base'] || 'none'
  const blur = tokens['--glass-blur'] || 'none'

  return (
    <div
      className="p-6 rounded-xl transition-all duration-300 space-y-4"
      style={{ background: surface, borderRadius: radius, border: border === 'none' ? '1px solid rgba(255,255,255,0.05)' : border }}
    >
      {/* Typography Preview */}
      <div>
        <p className="text-[10px] uppercase tracking-widest mb-1" style={{ color: textSec }}>Typography</p>
        <h3 className="text-lg font-bold" style={{ color: text }}>Preview Heading</h3>
        <p className="text-xs mt-1" style={{ color: textSec }}>Sample body text for readability check</p>
      </div>

      {/* Buttons */}
      <div className="flex items-center gap-2">
        <button
          className="px-4 py-2 text-xs font-semibold transition-all"
          style={{ background: accent, color: bg, borderRadius: radius, border: 'none', boxShadow: shadow }}
        >
          Primary
        </button>
        <button
          className="px-4 py-2 text-xs font-medium transition-all"
          style={{
            background: 'transparent',
            color: text,
            borderRadius: radius,
            border: border === 'none' ? `1px solid ${textSec}` : border,
            boxShadow: shadow,
          }}
        >
          Secondary
        </button>
      </div>

      {/* Card Preview */}
      <div
        className="p-4 flex items-center justify-between"
        style={{ background: bg, borderRadius: radius, border: border === 'none' ? 'none' : border, boxShadow: shadow, backdropFilter: blur !== 'none' ? blur : undefined }}
      >
        <div>
          <p className="text-xs font-semibold" style={{ color: text }}>Card Component</p>
          <p className="text-[10px]" style={{ color: textSec }}>With active state</p>
        </div>
        <span
          className="px-2 py-0.5 text-[10px] font-semibold rounded-full"
          style={{ background: accent, color: bg }}
        >
          Active
        </span>
      </div>

      {/* Input Preview */}
      <div
        className="px-3 py-2 text-xs"
        style={{
          background: bg,
          borderRadius: radius,
          border: border === 'none' ? `1px solid ${textSec}30` : border,
          color: textSec,
        }}
      >
        Input field placeholder...
      </div>
    </div>
  )
}

// ---- Main Component -------------------------------------------------------
export function DesignStudioTab() {
  const [activeStyleId, setActiveStyleId] = useState('glassmorphism')
  const [activeOptions, setActiveOptions] = useState<Record<string, string>>({})
  const [applied, setApplied] = useState(false)

  const activeStyle = UI_STYLES.find(s => s.id === activeStyleId) || UI_STYLES[0]
  const tokens = resolveTokens(activeStyle, activeOptions)

  // Apply tokens to workspace root on change
  useEffect(() => {
    const root = document.querySelector('[data-workspace-root]') as HTMLElement
    if (root) {
      applyTokensToElement(root, tokens)
    }
  }, [tokens])

  const handleStyleSelect = useCallback((styleId: string) => {
    setActiveStyleId(styleId)
    setActiveOptions({})
    setApplied(false)
  }, [])

  const handleOptionSelect = useCallback((optId: string, valId: string) => {
    setActiveOptions(prev => ({ ...prev, [optId]: valId }))
    setApplied(false)
  }, [])

  const handleApply = useCallback(() => {
    // Save to localStorage for persistence
    localStorage.setItem('workspace-design-style', JSON.stringify({
      styleId: activeStyleId,
      options: activeOptions,
    }))
    setApplied(true)
    setTimeout(() => setApplied(false), 2000)
  }, [activeStyleId, activeOptions])

  // Load saved style on mount
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('workspace-design-style') || '{}')
      if (saved.styleId) {
        setActiveStyleId(saved.styleId)
        setActiveOptions(saved.options || {})
      }
    } catch {}
  }, [])

  return (
    <div className="flex flex-col gap-4 p-3 min-h-0 overflow-y-auto scrollbar-thin">
      {/* ── Style Selection Grid ── */}
      <WorkspaceSection title="Select Design Language" icon={Palette} accent="indigo">
        <motion.div
          className="grid grid-cols-2 lg:grid-cols-3 gap-2"
          variants={listContainer} initial="hidden" animate="show"
        >
          {UI_STYLES.map((style) => {
            const isActive = activeStyleId === style.id
            const styleTokens = resolveTokens(style, {})
            return (
              <motion.button
                key={style.id}
                variants={riseItem}
                onClick={() => handleStyleSelect(style.id)}
                className={`relative text-left p-3 rounded-xl transition-all duration-200 border ${
                  isActive
                    ? 'ring-2 ring-offset-1 ring-offset-zinc-950'
                    : 'hover:border-zinc-600'
                }`}
                style={{
                  background: styleTokens['--bg-secondary'],
                  borderColor: isActive ? styleTokens['--accent-primary'] : undefined,
                  // @ts-ignore
                  '--tw-ring-color': isActive ? styleTokens['--accent-primary'] : undefined,
                }}
              >
                {isActive && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center"
                    style={{ background: styleTokens['--accent-primary'] }}
                  >
                    <Check className="w-3 h-3" style={{ color: styleTokens['--bg-primary'] }} />
                  </motion.div>
                )}

                {/* Color swatches */}
                <div className="flex gap-1 mb-2">
                  <div className="w-4 h-4 rounded-full" style={{ background: styleTokens['--bg-primary'], border: '1px solid rgba(255,255,255,0.1)' }} />
                  <div className="w-4 h-4 rounded-full" style={{ background: styleTokens['--accent-primary'] }} />
                  <div className="w-4 h-4 rounded-full" style={{ background: styleTokens['--text-primary'], border: '1px solid rgba(255,255,255,0.1)' }} />
                </div>

                <h4 className="text-[12px] font-semibold mb-0.5" style={{ color: styleTokens['--text-primary'] }}>
                  {style.name}
                </h4>
                <p className="text-[10px] leading-tight" style={{ color: styleTokens['--text-secondary'] }}>
                  {style.description}
                </p>
              </motion.button>
            )
          })}
        </motion.div>
      </WorkspaceSection>

      {/* ── Live Preview + Options ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Live Preview */}
        <WorkspaceSection title="Live Preview" icon={MousePointerClick} accent="indigo">
          <LivePreviewCanvas tokens={tokens} />
        </WorkspaceSection>

        {/* Style Options */}
        <WorkspaceSection title={`${activeStyle.name} Options`} icon={Square} accent="indigo">
          <div className="space-y-4">
            {activeStyle.options.map((opt) => (
              <div key={opt.id}>
                <label className="text-[10px] uppercase tracking-widest text-zinc-500 block mb-2">
                  {opt.label}
                </label>
                <div className="flex gap-1.5">
                  {Object.keys(opt.values).map((valId) => (
                    <button
                      key={valId}
                      onClick={() => handleOptionSelect(opt.id, valId)}
                      className={`flex-1 px-3 py-1.5 text-[11px] font-medium rounded-lg transition-all duration-150 border ${
                        activeOptions[opt.id] === valId
                          ? 'text-white'
                          : 'text-zinc-400 bg-zinc-800/50 border-zinc-700/50 hover:bg-zinc-700/50'
                      }`}
                      style={activeOptions[opt.id] === valId ? {
                        background: tokens['--accent-primary'],
                        color: tokens['--bg-primary'],
                        borderColor: tokens['--accent-primary'],
                      } : undefined}
                    >
                      {valId}
                    </button>
                  ))}
                </div>
              </div>
            ))}

            {/* Apply Button */}
            <button
              onClick={handleApply}
              className="w-full py-2 rounded-lg text-[12px] font-semibold transition-all duration-150 flex items-center justify-center gap-1.5"
              style={{
                background: tokens['--accent-primary'],
                color: tokens['--bg-primary'],
                border: 'none',
              }}
            >
              {applied ? (
                <><Check className="w-3.5 h-3.5" /> Applied!</>
              ) : (
                <><Zap className="w-3.5 h-3.5" /> Apply Design</>
              )}
            </button>
          </div>
        </WorkspaceSection>
      </div>

      {/* ── Style Info ── */}
      <WorkspaceSection title="MCP Routing Rules" icon={Terminal} accent="indigo">
        <WorkspaceCard variant="inset">
          <div className="space-y-2">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-zinc-500 mb-1">Allowed Components</p>
              <div className="flex flex-wrap gap-1">
                {activeStyle.allowedMCP.map((c) => (
                  <span key={c} className="px-1.5 py-0.5 text-[9px] font-medium bg-emerald-500/15 text-emerald-400 rounded">
                    {c}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-zinc-500 mb-1">Forbidden Components</p>
              <div className="flex flex-wrap gap-1">
                {activeStyle.forbiddenMCP.map((c) => (
                  <span key={c} className="px-1.5 py-0.5 text-[9px] font-medium bg-red-500/15 text-red-400 rounded">
                    {c}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </WorkspaceCard>
      </WorkspaceSection>
    </div>
  )
}
