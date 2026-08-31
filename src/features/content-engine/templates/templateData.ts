// Content Engine — Prompt Template System
// Pre-built style packages: color scheme + explanation style + tone + font pairing.
// Users select a template → the prompt is assembled with consistent style directives.

export interface PromptTemplate {
  id: string
  name: string
  description: string
  accent: string          // hex color for the card accent
  accentRGB: string       // r,g,b for CSS var usage
  icon: string            // lucide icon name
  category: 'tone' | 'visual' | 'depth' | 'format'
  // Prompt modifiers injected into the system prompt
  tone: string            // e.g. "conversational, punchy, Gen-Z"
  explanationStyle: string // e.g. "show don't tell, one-liner evidence"
  depth: 'compact' | 'standard' | 'deep'
  visualDirective: string // e.g. "every frame needs a visual description"
  outputFormat: string    // e.g. "JSON with titles, hooks, and frames"
  // UI display
  preview: string         // short text shown on the card
  tags: string[]
}

export const STYLE_PACKAGES: PromptTemplate[] = [
  // ── Tone packages ──
  {
    id: 'punchy-short',
    name: 'Punchy Short',
    description: 'Fast, hooky, every word earns its place. TikTok energy.',
    accent: '#f5c518',
    accentRGB: '245,197,24',
    icon: 'Zap',
    category: 'tone',
    tone: 'Conversational, punchy, zero filler. Write like you text your smartest friend. One idea per sentence. No throat-clearing.',
    explanationStyle: 'Evidence is a single quoted phrase from the script. No paragraphs. "This line works because X."',
    depth: 'compact',
    visualDirective: 'Every frame needs a 5-word visual note in parentheses. No scene descriptions.',
    outputFormat: 'JSON only. Frames array. Each frame: text, duration_seconds, frame_type, visual.',
    preview: 'Fast hooks, tight loops, Gen-Z energy',
    tags: ['tiktok', 'hooks', 'short-form', 'viral'],
  },
  {
    id: 'storyteller',
    name: 'Storyteller',
    description: 'Narrative-driven, emotional arcs, cliffhangers between beats.',
    accent: '#8b5cf6',
    accentRGB: '139,92,246',
    icon: 'BookOpen',
    category: 'tone',
    tone: 'Narrative, warm, emotionally engaged. Write like a friend telling a story over coffee. Build tension between beats.',
    explanationStyle: 'Evidence includes the emotional mechanism: "This creates curiosity because..." with a concrete example.',
    depth: 'standard',
    visualDirective: 'Each frame includes a visual that supports the emotional arc — lighting, camera angle, pacing notes.',
    outputFormat: 'JSON only. Frames array with text, duration_seconds, frame_type, visual, emotional_beat.',
    preview: 'Emotional arcs, narrative tension, warmth',
    tags: ['storytelling', 'emotional', 'narrative', 'long-form'],
  },
  {
    id: 'data-nerd',
    name: 'Data Nerd',
    description: 'Evidence-first, statistics-driven, authority-building.',
    accent: '#06b6d4',
    accentRGB: '6,182,212',
    icon: 'BarChart3',
    category: 'tone',
    tone: 'Analytical, precise, authority-building. Lead with data. "Studies show X" → "Here\'s what that means for you." Cite specific numbers.',
    explanationStyle: 'Evidence is a metric: "This frame targets completion rate by front-loading the payoff at 3s (avg retention drop: 40% at 4s)."',
    depth: 'deep',
    visualDirective: 'Each frame includes data visualization notes — charts, numbers on screen, comparison tables.',
    outputFormat: 'JSON only. Frames with text, duration_seconds, frame_type, visual, data_point.',
    preview: 'Stats, research, authority, numbers',
    tags: ['data', 'authority', 'educational', 'research'],
  },
  {
    id: 'chaos-creator',
    name: 'Chaos Creator',
    description: 'Pattern interrupts, surprise, anti-fragile hooks.',
    accent: '#ef4444',
    accentRGB: '239,68,68',
    icon: 'Flame',
    category: 'tone',
    tone: 'Unpredictable, provocative, pattern-breaking. Open with something that makes people say "wait what?" Subvert expectations every 15 seconds.',
    explanationStyle: 'Evidence focuses on the pattern interrupt: "This violates the expected pattern by X, which triggers attention re-engagement."',
    depth: 'compact',
    visualDirective: 'Every frame needs a visual surprise — wrong prop, unexpected location, visual contradiction to the words.',
    outputFormat: 'JSON only. Frames with text, duration_seconds, frame_type, visual, surprise_factor.',
    preview: 'Pattern breaks, surprises, anti-fragile',
    tags: ['pattern-interrupt', 'surprise', 'viral', 'chaos'],
  },
  // ── Visual packages ──
  {
    id: 'cinematic',
    name: 'Cinematic',
    description: 'Film-quality descriptions, lighting, camera work, mood boards.',
    accent: '#f59e0b',
    accentRGB: '245,158,11',
    icon: 'Film',
    category: 'visual',
    tone: 'Professional, evocative, film-literate. Use cinematic language: "slow push-in," "Dutch angle," "golden hour."',
    explanationStyle: 'Evidence links visual choices to retention: "The slow push-in creates intimacy, keeping the viewer engaged through visual rhythm."',
    depth: 'deep',
    visualDirective: 'Every frame has a full shot description: camera movement, lighting, color palette, mood, reference film/creator.',
    outputFormat: 'JSON only. Frames with text, duration_seconds, frame_type, visual (detailed shot list), mood.',
    preview: 'Shot lists, lighting, camera work, mood',
    tags: ['cinematic', 'film', 'production', 'quality'],
  },
  {
    id: 'minimal-visual',
    name: 'Minimal Visual',
    description: 'Clean, simple, text-forward. Let the words do the work.',
    accent: '#64748b',
    accentRGB: '100,116,139',
    icon: 'Minus',
    category: 'visual',
    tone: 'Clean, minimal, confident. Let the script breathe. Visual descriptions are one line max.',
    explanationStyle: 'Evidence is简洁: "Simple visual = less cognitive load = higher completion."',
    depth: 'compact',
    visualDirective: 'One-line visual note per frame. No scene descriptions. Just the key visual element.',
    outputFormat: 'JSON only. Frames with text, duration_seconds, frame_type, visual (one line).',
    preview: 'Clean, text-forward, simple',
    tags: ['minimal', 'clean', 'text-forward', 'simple'],
  },
  // ── Depth packages ──
  {
    id: 'deep-dive',
    name: 'Deep Dive',
    description: 'Maximum detail, every decision justified, full evidence chain.',
    accent: '#10b981',
    accentRGB: '16,185,129',
    icon: 'Layers',
    category: 'depth',
    tone: 'Thorough, expert, every creative choice is justified with reasoning and evidence.',
    explanationStyle: 'Full evidence chain: criterion → exact wording → mechanism → expected impact → confidence score. No hand-waving.',
    depth: 'deep',
    visualDirective: 'Detailed visual breakdowns with alternatives: "Primary: X. Backup: Y. Why: Z."',
    outputFormat: 'JSON only. Frames with full retention evidence object, alternatives, confidence scores.',
    preview: 'Full evidence, justified choices, alternatives',
    tags: ['detailed', 'thorough', 'expert', 'evidence'],
  },
  {
    id: 'quick-fire',
    name: 'Quick Fire',
    description: 'Fastest possible output. Title + hook + 5 frames. Go.',
    accent: '#f97316',
    accentRGB: '249,115,22',
    icon: 'Rocket',
    category: 'depth',
    tone: 'Direct, no preamble. Just the output. "Here\'s your script."',
    explanationStyle: 'Minimal evidence: one sentence per frame explaining why it works.',
    depth: 'compact',
    visualDirective: 'Visual: one word or phrase per frame.',
    outputFormat: 'JSON only. Frames with text, duration_seconds, frame_type, visual (short).',
    preview: 'Minimal, fast, just the output',
    tags: ['fast', 'minimal', 'quick', 'output'],
  },
  // ── Format packages ──
  {
    id: 'listicle',
    name: 'Listicle Machine',
    description: 'Numbered lists, countdowns, ranking formats.',
    accent: '#ec4899',
    accentRGB: '236,72,153',
    icon: 'ListOrdered',
    category: 'format',
    tone: 'Energetic, ranking-focused. "Top 5," "3 things," countdown energy. Each item escalates.',
    explanationStyle: 'Evidence: "List format creates completion bias — viewers watch to see the full ranking."',
    depth: 'standard',
    visualDirective: 'Each frame gets a number overlay and the item title.',
    outputFormat: 'JSON only. Frames with text, duration_seconds, frame_type, visual, list_number.',
    preview: 'Lists, rankings, countdowns',
    tags: ['listicle', 'ranking', 'countdown', 'top-list'],
  },
  {
    id: 'qa-format',
    name: 'Q&A Format',
    description: 'Question-led, curiosity gaps, answer reveals.',
    accent: '#3b82f6',
    accentRGB: '59,130,246',
    icon: 'MessageCircleQuestion',
    category: 'format',
    tone: 'Curious, Socratic. Every section starts with a question. Build anticipation before the reveal.',
    explanationStyle: 'Evidence: "Question → pause → answer creates a curiosity gap that sustains attention through the reveal."',
    depth: 'standard',
    visualDirective: 'Question frames: text on screen with "?" visual. Answer frames: the reveal with supporting visual.',
    outputFormat: 'JSON only. Frames with text, duration_seconds, frame_type, visual, question_type.',
    preview: 'Questions, curiosity gaps, reveals',
    tags: ['qa', 'question', 'curiosity', 'reveal'],
  },
]

