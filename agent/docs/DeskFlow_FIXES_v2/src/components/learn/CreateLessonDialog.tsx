import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  Copy,
  Check,
  FileText,
  Loader2,
  ChevronRight,
  ChevronLeft,
  AlertCircle,
  CheckCircle2,
  Wand2,
  Paperclip,
  X,
  AlignLeft,
  List,
} from 'lucide-react';

const api = (window as any).deskflowAPI;

type Step = 'input' | 'prompt' | 'result';
type GenStatus = 'idle' | 'generating' | 'done' | 'error';
type InputMode = 'simple' | 'detailed';

const STEPS = ['Describe', 'Prompt', 'Lesson'] as const;

function StepIndicator({ current }: { current: 0 | 1 | 2 }) {
  return (
    <div className="flex items-center gap-2">
      {STEPS.map((label, i) => {
        const active = i === current;
        const done = i < current;
        return (
          <div key={label} className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <motion.span
                animate={{ scale: active ? 1 : 0.85, opacity: active || done ? 1 : 0.5 }}
                transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                className={
                  'flex h-6 w-6 items-center justify-center rounded-lg text-[11px] font-semibold ' +
                  (active
                    ? 'bg-indigo-500/15 text-indigo-300 ring-1 ring-indigo-500/40'
                    : done
                    ? 'bg-emerald-400/10 text-emerald-300'
                    : 'bg-zinc-800/60 text-zinc-500')
                }
              >
                {done ? '\u2713' : i + 1}
              </motion.span>
              <span className={`text-xs font-medium ${active ? 'text-zinc-200' : 'text-zinc-500'}`}>{label}</span>
            </div>
            {i < STEPS.length - 1 && <span className="h-px w-6 bg-zinc-700/60" />}
          </div>
        );
      })}
    </div>
  );
}

const PHASES = ['Building prompt', 'Generating lesson', 'Validating', 'Importing'] as const;

function GenerationProgress({ phase }: { phase: number }) {
  return (
    <div className="flex flex-col gap-2.5">
      {PHASES.map((p, i) => {
        const state = i < phase ? 'done' : i === phase ? 'active' : 'pending';
        return (
          <div key={p} className="flex items-center gap-3">
            <span
              className={
                'flex h-5 w-5 items-center justify-center rounded-md text-[10px] ' +
                (state === 'done'
                  ? 'bg-emerald-400/10 text-emerald-300'
                  : state === 'active'
                  ? 'bg-indigo-500/15 text-indigo-300'
                  : 'bg-zinc-800/60 text-zinc-600')
              }
            >
              {state === 'done' ? '\u2713' : state === 'active' ? (
                <motion.span
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, ease: 'linear', duration: 0.8 }}
                  className="block h-2.5 w-2.5 rounded-full border border-indigo-300 border-t-transparent"
                />
              ) : i + 1}
            </span>
            <span className={`text-sm ${state === 'pending' ? 'text-zinc-600' : 'text-zinc-300'}`}>{p}</span>
          </div>
        );
      })}
    </div>
  );
}

