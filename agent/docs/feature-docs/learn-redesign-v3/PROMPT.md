# Design Prompt — Lyceum Learn Module Premium Redesign

## Raw Request (verbatim)

"the UI still really bad. Currently, it still looks like a vibe-coded shit. It looks like a vibe-coded which it is but like you can improve that. The welcoming page should be the best because it should show that this is a good page and should get a good first impression. Also, AI output was not valid JSON. Expected ',' or '}' after property value in JSON at position 4395 (line 107 column 89). Use the generate-prompt skill. Use all frontend skills — impeccable, humancentred-UIUX, frontend-design, frontend-external-infra, motion-alive. Use MCP tools to make the initial design choices. The AI receiving this prompt doesn't have access to MCP, so include the MCP results in the prompt."

---

## Context

You are the **Lead Designer and Engineer** for the Lyceum Learn module inside DeskFlow, an Electron + React + Tailwind desktop app. The current welcome screen and CreateLessonDialog look generic and vibe-coded. Your job is to redesign them to be premium, distinctive, and unmistakably high-quality.

**Read `CONTEXT_BUNDLE.md` FIRST.** It contains every design token, component source, IPC endpoint, and file path you need. Do not guess anything that is documented there.

---

## The Mandate

Design a comprehensive, production-ready redesign of TWO surfaces:

1. **The Welcome Screen** (LearnPage.tsx empty state — lines 275-398) — This is the FIRST thing a user sees. It must feel premium, intentional, and alive. Not a generic empty state with a gradient blob.

2. **The CreateLessonDialog** (CreateLessonDialog.tsx — 599 lines) — The step-based lesson creation wizard. Must feel polished and responsive, not like a generic form.

---

## Requirement Checklist

### A. Visual Design (impeccable + frontend-design skills)

1. **Typography hierarchy**: Use the Geist font at weight 600 for the hero heading, 500 for labels, 400 for body. NEVER use weight 300 on dark backgrounds. The heading "Welcome to Lyceum" must be visually dominant — consider `AnimatedGradientText` (source in CONTEXT_BUNDLE.md §4) with indigo→violet gradient.

2. **Color discipline**: ONE primary accent (indigo-500), ONE secondary (violet-400), ONE semantic (emerald for success). Never exceed 3 accent colors in the welcome screen. Use opacity layers (`bg-indigo-500/10`, `border-indigo-500/20`) for depth, not new hex values.

3. **Spatial system**: 8px grid. Low-density zones (hero, empty state): 24-48px gaps. Card padding: p-5 max. Border radius: rounded-xl (12px) max — NEVER rounded-2xl/rounded-3xl.

4. **Glass structure**: Use `backdrop-filter: blur()` as spatial depth cues. Dark glass cards (`bg-zinc-900/50 backdrop-blur-xl border border-zinc-800/50`) create layers without visual weight.

5. **Anti-AI-slop**: No purple gradients on everything. No default fonts. No same-radius-everything. No hero clichés. The design must have DISTINCT personality — not "gradient + icon + heading + button" repeated everywhere.

### B. Motion Design (motion-alive skill — L2 Responsive)

6. **Entrance choreography**: Use `BlurFade` (already created at `src/components/ui/blur-fade.tsx`) with staggered delays for the welcome screen cascade. Each element enters 0.07-0.08s after the previous. Use direction="up", duration=0.4-0.5, blur="6px".

7. **Primary CTA**: Use `ShinyButton` (already created at `src/components/ui/shiny-button.tsx`) for "Create New Lesson". The traveling light sweep signals "this is crafted."

8. **ONE ambient layer**: A subtle animated background element. Options from MCP research:
   - `AnimatedGridPattern` — SVG grid with gentle pulse
   - `dot-pattern-with-glow-effect` — dot grid with radial glow
   - Aurora glow (current, but make it more visible — currently too subtle)
   Choose ONE. Make it atmospheric, not decorative noise.

9. **Hover/press feedback**: Every interactive element must have hover lift (`y: -2, scale: 1.02`) and press feedback (`scale: 0.97`). Transitions: 150ms, ease [0.16, 1, 0.3, 1].

