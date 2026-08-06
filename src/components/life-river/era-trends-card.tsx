"use client"

import * as React from 'react'
import { useMemo, useState } from 'react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { LifePhase } from '@/lib/riverMath'
import { Globe, Landmark, LoaderCircle, WandSparkles } from 'lucide-react'

interface EraTrends {
  world?: string[]
  culture?: string[]
  field?: string[]
}

interface EraTrendsCardProps {
  phase: LifePhase
  onGenerate: () => Promise<string | null>
  onSave: (phase: LifePhase) => void
}

export function EraTrendsCard({ phase, onGenerate, onSave }: EraTrendsCardProps) {
  const [busy, setBusy] = useState(false)

  const parsed = useMemo<EraTrends | null>(() => {
    if (!phase.eraTrends) return null
    try {
      const obj = JSON.parse(phase.eraTrends)
      if (obj && Array.isArray(obj.world) && Array.isArray(obj.culture) && Array.isArray(obj.field)) {
        return obj as EraTrends
      }
      return null
    } catch {
      return null
    }
  }, [phase.eraTrends])

  const generate = async () => {
    setBusy(true)
    const text = await onGenerate()
    setBusy(false)
    if (text && phase.id) {
      onSave({ ...phase, eraTrends: text })
    }
  }

  const columns: Array<{ key: keyof EraTrends; label: string; icon: React.ReactNode }> = [
    { key: 'world', label: 'World', icon: <Globe size={12} /> },
    { key: 'culture', label: 'Culture', icon: <Landmark size={12} /> },
    { key: 'field', label: 'My field', icon: <WandSparkles size={12} /> },
  ]

  if (!parsed) {
    return (
      <div
        data-lifephase="era-trends"
        className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-3"
      >
        <div className="flex items-center justify-between gap-2">
          <p className="text-[12px] text-zinc-400">
            <span className="font-display text-zinc-200">Era trends</span> — what was happening in the world,
            in culture, and in your field during this phase?
          </p>
          <Button
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={generate}
            data-lifephase="generate-era-trends"
          >
            {busy ? <LoaderCircle size={13} className="animate-spin" /> : <WandSparkles size={13} />}
            {busy ? 'Gathering…' : 'Generate'}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div data-lifephase="era-trends" className="space-y-2.5">
      <div className="flex items-center justify-between">
        <p className="font-display text-[12.5px] text-zinc-200">Era trends</p>
        <Button variant="ghost" size="sm" className="h-6 px-2 text-[11px]" disabled={busy} onClick={generate}>
          {busy ? <LoaderCircle size={11} className="animate-spin" /> : <WandSparkles size={11} />}
          Regenerate
        </Button>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {columns.map(({ key, label, icon }) => (
          <div key={key} className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-2">
            <p className="mb-1.5 flex items-center gap-1 text-[10px] tracking-wide text-zinc-500 uppercase">
              {icon} {label}
            </p>
            <div className="flex flex-wrap gap-1">
              {(parsed[key] ?? []).slice(0, 6).map((item, i) => (
                <span
                  key={`${key}-${i}`}
                  className={cn(
                    'rounded-full border px-1.5 py-0.5 text-[10px]',
                    key === 'field'
                      ? 'border-amber-400/25 bg-amber-400/10 text-amber-200'
                      : key === 'world'
                        ? 'border-sky-400/25 bg-sky-400/10 text-sky-200'
                        : 'border-violet-400/25 bg-violet-400/10 text-violet-200'
                  )}
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
