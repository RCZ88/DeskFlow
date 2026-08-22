# Learn (Lyceum) System — Full Context Bundle

> This document explains the entire learning system architecture, how it changes AI output behavior, and the gaps being addressed.

---

## 1. What This System IS

Lyceum is a **mastery-based, curriculum-driven learning engine** embedded in a desktop productivity app (Electron + React + SQLite). It is NOT a chatbot wrapper. It is a structured pedagogical system that:

1. **Composes a multi-layer system prompt** from 4 documents + learner profile + knowledge base + Context Brain
2. **Generates a structured lesson document** (.lmd format) — NOT free-form text
3. **Parses it into typed blocks** (30+ block types) with a deterministic compiler
4. **Validates it against pedagogical rules** (DAG, visual requirements, fact grounding, anti-decoration)
5. **Renders it as interactive, level-gated content** with quizzes, simulations, and adaptive disclosure

The key insight: **the AI never outputs JSON**. It outputs Lesson Markdown (.lmd), which is then compiled into structured data. This eliminates the #1 failure mode of AI-generated educational content (corrupted JSON from code fences leaking into string values).

---

## 2. How It Changes AI Output Behavior

### The Prompt Composition Pipeline

When a user clicks "Generate", the system assembles a system prompt from multiple layers:

```
┌─────────────────────────────────────────────┐
│ 1. author-guide.md (format/syntax rules)     │
│ 2. master-prompt.md (teaching methodology)    │
│ 3. coach-persona.md (voice/personality)       │
│ 4. guardrails.md (safety boundaries)          │
│ 5. Learner Profile (density, modality, tone)  │
│ 6. Knowledge Base (what they already know)    │
│ 7. Context Brain (relevant facts/episodes)    │
│ 8. User's description of what to learn        │
└─────────────────────────────────────────────┘
         ↓ assembles into ↓
┌─────────────────────────────────────────────┐
│ learn:buildPrompt IPC → full system prompt    │
└─────────────────────────────────────────────┘
         ↓ sent to AI provider via ↓
┌─────────────────────────────────────────────┐
│ learn:generateLdoc IPC → callAi(provider)     │
│ → raw .lmd text → parseLessonMarkdown()       │
│ → LdocDocument (typed JSON) → validateFull()  │
│ → store in SQLite nodes/blocks tables         │
└─────────────────────────────────────────────┘
```

### What the System Prompt Forces

The master-prompt.md (v4.1) and author-guide.md (v4.0) together constrain the AI to:

1. **Output raw .lmd, never JSON** — eliminates code-fence corruption
2. **Every node MUST have a visual block** — L2+ nodes require at least one visual (mermaid, SVG, chart, interactive HTML widget, annotated code, annotated math)
3. **Mastery-gated layering** — `::: layer L3` blocks hide content until the learner reaches L3; this means the AI writes multi-level content, not one flat dump
4. **Grounding blocks required** — every node must have a `::: grounding` block with `know:` facts linked to `source:` citations; this forces the AI to declare what it claims and where it came from
5. **Interactive HTML widgets for L3+** — the prompt explicitly requires `::: html` blocks with sliders, canvas, click-to-reveal for higher mastery levels
6. **Code quality standards** — complete runnable scripts, real data, no placeholders

### The Coach Persona

The AI is given a specific persona: "Senior AI/ML Engineer / Technical Mentor — warm, direct, amused." It has explicit rules:
- Socratic first, direct when stuck (3 exchanges max)
- Relate everything to the learner's existing codebase (Electron/React/SQLite)
- Precision over brevity
- Reveal the meta-skill (teaching them to direct AI)
- Anti-patterns explicitly banned: "Great question!", overusing emoji, apologizing for being AI

---

## 3. The LDOC Format (What Makes It Structurally Powerful)

### Document Structure

```yaml
---
title: Neural Network Backpropagation
id: backprop-fundamentals
part: 8
version: 1.0.0
summary: How gradients flow backward through a neural network.
authored_by: ai
---
```

### Node Structure (each `# Heading` is a node)

```markdown
# What is Backpropagation?
@mastery L3
@prereq linear-algebra-ops chain-rule-calculus

Prose explaining the concept...

::: annotated-code python
```python
# Forward pass  // @cast
logits = W @ x + b  // @write
probs = softmax(logits)  // @activate
```
@cast: W @ x is matrix multiplication — the linear transform
@write: biases shift the decision boundary
@activate: softmax converts logits to probabilities
:::

::: grounding
includes: The core mechanism of gradient computation in neural networks
know: Backprop applies the chain rule recursively from output to input [goodfellow]
source: goodfellow | Deep Learning | https://www.deeplearningbook.org
:::
```

### Block Types (30+)