10. **Reduced-motion**: All animations must be suppressed when `prefers-reduced-motion: reduce`. The `BlurFade` component already handles this. Ensure the ambient background also has a `@media (prefers-reduced-motion: reduce)` fallback.

### C. Human-Centric UX (humancentred-UIUX skill)

11. **Visual hierarchy**: The "Create New Lesson" button must be the obvious primary action within 1 second. Secondary actions (Try example, Import file, Paste ldoc) must be clearly subordinate. The "How it works" link must be tertiary.

12. **Complete state coverage**: The welcome screen IS the empty state — it must be inviting, not sad. The dialog must cover: input, loading, error, and success states.

13. **Feedback**: Every button click must produce immediate visual feedback. The generation process must show progress, not just a spinner.

14. **Touch targets**: All interactive elements must be ≥ 44px. The secondary cards currently have `py-3.5` (14px) which is too small — increase to at least `py-4` (16px) with larger icon+text.

### D. Component Implementation (frontend-external-infra + MCP)

15. **AnimatedGradientText**: Create this component from the Magic UI source in CONTEXT_BUNDLE.md §4. Replace `cn` utility with template literals. Change imports from `motion/react` to `framer-motion`. Re-skin with:
    - `colorFrom="#6366f1"` (indigo-500)
    - `colorTo="#a78bfa"` (violet-400)
    - Use for the "Welcome to Lyceum" heading ONLY

16. **AnimatedShinyText**: Create this component from the Magic UI source. Re-skin for dark theme. Use for the subtitle text below the heading.

17. **BorderBeam**: Create this component from the Magic UI source. Change imports from `motion/react` to `framer-motion`. Use on the primary CTA card or a featured element. Re-skin with indigo→violet gradient.

18. **Icons**: Use lucide-react (already installed). The icon cluster should use distinct, meaningful icons:
    - BookOpen (main Lyceum icon)
    - Wand2 (AI generation)
    - Download (Try example)
    - FileUp (Import file)
    - FileCode2 (Paste ldoc)
    - HelpCircle (How it works)

### E. JSON Generation Fix (Engineering)

19. **Trailing comma fix**: The `learn:buildPrompt` IPC handler at `src/services/learn/index.ts:115` sends the author-guide.md as a system prompt. The AI returns JSON with trailing commas. Add post-processing in the `learn:generateLesson` handler (or wherever the AI response is parsed) to:
    - Try `JSON.parse(response)` first
    - If it fails, attempt to fix trailing commas: `response.replace(/,\s*([\]}])/g, '$1')`
    - If still fails, return a clear error message with the position info
    - This is a DEFENSIVE fix — the author-guide.md already warns against trailing commas but models don't always comply

---

## Constraints

1. **Files**: Only modify the files listed in CONTEXT_BUNDLE.md §9. Do not create new routes, pages, or sidebar items.
2. **No `cn` utility**: This project has no `clsx` or `cn` helper. Use template literals for className composition.
3. **Import paths**: Use relative imports (`../../../components/ui/...`), not `@/` aliases.
4. **framer-motion**: All motion imports must come from `framer-motion`, NOT from `motion/react`.
5. **Geometry**: `rounded-xl` (12px) max. `p-5` (20px) max padding on cards.
6. **Accent**: Lyceum uses indigo-500 as its page accent. Do not use pink (that's the DeskFlow brand).
7. **Existing components**: `BlurFade` and `ShinyButton` already exist at `src/components/ui/`. Do not recreate them — import and use them.

---

## Output Format

Provide the complete, production-ready source code for each file that must be modified or created. For each file:
1. Full file path
2. Complete file contents (not diffs — full files)
3. Brief explanation of what changed and why

For the JSON fix, provide the exact code change with file path and line numbers.

---

## Design Direction

The welcome screen should feel like opening a beautifully designed app for the first time — not like staring at an empty database. Think: the first screen of Linear, Notion, or Raycast. Clean, dark, minimal, but with subtle life. The ambient background breathes. The heading has a gentle gradient shimmer. The primary button catches light. The secondary actions are clearly organized but not competing for attention.

**The goal is NOT "more decoration." The goal is "the same elements, but executed with craft."**
