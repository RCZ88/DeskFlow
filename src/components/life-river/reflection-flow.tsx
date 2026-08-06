"use client"

import * as React from 'react'
import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { ChevronLeft, LoaderCircle, Sparkles } from 'lucide-react'

const QUESTIONS = [
  'Where were you, and what was the circumstance, when this phase began?',
  'What did your days look like? What did this phase demand of you?',
  'What did it change about you — and what would you tell the person you were then?',
]

interface ReflectionFlowProps {
  onBack: () => void
  onSubmit: (answers: string[]) => Promise<string | null>
  onKeep: (text: string) => void
}

export function ReflectionFlow({ onBack, onSubmit, onKeep }: ReflectionFlowProps) {
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<string[]>(['', '', ''])
  const [generating, setGenerating] = useState(false)
  const [result, setResult] = useState<string | null>(null)

  const answer = answers[step] ?? ''
  const setAnswer = (v: string) => setAnswers(a => a.map((x, i) => (i === step ? v : x)))

  const next = async () => {
    if (step < 2) {
      setStep(s => s + 1)
      return
    }
    setGenerating(true)
    const text = await onSubmit(answers)
    setGenerating(false)
    if (text) setResult(text)
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
          {result}
        </p>
        <div className="flex gap-2 pt-1">
          <Button variant="default" size="sm" onClick={() => onKeep(result)}>
            Keep it in this phase
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setResult(null)}>
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
