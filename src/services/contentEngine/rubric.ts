// Retention Rubric — v2.0.0
// 14 criteria (RESULT.md Appendix A) with non_negotiable flags.
// Criteria-as-data: every scorer/validator/prompt reads from this object.
export const RETENTION_RUBRIC = {
  version: '2.0.0',
  threshold: 0.6,
  criteria: [
    {
      id: 'visual_hook',
      name: 'Visual Hook',
      definition: 'A visual change in the first 0-0.5s breaks the scroll pattern before the viewer even hears the audio.',
      scoring: '0.0-1.0: perceptual mismatch strength of the opening frame vs the feed',
      timeline: '0-0.5s',
      non_negotiable: true,
    },
    {
      id: 'verbal_hook',
      name: 'Verbal Hook',
      definition: 'The spoken line within 0.5-1.5s names something the viewer immediately recognizes as theirs.',
      scoring: '0.0-1.0: how instantly the words grab attention',
      timeline: '0.5-1.5s',
      non_negotiable: true,
    },
    {
      id: 'context_lock',
      name: 'Context Lock',
      definition: 'By 1.5-3.0s the viewer knows exactly what this video is about and why it matters to them.',
      scoring: '0.0-1.0: clarity of topic + stakes within 3s',
      timeline: '1.5-3.0s',
      non_negotiable: true,
    },
    {
      id: 'curiosity_gap',
      name: 'Curiosity / Expectation Gap',
      definition: 'Reveals partial information and withholds the payoff, so the viewer must keep watching to close the gap (Zeigarnik effect).',
      scoring: '0.0-1.0: how strongly an unanswered question is raised',
      timeline: '3-10s',
      non_negotiable: true,
    },
    {
      id: 'pattern_interrupt',
      name: 'Pattern Interrupt',
      definition: 'A scene change, prop, or shock value at 30-45s interrupts the viewing habit loop and re-locks attention.',
      scoring: '0.0-1.0: strength of perceptual mismatch against the established pattern',
      timeline: '30-45s',
      non_negotiable: true,
    },
    {
      id: 'value_loop',
      name: 'Value Loop (What/How/Why)',
      definition: 'Each segment delivers value in a loop: What (the claim), How (the mechanism), Why (the stakes) — so every 8-15s block pays off.',
      scoring: '0.0-1.0: completeness of What/How/Why within each value beat',
      timeline: 'throughout',
      non_negotiable: true,
    },
    {
      id: 'three_cs',
      name: '3 Cs (Clarity, Conciseness, Conversational)',
      definition: 'Lines are clear, short (under ~12 words), and sound like speech — never written paragraphs.',
      scoring: '0.0-1.0: average line length + jargon count + conversational tone',
      timeline: 'throughout',
      non_negotiable: true,
    },
    {
      id: 'facial_expression',
      name: 'Facial Expression Engineering',
      definition: 'Delivery uses exaggerated facial expressions mapped to the emotional beats of each line.',
      scoring: '0.0-1.0: presence and range of deliberate facial cues',
      timeline: 'throughout',
      non_negotiable: false,
    },
    {
      id: 'pacing_pauses',
      name: 'Pacing & Pauses (125-150 WPM)',
      definition: 'Delivery speed lands in 125-150 WPM with intentional pauses after key lines to let the point land.',
      scoring: '0.0-1.0: how close the line length sits to the WPM target + pause placement',
      timeline: 'throughout',
      non_negotiable: false,
    },
    {
      id: 'acoustic_ducking',
      name: 'Acoustic Sidechain Ducking',
      definition: 'Background music ducks -3dB to -6dB under the voice so the words are never buried.',
      scoring: '0.0-1.0: edit note presence + ducking range (-3 to -6 dB)',
      timeline: 'editing',
      non_negotiable: false,
    },
    {
      id: 'seamless_loop',
      name: 'Seamless Loop',
      definition: 'The video ends where it began so a looped play does not feel like a restart.',
      scoring: '0.0-1.0: how well the last line/frame resolves into the first',
      timeline: 'end',
      non_negotiable: false,
    },
    {
      id: 'hook_at_3_4s',
      name: 'Hook Payoff at 3-4s',
      definition: 'The hook PAYOFF lands at 3-4s — exactly where viewers drop off — never at second 0.',
      scoring: '0.0-1.0: payoff placement AND stakes clarity at the 3-4s mark',
      timeline: '3-4s',
      non_negotiable: true,
    },
    {
      id: 'value_speed',
      name: 'Value Speed',
      definition: 'The first payoff lands within 8 seconds of the video start (5-7s retention barrier).',
      scoring: '0.0-1.0: how fast value arrives',
      timeline: '0-8s',
      non_negotiable: true,
    },
    {
      id: 'specific_pain',
      name: 'Specific Pain / Stakes First',
      definition: 'Names a concrete pain, person, or risk the viewer immediately recognizes as theirs — with stakes stated first.',
      scoring: '0.0-1.0: how concretely the pain + stakes are named',
      timeline: '0-10s',
      non_negotiable: true,
    },
  ],
  nicheRule:
    'All criteria must be re-expressed for the target niche/topic — never paste verbatim cross-niche.',
  nonNegotiableRule:
    'If ANY non-negotiable criterion scores below the threshold, the frame is AUTO-REJECTED regardless of the overall weighted score.',
} as const;

export type RetentionCriterionId = (typeof RETENTION_RUBRIC.criteria)[number]['id'];

export const RETENTION_CRITERIA_IDS: string[] = RETENTION_RUBRIC.criteria.map((c) => c.id);

export const NON_NEGOTIABLE_IDS: string[] = RETENTION_RUBRIC.criteria
  .filter((c) => c.non_negotiable)
  .map((c) => c.id);

// Per-frame evidence contract — every script frame carries this.
// {
//   criteria: ['pattern_interrupt', 'curiosity_gap'],
//   mechanism: 'Scene slams from static card to motion; line states a stakes question with withheld answer',
//   evidence: 'Line names a specific pain without revealing the resolution — viewer must watch to close the gap',
//   score: 0.9
// }
export interface RetentionEvidence {
  criteria: string[];
  mechanism: string;
  evidence: string;
  score: number;
}