import { getSystemPromptForSlug, getCoachingNoteForSlug } from './topicPrompts';
import { CURRICULUM_BLUEPRINT } from './curriculum';

// ── Prompt library types ──

export interface PromptLibrary {
  format: string;           // author-guide.md
  capabilities: string;     // capabilities-manifest.md
  style: string;            // master-prompt.md
  persona: string;          // coach-persona.md
  guardrails: string;       // guardrails.md
}

export interface PromptRecipe {
  name: string;
  slug: string;
  description: string;
  build: (topic?: string, userInput?: string) => { system: string; user: string };
}

// ── L0-L5 mastery ladder (§3.1) ──

const MASTERY_LADDER = [
  'L0 (Novice): No exposure — never heard of it.',
  'L1 (Aware): Heard the term, can define it at dictionary level.',
  'L2 (Apprentice): Can follow a recipe / reproduce with guidance.',
  'L3 (Practitioner): Can apply independently in familiar contexts.',
  'L4 (Proficient): Deep understanding; can teach it, tune it, combine it.',
  'L5 (Expert): Can innovate, extend the framework, publish new results.',
].join('\n');

// ── Segmentation procedure (§3.2) embedded in user prompt ──

const SEGMENTATION_INSTRUCTION = [
  '## Learner Segmentation Procedure',
  'Assess the learner against each checklist item using the L0-L5 ladder above.',
  '',
  'For each item, produce a 4-part assessment:',
  '1. **Demonstrated** — what the learner already shows at this level.',
  '2. **Gaps** — what is missing or fragile.',
  '3. **Verdict** — which level (L0-L5) this item lands at.',
  '4. **Next step** — a single actionable recommendation to advance one level.',
  '',
  'Then group adjacent items by level proximity into segments.',
  'Output ONE `::assess` block per segment group:',
  '',
  '```lmd',
  '::assess',
  'level: "L0-L2"',
  'title: "Novice → Apprentice"',
  'demonstrated:',
  '  - can define the term',
  'gaps:',
  '  - cannot apply independently',
  'verdict: "L1 (Aware)"',
  'next_step: "Work through guided exercises in sections 2-3"',
  '::',
  '```',
  '',
  'Order segments from lowest to highest level.',
  'Do NOT make up progress the learner has not shown.',
  'If evidence is insufficient, flag it in gaps and ask for more.',
].join('\n');

// ── Compose system prompt from layers ──

export function loadPromptLibrary(readResource: (rel: string) => string | null): PromptLibrary {
  return {
    format: readResource('author-guide.md') ?? '',
    capabilities: readResource('capabilities-manifest.md') ?? '',
    style: readResource('prompts/master-prompt.md') ?? '',
    persona: readResource('prompts/coach-persona.md') ?? '',
    guardrails: readResource('prompts/guardrails.md') ?? '',
  };
}

export function composeAuthorSystemPrompt(
  lib: PromptLibrary,
  opts?: { part?: number },
): string {
  const parts: string[] = [];

  // 1. Format layer (always first — must win)
  parts.push(`## Format\n${lib.format}`);

  // 1b. Capabilities manifest (block types the model can emit)
  if (lib.capabilities) {
    parts.push(`## Available Block Types\n${lib.capabilities}`);
  }

  // 2. Style / master prompt
  parts.push(`## Teaching Style\n${lib.style}`);

  // 3. Persona
  parts.push(`## Persona\n${lib.persona}`);

  // 4. Subject — per-topic brief when part is given
  if (opts?.part != null) {
    const curriculum = CURRICULUM_BLUEPRINT[opts.part];
    const slug = curriculum?.slug;
    const subject = slug ? getSystemPromptForSlug(slug) : '';
    if (subject) parts.push(`## Topic Brief\n${subject}`);
  }

  // 4b. Mastery Ladder — embedded so model can assess learner level (§3.1)
  parts.push(`## Learner Level Definitions\n${MASTERY_LADDER}`);

  // 5. Guardrails (always last — can't be overridden)
  parts.push(`## Guardrails\n${lib.guardrails}`);

  return parts.join('\n\n---\n\n');
}

export function composeTopicUserPrompt(part: number): string {
  const curriculum = CURRICULUM_BLUEPRINT[part];
  if (!curriculum) return '';

  const coachingNote = getCoachingNoteForSlug(curriculum.slug) ?? '';
  return [
    `Topic: ${curriculum.title}`,
    curriculum.intro,
    `\nRequired coverage — the lesson MUST help the learner demonstrate each of these:`,
    ...curriculum.checklist.map((c, i) => `${i + 1}. ${c}`),
    coachingNote ? `\n## Coaching note\n${coachingNote}` : '',
    `\n${SEGMENTATION_INSTRUCTION}`,
    `\nOutput as .lmd (lyceum markdown) with "---" frontmatter. Include a "Check Your Understanding" section.`,
  ].filter(Boolean).join('\n');
}