export function CreateLessonDialog({
  open,
  onClose,
  onImported,
}: {
  open: boolean;
  onClose: () => void;
  onImported: () => void;
}) {
  const [step, setStep] = useState<Step>('input');
  const [inputMode, setInputMode] = useState<InputMode>('simple');
  const [userInput, setUserInput] = useState('');
  const [description, setDescription] = useState('');
  const [contextDoc, setContextDoc] = useState('');
  const [fileName, setFileName] = useState('');
  const [numNodes, setNumNodes] = useState(5);
  const [prompt, setPrompt] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [copied, setCopied] = useState(false);
  const [genStatus, setGenStatus] = useState<GenStatus>('idle');
  const [genError, setGenError] = useState('');
  const [genResult, setGenResult] = useState<any>(null);
  const [building, setBuilding] = useState(false);
  const [validPrompt, setValidPrompt] = useState(false);
  const [genPhase, setGenPhase] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) {
      setStep('input');
      setInputMode('simple');
      setUserInput('');
      setDescription('');
      setContextDoc('');
      setFileName('');
      setPrompt('');
      setCopied(false);
      setGenStatus('idle');
      setGenError('');
      setGenResult(null);
      setValidPrompt(false);
      setGenPhase(0);
    }
  }, [open]);

  const canBuildSimple = userInput.trim().length >= 10 && !building;
  const canBuildDetailed = description.trim().length >= 3 && !building;
  const canBuild = inputMode === 'simple' ? canBuildSimple : canBuildDetailed;

  const handleBuildPrompt = async () => {
    if (!canBuild) return;
    setBuilding(true);
    try {
      const params = inputMode === 'simple'
        ? { userInput: userInput.trim(), contextDoc: contextDoc.trim() || undefined }
        : { topic: description.trim(), description: description.trim(), contextDoc: contextDoc.trim() || undefined, numNodes: numNodes > 0 ? numNodes : undefined };
      const result = await api.learnBuildPrompt(params);
      if (result.ok) {
        setPrompt(result.prompt);
        setSystemPrompt(result.systemPrompt);
        setStep('prompt');
        setValidPrompt(true);
      } else {
        setGenError(result.error || 'Failed to build prompt');
        setGenStatus('error');
      }
    } catch (e: any) {
      setGenError(e.message);
      setGenStatus('error');
    } finally {
      setBuilding(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const handleDownload = () => {
    const blob = new Blob([prompt], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const text = inputMode === 'simple' ? userInput.trim() : description.trim();
    const slug = text.toLowerCase().replace(/\s+/g, '-').slice(0, 40);
    a.download = `lyceum-prompt-${slug}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => setContextDoc(reader.result as string);
    reader.readAsText(file);
  };

  const handleClearFile = () => {
    setContextDoc('');
    setFileName('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleGenerate = async () => {
    if (!validPrompt) return;
    setGenStatus('generating');
    setGenError('');
    setGenResult(null);
    setGenPhase(0);
    try {
      // Phase 1: Building prompt (already done, advance)
      setGenPhase(1);
      await new Promise(r => setTimeout(r, 300));
      // Phase 2: Generating lesson
      setGenPhase(2);
      const result = await api.learnGenerateLdoc({ prompt, systemPrompt });
      // Phase 3: Validating (done by backend)
      setGenPhase(3);
      await new Promise(r => setTimeout(r, 200));
      if (result.ok && result.data?.lessonId) {
        setGenStatus('done');
        setGenResult(result);
        onImported();
      } else {
        setGenStatus('error');
        setGenError(result.error || 'Generation failed');
        if (result.validation) {
          const issues = (result.validation.errors || []).map((e: any) => e.message || e.rule).join('; ');
          setGenError(`${result.error}. Validation issues: ${issues}`);
        }
      }
    } catch (e: any) {
      setGenStatus('error');
      setGenError(e.message);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.96, opacity: 0, y: 8 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.96, opacity: 0, y: 8 }}
            transition={{ type: 'spring', duration: 0.3, bounce: 0.06 }}
            className="relative w-full max-w-2xl max-h-[88vh] flex flex-col rounded-xl border border-zinc-800/50 bg-zinc-900/80 backdrop-blur-xl shadow-2xl shadow-black/40"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Create a new lesson"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800/80 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0">
                  <Wand2 className="w-4 h-4 text-indigo-400" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-zinc-100 leading-tight">Create a Lesson</h2>
                  <p className="text-xs text-zinc-500 mt-0.5 leading-none">
                    {step === 'input' && 'Describe what you want to learn'}
                    {step === 'prompt' && 'Your prompt is ready'}
                    {step === 'result' && 'Lesson created'}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800/60 transition-colors duration-150"
                aria-label="Close dialog"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Step indicators */}
            <div className="flex items-center gap-1 px-6 py-3 border-b border-zinc-800/60 shrink-0">
              <StepIndicator current={step === 'input' ? 0 : step === 'prompt' ? 1 : 2} />
            </div>

            {/* Mode toggle — step 1 only */}
            <AnimatePresence>
              {step === 'input' && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden border-b border-zinc-800/60"
                >
                  <div className="flex items-center gap-1 px-6 py-2.5">
                    <span className="text-xs text-zinc-500 mr-1">Mode:</span>
                    <div className="flex bg-zinc-800/70 border border-zinc-700/50 rounded-lg p-0.5 gap-0.5">
                      <button
                        onClick={() => setInputMode('simple')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150 ${
                          inputMode === 'simple'
                            ? 'bg-zinc-700 text-zinc-100 shadow-sm'
                            : 'text-zinc-500 hover:text-zinc-300'
                        }`}
                      >
                        <AlignLeft className="w-3.5 h-3.5" />
                        Simple
                      </button>
                      <button
                        onClick={() => setInputMode('detailed')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150 ${
                          inputMode === 'detailed'
                            ? 'bg-zinc-700 text-zinc-100 shadow-sm'
                            : 'text-zinc-500 hover:text-zinc-300'
                        }`}
                      >
                        <List className="w-3.5 h-3.5" />
                        Detailed
                      </button>
                    </div>
                    <span className="text-xs text-zinc-600 ml-auto">
                      {inputMode === 'simple' ? 'One input — AI figures out the rest' : 'Multiple fields for precise control'}
                    </span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Content */}
            <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5">
              <AnimatePresence mode="wait">
              {step === 'input' && inputMode === 'simple' && (
                <motion.div
                  key="simple"
                  initial={{ opacity: 0, y: 8, filter: 'blur(4px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, y: -8, filter: 'blur(4px)' }}
                  transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                  className="space-y-4"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-medium text-zinc-400">
                        What do you want to learn? <span className="text-indigo-400">*</span>
                      </label>
                      <span className="text-xs text-zinc-600">{userInput.trim().length} chars</span>
                    </div>
                    <textarea
                      value={userInput}
                      onChange={(e) => setUserInput(e.target.value)}
                      placeholder={`Describe what you want to learn. For example:\n\n"I'm a CS student who knows basic Python. I want to understand how operating systems manage memory — virtual memory, paging, segmentation, and how the kernel allocates and frees memory. I've been reading OSTEP but find the chapters dense, so I'd like something more visual with diagrams and quizzes to check my understanding."`}
                      className="w-full px-4 py-3 rounded-xl bg-zinc-800/50 border border-zinc-700/50 text-zinc-200 text-sm leading-relaxed focus:outline-none focus:border-indigo-500/40 focus:ring-2 focus:ring-indigo-500/10 resize-y placeholder:text-zinc-600 transition-all duration-150 min-h-[180px]"
                      autoFocus
                    />
                    {userInput.trim().length > 0 && userInput.trim().length < 10 && (
                      <p className="text-xs text-amber-500/80 mt-1.5">Please enter at least 10 characters</p>
                    )}
                  </div>

                  {/* Reference material */}
                  <div>
                    <label className="block text-xs font-medium text-zinc-500 mb-2">
                      Reference material <span className="text-zinc-600 font-normal">(optional)</span>
                    </label>
                    {fileName ? (
                      <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-zinc-800/40 border border-zinc-700/50">
                        <FileText className="w-4 h-4 text-indigo-400 shrink-0" />
                        <span className="text-sm text-zinc-300 truncate flex-1">{fileName}</span>
                        <button
                          onClick={handleClearFile}
                          className="p-1 rounded text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors duration-150 shrink-0"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <textarea
                          value={contextDoc}
                          onChange={(e) => setContextDoc(e.target.value)}
                          placeholder="Paste reference notes, textbook excerpts, or documentation..."
                          className="flex-1 px-3 py-2.5 rounded-xl bg-zinc-800/50 border border-zinc-700/50 text-zinc-200 text-sm leading-relaxed focus:outline-none focus:border-indigo-500/40 focus:ring-2 focus:ring-indigo-500/10 resize-y placeholder:text-zinc-600 transition-all duration-150 min-h-[60px]"
                        />
                        <input ref={fileInputRef} type="file" accept=".txt,.md,.json,.pdf" onChange={handleFileUpload} className="hidden" />
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="flex flex-col items-center justify-center gap-1 px-3 rounded-xl bg-zinc-800/40 border border-zinc-700/50 text-zinc-500 hover:text-zinc-300 hover:border-zinc-600/60 transition-all duration-150 shrink-0"
                          title="Upload a file"
                        >
                          <Paperclip className="w-4 h-4" />
                          <span className="text-[10px]">File</span>
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {step === 'input' && inputMode === 'detailed' && (
                <motion.div
                  key="detailed"
                  initial={{ opacity: 0, y: 8, filter: 'blur(4px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, y: -8, filter: 'blur(4px)' }}
                  transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                  className="space-y-4"
                >
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-2">
                      Topic <span className="text-indigo-400">*</span>
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="e.g. How neural networks learn through backpropagation"
                      className="w-full px-4 py-3 rounded-xl bg-zinc-800/50 border border-zinc-700/50 text-zinc-200 text-sm leading-relaxed focus:outline-none focus:border-indigo-500/40 focus:ring-2 focus:ring-indigo-500/10 resize-y placeholder:text-zinc-600 transition-all duration-150 min-h-[80px]"
                      autoFocus
                    />
                    {description.trim().length > 0 && description.trim().length < 3 && (
                      <p className="text-xs text-amber-500/80 mt-1.5">Please enter at least 3 characters</p>
                    )}
                  </div>

                  {/* Reference material */}
                  <div>
                    <label className="block text-xs font-medium text-zinc-500 mb-2">
                      Reference material <span className="text-zinc-600 font-normal">(optional)</span>
                    </label>
                    {fileName ? (
                      <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-zinc-800/40 border border-zinc-700/50">
                        <FileText className="w-4 h-4 text-indigo-400 shrink-0" />
                        <span className="text-sm text-zinc-300 truncate flex-1">{fileName}</span>
                        <button
                          onClick={handleClearFile}
                          className="p-1 rounded text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors duration-150 shrink-0"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <textarea
                          value={contextDoc}
                          onChange={(e) => setContextDoc(e.target.value)}
                          placeholder="Paste reference notes, textbook excerpts, or documentation..."
                          className="flex-1 px-3 py-2.5 rounded-xl bg-zinc-800/50 border border-zinc-700/50 text-zinc-200 text-sm leading-relaxed focus:outline-none focus:border-indigo-500/40 focus:ring-2 focus:ring-indigo-500/10 resize-y placeholder:text-zinc-600 transition-all duration-150 min-h-[60px]"
                        />
                        <input ref={fileInputRef} type="file" accept=".txt,.md,.json,.pdf" onChange={handleFileUpload} className="hidden" />
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="flex flex-col items-center justify-center gap-1 px-3 rounded-xl bg-zinc-800/40 border border-zinc-700/50 text-zinc-500 hover:text-zinc-300 hover:border-zinc-600/60 transition-all duration-150 shrink-0"
                          title="Upload a file"
                        >
                          <Paperclip className="w-4 h-4" />
                          <span className="text-[10px]">File</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Node count */}
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-2">
                      Number of concepts <span className="text-zinc-600 font-normal">(default: 5)</span>
                    </label>
                    <div className="flex items-center gap-1.5">
                      {[3, 4, 5, 6, 8].map((n) => (
                        <button
                          key={n}
                          onClick={() => setNumNodes(n)}
                          className={`w-9 h-9 rounded-lg text-sm font-medium transition-all duration-150 ${
                            numNodes === n
                              ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                              : 'bg-zinc-800/40 text-zinc-500 border border-zinc-700/40 hover:border-zinc-600/60 hover:text-zinc-300'
                          }`}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* STEP 2: PROMPT PREVIEW */}
              {step === 'prompt' && (
                <motion.div
                  key="prompt"
                  initial={{ opacity: 0, y: 8, filter: 'blur(4px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, y: -8, filter: 'blur(4px)' }}
                  transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                  className="space-y-4"
                >
                  {/* Info callout */}
                  <div className="flex items-start gap-2.5 p-3 rounded-xl bg-indigo-500/5 border border-indigo-500/15">
                    <Sparkles className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      Your prompt is ready. Copy it and paste into any AI to generate a{' '}
                      <code className="text-indigo-300 font-medium">.ldoc</code> lesson file, or use{' '}
                      <strong className="text-zinc-300 font-medium">Generate Here</strong>{' '}
                      to create it directly with DeskFlow.
                    </p>
                  </div>

                    {/* Prompt block */}
                    <div className="relative rounded-xl border border-zinc-800/50 bg-zinc-950/80 backdrop-blur-xl overflow-hidden">
                      <div className="flex items-center justify-between border-b border-zinc-800/50 px-4 py-2.5">
                        <span className="text-xs font-medium text-zinc-400">Generated prompt</span>
                        <div className="flex gap-1.5">
                          <button
                            onClick={handleCopy}
                            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 border ${
                              copied
                                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25'
                                : 'bg-zinc-800/80 text-zinc-400 border-zinc-700/50 hover:bg-zinc-700/80 hover:text-zinc-200'
                            }`}
                          >
                            {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                            {copied ? 'Copied!' : 'Copy'}
                          </button>
                          <button
                            onClick={handleDownload}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-zinc-800/80 text-zinc-400 border border-zinc-700/50 hover:bg-zinc-700/80 hover:text-zinc-200 transition-all duration-150"
                          >
                            <FileText className="w-3 h-3" />
                            Save
                          </button>
                        </div>
                      </div>
                      <pre className="max-h-72 overflow-auto p-4 font-mono text-[12px] leading-relaxed text-zinc-300 whitespace-pre-wrap">
                        {prompt}
                      </pre>
                    </div>

                  {/* Generate Here card */}
                  <div className="rounded-xl border border-zinc-700/40 bg-zinc-800/20 overflow-hidden">
                    <div className="flex items-center justify-between gap-3 p-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500/20 to-violet-500/10 border border-indigo-500/25 flex items-center justify-center shrink-0">
                          <Wand2 className="w-4 h-4 text-indigo-300" />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-zinc-200 leading-tight">Generate Here</div>
                          <div className="text-xs text-zinc-500 mt-0.5">Uses DeskFlow's built-in AI provider</div>
                        </div>
                      </div>
                      <button
                        onClick={handleGenerate}
                        disabled={genStatus === 'generating' || genStatus === 'done'}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-150 shrink-0 ${
                          genStatus === 'done'
                            ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/25 cursor-default'
                            : genStatus === 'generating'
                            ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 opacity-70 cursor-wait'
                            : 'bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 border border-indigo-500/20 hover:border-indigo-500/30'
                        }`}
                      >
                        {genStatus === 'generating' ? (
                          <><Loader2 className="w-4 h-4 animate-spin" />Generating...</>
                        ) : genStatus === 'done' ? (
                          <><CheckCircle2 className="w-4 h-4" />Done</>
                        ) : (
                          <><Sparkles className="w-4 h-4" />Generate</>
                        )}
                      </button>
                    </div>

                    {/* Generation progress */}
                    <AnimatePresence>
                      {genStatus === 'generating' && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="mx-4 mb-3">
                            <GenerationProgress phase={genPhase} />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Error state */}
                    <AnimatePresence>
                      {genStatus === 'error' && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="flex items-start gap-2 mx-4 mb-3 p-2.5 rounded-lg bg-red-500/10 border border-red-400/30">
                            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                            <div className="flex-1">
                              <p className="text-xs text-red-300 leading-relaxed">{genError}</p>
                              <button
                                onClick={() => { setGenStatus('idle'); setGenError(''); setGenPhase(0); }}
                                className="mt-2 text-xs text-red-300 hover:text-red-200 underline underline-offset-2 transition-colors"
                              >
                                Try again
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Success state */}
                    <AnimatePresence>
                      {genStatus === 'done' && genResult?.ok && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="flex items-center gap-2 mx-4 mb-3 p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                            <div>
                              <p className="text-xs text-emerald-300 font-medium">Lesson generated and imported successfully!</p>
                              {genResult.data?.lessonId && (
                                <p className="text-xs text-zinc-500 mt-0.5">ID: {genResult.data.lessonId}</p>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              )}
              </AnimatePresence>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-800/80 shrink-0">
              <button
                onClick={() => {
                  if (step === 'prompt') setStep('input');
                  else if (step === 'result') setStep('prompt');
                  else onClose();
                }}
                className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors duration-150"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                {step === 'input' ? 'Cancel' : 'Back'}
              </button>

              {step === 'input' && (
                <button
                  onClick={handleBuildPrompt}
                  disabled={!canBuild}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 text-sm font-medium transition-all duration-150 border border-indigo-500/30 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {building ? (
                    <><Loader2 className="w-4 h-4 animate-spin" />Building...</>
                  ) : (
                    <><Sparkles className="w-4 h-4" />Generate Prompt</>
                  )}
                </button>
              )}

              {step === 'prompt' && (
                <button
                  onClick={() => {
                    if (genStatus === 'done') { onClose(); onImported(); }
                    else setStep('result');
                  }}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-800/60 hover:bg-zinc-800/80 text-zinc-300 text-sm font-medium transition-all duration-150 border border-zinc-700/50"
                >
                  {genStatus === 'done' ? 'View Library' : 'Done'}
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