export const TEMPLATE_CATEGORIES = [
  { id: 'tone', label: 'Tone & Voice', description: 'How the AI writes' },
  { id: 'visual', label: 'Visual Style', description: 'How scenes are described' },
  { id: 'depth', label: 'Detail Level', description: 'How much evidence & justification' },
  { id: 'format', label: 'Content Format', description: 'Structural pattern' },
] as const

export function getTemplatesByCategory(category: string): PromptTemplate[] {
  return STYLE_PACKAGES.filter(t => t.category === category)
}

export function getTemplateById(id: string): PromptTemplate | undefined {
  return STYLE_PACKAGES.find(t => t.id === id)
}

export function buildStyleDirective(templateIds: string[]): string {
  const templates = templateIds.map(getTemplateById).filter(Boolean) as PromptTemplate[]
  if (templates.length === 0) return ''

  const parts: string[] = []

  const tones = templates.filter(t => t.category === 'tone')
  const visuals = templates.filter(t => t.category === 'visual')
  const depths = templates.filter(t => t.category === 'depth')
  const formats = templates.filter(t => t.category === 'format')

  if (tones.length) parts.push(`TONE: ${tones.map(t => t.tone).join(' ')}`)
  if (visuals.length) parts.push(`VISUAL: ${visuals.map(t => t.visualDirective).join(' ')}`)
  if (depths.length) parts.push(`DEPTH: ${depths.map(t => t.tone).join(' ')}\nEVIDENCE: ${depths.map(t => t.explanationStyle).join(' ')}`)
  if (formats.length) parts.push(`FORMAT: ${formats.map(t => t.tone).join(' ')}\nSTRUCTURE: ${formats.map(t => t.visualDirective).join(' ')}`)

  return parts.join('\n\n')
}
