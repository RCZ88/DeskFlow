"use client"

import * as React from 'react'
import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import type { LifePhase } from '@/lib/riverMath'
import { ChevronLeft, LoaderCircle, RefreshCw, Sparkles } from 'lucide-react'

const QUESTIONS = [
  'Where were you, and what was the circumstance, when this phase began?',
  'What did your days look like? What did this phase demand of you?',
  'What did it change about you — and what would you tell the person you were then?',
]

export interface AiReflectResult {
  text: string
  confidence: 'grounded' | 'sparse'
}

interface ReflectionFlowProps {
  phase: LifePhase
  onBack: () => void
  onSubmit: (phase: LifePhase, answers: string[], variation?: string) => Promise<AiReflectResult | null>
  onKeep: (text: string) => void
}

export function ReflectionFlow({ phase, onBack, onSubmit, onKeep }: ReflectionFlowProps) {
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<string[]>(['', '', ''])
  const [generating, setGenerating] = useState(false)
  const [result, setResult] = useState<AiReflectResult | null>(null)

  const answer = answers[step] ?? ''
  const setAnswer = (v: string) => setAnswers(a => a.map((x, i) => (i === step ? v : x)))

  const run = async (variation?: string) => {
    setGenerating(true)
    const res = await onSubmit(phase, answers, variation)
    setGenerating(false)
    if (res) setResult(res)
  }

  const next = async () => {
    if (step < 2) {
      setStep(s => s + 1)
      return
    }
    await run()
  }

  if (result) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-3"
        data-lifephase="reflection-result"
      >
        <p className="font-serif text-[14px] leading-relaxed text-zinc-200 italic">
          {result.text}
        </p>
        {result.confidence === 'sparse' && (
          <p className="rounded-lg border border-zinc-700/50 bg-zinc-800/40 px-3 py-2 text-[11.5px] text-zinc-400">
            You gave me a lot of dates but not much story — want to add a sentence or two so this feels more like you?
          </p>
        )}
        <div className="flex gap-2 pt-1">
          <Button variant="default" size="sm" onClick={() => onKeep(result.text)}>
            Keep it in this phase
          </Button>
          <Button variant="ghost" size="sm" disabled={generating} onClick={() => run('give me a different angle on the same chapter.')}>
            {generating ? <LoaderCircle size={13} className="animate-spin" /> : <RefreshCw size={13} />}
            Try again
          </Button>
        </div>
      </motion.div>
    )
  }

  return (
    <div className="space-y-3" data-lifephase="reflection-flow">
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-[11px] text-zinc-500 transition-colors hover:text-zinc-300"
        >
          <ChevronLeft size={12} /> Back
        </button>
        <div className="flex gap-1">
          {QUESTIONS.map((_, i) => (
            <span
              key={i}
              className={cn(
                'h-1 rounded-full transition-all',
                i === step ? 'w-5 bg-amber-400' : i < step ? 'w-2 bg-amber-400/50' : 'w-2 bg-white/15'
              )}
            />
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 14 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -14 }}
          transition={{ duration: 0.18 }}
          className="space-y-2.5"
        >
          <p className="font-serif text-[14.5px] leading-snug text-amber-100/90 italic">
            {QUESTIONS[step]}
          </p>
          <Textarea
            value={answer}
            onChange={e => setAnswer(e.target.value)}
            placeholder="Write freely — this is just for you…"
            rows={5}
            autoFocus
          />
        </motion.div>
      </AnimatePresence>

      <div className="flex items-center justify-between">
        <span className="text-[11px] text-zinc-600">{step + 1} of {QUESTIONS.length}</span>
        <Button
          variant="default"
          size="sm"
          disabled={!answer.trim() || generating}
          onClick={next}
        >
          {generating ? (
            <><LoaderCircle size={13} className="animate-spin" /> Listening to the river…</>
          ) : step < 2 ? (
            'Next'
          ) : (
            <><Sparkles size={13} /> Write my reflection</>
          )}
        </Button>
      </div>
    </div>
  )
}
