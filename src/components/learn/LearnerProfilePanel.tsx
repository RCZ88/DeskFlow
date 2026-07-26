import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, RotateCcw, RefreshCw } from 'lucide-react';
import { loadProfile, saveProfile, updateKnob, resetProfile, setPriorKnowledge } from '../../services/learn/learnerProfile';
import { CURRICULUM_BLUEPRINT } from '../../services/learn/curriculum';
import { PROFILE_KNOBS } from '../../shared/learn/types';
import { ImageGenSettings } from './ImageGenSettings';
import type { LearnerProfile, ProfileKnob, MasteryLevel } from '../../shared/learn/types';

interface Props {
  open: boolean;
  onClose: () => void;
  onRerunSetup: () => void;
}

const KNOB_LABELS: Record<ProfileKnob, { label: string; options: string[] }> = {
  density: { label: 'Density', options: ['terse', 'balanced', 'thorough'] },
  modalityBias: { label: 'Modality', options: ['diagram_first', 'balanced', 'text_ok'] },
  exampleStance: { label: 'Examples', options: ['worked_first', 'balanced', 'discovery_first'] },
  mathDepth: { label: 'Math depth', options: ['applied_only', 'intuition_first', 'derive_everything'] },
  handsOn: { label: 'Hands-on', options: ['0', '1', '2', '3'] },
  codeStagingDepth: { label: 'Code staging', options: ['framework_only', 'numpy_plus', 'scratch_first'] },
  quizAppetite: { label: 'Quiz appetite', options: ['light', 'normal', 'heavy'] },
  chunkSize: { label: 'Session size', options: ['micro', 'standard', 'deep'] },
  layerRevealDefault: { label: 'Layer reveal', options: ['L0', 'L1', 'L2', 'L3', 'L4', 'L5'] },
  tone: { label: 'Tone', options: ['gentle', 'balanced', 'demanding'] },
};

export function LearnerProfilePanel({ open, onClose, onRerunSetup }: Props) {
  const [profile, setProfile] = useState<LearnerProfile>(loadProfile);

  useEffect(() => {
    if (open) setProfile(loadProfile());
  }, [open]);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail) setProfile(detail);
    };
    window.addEventListener('lyceum:profile-changed', handler);
    return () => window.removeEventListener('lyceum:profile-changed', handler);
  }, []);

  const handleKnobChange = (knob: ProfileKnob, value: string | number) => {
    const updated = updateKnob(knob, value as any, 0.6);
    setProfile(updated);
  };

  const handlePriorChange = (part: number, level: MasteryLevel) => {
    const updated = setPriorKnowledge(part, level);
    setProfile(updated);
  };

  const handleReset = () => {
    if (confirm('Reset all profile settings to defaults?')) {
      resetProfile();
      setProfile(loadProfile());
    }
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex justify-end bg-black/40"
        onClick={onClose}
      >
        <motion.div
          initial={{ x: 320 }}
          animate={{ x: 0 }}
          exit={{ x: 320 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          className="w-80 h-full bg-zinc-900 border-l border-zinc-700/50 overflow-y-auto"
        >
          {/* Header */}
          <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 border-b border-zinc-800 bg-zinc-900">
            <h2 className="font-serif text-lg font-semibold text-zinc-100">Your Profile</h2>
            <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 transition">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-5 space-y-6">
            {/* Knobs */}
            {PROFILE_KNOBS.map((knob) => {
              const meta = KNOB_LABELS[knob];
              const val = String(profile[knob]);
              const conf = profile.confidence[knob] ?? 0.3;
              return (
                <div key={knob}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-medium text-zinc-300">{meta.label}</span>
                    <span className="font-mono text-[10px] text-zinc-600">{conf >= 0.5 ? 'set by you' : 'learning from behavior'}</span>
                  </div>
                  <div className="flex gap-1">
                    {meta.options.map((opt) => (
                      <button
                        key={opt}
                        onClick={() => handleKnobChange(knob, knob === 'handsOn' ? Number(opt) : opt)}
                        className={`flex-1 px-2 py-1.5 rounded-lg text-[11px] font-medium transition border ${val === opt ? 'bg-clay-500/20 text-clay-300 border-clay-400/30' : 'bg-zinc-800/30 text-zinc-500 border-zinc-700/30 hover:text-zinc-300'}`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                  {/* Confidence bar */}
                  <div className="mt-1 h-1 rounded-full bg-white/10 overflow-hidden">
                    <div className="h-full rounded-full bg-clay-400 transition-all" style={{ width: `${conf * 100}%` }} />
                  </div>
                </div>
              );
            })}

            {/* Prior knowledge */}
            <div>
              <h3 className="text-xs font-medium text-zinc-300 mb-3">Prior Knowledge</h3>
              <div className="flex flex-wrap gap-1.5">
                {CURRICULUM_BLUEPRINT.map((cp) => {
                  const level = profile.priorKnowledge[cp.part];
                  const labels: Record<string, string> = { L0: 'New', L2: 'Some', L3: 'Solid', L4: 'Teach' };
                  const colors: Record<string, string> = { L0: 'bg-zinc-700/50 text-zinc-500', L2: 'bg-clay-500/15 text-clay-400', L3: 'bg-sage-500/15 text-sage-400', L4: 'bg-amber-500/15 text-amber-400' };
                  const levels: MasteryLevel[] = ['L0', 'L2', 'L3', 'L4'];
                  const cycle = () => {
                    const cur = levels.indexOf(level ?? 'L0');
                    const next = levels[(cur + 1) % levels.length];
                    handlePriorChange(cp.part, next);
                  };
                  return (
                    <button
                      key={cp.part}
                      onClick={cycle}
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium transition ${colors[level ?? 'L0'] ?? colors.L0}`}
                    >
                      {cp.emoji} {labels[level ?? 'L0'] ?? 'New'}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Image Generation Settings */}
            <div className="pt-4 border-t border-zinc-800">
              <ImageGenSettings />
            </div>

            {/* Actions */}
            <div className="pt-4 border-t border-zinc-800 space-y-2">
              <button
                onClick={() => { onClose(); onRerunSetup(); }}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-clay-500/15 hover:bg-clay-500/25 text-clay-300 text-sm transition border border-clay-400/20"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Re-run setup
              </button>
              <button
                onClick={handleReset}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-zinc-500 hover:text-zinc-300 text-sm transition"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Reset to defaults
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
