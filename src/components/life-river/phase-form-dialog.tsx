"use client"

import * as React from 'react'
import { useEffect, useMemo, useState } from 'react'

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectItem } from '@/components/ui/select'
import {
  Slider,
  SliderControl,
  SliderIndicator,
  SliderThumb,
  SliderTrack,
  SliderValue,
} from '@/components/ui/slider'

import {
  MONTHS,
  PHASE_CATEGORIES,
  magnitudeWords,
  uid,
  type LifePhase,
} from '@/lib/riverMath'
import { Sparkles } from 'lucide-react'

const EMPTY: Omit<LifePhase, 'id'> = {
  title: '',
  description: '',
  category: 'growth',
  startMonth: new Date().getMonth() + 1,
  startYear: new Date().getFullYear(),
  endMonth: null,
  endYear: null,
  magnitude: 50,
  color: null,
  reflection: '',
  eraTrends: '',
  impactNotes: '',
  milestones: [],
  connections: [],
}

interface PhaseFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initial?: LifePhase | null
  onSave: (phase: LifePhase) => void
}

export function PhaseFormDialog({ open, onOpenChange, initial, onSave }: PhaseFormDialogProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('growth')
  const [startMonth, setStartMonth] = useState(EMPTY.startMonth)
  const [startYear, setStartYear] = useState(String(EMPTY.startYear))
  const [hasEnd, setHasEnd] = useState(false)
  const [endMonth, setEndMonth] = useState(12)
  const [endYear, setEndYear] = useState(String(new Date().getFullYear() + 1))
  const [magnitude, setMagnitude] = useState(50)

  useEffect(() => {
    if (!open) return
    setTitle(initial?.title ?? '')
    setDescription(initial?.description ?? '')
    setCategory(initial?.category ?? 'growth')
    setStartMonth(initial?.startMonth ?? EMPTY.startMonth)
    setStartYear(String(initial?.startYear ?? EMPTY.startYear))
    setHasEnd(Boolean(initial?.endYear && initial.endYear > 0))
    setEndMonth(initial?.endMonth ?? 12)
    setEndYear(String(initial?.endYear ?? new Date().getFullYear() + 1))
    setMagnitude(initial?.magnitude ?? 50)
  }, [open, initial])

  const yearNum = (s: string) => {
    const n = parseInt(s, 10)
    return Number.isFinite(n) ? n : 0
  }

  const valid = useMemo(() => {
    const sy = yearNum(startYear)
    const ey = hasEnd ? yearNum(endYear) : null
    if (!title.trim() || sy < 1900 || sy > 2100) return false
    if (ey != null && (ey < sy || ey > 2200)) return false
    return true
  }, [title, startYear, endYear, hasEnd])

  const handleSave = () => {
    if (!valid) return
    const phase: LifePhase = {
      id: initial?.id ?? uid('phase'),
      title: title.trim(),
      description: description.trim(),
      category,
      startMonth,
      startYear: yearNum(startYear),
      endMonth: hasEnd ? endMonth : null,
      endYear: hasEnd ? yearNum(endYear) : null,
      magnitude,
      color: initial?.color ?? null,
      reflection: initial?.reflection ?? '',
      eraTrends: initial?.eraTrends ?? '',
      impactNotes: initial?.impactNotes ?? '',
      milestones: initial?.milestones ?? [],
      connections: initial?.connections ?? [],
    }
    onSave(phase)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-lifephase="phase-form-dialog" className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-[15px] text-zinc-100">
            {initial ? 'Edit phase' : 'Add a phase'}
          </DialogTitle>
          <DialogDescription>
            A phase is a stretch of your life — school, a job, a relationship, a move.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3.5">
          <div className="space-y-1.5">
            <Label htmlFor="phase-title">Title</Label>
            <Input
              id="phase-title"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. University, First startup, Parenthood"
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="phase-description">Description</Label>
            <Textarea
              id="phase-description"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="A sentence or two about what this time was like…"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory} valueLabel={Object.fromEntries(PHASE_CATEGORIES.map(c => [c.id, c.label]))}>
                {PHASE_CATEGORIES.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Magnitude</Label>
              <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-2.5 pt-3 pb-2">
                <Slider
                  value={magnitude}
                  onValueChange={setMagnitude}
                  min={0}
                  max={100}
                  step={1}
                  className="grow"
                  aria-label="Magnitude"
                >
                  <SliderControl>
                    <SliderTrack>
                      <SliderIndicator style={{ width: `${magnitude}%` }} />
                    </SliderTrack>
                    <SliderThumb />
                  </SliderControl>
                  <SliderValue />
                </Slider>
              </div>
              <p className="flex items-center gap-1 text-[11px] text-amber-300/80">
                <Sparkles size={11} /> {magnitudeWords(magnitude)}
              </p>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Starts</Label>
            <div className="flex gap-2">
              <select
                value={startMonth}
                onChange={e => setStartMonth(Number(e.target.value))}
                className="h-8 rounded-lg border border-border bg-background px-2 text-sm text-foreground outline-none focus-visible:border-ring"
                aria-label="Start month"
              >
                {MONTHS.map((m, i) => (
                  <option key={m} value={i + 1}>{m}</option>
                ))}
              </select>
              <Input
                value={startYear}
                onChange={e => setStartYear(e.target.value.replace(/[^\d]/g, ''))}
                inputMode="numeric"
                maxLength={4}
                className="w-24"
                placeholder="Year"
                aria-label="Start year"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-[12px] text-zinc-400 select-none">
            <input
              type="checkbox"
              checked={hasEnd}
              onChange={e => setHasEnd(e.target.checked)}
              className="size-3.5 accent-amber-400"
            />
            This phase has ended
          </label>

          {hasEnd && (
            <div className="space-y-1.5">
              <Label>Ended</Label>
              <div className="flex gap-2">
                <select
                  value={endMonth}
                  onChange={e => setEndMonth(Number(e.target.value))}
                  className="h-8 rounded-lg border border-border bg-background px-2 text-sm text-foreground outline-none focus-visible:border-ring"
                  aria-label="End month"
                >
                  {MONTHS.map((m, i) => (
                    <option key={m} value={i + 1}>{m}</option>
                  ))}
                </select>
                <Input
                  value={endYear}
                  onChange={e => setEndYear(e.target.value.replace(/[^\d]/g, ''))}
                  inputMode="numeric"
                  maxLength={4}
                  className="w-24"
                  placeholder="Year"
                  aria-label="End year"
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="mt-2">
          <DialogClose render={<Button variant="ghost">Cancel</Button>} />
          <Button
            variant="default"
            disabled={!valid}
            onClick={handleSave}
            data-lifephase="save-phase"
          >
            {initial ? 'Save changes' : 'Add phase'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