export function composeTutorPersona(lib: PromptLibrary): string {
  return [lib.persona, lib.guardrails].filter(Boolean).join('\n\n---\n\n');
}

// ── Prompt recipes (kept for IPC convenience) ──

const recipes: PromptRecipe[] = [
  {
    name: 'Generate Lesson',
    slug: 'generate-lesson',
    description: 'Create a new .lmd lesson for a curriculum topic, coached for the learner\u2019s profile.',
    build: (topic?: string) => {
      const masterPrompt = topic ? getSystemPromptForSlug(topic) : '';
      const coachingNote = topic ? getCoachingNoteForSlug(topic) : '';
      return {
        system: `You are a curriculum authoring AI. Your output is always raw .lmd format — never JSON, never wrapped in fences. Start with "---" frontmatter.

Topic: ${topic ?? 'General'}
${masterPrompt ? `\n\n## Master prompt\n${masterPrompt}` : ''}
${coachingNote ? `\n\n## Coaching note\n${coachingNote}` : ''}

Output ONLY the .lmd lesson content. No commentary, no code fences, no JSON wrapper.`,
        user: `Create a ${topic ?? 'general'} lesson in .lmd format. Write for a self-taught engineer with strong math fundamentals who ships Electron/React apps. Include a "Check Your Understanding" section with multiple-choice questions.`,
      };
    },
  },
  {
    name: 'Test Knowledge',
    slug: 'test-knowledge',
    description: 'Generate a quiz or knowledge check for a specific curriculum part.',
    build: (topic?: string) => ({
      system: `You generate .lmd-formatted knowledge checks. Output ONLY raw .lmd starting with "---".${topic ? `\nTopic: ${topic}` : ''}`,
      user: `Generate a knowledge check quiz for ${topic ?? 'the given topic'}. Include: 3 multiple-choice, 1 short-answer, 1 code-reading. Output in .lmd format.`,
    }),
  },
  {
    name: 'Coach Response',
    slug: 'coach-response',
    description: 'Respond to a learner question with Socratic coaching.',
    build: (topic?: string, userInput?: string) => ({
      system: `You are a Socratic coach. Never give direct answers — guide the learner to discover the answer themselves.

Role: Senior AI/ML engineer mentoring a self-taught coder with strong math fundamentals.
Tone: Warm, direct, a little amused. Like a senior dev over coffee.
Method: Ask a clarifying question first, then offer a scaffold. If they\u2019re close, say so and nudge. If they\u2019re wrong, show the contradiction gently.

Know when to break character: if they are stuck after 3 exchanges, explain directly. The goal is learning, not gamesmanship.`,
      user: `The learner asked: ${userInput ?? '[no question provided]'}\n\n${topic ? `Context: studying "${topic}".` : ''}\n\nCoach them Socratically. Output in .lmd format.`,
    }),
  },
  {
    name: 'Generate Check Your Understanding',
    slug: 'generate-cyu',
    description: 'Add a "Check Your Understanding" block to an existing lesson.',
    build: (topic?: string, userInput?: string) => ({
      system: `You generate "Check Your Understanding" blocks in .lmd format.

Include:
- 2-3 multiple-choice questions with 4 options each and correct answer indicated
- 1 open-ended reflection question
- An answer key at the bottom

Output ONLY raw .lmd starting with "---". Never JSON, never fenced.`,
      user: `Generate a CYU block for this lesson:\n\n"""\n${userInput ?? 'No lesson content provided.'}\n"""\n\n${topic ? `\nTopic: ${topic}` : ''}`,
    }),
  },
];

const recipeIndex = new Map<string, PromptRecipe>();
recipes.forEach((r) => {
  recipeIndex.set(r.slug, r);
  recipeIndex.set(r.name.toLowerCase(), r);
});

export function getRecipe(slugOrName: string): PromptRecipe | undefined {
  return recipeIndex.get(slugOrName.toLowerCase());
}

export function buildPrompt(
  recipeSlug: string,
  topic?: string,
  userInput?: string,
): { system: string; user: string } | null {
  const recipe = getRecipe(recipeSlug);
  if (!recipe) return null;
  return recipe.build(topic, userInput);
}

export function listRecipes(): Omit<PromptRecipe, 'build'>[] {
  return recipes.map(({ build: _, ...rest }) => rest);
}
