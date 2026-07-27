# CONTEXT_BUNDLE.md — Resume Builder Page Revamp

> This file contains the actual source code for every file the solution touches.
> The target AI should use this as its codebase reference — no access to the real repo.

---

## 1. Current Type Definitions

### src/types/resume.ts (full file, 304 lines)

```typescript
export interface UserProfile {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  phone: string;
  linkedinUrl: string;
  githubUrl: string;
  portfolioUrl: string;
  location: string;
  targetRole: string;
  careerLevel: 'junior' | 'mid' | 'senior' | 'staff' | 'principal';
  professionalSummary: string;
  createdAt: string;
  updatedAt: string;
}

export interface BuilderProgress {
  currentPhase: number;
  currentQuestionId: string;
  phaseStatus: Record<number, 'locked' | 'in_progress' | 'complete'>;
  answers: Record<string, any>;
  overallPercent: number;
}

export interface Question {
  id: string;
  phase: number;
  phaseName: string;
  questionNumber: string;
  text: string;
  whyItMatters: string;
  inputType: 'text' | 'textarea' | 'metric' | 'tags' | 'slider' | 'select';
  exampleAnswer: string;
  showExample: boolean;
  validation: {
    minLength?: number;
    requiresMetric?: boolean;
    metricTypes?: string[];
  };
  guideInclude?: string[];
  guideExclude?: string[];
  guideTips?: string[];
}

export interface AiFeedback {
  quality: 'strong' | 'good' | 'needs_work' | 'weak';
  comment: string;
  suggestion: string;
  bulletDraft: string;
}

export interface ResumeScore {
  current: number;
  previous: number;
  breakdown: Record<string, number>;
}

export interface NextQuestionResponse {
  nextQuestion: Question;
  aiFeedback: AiFeedback;
  progress: {
    overallPercent: number;
    currentPhasePercent: number;
    phaseStatus: string;
  };
  checklistUpdates: { item: string; status: string }[];
  resumeScore: ResumeScore;
}

export const PHASE_NAMES: Record<number, string> = {
  1: 'Foundation',
  2: 'Experience Archaeology',
  3: 'Project Excavation',
  4: 'Skills Inventory',
  5: 'Impact Quantification',
  6: 'Objective Audit',
  7: 'Final Assembly',
};
```

---

## 2. Current ResumeBuilderPage.tsx (full file, 353 lines)

**File:** `src/pages/ResumeBuilderPage.tsx`

```tsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, ChevronRight, Loader2, Settings, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useResumeStore } from '../stores/resumeStore';
import { CareerTapestry } from '../features/resume/components/CareerTapestry';
import { QuestionCard } from '../features/resume/components/QuestionCard';
import { AnswerInput } from '../features/resume/components/AnswerInput';
import { AiFeedbackBox } from '../features/resume/components/AiFeedbackBox';
import { ResumePreview } from '../features/resume/components/ResumePreview';
import { ProgressBar } from '../features/resume/components/ProgressBar';
import { ResizablePanel } from '../features/resume/components/ResizablePanel';
import { AiSettings } from '../features/resume/components/AiSettings';
import { Button } from '../components/ui/button';
import { Skeleton } from '../components/ui/skeleton';
import { BlurFade } from '../components/ui/blur-fade';
import { PHASE_NAMES } from '../types/resume';
import { Rocket, Briefcase, FolderOpen, Code2, TrendingUp, Search, FileText, CheckCircle, Lock } from 'lucide-react';

const phaseIcons: Record<number, any> = {
  1: Rocket, 2: Briefcase, 3: FolderOpen, 4: Code2,
  5: TrendingUp, 6: Search, 7: FileText,
};

export default function ResumeBuilderPage() {
  const navigate = useNavigate();
  const {
    builderProgress, currentQuestion, aiFeedback, resumeContent, score,
    updateBuilderProgress, setCurrentQuestion, setAiFeedback, submitAnswer,
    isSaving, isLoading, setIsLoading,
  } = useResumeStore();

  const [answer, setAnswer] = useState<any>('');
  const [showFeedback, setShowFeedback] = useState(false);
  const [showAiSettings, setShowAiSettings] = useState(false);
  const [showSkipWarning, setShowSkipWarning] = useState(false);
  const [skipWarningMessage, setSkipWarningMessage] = useState('');
  const [showChecklist, setShowChecklist] = useState(false);
  const [previewMode, setPreviewMode] = useState<'styled' | 'ats_raw'>('styled');
  const [scale, setScale] = useState(50);

  const totalQuestionsPerPhase = [4, 7, 6, 6, 4, 4, 6];
  const totalQ = totalQuestionsPerPhase.reduce((a, b) => a + b, 0);
  const currentQNum = totalQuestionsPerPhase.slice(0, builderProgress.currentPhase - 1).reduce((a, b) => a + b, 0) + 1;

  useEffect(() => {
    if (!currentQuestion) {
      loadFirstQuestion();
    }
  }, []);

  const loadFirstQuestion = async (phase?: number) => {
    try {
      setIsLoading(true);
      const result = await (window as any).deskflowAPI?.resume?.nextQuestion({
        currentPhase: phase || builderProgress.currentPhase,
        currentQuestionId: builderProgress.currentQuestionId,
        previousAnswers: builderProgress.answers,
        targetRole: '',
        careerLevel: 'mid',
      });
      if (result?.nextQuestion) {
        setCurrentQuestion(result.nextQuestion);
        setAiFeedback(result.aiFeedback);
      }
    } catch (e) {
      console.error('[Builder] Failed to load question:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePhaseClick = (phase: number) => {
    if (phase !== builderProgress.currentPhase) {
      const incompletePrior = Object.entries(builderProgress.phaseStatus)
        .filter(([p, s]) => parseInt(p) < phase && s !== 'complete').length;
      if (incompletePrior > 0) {
        setSkipWarningMessage(`You're skipping ${incompletePrior} incomplete phase${incompletePrior > 1 ? 's' : ''}. The preview may show partial data.`);
        setShowSkipWarning(true);
        setTimeout(() => setShowSkipWarning(false), 4000);
      }
      updateBuilderProgress({ currentPhase: phase });
      loadFirstQuestion(phase);
    }
  };

  const handleSubmit = async () => {
    if (!answer || !currentQuestion) return;
    try {
      await submitAnswer(currentQuestion.id, answer, builderProgress.currentPhase);
      setAnswer('');
      setShowFeedback(true);
      setTimeout(() => setShowFeedback(false), 10000);
    } catch (e) {
      console.error('[Builder] Submit failed:', e);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const getPhaseState = (phase: number) => builderProgress.phaseStatus[phase] || 'locked';

  return (
    <div className="h-full flex flex-col" style={{ '--page-accent': 'rgb(99, 102, 241)' } as any}>
      {/* Sticky Header */}
      <div className="shrink-0 border-b border-zinc-800/60 px-5 h-14 bg-gradient-to-r from-zinc-900/90 to-zinc-800/70 backdrop-blur-xl sticky top-0 z-10 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/resume')} className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" /> Hub
          </button>
          <div className="w-px h-5 bg-zinc-700/50" />
          <div className="flex items-center gap-2">
            {(() => { const Icon = phaseIcons[builderProgress.currentPhase] || FileText; return <Icon className="w-4 h-4 text-[var(--page-accent)]" />; })()}
            <span className="text-sm font-semibold text-white">{PHASE_NAMES[builderProgress.currentPhase]}</span>
            <span className="text-[10px] text-zinc-500">Phase {builderProgress.currentPhase} of 7</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--page-accent)]/10 ring-1 ring-[var(--page-accent)]/20">
            <span className="text-xs text-[var(--page-accent)] font-bold tabular-nums">{score.current}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setShowAiSettings(true)} className="text-zinc-400 hover:text-white">
            <Settings className="w-3.5 h-3.5" />
          </Button>
          <Button variant="ghost" size="sm" disabled={isSaving} className="text-zinc-400 hover:text-white">
            {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          </Button>
        </div>
      </div>

      {/* Mini Tapestry */}
      <div className="shrink-0 border-b border-zinc-800/40 px-5 py-2 bg-gradient-to-r from-zinc-900/60 to-zinc-800/30">
        <CareerTapestry
          phaseStatus={builderProgress.phaseStatus as Record<number, 'locked' | 'in_progress' | 'complete'>}
          currentPhase={builderProgress.currentPhase}
          onPhaseClick={handlePhaseClick}
          compact
        />
      </div>

      {/* Skip Warning */}
      <AnimatePresence>
        {showSkipWarning && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="shrink-0 px-5 py-2 bg-amber-500/10 border-b border-amber-500/20 flex items-center gap-2"
          >
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <span className="text-xs text-amber-300">{skipWarningMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content — builder takes most space */}
      <div className="flex-1 flex gap-5 p-5 min-h-0">
        {/* Builder Panel — FLEX GROW, takes 60% */}
        <div className="flex-[3] overflow-y-auto min-w-0 scrollbar-thin">
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-[120px] rounded-xl" />
              <Skeleton className="h-[300px] rounded-xl" />
              <Skeleton className="h-[60px] rounded-xl" />
            </div>
          ) : currentQuestion ? (
            <AnimatePresence mode="wait">
              <motion.div
                key={builderProgress.currentPhase}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="space-y-5"
              >
                {/* Phase Progress — compact */}
                <ProgressBar
                  currentPhase={builderProgress.currentPhase}
                  totalPhases={7}
                  phaseStatus={builderProgress.phaseStatus}
                  overallPercent={builderProgress.overallPercent}
                />

                {/* Question Card */}
                <QuestionCard
                  question={currentQuestion}
                  questionNumber={currentQNum}
                  totalQuestions={totalQ}
                />

                {/* THE INPUT — takes up the most space */}
                <div onKeyDown={handleKeyDown} className="space-y-4">
                  <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider block">
                    Your Answer
                  </label>
                  <AnswerInput
                    inputType={currentQuestion.inputType}
                    value={answer}
                    onChange={setAnswer}
                    validation={currentQuestion.validation}
                    placeholder={
                      currentQuestion.inputType === 'metric'
                        ? 'e.g., 42%, 3 months, $50k'
                        : currentQuestion.inputType === 'tags'
                        ? 'Type and press Enter...'
                        : 'Type your answer here...'
                    }
                  />

                  {/* Submit — inline with input, always visible */}
                  <motion.button
                    whileHover={{ scale: 1.01, y: -1 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleSubmit}
                    disabled={!answer || isSaving}
                    className="w-full h-14 rounded-xl bg-[var(--page-accent)] text-white font-semibold text-sm flex items-center justify-center gap-2.5 disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-110 transition-all shadow-[0_0_24px_rgba(99,102,241,0.25)] hover:shadow-[0_0_36px_rgba(99,102,241,0.4)]"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="w-4.5 h-4.5 animate-spin" />
                        <span>Analyzing your answer...</span>
                      </>
                    ) : (
                      <>
                        <span>Submit Answer</span>
                        <ChevronRight className="w-4 h-4" />
                      </>
                    )}
                  </motion.button>
                </div>

                {/* AI Feedback — below input */}
                <AiFeedbackBox
                  feedback={aiFeedback}
                  visible={showFeedback}
                  onDismiss={() => setShowFeedback(false)}
                />

                {/* Phase Checklist — collapsible, at bottom */}
                <div className="rounded-xl bg-gradient-to-br from-zinc-900/80 to-zinc-800/40 border border-zinc-800/60 overflow-hidden">
                  <button
                    onClick={() => setShowChecklist(!showChecklist)}
                    className="w-full px-5 py-3 flex items-center justify-between hover:bg-zinc-800/20 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-zinc-400">Journey Checklist</span>
                      <span className="text-[10px] text-zinc-500 tabular-nums">
                        {Object.values(builderProgress.phaseStatus).filter(s => s === 'complete').length}/7 phases
                      </span>
                    </div>
                    {showChecklist ? <ChevronUp className="w-3.5 h-3.5 text-zinc-500" /> : <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />}
                  </button>
                  <AnimatePresence>
                    {showChecklist && (
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: 'auto' }}
                        exit={{ height: 0 }}
                        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                        className="overflow-hidden"
                      >
                        <div className="px-5 pb-4 space-y-1">
                          {Array.from({ length: 7 }, (_, i) => {
                            const phase = i + 1;
                            const state = getPhaseState(phase);
                            const Icon = phaseIcons[phase] || FileText;
                            return (
                              <button
                                key={phase}
                                onClick={() => state !== 'locked' && handlePhaseClick(phase)}
                                disabled={state === 'locked'}
                                className={`w-full flex items-center gap-3 p-2.5 rounded-lg transition-all duration-150 ${
                                  state === 'locked' ? 'opacity-40 cursor-not-allowed' : 'hover:bg-zinc-800/30 cursor-pointer'
                                }`}
                              >
                                <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                                  state === 'complete' ? 'bg-emerald-500/15 ring-1 ring-emerald-500/20' : state === 'in_progress' ? 'bg-[var(--page-accent)]/15 ring-1 ring-[var(--page-accent)]/20' : 'bg-zinc-800/60'
                                }`}>
                                  {state === 'complete' ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> :
                                   state === 'in_progress' ? <Icon className="w-3.5 h-3.5 text-[var(--page-accent)]" /> :
                                   <Lock className="w-3 h-3 text-zinc-600" />}
                                </div>
                                <span className={`text-xs ${state === 'locked' ? 'text-zinc-600' : state === 'complete' ? 'text-zinc-300' : 'text-white'}`}>
                                  {phase}. {PHASE_NAMES[phase]}
                                </span>
                                {state === 'complete' && (
                                  <span className="ml-auto text-[10px] text-emerald-400 font-medium">Done</span>
                                )}
                                {state === 'in_progress' && (
                                  <span className="ml-auto text-[10px] text-[var(--page-accent)] font-medium">Current</span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            </AnimatePresence>
          ) : (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-[var(--page-accent)] animate-spin mb-3" />
              <p className="text-sm text-zinc-400">Loading first question...</p>
            </div>
          )}
        </div>

        {/* Preview Panel — FLEX SHRINK, takes 40% */}
        <ResizablePanel defaultWidth={420} minWidth={300} maxWidth={800} storageKey="resume-preview-width">
          <div className="h-full flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">Live Preview</span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPreviewMode('styled')}
                  className={`text-[10px] px-2.5 py-1 rounded-lg transition-all duration-150 ${previewMode === 'styled' ? 'text-white bg-[var(--page-accent)]/15 ring-1 ring-[var(--page-accent)]/20' : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'}`}
                >
                  Styled
                </button>
                <button
                  onClick={() => setPreviewMode('ats_raw')}
                  className={`text-[10px] px-2.5 py-1 rounded-lg transition-all duration-150 ${previewMode === 'ats_raw' ? 'text-white bg-[var(--page-accent)]/15 ring-1 ring-[var(--page-accent)]/20' : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'}`}
                >
                  ATS Raw
                </button>
                <div className="w-px h-3 bg-zinc-700/50 mx-1" />
                <button onClick={() => setScale(s => Math.max(25, s - 10))} className="text-[10px] text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800/50 transition-colors">−</button>
                <span className="text-[10px] text-zinc-500 tabular-nums w-8 text-center">{scale}%</span>
                <button onClick={() => setScale(s => Math.min(100, s + 10))} className="text-[10px] text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800/50 transition-colors">+</button>
              </div>
            </div>
            <div className="flex-1 rounded-xl overflow-hidden border border-zinc-800/60 shadow-lg shadow-black/20">
              <ResumePreview content={resumeContent} mode={previewMode} scale={scale} />
            </div>
          </div>
        </ResizablePanel>
      </div>

      <AiSettings
        isOpen={showAiSettings}
        onClose={() => setShowAiSettings(false)}
        onSave={(config) => console.log('AI settings saved:', config)}
      />
    </div>
  );
}
```

---

## 3. Current AnswerInput.tsx (full file, 150 lines)

**File:** `src/features/resume/components/AnswerInput.tsx`

```tsx
import { useState } from 'react';
import { X, Plus } from 'lucide-react';
import { Input } from '../../../components/ui/input';
import { VoiceInput } from './VoiceInput';
import type { Question } from '../../../types/resume';

interface AnswerInputProps {
  inputType: Question['inputType'];
  value: any;
  onChange: (value: any) => void;
  validation?: Question['validation'];
  placeholder?: string;
  disabled?: boolean;
}

export function AnswerInput({ inputType, value, onChange, validation, placeholder, disabled }: AnswerInputProps) {
  const [tagInput, setTagInput] = useState('');

  if (inputType === 'tags') {
    // ... tags implementation with chips + input
  }

  if (inputType === 'textarea') {
    return (
      <div className="relative">
        <textarea
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder || 'Type your answer here...'}
          disabled={disabled}
          rows={16}
          className="w-full p-5 pr-14 rounded-xl bg-gradient-to-br from-zinc-900/80 to-zinc-800/40 ring-1 ring-zinc-700/50 text-[15px] text-white placeholder-zinc-500 outline-none focus:ring-[var(--page-accent)]/50 focus:ring-2 transition-all duration-150 resize-y min-h-[320px] disabled:opacity-50 disabled:cursor-wait leading-relaxed"
        />
        <VoiceInput value={value || ''} onChange={onChange} disabled={disabled} />
      </div>
    );
  }

  if (inputType === 'metric') {
    return (
      <div className="relative">
        <Input
          type="text"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder || 'e.g., 42%, 3 months, $50k'}
          disabled={disabled}
          className="h-14 pr-14 text-base rounded-xl bg-gradient-to-br from-zinc-900/80 to-zinc-800/40"
        />
        <VoiceInput value={value || ''} onChange={onChange} disabled={disabled} />
      </div>
    );
  }

  // Default: text input — single line, h-14, text-base
  return (
    <div className="relative">
      <Input
        type="text"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || 'Type your answer here...'}
        disabled={disabled}
        className="h-14 pr-14 text-base rounded-xl bg-gradient-to-br from-zinc-900/80 to-zinc-800/40"
      />
      <VoiceInput value={value || ''} onChange={onChange} disabled={disabled} />
    </div>
  );
}
```

---

## 4. Current ResizablePanel.tsx (full file, 100 lines)

**File:** `src/features/resume/components/ResizablePanel.tsx`

```tsx
import { useState, useRef, useCallback, useEffect } from 'react';
import { GripVertical } from 'lucide-react';

