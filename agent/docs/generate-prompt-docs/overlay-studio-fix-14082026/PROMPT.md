# Overlay Studio — Fix Everything Prompt (14/08/2026)

## Raw Request

> "NONE OF THE FEATURES BUTTON WORK. ALSO THE DISPLAY SIDEBAR ON THE RIGHT SIDE CAN BE CLOSED BUT CAN'T BE REOPENED. WHAT THE FUCK IS WRONG WITH UR ASS?? ARE YOU EVEN IMPLEMENTING ANYTHING FROM THE SPECIFICATION PROPERLY AT ALL??"
>
> "NOTHING FUCKING WORKS. THE MANUAL BRIDGE CUT PLAN. THERE'S NO PROMPT WHATSOEVER. THERE'S NO GENERATION OF ANYTHING. NOTHING."
>
> "WHERE'S THE PROMPT IDIOT. GENERATE PROMPT TO FIX ALL OF THE THINGS THAT I REQUESTED."

---

## Context

Read `CONTEXT_BUNDLE.md` in this folder. It contains the COMPLETE source code for every file in the Overlay Studio feature — the state layer (types, reducer, provider), the shell components (StudioShell, StudioWorkspace, StudioSidebar, StudioInspector), the dashboard (DashboardView), the bridge (ManualBridgePanel), the prompts (overlayPrompts.ts), and the parser (overlayParser.ts).

The Overlay Studio is a 3-panel video overlay suggestion studio inside an Electron + React + Vite desktop app. It has a 7-stage pipeline: Source → Transcript → Visual Evidence → Cut Plan → Scene Plan → Visualizer → Export. The Manual Bridge is the mechanism for generating cut plans and scene plans — it shows a system prompt, the user copies it to any AI, pastes the response back, and the system validates it.

---

## Problem Statement

The entire Overlay Studio is non-functional. Nothing works:
1. **Dashboard feature buttons don't navigate** — clicking Transcript, Cut Planner, Scene DSL, or Scene Visualizer does nothing
2. **Inspector sidebar can't reopen** — once collapsed, the toggle button disappears because the component is unmounted
3. **Manual Bridge has no prompt** — the prompt text area is completely empty
4. **No data flows through the pipeline** — every view shows "No transcript yet", "No cut plan yet", "No scene plan yet"
5. **Missing imports** cause runtime crashes (AlertTriangle, FileJson not imported)

---

## Engineering Task

Fix ALL of the following bugs. Do NOT redesign anything. Do NOT add new features. Fix what is broken.

### Bug #1: Manual Bridge — Prompt is Empty
**File:** `src/features/overlay-studio/components/bridge/ManualBridgePanel.tsx`
**Root cause:** Line 13: `if (!activeSession) return (...)` — early return blocks the entire panel when no session exists. Line 22: `if (!activeSession?.transcript) return ''` — returns empty string when no transcript.
**Fix:** Remove the early return. The prompt MUST always render, showing the full system prompt from `PROMPT_CUT_PLANNER` or `PROMPT_SCENE_DSL` regardless of whether a session or transcript exists. When no transcript is loaded, show a template placeholder. The prompt is the CORE functionality — it must never be empty.

### Bug #2: Dashboard — Feature Buttons Don't Navigate
**File:** `src/features/overlay-studio/components/dashboard/DashboardView.tsx`
**Root cause:** ToolCard onClick handlers are gated on conditions like `activeSession?.cutPlan && dispatch(...)`. When the condition is false, the click handler does nothing — no navigation, no feedback.
**Fix:** Every ToolCard MUST always navigate when clicked. Logic:
- If the required data exists → navigate to that view via `SET_STAGE`
- If data is missing but session exists → open Manual Bridge via `OPEN_BRIDGE`
- If no session → navigate to source/dashboard
NEVER gate navigation behind data existence. The buttons must always do something.

### Bug #3: Inspector — Can't Reopen After Collapse
**File:** `src/features/overlay-studio/components/shell/StudioShell.tsx`
**Root cause:** Line 14: `{!inspectorCollapsed && <StudioInspector />}` — unmounts the component when collapsed, so the toggle button disappears.
**Fix:** Always render `<StudioInspector />`. Remove the conditional. The StudioInspector component already handles its own collapsed state internally (shrinks to 56px with a toggle button).

### Bug #4: Sidebar — Pipeline Steps Disabled
**File:** `src/features/overlay-studio/components/shell/StudioSidebar.tsx`
**Root cause:** `disabled={!activeSession}` on pipeline step buttons. When no session exists, all steps are completely unclickable.
**Fix:** Remove `disabled` prop. Steps must always be clickable. Without a session, they navigate to dashboard. Also add `visual-evidence` to the `stageOrder` array in `getStepStatus`.

### Bug #5: Missing Imports
**File:** `src/features/overlay-studio/components/dashboard/DashboardView.tsx`
- `AlertTriangle` is used in `ErrorState` component but not imported from lucide-react
**File:** `src/features/overlay-studio/components/bridge/ManualBridgePanel.tsx`
- `FileJson` is used in the empty state but not imported from lucide-react

---

## Design Task

No design changes. Fix the existing broken behavior only. The current UI design is correct — it just doesn't function.

---

## UX Task

The Manual Bridge is the critical path. When the user opens it:
1. **Step 1 (Copy):** The prompt text area MUST contain the full system prompt. User copies it.
2. **Step 2 (Paste):** User pastes the AI response into a textarea.
3. **Step 3 (Check):** System validates the response against the schema.

The prompt must be visible and copyable in ALL states:
- No session exists
- Session exists but no transcript
- Session with transcript

The pipeline navigation must work from ANY starting point:
- Fresh open (no sessions) → Dashboard shows Import + Load Sample
- After loading sample → all buttons navigate correctly
- After Manual Bridge generates data → Cut Plan / Scene Plan views show the data

---

## Constraints

1. **Do NOT redesign the UI** — keep the existing 3-panel layout, glass aesthetic, and component structure
2. **Do NOT add new features** — only fix what is broken
3. **Do NOT change the state management architecture** — keep Context + useReducer
4. **Do NOT modify overlayPrompts.ts or overlayParser.ts** — they are correct
5. **Preserve all existing functionality** — the "Load sample" button, the import flow, the validation pipeline
6. **Build must pass** — run `npx vite build` after changes
7. **Keep existing code style** — Tailwind classes, motion components, lucide-react icons, 11px/13px font sizes, zinc-700/30 borders, #ec4899 accent

---

## Output Format

Provide the COMPLETE fixed source code for each affected file. Not diffs — full files. The files are small (50-130 lines each). Include:
1. `ManualBridgePanel.tsx` — full file
2. `DashboardView.tsx` — full file  
3. `StudioShell.tsx` — full file
4. `StudioSidebar.tsx` — full file

Each file must be a drop-in replacement that compiles and works.