| Category | Types |
|----------|-------|
| **Content** | prose, code, mermaid, math, image, video, table |
| **Interactive** | html (sandboxed iframe with JS), whiteboard, layer_reveal |
| **Assessment** | quiz (mcq/numeric/open), flashcard, flashcard_occlusion |
| **Visualization** | chart, finchart, flow (sankey/waterfall), viz_heatmap, viz_graph, viz_timeline, viz_concept_map |
| **Structure** | layer (mastery-gated), callout, illustration |
| **Annotation** | annotated-code (line targets + explanations), annotated-math (KaTeX with \htmlId targets) |
| **Social** | tutor, proposal, conversation, notes |
| **SVG** | figure (with id scanning for hover targets) |

### The Visual Grounding System (Being Implemented)

This is the newest layer — it connects prose references to visual targets:

- **Prose:** `@ref[cast]` renders as a hoverable amber chip
- **Code lines:** `// @cast` at end of line creates a target; `@cast: explanation` provides annotation
- **Math:** `\htmlId{m-base}{B}` creates a hoverable target; `@m-base: explanation` provides annotation
- **SVG figures:** `<g id="architecture">` + visible `<text>` labels create targets
- **On hover:** RefChip highlights → target glows amber with drop-shadow
- **On click:** scrolls target into view + flash animation
- **Validation:** unresolved @ref = error; unreferenced annotated block = error (anti-decoration)

This forces the AI to create **connected, referenced content** rather than decoration visuals that aren't tied to the prose.

---

## 4. The Mastery Model (L0-L5)

| Level | Label | What It Means | Content Behavior |
|-------|-------|---------------|------------------|
| L0 | Beginner | "I've heard of it" | Definitions, static diagrams |
| L1 | Aware | "I can recognize it" | Naming components, simple examples |
| L2 | Apprentice | "I can do it with help" | Walked examples, guided practice |
| L3 | Practitioner | "I can do it independently" | Interactive explorables, parameter sliders |
| L4 | Proficient | "I can teach it" | Simulations, build-from-scratch, open quizzes |
| L5 | Expert | "I can extend it" | Research-level, edge cases, contribute to field |

The system tracks mastery via a **Bayesian belief state** (Beta distributions per level) updated by evidence from quizzes, self-reports, and tutor interactions. When mastery rises, `::: layer L3` content auto-reveals.

---

## 5. The Learner Profile System

The profile has 10 knobs that shape how the AI teaches:

| Knob | Options | Effect on Output |
|------|---------|------------------|
| density | terse / balanced / thorough | Controls prose volume |
| modalityBias | diagram_first / balanced / text_ok | Controls visual-to-text ratio |
| exampleStance | worked_first / balanced / discovery_first | Controls example ordering |
| mathDepth | applied_only / intuition_first / derive_everything | Controls derivation depth |
| handsOn | 0-3 | Controls build-project inclusion |
| codeStagingDepth | framework_only / numpy_plus / scratch_first | Controls implementation level |
| quizAppetite | light / normal / heavy | Controls quiz count |
| chunkSize | micro / standard / deep | Controls node length |
| layerRevealDefault | L0-L5 | Controls default visible layer depth |
| tone | gentle / balanced / demanding | Controls voice formality |
| teachMode | syntax-first / concept-first / auto | Controls intro style (being added) |

These are composed into the system prompt via `composeLearnerProfileBlock()` in promptLibrary.ts.

---

## 6. The 6 Knowledge Systems (Context Injection)

The system can draw on 6 context sources toggled in Settings:

