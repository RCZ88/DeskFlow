import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FolderTree, FileText, Check, X, AlertCircle,
  Loader2, RotateCcw, XCircle, ChevronDown, ChevronRight, FileCode,
} from 'lucide-react';

interface InitStep {
  id: string;
  label: string;
  type: 'folder' | 'file';
  status: 'pending' | 'creating' | 'done' | 'error';
  content?: string;
  path?: string;
  group?: string;
}

interface InitProgressEvent {
  type: 'manifest' | 'step' | 'complete' | 'error';
  steps?: Omit<InitStep, 'status'>[];
  stepId?: string | null;
  status?: string;
  content?: string;
  error?: string;
  stats?: { total: number; created: number };
}

interface InitializeProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete?: () => void;
  projectId?: string;
  isReinit?: boolean;
}

const GROUP_LABELS: Record<string, string> = {
  agent: 'agent/',
  skills: 'agent/skills/',
  graphify: 'graphify-out/',
};

const GROUP_ORDER = ['agent', 'skills', 'graphify'];

function groupSteps(steps: InitStep[]): Array<{ group: string; steps: InitStep[] }> {
  const groups: Record<string, InitStep[]> = {};
  for (const s of steps) {
    const g = s.group || 'other';
    if (!groups[g]) groups[g] = [];
    groups[g].push(s);
  }
  return GROUP_ORDER
    .filter(g => groups[g]?.length)
    .map(g => ({ group: g, steps: groups[g] }));
}

