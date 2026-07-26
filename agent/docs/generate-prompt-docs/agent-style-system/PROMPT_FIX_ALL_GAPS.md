# PROMPT: Fix All Broken Implementation + Complete Missing UX Design

## Raw Request

> "so ur saying the workspace is now updated with all of the ui and everything implemented properly and the backend feature implemented?"
> "THEN GENERATE THE PROMPT AND EVERYTHING FOR THE STUFF THAT HAS NOT BEEN IMPLEMENTED. WHERES THE PROMPT AND LIKE WHERES THE DESIGN OF THE WORKSPACE SIDEBAR?? THE UI PLANNING NOO HOW THE USER CAN USE THOSE STUFF PROPERLY AND HUMANCENTRIC UI UX SKILL."

## Context

Read `agent/docs/agent-style-system/CONTEXT_BUNDLE.md` for codebase reference.
Read `agent/skills/humancentred-UIUX/SKILL.md` for UX requirements.
Read `agent/skills/frontend-external-infra/SKILL.md` for component sourcing and re-skin rules.

## CRITICAL BUGS Found During Audit

### BUG 1: Type Mismatch — TokensTab receives wrong ColorEntry shape
**Files:** `src/components/workspace/TokensTab.tsx` vs `src/components/workspace/ColorPicker.tsx`

`ColorPicker.tsx` exports:
```typescript
interface ColorEntry { id: string; color: string; role: string; label: string; }
```

`TokensTab.tsx` expects:
```typescript
interface ColorEntry { role: 'bg' | 'text' | 'primary' | 'secondary' | 'accent'; hex: string; }
```