interface ResizablePanelProps {
  defaultWidth?: number;
  minWidth?: number;
  maxWidth?: number;
  storageKey?: string;
  children: React.ReactNode;
  className?: string;
}

export function ResizablePanel({
  defaultWidth = 400,
  minWidth = 300,
  maxWidth = 800,
  storageKey = 'resume-preview-width',
  children,
  className = '',
}: ResizablePanelProps) {
  const [width, setWidth] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? parseInt(saved, 10) : defaultWidth;
    } catch {
      return defaultWidth;
    }
  });
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    startXRef.current = e.clientX;
    startWidthRef.current = width;
  }, [width]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    const delta = startXRef.current - e.clientX;
    const newWidth = Math.max(minWidth, Math.min(maxWidth, startWidthRef.current + delta));
    setWidth(newWidth);
  }, [isDragging, minWidth, maxWidth]);

  const handleMouseUp = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
      try {
        localStorage.setItem(storageKey, String(width));
      } catch { /* ignore */ }
    }
  }, [isDragging, width, storageKey]);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  return (
    <div ref={containerRef} className={`flex h-full ${className}`}>
      <div
        style={{ width: `${width}px` }}
        className="shrink-0 overflow-y-auto scrollbar-thin"
      >
        {children}
      </div>

      {/* Drag Handle — currently renders INSIDE the panel on the LEFT */}
      <div
        onMouseDown={handleMouseDown}
        className={`w-1 shrink-0 cursor-col-resize flex items-center justify-center group transition-colors duration-150 ${
          isDragging
            ? 'bg-[var(--page-accent)]'
            : 'bg-zinc-700 hover:bg-zinc-500'
        }`}
      >
        <GripVertical
          className={`w-3 h-3 transition-colors duration-150 ${
            isDragging
              ? 'text-white'
              : 'text-zinc-500 group-hover:text-zinc-300'
          }`}
        />
      </div>
    </div>
  );
}
```

**PROBLEM:** The drag handle is rendered INSIDE the ResizablePanel's flex container, on the LEFT of the children. This means the handle appears between the builder panel and the preview panel, but the resize logic only controls the preview panel's width. The handle should be BETWEEN the two panels, and resizing should adjust the split ratio.

---

## 5. Current AiSettings.tsx (full file, 238 lines)

**File:** `src/features/resume/components/AiSettings.tsx`

```tsx
// STANDALONE — completely disconnected from main settings
// Uses localStorage key 'resume-ai-settings'
// Has 3 hardcoded providers: OpenAI, Anthropic, Ollama
// NOT connected to the main multi-provider system in deskflow-prefs.json

