// Mode Registry — Different prompt structures for different presentation types

export interface GenerationMode {
  id: string
  label: string
  description: string
  defaultSlideCount: number
  minSlides: number
  maxSlides: number
  frameSequence: string[]
  promptPreset: string
}

export const MODES: Record<string, GenerationMode> = {
  educational: {
    id: 'educational',
    label: 'Educational',
    description: 'Explain concepts with diagrams, examples, and visual grounding',
    defaultSlideCount: 8,
    minSlides: 4,
    maxSlides: 15,
    frameSequence: ['hook', 'value', 'value', 'value', 'value', 'value', 'value', 'call_to_action'],
    promptPreset: 'Teach this topic step by step. Each slide builds on the previous. Use diagrams, equations, and interactive elements to make abstract concepts concrete.',
  },
  youtube_shorts: {
    id: 'youtube_shorts',
    label: 'YouTube Shorts',
    description: 'Fast hook, high-contrast claim, quick payoff, CTA ending',
    defaultSlideCount: 6,
    minSlides: 3,
    maxSlides: 10,
    frameSequence: ['hook', 'value', 'value', 'visual_only', 'value', 'call_to_action'],
    promptPreset: 'Create fast-paced, high-impact slides for a YouTube Short. Hook in the first slide, deliver value fast, end with a clear CTA.',
  },
  pitch: {
    id: 'pitch',
    label: 'Pitch Deck',
    description: 'Problem → Solution → Market → Product → Traction → Ask',
    defaultSlideCount: 8,
    minSlides: 5,
    maxSlides: 12,
    frameSequence: ['hook', 'value', 'value', 'value', 'value', 'value', 'value', 'call_to_action'],
    promptPreset: 'Create a pitch deck. Start with the problem, present the solution, show market proof, demonstrate the product, show traction, and end with the ask.',
  },
  technical: {
    id: 'technical',
    label: 'Technical Deep Dive',
    description: 'Definition → Architecture → Code → Tradeoffs → Summary',
    defaultSlideCount: 8,
    minSlides: 4,
    maxSlides: 15,
    frameSequence: ['hook', 'value', 'value', 'visual_only', 'value', 'value', 'value', 'call_to_action'],
    promptPreset: 'Create a technical deep dive. Start with definitions, show architecture diagrams, include code examples, discuss tradeoffs, and summarize.',
  },
}
