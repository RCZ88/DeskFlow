import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, FileJson, BookOpen, GraduationCap, Lightbulb, Code2, HelpCircle, Brain } from 'lucide-react';

const steps = [
  {
    icon: <FileJson className="w-5 h-5" />,
    title: '.ldoc Format',
    desc: 'Lessons are typed JSON documents with a schema. Each lesson has nodes (topics), each node has blocks (prose, math, code, diagrams, quizzes, and more).',
  },
  {
    icon: <BookOpen className="w-5 h-5" />,
    title: '10 Block Types',
    desc: 'Prose, Code, Math (KaTeX), Mermaid diagrams, Images, Videos, Widgets, Quizzes, Callouts, and Layers (reveal at mastery level).',
  },
  {
    icon: <Lightbulb className="w-5 h-5" />,
    title: 'Mastery Levels (L0–L5)',
    desc: 'Each node targets a mastery level. The tutor tracks your level per node and schedules spaced-repetition reviews when you dip below threshold.',
  },
  {
    icon: <GraduationCap className="w-5 h-5" />,
    title: 'Import Methods',
    desc: 'Start with the built-in worked example, open a lesson file from disk, or paste a .lmd lesson (or compiled .ldoc JSON). The validator checks schema, DAG cycles, visual rules, and grounding.',
  },
  {
    icon: <Brain className="w-5 h-5" />,
    title: 'AI Tutor & Quiz',
    desc: 'Ask questions, get grounded answers with citations from lesson sources. Submit quiz answers to level up and unlock deeper layer content.',
  },
];

// Progressive accent: steps warm from clay-300 -> clay-500 as the learner
// advances, ending in sage when complete. Literal class names so Tailwind's
// JIT scanner picks them up.
const STEP_CIRCLE = [
  'bg-clay-500/15 text-clay-300',
  'bg-clay-500/15 text-clay-400',
  'bg-clay-500/20 text-clay-400',
  'bg-clay-500/20 text-clay-500',
  'bg-sage-500/15 text-sage-400',
];
const STEP_DOT = ['bg-clay-300', 'bg-clay-400', 'bg-clay-400', 'bg-clay-500', 'bg-sage-400'];

export function OnboardingPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [currentStep, setCurrentStep] = useState(0);

  if (!open) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg mx-4 rounded-2xl border border-zinc-700/50 bg-zinc-900 shadow-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-clay-400" />
            <h2 className="font-semibold text-zinc-100">How Lyceum Works</h2>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 transition">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6">
          <div className="flex items-center justify-center mb-6">
            <div className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors duration-300 ${STEP_CIRCLE[currentStep] ?? STEP_CIRCLE[STEP_CIRCLE.length - 1]}`}>
              {steps[currentStep].icon}
            </div>
          </div>

          <h3 className="text-center text-lg font-medium text-zinc-100 mb-2">{steps[currentStep].title}</h3>
          <p className="text-center text-sm text-zinc-400 leading-relaxed">{steps[currentStep].desc}</p>

          <div className="flex items-center justify-center gap-3 mt-8">
            {steps.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentStep(i)}
                className={`w-2 h-2 rounded-full transition ${
                  i === currentStep
                    ? `${STEP_DOT[currentStep] ?? 'bg-clay-400'} w-6`
                    : i < currentStep
                    ? 'bg-sage-400/60'
                    : 'bg-zinc-700 hover:bg-zinc-600'
                }`}
              />
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-800">
          <button
            onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
            disabled={currentStep === 0}
            className="text-sm text-zinc-400 hover:text-zinc-200 disabled:opacity-30 disabled:cursor-not-allowed transition"
          >
            Previous
          </button>
          {currentStep < steps.length - 1 ? (
            <button
              onClick={() => setCurrentStep(Math.min(steps.length - 1, currentStep + 1))}
              className="px-4 py-2 rounded-lg bg-clay-500/20 hover:bg-clay-500/30 text-clay-300 text-sm font-medium transition border border-clay-400/30"
            >
              Next
            </button>
          ) : (
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-sage-500/20 hover:bg-sage-500/30 text-sage-300 text-sm font-medium transition border border-sage-400/30"
            >
              Got it
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
