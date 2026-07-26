# Round 7 — Context: promptLibrary.ts (prompt composition system)

## File: src/services/learn/promptLibrary.ts

### Key functions:

#### loadPromptLibrary (lines 134-142)
```ts
export function loadPromptLibrary(readResource: (rel: string) => string | null): PromptLibrary {
  return {
    format: readResource('author-guide.md') ?? '',
    capabilities: '', // deprecated — author-guide.md is the authoritative format reference
    style: readResource('prompts/master-prompt.md') ?? '',
    persona: readResource('prompts/coach-persona.md') ?? '',
    guardrails: readResource('prompts/guardrails.md') ?? '',
  };
}
```

#### composeAuthorSystemPrompt (lines 144-174) — MAIN prompt composition
```ts
export function composeAuthorSystemPrompt(
  lib: PromptLibrary,
  opts?: { part?: number; profile?: LearnerProfile },
): string {
  const parts: string[] = [];

  // 1. Format layer (always first — must win)
  parts.push(`## Format\n${lib.format}`);

  // 2. Style / master prompt
  parts.push(`## Teaching Style\n${lib.style}`);

  // 3. Persona — profile block REPLACES the static persona when present
  parts.push(`## Persona\n${opts?.profile ? composeLearnerProfileBlock(opts.profile) : lib.persona}`);

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
```

#### composeTopicUserPrompt (lines 176-195) — per-topic generation
```ts
export function composeTopicUserPrompt(part: number, profile?: LearnerProfile): string {
  const curriculum = CURRICULUM_BLUEPRINT[part];
  if (!curriculum) return '';

  const coachingNote = getCoachingNoteForSlug(curriculum.slug) ?? '';
  const target = profile?.priorKnowledge?.[part] ?? curriculum.defaultMasteryTarget;
  const parts = [
    `Topic: ${curriculum.title}`,
    curriculum.intro,
    `\nRequired coverage — the lesson MUST help the learner demonstrate each of these:`,
    ...curriculum.checklist.map((c, i) => `${i + 1}. ${c}`),
    coachingNote ? `\n## Coaching note\n${coachingNote}` : '',
    target !== curriculum.defaultMasteryTarget
      ? `\nCalibrate to the learner's current level for this part: ${target}. Author to move them ONE level beyond it.`
      : '',
    `\n${SEGMENTATION_INSTRUCTION}`,
    `\nOutput as .lmd (lyceum markdown) with "---" frontmatter. Include a "Check Your Understanding" section.`,
  ];
  return parts.filter(Boolean).join('\n');
}
```

#### composeCombinedPrompt (lines 207+) — standalone prompt for external AI chats
```ts
export function composeCombinedPrompt(topic: string, profile: LearnerProfile): string {
  const preamble = `# Lyceum Personal Learning System — System Prompt (v3)

You are my personal curriculum author and tutor. You teach in a mastery-learning
style: concepts are broken into nodes, each targeting an explicit mastery level
(L0 Novice → L1 Aware → L2 Apprentice → L3 Practitioner → L4 Proficient → L5
Expert), each grounded (cite what's true, flag common misconceptions), and each
checked with a quiz before moving on.

## How to teach — pick the right visual, don't default to one
- Diagrams (flows, architectures, trees, state machines) → describe/draw them
  clearly (Mermaid-style or ASCII if I can't render images).
- Data/quantitative relationships → a described chart or table, not prose.
```
(truncated — full file is 348 lines)

### Prompt files referenced:
- `resources/learn/author-guide.md` — format reference (v3)
- `resources/learn/prompts/master-prompt.md` — teaching style
- `resources/learn/prompts/coach-persona.md` — persona
- `resources/learn/prompts/guardrails.md` — guardrails

### No dedicated FLASHCARD_GENERATION_PROMPT or CONCEPT_MAP_PROMPT exists.
The AI generates viz blocks (flashcards, concept maps, etc.) based on the format layer
(`author-guide.md`) which documents the block types the AI should produce. The viz block
types are: heatmap, knowledge_graph, flashcard, layer_reveal, concept_map, mastery_timeline,
whiteboard.