export default function InitializeProgressModal({
  isOpen,
  onClose,
  onComplete,
  projectId,
  isReinit = false,
}: InitializeProgressModalProps) {
  const [steps, setSteps] = useState<InitStep[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [expandedStep, setExpandedStep] = useState<string | null>(null);
  const cancelledRef = useRef(false);
  const cleanupRef = useRef<(() => void) | null>(null);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const runInit = useCallback(() => {
    cancelledRef.current = false;
    setSteps([]);
    setIsRunning(true);
    setIsComplete(false);
    setHasError(false);
    setErrorMessage('');
    setExpandedStep(null);

    const api = (window as any).deskflowAPI;
    const agent = localStorage.getItem('terminal-defaultAgent') || 'claude';

    const unsub = api?.onTrackerMindInitProgress?.((data: InitProgressEvent) => {
      if (cancelledRef.current) return;

      if (data.type === 'manifest' && data.steps) {
        setSteps(data.steps.map(s => ({ ...s, status: 'pending' as const })));
      }

      if (data.type === 'step') {
        setSteps(prev => {
          const idx = prev.findIndex(s => s.id === data.stepId);
          if (idx === -1) return prev;
          const u = [...prev];
          u[idx] = {
            ...u[idx],
            status: (data.status as InitStep['status']) || u[idx].status,
            content: data.content !== undefined ? data.content : u[idx].content,
          };
          return u;
        });
      }

      if (data.type === 'complete') {
        setIsComplete(true);
        setIsRunning(false);
        onCompleteRef.current?.();
      }

      if (data.type === 'error') {
        setIsRunning(false);
        setHasError(true);
        setErrorMessage(data.error || 'Initialization failed');
        setSteps(prev =>
          prev.map(s => ({
            ...s,
            status: s.status === 'creating' || s.status === 'pending' ? 'error' as const : s.status,
          }))
        );
      }
    });

    cleanupRef.current = unsub;

    api
      ?.trackerMindSetup?.('init-all', projectId || undefined, agent)
      .then((result: any) => {
        if (cancelledRef.current) return;
        if (!result?.success) {
          setIsRunning(false);
          setHasError(true);
          setErrorMessage(result?.error || 'Infrastructure setup failed');
          setSteps(prev =>
            prev.map(s => ({
              ...s,
              status: s.status === 'creating' || s.status === 'pending' ? 'error' as const : s.status,
            }))
          );
        }
      })
      .catch((e: any) => {
        if (cancelledRef.current) return;
        setIsRunning(false);
        setHasError(true);
        setErrorMessage(e?.message || 'Failed to initialize workspace');
        setSteps(prev =>
          prev.map(s => ({
            ...s,
            status: s.status === 'creating' || s.status === 'pending' ? 'error' as const : s.status,
          }))
        );
      });
  }, [projectId]);

  useEffect(() => {
    if (isOpen) {
      const t = setTimeout(runInit, 400);
      return () => {
        clearTimeout(t);
        cancelledRef.current = true;
        cleanupRef.current?.();
      };
    } else {
      cancelledRef.current = true;
      cleanupRef.current?.();
    }
  }, [isOpen, runInit]);

  const doneCount = steps.filter(s => s.status === 'done').length;
  const totalCount = steps.length;
  const progressPct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;
  const groups = groupSteps(steps);

  const toggleExpand = (stepId: string) => {
    setExpandedStep(prev => prev === stepId ? null : stepId);
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isRunning) onClose();
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ duration: 0.2 }}
        className="bg-zinc-800 rounded-xl border border-zinc-700 w-full max-w-lg flex flex-col"
        style={{ maxHeight: '85vh' }}
      >
        <div className="p-5 pb-0 flex-shrink-0">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                  hasError
                    ? 'bg-red-500/10'
                    : isComplete
                    ? 'bg-emerald-500/10'
                    : 'bg-green-500/10'
                }`}
              >
                {hasError ? (
                  <AlertCircle className="w-4.5 h-4.5 text-red-400" />
                ) : isComplete ? (
                  <Check className="w-4.5 h-4.5 text-emerald-400" />
                ) : (
                  <FolderTree className="w-4.5 h-4.5 text-green-400" />
                )}
              </div>
              <div>
                <h2 className="text-sm font-semibold text-white">
                  {hasError
                    ? 'Initialization Failed'
                    : isComplete
                    ? 'Initialization Complete'
                    : isReinit
                    ? 'Re-initializing Workspace'
                    : 'Initializing Workspace'}
                </h2>
                <p className="text-[11px] text-zinc-500">
                  {hasError
                    ? 'Some steps failed'
                    : isComplete
                    ? `${doneCount} items ready`
                    : totalCount > 0
                    ? `${doneCount} / ${totalCount} — ${progressPct}%`
                    : 'Preparing...'}
                </p>
              </div>
            </div>
            {!isRunning && (
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-zinc-700/50 text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                <XCircle className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="h-2 bg-zinc-900 rounded-full overflow-hidden mb-4">
            <motion.div
              className={`h-full rounded-full transition-colors duration-300 ${
                hasError
                  ? 'bg-red-500'
                  : isComplete
                  ? 'bg-emerald-500'
                  : 'bg-gradient-to-r from-green-500 to-emerald-500'
              }`}
              initial={{ width: 0 }}
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            />
          </div>
        </div>

        <div className="px-5 overflow-y-auto flex-1 scrollbar-thin mb-4">
          {steps.length === 0 && isRunning && (
            <div className="flex items-center justify-center py-8 text-zinc-500 text-xs">
              <Loader2 className="w-3.5 h-3.5 text-green-400 animate-spin mr-2" />
              Loading manifest...
            </div>
          )}

          {groups.map(({ group, steps: groupStepsList }) => (
            <div key={group} className="mb-3 last:mb-0">
              <div className="flex items-center gap-1.5 pb-1.5 mb-0.5 border-b border-zinc-700/40">
                <FolderTree className="w-3.5 h-3.5 text-cyan-500 flex-shrink-0" />
                <span className="text-[11px] font-semibold text-zinc-300 tracking-wide uppercase">
                  {GROUP_LABELS[group] || group}
                </span>
                <span className="text-[10px] text-zinc-600 ml-auto font-mono">
                  {groupStepsList.filter(s => s.status === 'done').length}/{groupStepsList.length}
                </span>
              </div>
              <div className="space-y-0.5">
                {groupStepsList.map((step, i) => {
                  const isFile = step.type === 'file';
                  const isExpandable = isFile && step.status === 'done' && !!step.content;
                  const isExpanded = expandedStep === step.id;
                  const isPending = step.status === 'pending';

                  return (
                    <div key={step.id}>
                      <button
                        onClick={() => isExpandable && toggleExpand(step.id)}
                        disabled={!isExpandable}
                        className={`w-full flex items-center gap-2 py-1.5 px-2.5 rounded-lg text-xs transition-all text-left ${
                          isExpandable
                            ? 'hover:bg-zinc-700/40 cursor-pointer'
                            : 'cursor-default'
                        } ${
                          step.status === 'creating'
                            ? 'bg-green-500/5 ring-1 ring-green-500/20'
                            : step.status === 'done'
                            ? 'bg-emerald-500/5'
                            : step.status === 'error'
                            ? 'bg-red-500/5'
                            : isPending
                            ? 'opacity-50'
                            : ''
                        }`}
                      >
                        <div className="w-4 h-4 flex items-center justify-center flex-shrink-0">
                          {isPending && (
                            <div className="w-1.5 h-1.5 rounded-full bg-zinc-700" />
                          )}
                          {step.status === 'creating' && (
                            <Loader2 className="w-3.5 h-3.5 text-green-400 animate-spin" />
                          )}
                          {step.status === 'done' && (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          )}
                          {step.status === 'error' && (
                            <X className="w-3.5 h-3.5 text-red-400" />
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 min-w-0 flex-1">
                          {step.type === 'folder' ? (
                            <FolderTree className="w-3 h-3 text-amber-500 flex-shrink-0" />
                          ) : (
                            <FileCode className="w-3 h-3 text-sky-500 flex-shrink-0" />
                          )}
                          <span
                            className={`truncate ${
                              isPending
                                ? 'text-zinc-600'
                                : step.status === 'creating'
                                ? 'text-green-300'
                                : step.status === 'done'
                                ? 'text-zinc-300'
                                : 'text-red-400'
                            }`}
                          >
                            {step.label}
                          </span>
                        </div>

                        <span className="text-[10px] text-zinc-600 font-mono truncate max-w-[140px] flex-shrink-0 mr-1">
                          {step.path || ''}
                        </span>

                        {step.status === 'creating' && (
                          <span className="text-[9px] text-green-500 flex-shrink-0 font-medium">creating</span>
                        )}
                        {step.status === 'done' && !isExpandable && (
                          <span className="text-[9px] text-emerald-600 flex-shrink-0">done</span>
                        )}
                        {step.status === 'done' && isExpandable && (
                          <span className="flex items-center gap-0.5 text-[9px] text-emerald-500 flex-shrink-0 font-medium">
                            done
                            {isExpanded ? (
                              <ChevronDown className="w-3 h-3" />
                            ) : (
                              <ChevronRight className="w-3 h-3" />
                            )}
                          </span>
                        )}
                        {step.status === 'error' && (
                          <span className="text-[9px] text-red-500 flex-shrink-0 font-medium">failed</span>
                        )}
                      </button>

                      <AnimatePresence>
                        {isExpandable && isExpanded && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="ml-8 mr-2 mt-1 mb-2">
                              <div className="flex items-center gap-1.5 mb-1">
                                <FileText className="w-3 h-3 text-zinc-600" />
                                <span className="text-[10px] text-zinc-600 font-mono">{step.path}</span>
                                <div className="flex-1" />
                                <button
                                  onClick={() => setExpandedStep(null)}
                                  className="text-zinc-600 hover:text-zinc-400 transition-colors"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                              <pre className="p-3 rounded-lg bg-zinc-900/90 border border-zinc-700/50 text-[11px] text-zinc-400 font-mono max-h-[200px] overflow-y-auto whitespace-pre-wrap leading-relaxed">
                                {step.content}
                              </pre>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="px-5 pb-5 flex-shrink-0">
          <AnimatePresence>
            {hasError && errorMessage && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-3 overflow-hidden"
              >
                <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/20">
                  <p className="text-xs text-red-400">{errorMessage}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {isComplete && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-3 overflow-hidden"
              >
                <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20 flex items-start gap-2.5">
                  <div className="w-6 h-6 rounded-lg bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  </div>
                  <div>
                    <span className="text-xs font-medium text-emerald-400 block mb-0.5">
                      Workspace Ready
                    </span>
                    <p className="text-[11px] text-zinc-500 leading-relaxed">
                      {doneCount} files created across {groups.length} directories.
                      Click any file above to preview its contents.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex items-center justify-end gap-2">
            {hasError && (
              <button
                onClick={runInit}
                className="px-3 py-1.5 rounded-lg bg-zinc-700/50 border border-zinc-600/50 text-xs text-zinc-300 hover:bg-zinc-600/50 flex items-center gap-1.5 transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
                Retry
              </button>
            )}
            <button
              onClick={onClose}
              disabled={isRunning}
              className={`px-4 py-1.5 rounded-lg text-xs font-medium text-white transition-colors disabled:opacity-50 ${
                isComplete
                  ? 'bg-emerald-600 hover:bg-emerald-500'
                  : hasError
                  ? 'bg-red-600 hover:bg-red-500'
                  : 'bg-green-700 hover:bg-green-600'
              }`}
            >
              {isRunning ? 'Initializing…' : isComplete ? 'Done' : 'Close'}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
