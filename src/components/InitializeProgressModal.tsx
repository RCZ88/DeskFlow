import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FolderTree, FileText, Check, X, AlertCircle,
  Loader2, RotateCcw, XCircle,
} from 'lucide-react';

interface InitStep {
  id: string;
  label: string;
  type: 'folder' | 'file';
  status: 'pending' | 'creating' | 'done' | 'error';
}

const STEP_DEFS: Omit<InitStep, 'status'>[] = [
  { id: 'agent-dir', label: 'agent/ directory', type: 'folder' },
  { id: 'agents-md', label: 'AGENTS.md', type: 'file' },
  { id: 'initialize-md', label: 'INITIALIZE.md', type: 'file' },
  { id: 'problems-md', label: 'PROBLEMS.md', type: 'file' },
  { id: 'requests-md', label: 'REQUESTS.md', type: 'file' },
  { id: 'state-md', label: 'state.md', type: 'file' },
  { id: 'problems-json', label: 'problems.json', type: 'file' },
  { id: 'requests-json', label: 'requests.json', type: 'file' },
  { id: 'checklists-json', label: 'checklists.json', type: 'file' },
  { id: 'commits-md', label: 'COMMITS.md', type: 'file' },
  { id: 'feature-tracker', label: 'FEATURE_TRACKER.md', type: 'file' },
  { id: 'workspace-context', label: 'WORKSPACE_CONTEXT.md', type: 'file' },
  { id: 'human-test', label: 'HUMAN_TEST_CHECKLIST.md', type: 'file' },
  { id: 'skills-dir', label: 'agent/skills/ directory', type: 'folder' },
  { id: 'skill-templates', label: 'Skill templates', type: 'file' },
  { id: 'graphify-dir', label: 'graphify-out/ directory', type: 'folder' },
];

const freshSteps = (): InitStep[] =>
  STEP_DEFS.map((s) => ({ ...s, status: 'pending' as const }));

interface InitializeProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete?: () => void;
  projectId?: string;
  isReinit?: boolean;
}