`DesignWorkspacePage` passes `colors` (ColorPicker's shape) to `TokensTab colorEntries={colors}`. **This is a type mismatch that will cause runtime errors.** The TokensTab will receive `{ id, color, role, label }` but tries to access `.hex` which doesn't exist.

**FIX:** Either:
- Option A: Change TokensTab to accept ColorPicker's ColorEntry shape and map internally
- Option B: Add a mapping layer in DesignWorkspacePage that converts ColorPicker entries to TokensTab format before passing
- Option C: Create a shared `DesignColorEntry` type used by both components

### BUG 2: MCP Server Not Set Up
`design-suite-mcp/` has no `node_modules/` and no `dist/`. The MCP server cannot run.
- Needs `npm install` in the directory
- Needs `npm run build` (tsc compilation)
- Needs to be registered in the app's MCP server lifecycle

### BUG 3: Build Not Fully Verified
`node scripts/build.mjs` timed out at 3 minutes. The main process Vite library build + service compilation has not been confirmed to succeed. The .cjs shims for the 5 new design services may not be created correctly.

### BUG 4: New Components Don't Use Existing Design System
The workspace already has a shared design system:
- `src/components/workspace/_ds/primitives.tsx` — `EmptyState`, `Skeleton`, `Chip`, `StatusPill`, `IconButton`
- `src/components/workspace/_ds/motion.ts` — animation constants
- `src/components/workspace/_ds/controls.tsx` — form controls, buttons, modal shell

The new components (MoodboardTab, TokensTab, CommandPalette) **invent their own styling** instead of using these primitives. This creates inconsistency.

### BUG 5: Tab Bar Doesn't Use Existing SubTabBar
The workspace has `SubTabBar.tsx` — a reusable tab component with accent colors, rounded pills, and proper accessibility (`role="tab"`, `aria-selected`). The new tab bar in DesignWorkspacePage **ignores this** and uses a custom inline tab implementation.

### BUG 6: No Workspace Sidebar Integration Plan
The spec says the Design Co-Pilot should be a "Sidebar Panel" but there's no plan for:
- How users navigate to the Moodboard/Tokens/Command Palette from the workspace sidebar
- Whether these features are accessible from the 5-group sidebar (Setup/Work/Insights/Studio/Context)
- How the Command Palette overlays the workspace vs the terminal
- Whether moodboard/tokens state persists across tab switches

---

## What Needs To Be Designed (UX Planning)

### Question 1: Where do Moodboard and Tokens live?
The existing Design Workspace is at `studio/design` subtab. The new Moodboard and Tokens tabs were added INSIDE DesignWorkspacePage. But the spec says they should be in a "Sidebar Panel."

**Design Decision Required:**
- Option A: Moodboard + Tokens are tabs WITHIN the existing Design Workspace (`studio/design`). User clicks Studio → Design → sees 5 tabs (Moodboard | Tokens | Sources | Motion | Registry).
- Option B: Moodboard + Tokens are TOP-LEVEL subtabs in the Studio group (`studio/moodboard`, `studio/tokens`). User clicks Studio → sees: Skills | Design | Moodboard | Tokens.
- Option C: Moodboard + Tokens replace the current Design tab entirely — the Design tab becomes a "Design Co-Pilot" with all 5 sub-panels.

**Recommend:** Option A — keep them inside Design Workspace. Reasoning: They're all design-related features. Splitting them into separate subtabs fragments the design workflow. The tab bar inside Design Workspace already handles 3 tabs; adding 2 more is natural.

### Question 2: How does Command Palette overlay work?
The Command Palette uses `Cmd+K` globally. But when the user is in the terminal workspace, `Cmd+K` might conflict with terminal shortcuts.

**Design Decision Required:**
- Should Cmd+K only work when the Design Workspace tab is active?
- Or should it work globally but with different commands depending on context?
- What happens if the terminal is focused and user presses Cmd+K?

**Recommend:** Cmd+K is global but context-aware. In Design Workspace, it shows design commands. In terminal, it shows terminal commands. The palette reads the active context to determine which commands to show.

### Question 3: How do users discover these features?
A user visiting Studio → Design for the first time sees 5 tabs. They might not know:
- Moodboard exists (tab label isn't self-explanatory)
- Tokens tab does (what are "tokens"?)
- Cmd+K works (no visible hint except the small `⌘K` text I added)

**Design Decision Required:**
- Should there be an onboarding tooltip on first visit?
- Should the tab labels be more descriptive?
- Should there be a "What's new" indicator?

### Question 4: State persistence
- Moodboard items: should they persist per-project or be cleared when switching tabs?
- Tokens (color sync): the ColorPicker state already persists via the parent. But should synced CSS variables persist?
- Command Palette recent commands: localStorage persistence is implemented. But should it be per-project?

### Question 5: How does "Inject Context" work end-to-end?
When user hovers a moodboard image and clicks "Inject Context":
1. The item is added to `moodboardItems` state
2. `buildFullContext()` includes `<moodboard>` XML block
3. User clicks "Send" in DesignComposeOutlet
4. XML is sent to terminal agent

But there's a gap: **the user has to manually click "Send" after injecting.** Should "Inject Context" also auto-send? Or should it just stage the item and let the user send when ready?

---

## What Needs To Be Built (Implementation)

### Fix 1: Shared ColorEntry Type
Create a shared type that both ColorPicker and TokensTab use:

```typescript
// src/components/workspace/_ds/types.ts
export interface DesignColorEntry {
  id: string;
  hex: string;       // The hex color value (ColorPicker calls this 'color')
  role: string;      // Color role (primary, accent, background, etc.)
  label: string;     // Human-readable label
}
```

Update ColorPicker to export this type. Update TokensTab to accept it and map role names internally (e.g., `background` → `bg`, `surface` → `text`).

### Fix 2: Use Existing Design System Primitives
Rewrite MoodboardTab, TokensTab, CommandPalette to use:
- `EmptyState` from `_ds/primitives.tsx` for empty states
- `Skeleton` from `_ds/primitives.tsx` for loading states
- `IconButton` from `_ds/primitives.tsx` for action buttons
- `Chip` from `_ds/primitives.tsx` for filter chips
- Animation constants from `_ds/motion.ts`

### Fix 3: Use SubTabBar for Tab Navigation
Replace the custom tab bar in DesignWorkspacePage with the existing `SubTabBar` component. This gives proper accessibility, accent colors, and consistent styling.

### Fix 4: MCP Server Setup
- Run `npm install` in `design-suite-mcp/`
- Run `npm run build` to compile TypeScript
- Register the MCP server in the app's MCP lifecycle (add to `DEFAULT_LIBRARIES` in DesignWorkspacePage)

### Fix 5: Full Build Verification
- Run `node scripts/build.mjs` successfully
- Verify `dist-electron/services/design/` has all 5 .js files
- Verify .cjs shims are created
- Launch app and verify no crash

### Fix 6: Onboarding/Discovery
Add a first-visit indicator:
- When user first opens Studio → Design, show a subtle "New: Moodboard & Tokens" badge on those tabs
- After user visits both tabs, dismiss the badge (localStorage)
- Add a tooltip on the `⌘K` hint explaining the Command Palette

---

## Human-Centric UX Checklist (applied to all fixes)

For EACH component (MoodboardTab, TokensTab, CommandPalette):

### 1. Clarity
- [ ] Every label is plain language (no raw system tokens)
- [ ] Primary action is obvious within 1 second
- [ ] Icons always paired with labels or tooltips

### 2. Progressive Disclosure
- [ ] Default view shows most common case
- [ ] Advanced options hidden behind disclosure
- [ ] One primary question per view

### 3. Visual Hierarchy
- [ ] One focal point per view
- [ ] Metadata is muted
- [ ] Related items grouped, unrelated separated

### 4. Complete State Coverage
- [ ] **Empty:** Icon + friendly explanation + clear CTA
- [ ] **Loading:** Skeleton matching content shape (not spinner)
- [ ] **Error:** Plain language + retry action
- [ ] **Populated:** Normal state

### 5. Feedback & Micro-interactions
- [ ] Hover/focus/active/disabled on all interactive elements
- [ ] 150-300ms transitions on state changes
- [ ] Submit gives immediate feedback (loading → success/error)
- [ ] Destructive actions confirm or offer undo

### 6. Forgiveness & Affordance
- [ ] Click targets ≥ 44px
- [ ] Visible focus rings
- [ ] Keyboard navigation works
- [ ] Nothing is mouse-only

---

## Anti-Slop Checklist

- [ ] NOT purple/indigo gradient-on-everything
- [ ] Uses DeskFlow tokens (`--bg-primary`, `--accent-primary`, etc.)
- [ ] Max `rounded-xl`, `p-5` padding
- [ ] Dark mode only
- [ ] Geist body (13px), JetBrains Mono code
- [ ] All icons from lucide-react
- [ ] No emoji as UI icons
- [ ] Real empty/loading/error states using `_ds/primitives.tsx`
- [ ] Glass layer: `bg-zinc-900/80 backdrop-blur-xl`
- [ ] Respects `prefers-reduced-motion`

---

## Output Format

Return:
1. **Bug fix specs** — exact code changes for each bug
2. **Shared type definition** — the `DesignColorEntry` interface
3. **Component rewrites** — MoodboardTab, TokensTab, CommandPalette using existing primitives
4. **Tab integration** — how SubTabBar replaces custom tab bar
5. **MCP server setup steps** — exact commands
6. **Build verification steps** — what to run and what to check
7. **UX onboarding design** — tooltip/badge implementation
8. **State persistence rules** — what persists, what's ephemeral
9. **Testing plan** — manual verification for each feature