1. **Graphify** — Knowledge graph from code/docs → entity relationships
2. **LLM Wiki** — All agent/*.md files (dictionary, memory, problems, features)
3. **Obsidian Skills** — YAML-frontmatter skill files
4. **PARA** — Projects/Areas/Resources/Archives vault
5. **QMD** — Session/problem templates
6. **Automations** — Declarative automation rules

Plus:
- **Context Brain** — bitemporal knowledge graph with episodes, entities, facts, embeddings
- **AI Context Capture** — browser extension captures ChatGPT/Claude/Perplexity conversations → fed to brain

When enabled, these inject relevant context into the system prompt, making the AI aware of the learner's existing knowledge, projects, and learning history.

---

## 7. Current Gaps Being Fixed (This Session)

### Gap 1: Visual Grounding (Being Implemented)
- **Problem:** AI generates decorative visuals that aren't connected to prose
- **Fix:** `@ref[id]` system + annotated-code/annotated-math blocks + anti-decoration validator
- **Effect:** Every visual must be referenced; every reference must resolve to a target

### Gap 2: Theory-Heavy Output (Prompt Edits Planned)
- **Problem:** Too much theory, not enough practical content
- **Fix:** New Step 0 mode classification (SYNTAX/MATH/STRUCTURE/CONCEPT) + "Visual Grounding Anti-Decoration Law" + "Intuition first for CONCEPT/MATH only" scoping
- **Effect:** AI classifies the concept type first, then picks appropriate teaching strategy

### Gap 3: No Clarification Flow (Being Implemented)
- **Problem:** AI generates without asking clarifying questions when info is missing
- **Fix:** `::: clarify` block → dialog step with VoiceInputWrapper + "remember preferences" checkbox → answers injected as hard constraints
- **Effect:** AI can ask "how do you want this displayed?" before generating

### Gap 4: No Editable Sources (Task A, Pending)
- **Problem:** Grounding sources are generated but can't be edited per-node
- **Fix:** updateSourcesForNode IPC + NodeSourcesPanel Sheet + ReaderView Sources badge
- **Effect:** Users can add/modify citations per node

### Gap 5: No Visual Catalog (Task B, Pending)
- **Problem:** AI decides visual types without user preference
- **Fix:** visualCatalog.ts (curated library) + VisualCatalogPicker in CreateLessonDialog
- **Effect:** Users can browse and select visual types before generation

### Gap 6: Profile Not Expanded (Task C, Pending)
- **Problem:** LearnerProfilePanel is too compact
- **Fix:** Full expanded mode + speech-to-text for knobs
- **Effect:** Better profile configuration UX

### Gap 7: No Brain Integration in Prompts (Task D, Pending)
- **Problem:** buildPrompt doesn't use Context Brain data
- **Fix:** contextBrain.retrieve(query) → inject relevant episodes/entities/facts into system prompt
- **Effect:** AI generates lessons informed by learner's existing knowledge graph

---

## 8. The Generation Flow (End to End)

```
User types description in CreateLessonDialog
  → handleBuildPrompt() calls learn:buildPrompt IPC
    → promptLibrary.ts assembles system prompt from:
      author-guide.md + master-prompt.md + coach-persona.md + guardrails.md
      + learner profile (10 knobs)
      + knowledge base entries
      + Context Brain retrieval
    → returns { prompt, systemPrompt, knowledgeUsed }
  → User sees prompt in PromptStep (with new "System Prompt" toggle)
  → User clicks "Generate"
    → handleGenerate() calls learn:generateLdoc IPC
      → index.ts: buildChain(pState, 'learn') → runWithFallback(callAi)
      → AI returns raw .lmd text
      → parseLessonMarkdown() → LdocDocument
      → validateFull() → ValidationReport
      → if OK: store in SQLite (lessons + nodes + blocks tables)
      → returns { ok, lessonId, nodes, warnings, validation }
  → Dialog shows result with lesson ID
  → ReaderView renders the lesson with all block types
```

---

## 9. Key Files Reference

| File | Purpose |
|------|---------|
| `resources/learn/prompts/master-prompt.md` | Teaching methodology + visual depth rules |
| `resources/learn/author-guide.md` | .lmd syntax specification |
| `resources/learn/prompts/coach-persona.md` | AI voice/personality |
| `resources/learn/prompts/guardrails.md` | Safety boundaries |
| `src/services/learn/index.ts` | IPC handlers (buildPrompt, generateLdoc, etc.) |
| `src/services/learn/promptLibrary.ts` | Prompt composition (composeAuthorSystemPrompt) |
| `src/services/learn/parseLessonMarkdown.ts` | .lmd → LdocDocument compiler |
| `src/services/learn/validator/validate.ts` | DAG, visual, fact-grounding, anti-decoration checks |
| `src/services/learn/curriculum.ts` | 13 CS-AI topics + branches |
| `src/services/learn/db/repo.ts` | SQLite CRUD for lessons/nodes/blocks |
| `src/shared/learn/types.ts` | All TypeScript interfaces (LdocBlock, LearnerProfile, etc.) |
| `src/components/learn/CreateLessonDialog.tsx` | 3-step generation UI |
| `src/components/learn/ReaderView.tsx` | Block rendering pipeline |
| `src/components/learn/blocks/BlockRenderer.tsx` | 30+ block type dispatcher |
| `src/components/learn/blocks/AnnotatedCodeBlock.tsx` | Two-pane code + annotation cards |
| `src/components/learn/blocks/AnnotatedMathBlock.tsx` | KaTeX + annotation cards |
| `src/components/learn/blocks/ProseBlock.tsx` | Markdown + @ref chips |
| `src/components/learn/blocks/MathBlock.tsx` | KaTeX rendering + hover |
| `src/components/learn/blocks/SvgBlock.tsx` | SVG + hover wiring |
| `src/components/learn/LearnerProfilePanel.tsx` | Profile knob editor |
| `src/main/ai/contextBrain.ts` | Knowledge graph retrieval |
