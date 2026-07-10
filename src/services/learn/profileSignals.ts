import { loadProfile, saveProfile } from './learnerProfile';
import type { LearnerProfile, ProfileKnob } from '../../shared/learn/types';

export type LearnSignal =
  | 'layer_expanded' | 'prose_scrolled_fast' | 'prose_dwelled'
  | 'worked_example_opened' | 'try_it_jumped'
  | 'quiz_failed' | 'quiz_aced' | 'session_abandoned';

const ALPHA = 0.18;

const SCALES: Partial<Record<ProfileKnob, string[]>> = {
  density: ['thorough', 'balanced', 'terse'],
  mathDepth: ['applied_only', 'intuition_first', 'derive_everything'],
  exampleStance: ['discovery_first', 'balanced', 'worked_first'],
  layerRevealDefault: ['L0', 'L1', 'L2', 'L3', 'L4', 'L5'],
  chunkSize: ['deep', 'standard', 'micro'],
};

function nudge(p: LearnerProfile, knob: ProfileKnob, dir: -1 | 1) {
  const scale = SCALES[knob]; if (!scale) return;
  const cur = scale.indexOf((p as any)[knob]);
  const target = Math.max(0, Math.min(scale.length - 1, cur + dir));
  const next = Math.round(cur * (1 - ALPHA) + target * ALPHA + dir * 0.01);
  const idx = Math.max(0, Math.min(scale.length - 1, next));
  (p as any)[knob] = scale[idx];
  p.confidence[knob] = Math.min(0.9, (p.confidence[knob] ?? 0.3) + 0.05);
}

function bumpPrior(p: LearnerProfile, part: number, dir: -1 | 1) {
  const levels = ['L0', 'L1', 'L2', 'L3', 'L4', 'L5'] as const;
  const cur = levels.indexOf(p.priorKnowledge[part] ?? 'L0');
  const idx = Math.max(0, Math.min(5, cur + dir));
  p.priorKnowledge[part] = levels[idx];
}

export function recordSignal(sig: LearnSignal, ctx?: { part?: number }) {
  const p = loadProfile();
  switch (sig) {
    case 'layer_expanded':        nudge(p, 'mathDepth', 1); nudge(p, 'layerRevealDefault', 1); break;
    case 'prose_scrolled_fast':   nudge(p, 'density', 1); break;
    case 'prose_dwelled':         nudge(p, 'density', -1); break;
    case 'worked_example_opened': nudge(p, 'exampleStance', 1); break;
    case 'try_it_jumped':         nudge(p, 'exampleStance', -1); break;
    case 'quiz_aced':             if (ctx?.part != null) bumpPrior(p, ctx.part, 1); nudge(p, 'exampleStance', -1); break;
    case 'quiz_failed':           if (ctx?.part != null) bumpPrior(p, ctx.part, -1); nudge(p, 'exampleStance', 1); break;
    case 'session_abandoned':     nudge(p, 'chunkSize', 1); break;
  }
  saveProfile(p);
}
