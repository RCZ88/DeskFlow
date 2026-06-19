import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowLeft, ArrowRight, Check, ChevronDown } from 'lucide-react';
import type { TutorialStep } from '../data/tutorial-steps';
import { useTutorialContext } from '../contexts/TutorialContext';

const SPOTLIGHT_PAD = 16;
const SPOTLIGHT_MIN = 80;

function getCardStyle(rect: DOMRect | null, position: string): React.CSSProperties {
  if (!rect) {
    return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
  }
  const gap = 16;
  const cardWidth = 320;
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  switch (position) {
    case 'top':
      return { bottom: vh - rect.top + gap, left: Math.max(16, Math.min(rect.left + rect.width / 2 - cardWidth / 2, vw - cardWidth - 16)) };
    case 'bottom':
      return { top: rect.bottom + gap, left: Math.max(16, Math.min(rect.left + rect.width / 2 - cardWidth / 2, vw - cardWidth - 16)) };
    case 'left':
      return { top: Math.max(16, Math.min(rect.top + rect.height / 2 - 80, vh - 176)), right: vw - rect.left + gap };
    case 'right':
      return { top: Math.max(16, Math.min(rect.top + rect.height / 2 - 80, vh - 176)), left: rect.right + gap };
    default:
      return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
  }
}

function getSpotlightRect(step: TutorialStep | null): DOMRect | null {
  if (!step) return null;
  try {
    const el = document.querySelector(step.target);
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height, SPOTLIGHT_MIN) + SPOTLIGHT_PAD * 2;
    return new DOMRect(
      rect.left + rect.width / 2 - size / 2,
      rect.top + rect.height / 2 - size / 2,
      size,
      size
    );
  } catch {
    return null;
  }
}

