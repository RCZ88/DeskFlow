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
