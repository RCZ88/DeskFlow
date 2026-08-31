"use client"

import { useState } from 'react'
import { Check, Zap, BookOpen, BarChart3, Flame, Film, Minus, Layers, Rocket, ListOrdered, MessageCircleQuestion, ChevronDown, ChevronUp, Palette, Lock, Unlock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { STYLE_PACKAGES, TEMPLATE_CATEGORIES, type PromptTemplate } from '../templates/templateData'

const ICON_MAP: Record<string, React.ReactNode> = {
  Zap: <Zap size={14} />,
  BookOpen: <BookOpen size={14} />,
  BarChart3: <BarChart3 size={14} />,
  Flame: <Flame size={14} />,
  Film: <Film size={14} />,
  Minus: <Minus size={14} />,
  Layers: <Layers size={14} />,
  Rocket: <Rocket size={14} />,
  ListOrdered: <ListOrdered size={14} />,
  MessageCircleQuestion: <MessageCircleQuestion size={14} />,
}

interface TemplateSelectorProps {
  selected: string[]
  onChange: (ids: string[]) => void
  frameMode?: 'strict' | 'flexible'
  onFrameModeChange?: (mode: 'strict' | 'flexible') => void
  className?: string
}

export function TemplateSelector({ selected, onChange, frameMode = 'strict', onFrameModeChange, className }: TemplateSelectorProps) {
  const [expandedCat, setExpandedCat] = useState<string | null>('tone')

  const toggle = (id: string) => {
    const tmpl = STYLE_PACKAGES.find(t => t.id === id)
    if (!tmpl) return
    const sameCat = selected.filter(sid => {
      const s = STYLE_PACKAGES.find(t => t.id === sid)
      return s?.category === tmpl.category
    })
    const withoutSameCat = selected.filter(sid => !sameCat.includes(sid))
    if (sameCat.includes(id)) {
      onChange(withoutSameCat)
    } else {
      onChange([...withoutSameCat, id])
    }
  }

  return (
    <div className={cn('space-y-3', className)}>
      {/* Frame mode toggle */}
      {onFrameModeChange && (
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 text-[10px] font-semibold tracking-wider text-zinc-400 uppercase">
            <Palette size={12} />
            Style Templates
          </div>
          <div className="ml-auto flex items-center gap-1 rounded-lg border border-white/[0.06] bg-white/[0.03] p-0.5">
            <button
              onClick={() => onFrameModeChange('strict')}
              className={cn('flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium transition-colors',
                frameMode === 'strict' ? 'bg-amber-500/15 text-amber-400' : 'text-zinc-500 hover:text-zinc-300')}>
              <Lock size={10} /> Strict
            </button>
            <button
              onClick={() => onFrameModeChange('flexible')}
              className={cn('flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium transition-colors',
                frameMode === 'flexible' ? 'bg-blue-500/15 text-blue-400' : 'text-zinc-500 hover:text-zinc-300')}>
              <Unlock size={10} /> Flexible
            </button>
          </div>
        </div>
      )}

      {!onFrameModeChange && (
        <div className="flex items-center gap-2 text-[10px] font-semibold tracking-wider text-zinc-400 uppercase">
          <Palette size={12} />
          Style Templates
        </div>
      )}

      {TEMPLATE_CATEGORIES.map(cat => {
        const templates = STYLE_PACKAGES.filter(t => t.category === cat.id)
        const isOpen = expandedCat === cat.id
        const selectedInCat = selected.find(sid => {
          const s = STYLE_PACKAGES.find(t => t.id === sid)
          return s?.category === cat.id
        })
        const selectedTmpl = selectedInCat ? STYLE_PACKAGES.find(t => t.id === selectedInCat) : null

        return (
          <div key={cat.id} className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
            <button
              onClick={() => setExpandedCat(isOpen ? null : cat.id)}
              className="flex w-full items-center justify-between px-3.5 py-2.5 text-left transition-colors hover:bg-white/[0.03]"
            >
              <div className="flex items-center gap-2.5">
                <div className="min-w-0">
                  <div className="text-xs font-medium text-zinc-200">{cat.label}</div>
                  <div className="text-[10px] text-zinc-500">{cat.description}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {selectedTmpl && (
                  <span
                    className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium"
                    style={{ backgroundColor: `rgba(${selectedTmpl.accentRGB},0.15)`, color: selectedTmpl.accent }}
                  >
                    {ICON_MAP[selectedTmpl.icon]}
                    {selectedTmpl.name}
                  </span>
                )}
                {isOpen ? <ChevronUp size={12} className="text-zinc-500" /> : <ChevronDown size={12} className="text-zinc-500" />}
              </div>
            </button>

            {isOpen && (
              <div className="grid grid-cols-2 gap-2 p-3 pt-0">
                {templates.map(tmpl => {
                  const isSelected = selected.includes(tmpl.id)
                  return (
                    <button
                      key={tmpl.id}
                      onClick={() => toggle(tmpl.id)}
                      className={cn(
                        'group relative flex flex-col items-start gap-1.5 rounded-lg border p-3 text-left transition-all',
                        isSelected
                          ? 'border-transparent ring-1'
                          : 'border-white/[0.06] hover:border-white/[0.12] hover:bg-white/[0.03]'
                      )}
                      style={{
                        borderColor: isSelected ? tmpl.accent : undefined,
                        boxShadow: isSelected ? `0 0 12px rgba(${tmpl.accentRGB},0.15)` : undefined,
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="flex h-6 w-6 items-center justify-center rounded-md"
                          style={{ backgroundColor: `rgba(${tmpl.accentRGB},0.15)`, color: tmpl.accent }}
                        >
                          {ICON_MAP[tmpl.icon] || <Zap size={14} />}
                        </div>
                        {isSelected && (
                          <div className="flex h-4 w-4 items-center justify-center rounded-full" style={{ backgroundColor: tmpl.accent }}>
                            <Check size={10} className="text-black" />
                          </div>
                        )}
                      </div>
                      <div className="text-[11px] font-semibold text-zinc-100">{tmpl.name}</div>
                      <div className="text-[10px] leading-relaxed text-zinc-500 line-clamp-2">{tmpl.preview}</div>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {tmpl.tags.slice(0, 2).map(tag => (
                          <span key={tag} className="rounded bg-white/[0.05] px-1 py-0.5 text-[8px] text-zinc-600">{tag}</span>
                        ))}
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
