# Collaboration Request: RHEO Content Engine v2.0

## Your Role

You are the **Specialist AI**. I am the **Project Owner AI** (opencode). I know the codebase; you know how to design and architect solutions. We will collaborate through a structured back-and-forth to refine this idea into an implementable specification.

**Your job is to DESIGN — not just plan.** I need:
1. **High-fidelity UI specifications** — exact layouts, component hierarchy, interaction flows, states (empty/loading/error/success), hover/focus behaviors, animations
2. **Feature logic** — what each button does, what each flow produces, edge cases
3. **Backend architecture** — DB schema refinements, IPC handler signatures, service layer design
4. **Frontend architecture** — component tree, state management, data flow
5. **Human-centric UX** — progressive disclosure, feedback loops, error recovery, accessibility
6. **MCP component inventory** — which shadcn/Magic UI/Lucide components to use for each UI element

---

## The Idea

**RHEO Content Engine v2.0** — a full content creation pipeline inside the DeskFlow Electron app.

The core concept: a creator opens a single chat interface and "yaps" freely about content ideas. The AI listens, categorizes, and routes each thought to the correct bucket (Ideas, Framework Updates, System Improvements, Analytics Insights). Later, they browse accumulated ideas by series, compile them into episodes, generate script bullet points, track experiments, and see performance analytics.

### Core Features to Design:

1. **Brainstorm Chat** — Single-input chat with AI auto-categorization and routing confirmation
2. **Idea Pool** — Kanban/list view of accumulated ideas with status pipeline
3. **Series & Episode Management** — Themed content arcs with episode compilation
4. **Script Compilation** — AI generates hook options, bullet points, visual overlay plans from compiled ideas
5. **Content Equation Analytics** — Radar charts, trend lines, AI insights on performance
6. **Trial & Error Log** — Experiment tracking per episode (hypothesis → result → learning)
7. **Framework Registry** — Versioned content rules with diff/rollback

---

## Current Context (What I Have)

### Project Stack
- **Electron + React + Vite + TypeScript**
- **SQLite** via better-sqlite3 (local, no server)
- **AI via OpenRouter** (existing provider router with fallback chain)
- **Tailwind CSS v4** with glass aesthetic (dark zinc palette, backdrop-blur, amber/cyan accents)
- **Framer Motion** for animations
- **Lucide React** for icons
- **shadcn/ui** components available via MCP
- **Magic UI** components available via MCP

### Existing Patterns I've Verified

**DB Schema Pattern** (`src/domains/focus/focusSchema.ts`):
```ts
export function ensureFocusSchema(db: Database.Database) {
  db.exec(`CREATE TABLE IF NOT EXISTS ...`);
  // Migration: PRAGMA table_info → ALTER TABLE ADD COLUMN
}
```

**IPC Handler Pattern** (`src/main.ts`):
```ts
ipcMain.handle('focusGroup:save', (_e, g: any) => {
  if (!g || typeof g.name !== 'string') return { success: false, error: 'Name required' };
  try {
    const id = focusGroupManager.save({ ... });
    return { success: true, id };
  } catch (err) {
    return { success: false, error: String(err) };
  }
});
```

**Preload Bridge Pattern** (`src/preload.ts`):
```ts
contextBridge.exposeInMainWorld('deskflowAPI', {
  getLogs: () => ipcRenderer.invoke('get-logs'),
  // ...
});
```

**AI Provider Pattern** (`src/services/providers/router.ts`):
```ts
const chain = buildChain(pState, 'researchDigest');
const { result } = await runWithFallback(chain, {
  systemPrompt, messages: [{ role: 'user', content }], maxTokens: 2000, temperature: 0.4,
});
```

**Page Component Pattern** (`src/pages/StatsPage.tsx`):
```tsx
<PageShell page="stats">
  <SectionHeader title="Stats" icon={<BarChart3 />} />
  <GlassCard><>...</></GlassCard>
</PageShell>
```

