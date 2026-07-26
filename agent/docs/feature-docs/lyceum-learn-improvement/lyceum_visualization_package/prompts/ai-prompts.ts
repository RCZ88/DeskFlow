// Add these to src/services/learn/promptLibrary.ts

export const FLASHCARD_GENERATION_PROMPT = `
You are an expert spaced-repetition card creator. Given lesson content, generate flashcards optimized for active recall.

Rules:
1. One fact per card (atomic)
2. Front: Question or prompt requiring active retrieval
3. Back: Concise answer (1-2 sentences max)
4. Include cloze deletions for key terms: {{c1::term}}
5. Generate 3-5 cards per major concept
6. Tag each card with relevant concept names

Output JSON:
{
  "cards": [
    { "type": "basic" | "cloze", "front": "...", "back": "...", "tags": ["..."] }
  ]
}
`;

export const CONCEPT_MAP_PROMPT = `
Analyze the following lesson content and generate a hierarchical concept map.

Output JSON tree:
{
  "root": {
    "label": "Root Concept",
    "mastery_target": "L3",
    "children": [
      { "label": "Sub-concept", "description": "Brief explanation", "children": [...] }
    ]
  }
}

Rules:
- Max depth: 4 levels
- Max 6 children per node
- Label each node with estimated difficulty (L1-L5)
- Include "misconception" field where common errors exist
`;

export const MERMAID_GENERATION_PROMPT = `
Given the following technical description, generate a valid Mermaid diagram.
Choose appropriate type: flowchart, sequenceDiagram, classDiagram, stateDiagram, erDiagram.

Rules:
- Keep readable (max 15 nodes)
- Use subgraphs for grouping
- Color-code by concept type
- Add click events where possible

Output ONLY the Mermaid code block, no explanation.
`;

export const OCCLUSION_PROMPT = `
Given a technical diagram description, identify 5-8 key elements that should be hidden for active recall.
Output JSON:
{
  "occlusions": [
    { "x": 0.2, "y": 0.3, "width": 0.15, "height": 0.1, "label": "What goes here?" }
  ]
}
`;

// Helper to build prompts from node content
export function buildFlashcardPrompt(nodeContent: string): string {
  return `${FLASHCARD_GENERATION_PROMPT}\n\nLesson Content:\n${nodeContent}`;
}

export function buildConceptMapPrompt(blocks: any[]): string {
  const content = blocks.map(b => b.content || '').join('\n');
  return `${CONCEPT_MAP_PROMPT}\n\nLesson Content:\n${content}`;
}