interface AiProviderConfig {
  provider: 'openai' | 'anthropic' | 'ollama';
  apiKey: string;
  model: string;
  temperature: number;
  baseUrl?: string;
}

const providers = [
  { id: 'openai' as const, name: 'OpenAI', models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'] },
  { id: 'anthropic' as const, name: 'Anthropic', models: ['claude-sonnet-4-20250514', 'claude-3-5-haiku-20241022', 'claude-3-opus-20240229'] },
  { id: 'ollama' as const, name: 'Local (Ollama)', models: ['llama3', 'mistral', 'codellama', 'phi3'] },
];
```

---

## 6. Main AI Provider System (the one to connect to)

### AiProviderSelectModal.tsx (src/components/AiProviderSelectModal.tsx)

This is the existing per-feature provider selector used by Research Digest and Goal Assistant. It reads `aiProviders` from the main process and supports per-feature routing.

```typescript
interface AiProviderSelectModalProps {
  open: boolean;
  onClose: () => void;
  featureKey: 'researchDigest' | 'goalAssistant';  // <-- needs 'resumeBuilder' added
  featureLabel: string;
  accentColor: string;
  providers: ProviderOption[];  // from main process
  currentRouting: RoutingEntry | null | undefined;
  onSave: (entry: RoutingEntry | null) => void;
}

interface ProviderOption {
  id: string;
  label: string;
  models: string[];
  enabled: boolean;
}

interface RoutingEntry {
  providerId: string;
  model: string;
}
```

### Provider Router (src/services/providers/router.ts)

```typescript
export function buildChain(
  state: AiProvidersState,
  feature: 'researchDigest' | 'goalAssistant',  // <-- needs 'resumeBuilder'
): Array<{ provider: ResolvedProvider; model: string }> {
  // Builds fallback chain from enabled providers
}

export async function runWithFallback(
  chain: ReturnType<typeof buildChain>,
  req: Omit<CanonicalRequest, 'model'>,
  externalSignal?: AbortSignal,
): Promise<{ result: CanonicalResponse; usedProviderId: string }> {
  // Tries each provider in chain order with token tier reduction
}
```

### Available Providers (from Settings)
- OpenRouter (enabled by default)
- Google Gemini
- Cloudflare
- Ollama (local)
- GitHub Models
- Custom OpenAI-compatible

---

## 7. Current Zustand Store (resumeStore.ts)

```typescript
interface ResumeState {
  builderProgress: BuilderProgress;
  currentQuestion: Question | null;
  aiFeedback: AiFeedback | null;
  resumeContent: ResumeContent;
  score: ResumeScore;
  // ... other state
  submitAnswer: (questionId: string, answer: any, phase: number) => Promise<NextQuestionResponse>;
}
```

**NOTE:** `builderProgress.answers` is a `Record<string, any>` (questionId → answer) but there's NO `questionHistory` array. The UI has no way to show previous questions.

---

## 8. Backend submitAnswer Handler (main.ts, lines 27912-27929)

```typescript
electron_1.ipcMain.handle('resume:submitAnswer', (_e, questionId, answer, phase) => {
  const qs = resumePhases[phase] || resumePhases[1];
  const idx = qs.findIndex((q: any) => q.id === questionId);
  const nextQ = qs[idx + 1] || null;
  let nextPhase = phase;
  let nextQFinal = nextQ;
  if (!nextQFinal && phase < 7) {
    nextPhase = phase + 1;
    nextQFinal = { id: `phase_${nextPhase}_1`, phase: nextPhase, ... };
  }
  const overallPercent = Math.round(((phase - 1) / 7) * 100 + ((idx + 1) / qs.length) * (100 / 7));
  return {
    nextQuestion: nextQFinal,
    aiFeedback: {
      quality: answer.length > 30 ? 'strong' : answer.length > 15 ? 'good' : 'needs_work',
      comment: answer.length > 30 ? 'Great detail!' : answer.length > 15 ? 'Good start.' : 'Can you elaborate more?',
      suggestion: answer.length < 15 ? 'Try to include specific numbers and outcomes.' : '',
      bulletDraft: ''
    },
    progress: { overallPercent, currentPhasePercent, phaseStatus },
    checklistUpdates: [],
    resumeScore: { current: Math.min(30 + overallPercent, 95), ... },
  };
});
// ⚠️ AI FEEDBACK IS HARDCODED — based on answer.length, NOT real AI
```

---

## 9. Available UI Components in Project

Already installed in `src/components/ui/`:
- accordion, alert-dialog, animated-circular-progress-bar, animated-gradient-text, animated-shiny-text
- aurora-text, badge, blur-fade, border-beam, button
- dialog, dot-pattern, dropdown-menu, input, marquee
- number-ticker, particles, progress, scroll-area, select
- separator, shadow, shiny-button, skeleton, tabs
- toggle, tooltip

Available via shadcn-ui-mcp (61 components):
- textarea, slider, resizable, sheet, drawer, sonner, spinner
- card, combobox, command, form, radio-group, switch
- calendar, table, pagination, breadcrumb, sidebar

---

## 10. Design Tokens

```css
/* Page accent for Resume Builder */
--page-accent: rgb(99, 102, 241)  /* indigo-500 */

/* Glass pattern */
bg-[rgba(24,24,27,0.80)] backdrop-blur-xl border border-[rgba(63,63,70,0.50)]

/* Animation tokens */
--fast: 150ms (hover/press)
--normal: 250ms (modals, content swap)
--slow: 400ms (page transitions)
--ease-out: cubic-bezier(0.16, 1, 0.3, 1)

/* Typography */
Body: Geist/Inter 13px/400
Mono: JetBrains Mono
Card title: 13px/600
Section h2: 15px/600
Page title: 18px/600

/* Spacing */
p-5 (20px) for cards
rounded-xl (12px) max radius
```

---

## 11. Resume Page Routes

| Route | Component | Purpose |
|-------|-----------|---------|
| `/resume` | ResumePage | Hub: hero, career tapestry, identity card, score gauge |
| `/resume/build` | ResumeBuilderPage | 7-phase question builder with live preview |
| `/resume/preview` | ResumePreviewPage | Full-screen styled/ATS/heatmap preview |
| `/resume/import` | ResumeImportPage | Chat/doc/cert import |
| `/resume/export` | ResumeExportPage | Version management + export/reports |

---

## 12. IPC Endpoints (Resume Feature)

| Endpoint | Purpose | Status |
|----------|---------|--------|
| `resume:nextQuestion` | Get next question for phase | ✅ Real (returns hardcoded questions) |
| `resume:submitAnswer` | Submit answer, get next + feedback | ⚠️ Stub (feedback is length-based) |
| `resume:getAiSettings` | Load AI provider config | ✅ Real (JSON file) |
| `resume:saveAiSettings` | Save AI provider config | ✅ Real (JSON file) |
| `resume:testAiConnection` | Test AI connection | ⚠️ Stub (always returns success) |
| `resume:saveProgress` | Persist builder progress | ✅ Real |
| `resume:loadProgress` | Load builder progress | ✅ Real |

---

## 13. Files to Modify (Complete List)

| File | Change |
|------|--------|
| `src/pages/ResumeBuilderPage.tsx` | Restructure layout, add question history, connect AI modal |
| `src/features/resume/components/AnswerInput.tsx` | Auto-expanding textarea, fix font sizes |
| `src/features/resume/components/ResizablePanel.tsx` | Refactor to be a proper split panel with center handle |
| `src/features/resume/components/AiSettings.tsx` | DELETE — replaced by AiProviderSelectModal |
| `src/features/resume/components/AiFeedbackBox.tsx` | Minor polish (keep mostly as-is) |
| `src/features/resume/components/QuestionCard.tsx` | Minor polish (keep mostly as-is) |
| `src/stores/resumeStore.ts` | Add questionHistory to BuilderProgress |
| `src/types/resume.ts` | Add questionHistory field to BuilderProgress |
| `src/main.ts` (submitAnswer handler) | Connect to real AI provider via router |
| `src/components/AiProviderSelectModal.tsx` | Add 'resumeBuilder' to featureKey union |
| `src/services/providers/router.ts` | Add 'resumeBuilder' to feature union |