**Design Tokens** (`src/index.css`):
```
Background: #09090b → Card: #18181b → Border: #27272a → Muted: #a1a1aa → Text: #fafafa
Primary: #fbbf24 (amber) | Secondary accent: #06b6d4 (cyan)
Font: Inter (sans), JetBrains Mono (mono), Space Grotesk (display)
Cards: rounded-xl, bg-zinc-900/60, backdrop-blur-xl, border-zinc-800/50
```

### The Spec

The full feature specification is at `agent/docs/RHEO_Content_Engine_v2_Spec.md`. Key data points:

- **11 SQLite tables** already defined (brainstorm_sessions, brainstorm_messages, ideas, series, episodes, episode_ideas, performance_metrics, content_equation_scores, trial_logs, frameworks, framework_versions)
- **30+ IPC handlers** defined in the spec
- **4 AI prompts** defined (classification, script compilation, analytics insight, session summary)
- **7 UI views** defined (Brainstorm, Idea Pool, Series, Episode Detail, Analytics Dashboard, Frameworks, and the navigation)
- **Content Equation formula** defined: `(Hook×0.25) + (Visual×0.20) + (Audio×0.15) + (Speed×0.20) + (Format×0.20)`

---

## Context Gaps (What I Don't Have Yet)

- "If you need to see how GlassCard renders different variants, ask and I will fetch it"
- "If you need the full App.tsx routing/sidebar setup, ask and I will include it"
- "If you need to see how the existing OpenRouter integration handles streaming, ask"
- "If you need to see how other pages handle loading/empty/error states, ask"
- "If you need the full tailwind config or design system docs, ask"

---

## Conversation Protocol

**How we communicate:**

1. **You ask specific questions.** Format: `REQUEST: [specific file, schema, or clarification]`
2. **I fetch and respond.** Format: `CONTEXT: [file path]\n[actual source code]`
3. **You refine your understanding.** Ask follow-ups or propose a design.
4. **When ready, you produce RESULT.md.** Format: complete design specification with UI specs, component hierarchy, interaction flows, backend architecture, and implementation plan.

**Rules:**
- Do NOT assume context you don't have. Ask for it.
- Do NOT design for features whose backend doesn't exist. Flag them.
- Do NOT produce a monolithic answer. Iterate with me.
- When you need to see code, ask for the EXACT file path.
- **DESIGN THE UI IN DETAIL** — exact layouts, component names, states, interactions. Not "a card with data" — specify what's inside the card, how it animates, what happens on hover.
- **USE MCP COMPONENTS** — reference specific shadcn/Magic UI/Lucide components by name.

---

## Scope

**IN:**
- All 7 views (Brainstorm, Idea Pool, Series, Episode Detail, Analytics, Frameworks, Navigation)
- DB schema (11 tables already defined — refine if needed)
- IPC handlers (30+ defined — refine signatures)
- AI integration (4 prompts defined — refine if needed)
- UI component design with MCP inventory
- Human-centric UX flows
- Content Equation analytics visualization

**OUT:**
- Actual video rendering/editing
- External platform API integration (Instagram, TikTok, YouTube APIs)
- User authentication (local app only)
- Deployment/packaging

---

## Expected Output

After our conversation converges, produce:

1. **RESULT.md** — The complete design specification including:
   - UI specifications for every view (layout, components, states, interactions)
   - Component hierarchy with MCP component assignments
   - Backend architecture (DB schema refinements, IPC signatures, service layer)
   - Frontend architecture (component tree, state management, data flow)
   - Human-centric UX patterns (loading, empty, error, success states)
   - AI integration details (prompt refinements, response parsing)
   - Content Equation visualization spec
   - Implementation plan (file-by-file, phase-by-phase)

2. **Backend Audit** — Any missing IPC/services/DB schemas flagged

---

## First Question

Before you start designing, I need to understand your approach:

1. **Which view do you want to start with?** I recommend starting with the Brainstorm Chat since it's the entry point for the entire pipeline.
2. **Do you want to see the full App.tsx routing setup first** so you understand how pages are added to the navigation?
3. **Do you want to see how existing pages handle real-time data updates** (e.g., the dashboard's live tracking) so you can design the chat's real-time classification flow?

Ask me for whatever context you need. Let's start.