export default function TutorialOverlay() {
  const {
    isVisible, currentStep: step, stepIndex, totalSteps,
    activeFeatureName, nextStep, prevStep, closeTutorial,
    steps, activeFeatureId,
  } = useTutorialContext();

  const [spotlightRect, setSpotlightRect] = useState<DOMRect | null>(null);
  const [targetFound, setTargetFound] = useState(true);
  const hoveredRef = useRef(false);
  const autoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const spotSize = spotlightRect ? spotlightRect.width : 300;

  const updatePosition = useCallback(() => {
    const rect = getSpotlightRect(step);
    setSpotlightRect(rect);
    setTargetFound(!!rect);
  }, [step]);

  useEffect(() => {
    if (!isVisible || !step) return;
    updatePosition();
    const handleScroll = () => requestAnimationFrame(updatePosition);
    const handleResize = () => requestAnimationFrame(updatePosition);
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleResize);
    const observer = new ResizeObserver(handleScroll);
    if (step.target) {
      const el = document.querySelector(step.target);
      if (el) observer.observe(el);
    }
    return () => {
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleResize);
      observer.disconnect();
    };
  }, [isVisible, step, updatePosition]);

  const isAction = step?.type === 'action';

  useEffect(() => {
    if (!isVisible || !isAction || !step) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const match = target.closest(step.target);
      if (match) {
        nextStep();
      }
    };
    document.addEventListener('click', handler, true);
    return () => document.removeEventListener('click', handler, true);
  }, [isVisible, isAction, step, nextStep]);

  useEffect(() => {
    console.log('[TutorialOverlay] Spotlight effect:', {
      isVisible,
      step: step?.title,
      target: step?.target,
      spotlightRect: spotlightRect ? {
        left: spotlightRect.left,
        top: spotlightRect.top,
        width: spotlightRect.width,
        height: spotlightRect.height,
      } : null,
      spotSize,
      isAction,
    });
  }, [isVisible, step, spotlightRect, spotSize, isAction]);

  useEffect(() => {
    if (!isVisible || !step || isAction) return;
    if (autoTimerRef.current) clearTimeout(autoTimerRef.current);
    autoTimerRef.current = setTimeout(() => {
      if (!hoveredRef.current) nextStep();
    }, 5000);
    return () => {
      if (autoTimerRef.current) clearTimeout(autoTimerRef.current);
    };
  }, [isVisible, step, isAction, nextStep]);

  const isLastStep = stepIndex === totalSteps - 1;
  const cardStyle = getCardStyle(spotlightRect, step?.position || 'center');

  return (
    <AnimatePresence>
      {isVisible && step && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[100]"
        >
          {spotlightRect ? (
            <>
              <div
                className="fixed inset-0 bg-black/70 backdrop-blur-sm"
                style={{
                  maskImage: `radial-gradient(circle ${spotSize / 2}px at ${spotlightRect.left + spotSize / 2}px ${spotlightRect.top + spotSize / 2}px, transparent 0px, black ${spotSize / 2 + 4}px)`,
                  WebkitMaskImage: `radial-gradient(circle ${spotSize / 2}px at ${spotlightRect.left + spotSize / 2}px ${spotlightRect.top + spotSize / 2}px, transparent 0px, black ${spotSize / 2 + 4}px)`,
                  maskComposite: 'exclude',
                  WebkitMaskComposite: 'exclude',
                }}
              />
              <motion.div
                initial={{ scale: 0.92, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className="fixed rounded-full border-2 border-amber-400/80 bg-amber-400/[0.12]"
                style={{
                  width: spotSize,
                  height: spotSize,
                  left: spotlightRect.left,
                  top: spotlightRect.top,
                  boxShadow: `0 0 0 1px rgba(251,191,36,0.2), 0 0 40px 12px rgba(251,191,36,0.25)`,
                  pointerEvents: 'none',
                }}
              >
                {isAction && (
                  <motion.div
                    className="absolute inset-0 rounded-full border-2 border-amber-400/60"
                    animate={{ scale: [1, 1.08, 1], opacity: [0.8, 0.3, 0.8] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                  />
                )}
              </motion.div>
            </>
          ) : (
            <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" />
          )}

          <motion.div
            key={stepIndex}
            initial={{ opacity: 0, scale: 0.92, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 8 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="fixed w-[320px] z-[101]"
            style={cardStyle}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-zinc-800/95 backdrop-blur-xl rounded-xl border border-zinc-700/80 shadow-2xl overflow-hidden">
              <div className="flex items-center justify-between px-4 pt-4 pb-2">
                <div className="min-w-0">
                  <div className="text-[9px] text-amber-400 uppercase tracking-[0.12em] font-semibold">
                    {activeFeatureName}
                  </div>
                  <h3 className="text-sm font-semibold text-white mt-0.5 truncate pr-2">{step.title}</h3>
                </div>
                <button onClick={closeTutorial}
                  className="shrink-0 p-1 rounded-lg hover:bg-zinc-700/50 text-zinc-500 hover:text-zinc-300 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="px-4 pb-2">
                <p className="text-xs text-zinc-400 leading-relaxed whitespace-pre-line">
                  {step.instruction}
                  {isAction && !step.instruction.includes('• Click') && !step.instruction.includes('• Tap') && (
                    <span className="block mt-1.5 text-amber-400/80 font-medium">Click the highlighted element to continue</span>
                  )}
                </p>
              </div>

              {!isAction && (
                <div className="px-4 pb-1.5">
                  <div className="h-0.5 bg-zinc-700 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: '0%' }}
                      animate={{ width: '100%' }}
                      transition={{ duration: 5, ease: 'linear' }}
                      className="h-full bg-amber-400/60 rounded-full"
                    />
                  </div>
                </div>
              )}

              <div className="px-4 pb-2.5 flex items-center gap-1">
                {Array.from({ length: totalSteps }).map((_, i) => (
                  <div key={i}
                    className={`h-1 rounded-full transition-all duration-300 ${
                      i === stepIndex ? 'w-4 bg-amber-400'
                        : i < stepIndex ? 'w-1.5 bg-emerald-500' : 'w-1.5 bg-zinc-700'
                    }`} />
                ))}
                <span className="text-[9px] text-zinc-600 ml-1.5 font-medium">{stepIndex + 1}/{totalSteps}</span>
              </div>

              <div className="flex items-center justify-between px-4 py-2.5 bg-zinc-900/60 border-t border-zinc-700/50">
                <button onClick={prevStep} disabled={stepIndex === 0}
                  className="px-2.5 py-1.5 rounded-lg text-[11px] text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/40 transition-colors disabled:opacity-30 flex items-center gap-1">
                  <ArrowLeft className="w-3 h-3" />
                  Back
                </button>
                {isLastStep ? (
                  <button onClick={nextStep}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-[11px] font-medium text-white transition-colors flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    Done
                  </button>
                ) : (
                  <button onClick={nextStep}
                    className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-[11px] font-medium text-white transition-colors flex items-center gap-1">
                    {isAction ? 'Skip' : 'Next'}
                    <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