export default function InitializeProgressModal({
  isOpen,
  onClose,
  onComplete,
  projectId,
  isReinit = false,
}: InitializeProgressModalProps) {
  const [steps, setSteps] = useState<InitStep[]>(freshSteps);
  const [isRunning, setIsRunning] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const cancelledRef = useRef(false);
  const ipcSuccessRef = useRef(false);
  const simCompleteRef = useRef(false);

  const runInit = useCallback(() => {
    cancelledRef.current = false;
    ipcSuccessRef.current = false;
    simCompleteRef.current = false;
    setSteps(freshSteps());
    setIsRunning(true);
    setIsComplete(false);
    setHasError(false);
    setErrorMessage('');

    setSteps((prev) => {
      const u = [...prev];
      if (u[0]) u[0] = { ...u[0], status: 'creating' };
      return u;
    });

    let simIdx = 0;
    let simTimer: ReturnType<typeof setTimeout> | null = null;

    const simTick = () => {
      if (cancelledRef.current) return;

      setSteps((prev) => {
        const u = [...prev];
        const creatingIdx = u.findIndex((s) => s.status === 'creating');
        if (creatingIdx >= 0) u[creatingIdx] = { ...u[creatingIdx], status: 'done' };
        const nextPending = u.findIndex((s) => s.status === 'pending');
        if (nextPending >= 0) u[nextPending] = { ...u[nextPending], status: 'creating' };
        return u;
      });

      simIdx++;
      if (simIdx >= STEP_DEFS.length) {
        simCompleteRef.current = true;
        if (ipcSuccessRef.current) {
          setIsComplete(true);
          onComplete?.();
        }
      } else {
        simTimer = setTimeout(simTick, 220 + Math.random() * 200);
      }
    };

    simTimer = setTimeout(simTick, 350);

    const api = (window as any).deskflowAPI;
    const agent = localStorage.getItem('terminal-defaultAgent') || 'claude';

    api
      ?.trackerMindSetup?.('init-all', projectId || undefined, agent)
      .then((result: any) => {
        if (cancelledRef.current) return;

        if (result?.success) {
          ipcSuccessRef.current = true;
          if (simCompleteRef.current) {
            setIsComplete(true);
            onComplete?.();
          }
        } else {
          if (simTimer) clearTimeout(simTimer);
          setSteps((prev) =>
            prev.map((s) => ({
              ...s,
              status: s.status === 'creating' || s.status === 'pending' ? ('error' as const) : s.status,
            }))
          );
          setHasError(true);
          setErrorMessage(result?.error || 'Infrastructure setup failed');
        }
      })
      .catch((e: any) => {
        if (cancelledRef.current) return;
        if (simTimer) clearTimeout(simTimer);
        setSteps((prev) =>
          prev.map((s) => ({
            ...s,
            status: s.status === 'creating' || s.status === 'pending' ? ('error' as const) : s.status,
          }))
        );
        setHasError(true);
        setErrorMessage(e?.message || 'Failed to initialize workspace');
      })
      .finally(() => {
        if (!cancelledRef.current) setIsRunning(false);
      });
  }, [projectId, onComplete]);

  useEffect(() => {
    if (isOpen) {
      const t = setTimeout(runInit, 400);
      return () => {
        clearTimeout(t);
        cancelledRef.current = true;
      };
    } else {
      cancelledRef.current = true;
    }
  }, [isOpen, runInit]);

  const doneCount = steps.filter((s) => s.status === 'done').length;
  const totalCount = steps.length;
  const progressPct = Math.round((doneCount / totalCount) * 100);

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
        className="bg-zinc-800 rounded-xl p-6 border border-zinc-700 shadow-2xl w-full max-w-md"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                hasError
                  ? 'bg-red-500/10'
                  : isComplete
                  ? 'bg-emerald-500/10'
                  : 'bg-green-500/10'
              }`}
            >
              {hasError ? (
                <AlertCircle className="w-4 h-4 text-red-400" />
              ) : isComplete ? (
                <Check className="w-4 h-4 text-emerald-400" />
              ) : (
                <FolderTree className="w-4 h-4 text-green-400" />
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
              <p className="text-[10px] text-zinc-500">
                {hasError
                  ? 'Some steps failed'
                  : isComplete
                  ? `${doneCount} of ${totalCount} files created`
                  : `${doneCount}/${totalCount} steps`}
              </p>
            </div>
          </div>
          {!isRunning && (
            <button
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-zinc-700/50 text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              <XCircle className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="h-1.5 bg-zinc-900 rounded-full overflow-hidden mb-4">
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

        <div className="space-y-0.5 max-h-[280px] overflow-y-auto pr-1 mb-4 scrollbar-thin">
          {steps.map((step, i) => (
            <motion.div
              key={step.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.02, duration: 0.15 }}
              className={`flex items-center gap-2 py-1.5 px-2 rounded-lg text-xs transition-colors ${
                step.status === 'creating'
                  ? 'bg-green-500/5'
                  : step.status === 'done'
                  ? 'bg-emerald-500/5'
                  : step.status === 'error'
                  ? 'bg-red-500/5'
                  : ''
              }`}
            >
              <div className="w-4 h-4 flex items-center justify-center flex-shrink-0">
                {step.status === 'pending' && (
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

              {step.type === 'folder' ? (
                <FolderTree className="w-3 h-3 text-zinc-600 flex-shrink-0" />
              ) : (
                <FileText className="w-3 h-3 text-zinc-600 flex-shrink-0" />
              )}

              <span
                className={`truncate flex-1 ${
                  step.status === 'pending'
                    ? 'text-zinc-600'
                    : step.status === 'creating'
                    ? 'text-green-300'
                    : step.status === 'done'
                    ? 'text-zinc-400'
                    : 'text-red-400'
                }`}
              >
                {step.label}
              </span>

              {step.status === 'creating' && (
                <span className="text-[9px] text-green-500 flex-shrink-0">creating…</span>
              )}
              {step.status === 'done' && (
                <span className="text-[9px] text-emerald-600 flex-shrink-0">done</span>
              )}
              {step.status === 'error' && (
                <span className="text-[9px] text-red-500 flex-shrink-0">failed</span>
              )}
            </motion.div>
          ))}
        </div>

        <AnimatePresence>
          {hasError && errorMessage && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-4 overflow-hidden"
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
              className="mb-4 overflow-hidden"
            >
              <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
                <div className="flex items-center gap-2 mb-1">
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-xs font-medium text-emerald-400">
                    Workspace Ready
                  </span>
                </div>
                <p className="text-[10px] text-zinc-500">
                  {doneCount} files created. Configure context systems via
                  Setup, or start a new agent session.
                </p>
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
      </motion.div>
    </motion.div>
  );
}
