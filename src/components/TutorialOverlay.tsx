import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowLeft, ArrowRight, ExternalLink, Check } from 'lucide-react';

interface TutorialStep {
  target: string;
  title: string;
  instruction: string;
  position: 'top' | 'bottom' | 'left' | 'right' | 'center';
}

interface TutorialOverlayProps {
  isVisible: boolean;
  step: TutorialStep | null;
  stepIndex: number;
  totalSteps: number;
  featureName: string;
  onNext: () => void;
  onPrev: () => void;
  onClose: () => void;
  onTryIt: () => void;
}

export default function TutorialOverlay({
  isVisible, step, stepIndex, totalSteps, featureName,
  onNext, onPrev, onClose, onTryIt,
}: TutorialOverlayProps) {
  if (!isVisible || !step) return null;

  const isLastStep = stepIndex === totalSteps - 1;

  const positionClasses: Record<string, string> = {
    center: 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
    top: 'top-[15%] left-1/2 -translate-x-1/2',
    bottom: 'bottom-[15%] left-1/2 -translate-x-1/2',
    left: 'top-1/2 left-[10%] -translate-y-1/2',
    right: 'top-1/2 right-[10%] -translate-y-1/2',
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm"
          onClick={onClose}
        >
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] rounded-full border-2 border-amber-400/30 bg-amber-400/5 shadow-[0_0_60px_rgba(245,158,11,0.15)]" />

          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            transition={{ duration: 0.25, delay: 0.1 }}
            className={`absolute ${positionClasses[step.position] || positionClasses.center} w-full max-w-sm`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-zinc-800 rounded-xl border border-zinc-700 overflow-hidden">
              <div className="flex items-center justify-between px-4 pt-4 pb-2">
                <div>
                  <div className="text-[10px] text-amber-400 uppercase tracking-wider font-medium">
                    {featureName}
                  </div>
                  <h3 className="text-sm font-semibold text-white">{step.title}</h3>
                </div>
                <button onClick={onClose}
                  className="p-1 rounded-lg hover:bg-zinc-700/50 text-zinc-500 hover:text-zinc-300 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="px-4 pb-3">
                <p className="text-xs text-zinc-400 leading-relaxed">{step.instruction}</p>
              </div>

              <div className="px-4 pb-3 flex items-center gap-1">
                {Array.from({ length: totalSteps }).map((_, i) => (
                  <div key={i}
                    className={`h-1 rounded-full transition-all duration-300 ${
                      i === stepIndex ? 'w-4 bg-amber-400'
                        : i < stepIndex ? 'w-1.5 bg-emerald-500' : 'w-1.5 bg-zinc-700'
                    }`} />
                ))}
                <span className="text-[10px] text-zinc-600 ml-2">{stepIndex + 1} of {totalSteps}</span>
              </div>

              <div className="flex items-center justify-between px-4 py-3 bg-zinc-900/50 border-t border-zinc-700/50">
                <button onClick={onPrev} disabled={stepIndex === 0}
                  className="px-2.5 py-1.5 rounded-lg text-[11px] text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/40 transition-colors disabled:opacity-30 flex items-center gap-1">
                  <ArrowLeft className="w-3 h-3" />
                  Back
                </button>
                <div className="flex items-center gap-2">
                  <button onClick={onTryIt}
                    className="px-2.5 py-1.5 rounded-lg bg-zinc-700/40 border border-zinc-600/30 text-[11px] text-zinc-300 hover:bg-zinc-600/40 transition-colors flex items-center gap-1">
                    <ExternalLink className="w-3 h-3" />
                    Try it
                  </button>
                  {isLastStep ? (
                    <button onClick={onNext}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-[11px] font-medium text-white transition-colors flex items-center gap-1">
                      <Check className="w-3 h-3" />
                      Done
                    </button>
                  ) : (
                    <button onClick={onNext}
                      className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-[11px] font-medium text-white transition-colors flex items-center gap-1">
                      Next
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
