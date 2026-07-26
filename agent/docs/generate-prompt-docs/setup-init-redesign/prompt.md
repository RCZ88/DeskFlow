# Setup vs Initialize — Design Prompt

## Raw Request (verbatim)

> "intialize should jut setup the initial stuff for the infrastructure. things that have the agnets.md and like the stuff that is MANDATORY for the infrastructure workspace to work."
>
> "the setup should control everything. it should be like the settings of the workspace."
>
> "IT SHOULD BE THAT THE INITIALIZE SHOULD BE THE ONES WITH THE PROGRESS"
>
> "WE HAVE DISCUSSED THIS BEFORE"
>
> "THE UI POPUP ON THE CURRENT initilazie should be for the setup button"
>
> "knowing the list of features and every request and explanation ive given of both of those"

## Context

Read `agent/docs/setup-init-redesign/CONTEXT_BUNDLE.md` first. It contains:
- Full current button/handler code for both Setup and Initialize
- The NewSessionDialog component (808 lines with context toggles)
- The `trackerMindSetup` IPC handler (infrastructure creation)
- Existing design doc + user's exact intent
- Design tokens and patterns

Currently the two concepts are **reversed**:
- The **Setup** button (green, FolderTree) does one-click infrastructure creation with zero UI feedback
- The **Initialize** button (amber, Bot) opens the full config dialog with context system toggles

The user wants them **swapped and redesigned**:
- **Initialize** = infrastructure setup with progress UI → one-click, shows progress (creating AGENTS.md... creating PROBLEMS.md... etc.)
- **Setup** = workspace settings panel → the full config dialog with all updatable context toggles (currently in NewSessionDialog)

## The Mandate

Design a comprehensive solution that renames, rewires, and redesigns both buttons and their associated flows. You are the Lead Designer and Engineer — own the solution from logic to pixels.

### Engineering Task

1. **Initialize flow (infrastructure)**:
   - Design a `showInitializeProgress` modal that shows real-time progress of `trackerMindSetup('init-all')`
   - The modal must display each file being created with status: pending → creating → done/error
   - Steps to show: agent/ directory, AGENTS.md, INITIALIZE.md, PROBLEMS.md, REQUESTS.md, state.md, problems.json, requests.json, checklists.json, COMMITS.md, FEATURE_TRACKER.md, WORKSPACE_CONTEXT.md, HUMAN_TEST_CHECKLIST.md, skills/ directory
   - After completion: show summary (X files created, Y updated) with close button
   - Handle error case: show which step failed with retry option

2. **Setup flow (workspace settings)**:
   - Move the NewSessionDialog's context configuration (system toggles, behaviors, token budget, design skills, advanced config, context map) to a **persistent workspace settings panel**
   - This panel must save settings via `setPreference` (already available) so they persist across sessions
   - Settings should auto-load on workspace open
   - The panel should be the same dialog that NewSessionDialog currently shows but decoupled from session creation — **Setup controls the workspace, not a specific session**
   - Setup settings should feed into NewSessionDialog as defaults when creating a new session

3. **Button wiring**:
   - Current "Setup" (green, FolderTree) → rename to "Initialize" → dispatches `trigger-initialize` → shows progress modal
   - Current "Initialize" (amber, Bot) → rename to "Setup" → dispatches `open-settings` → shows setup config panel
   - Both buttons in IDEProjectsPage.tsx header
   - The green/amber button colors can be swapped or redesigned

### Design Task

1. **Initialize Progress Modal**:
   - Full glass-morphism modal (`bg-zinc-800 rounded-xl border border-zinc-700 shadow-2xl`)
   - Step-by-step list with animated checkmarks per file
   - Progress bar at top showing overall completion percentage
   - Animated file creation icons (FolderTree icon pulsing while creating, checkmark when done)
   - Colors: amber/accent for "in progress", green for "done", red for "error"
   - Optionally: terminal-like log output showing file paths
   - Close button + auto-close on success + retry button on error

2. **Setup Config Panel**:
   - Same glass-morphism aesthetic
   - Persisted settings loaded from preferences
   - Context system toggles (same 7 systems as NewSessionDialog)
   - Behavior toggles (summarization, deep memory)
   - Token budget slider
   - Design skills section (variance/motion/density sliders)
   - Context map visualization (SVG from existing component)
   - Save/Cancel buttons at bottom
   - Show which settings differ from defaults

### UX Task

1. **Initialize Interaction Flow**:
   - Click → modal opens with animation
   - Each step: file name + spinner → checkmark + green
   - Total time: ~2-5 seconds
   - If project already initialized: show "Already initialized. Re-initialize?" with Yes/No
   - On success: toast notification "Project initialized (X files)"
   - On error: toast notification + modal stays with error highlighted, retry button

2. **Setup Interaction Flow**:
   - Click → modal opens (same position/style as NewSessionDialog)
   - Toggle switches immediately feel responsive
   - Context map updates live as toggles change
   - "Save" persists to preferences, closes modal
   - "Cancel" discards changes, closes modal
   - Changes take effect on NEXT "New Agent" session creation
   - Different visual from session creation dialog (different icon in header, different title)

3. **Empty states**:
   - Initialize button disabled when no project selected
   - Setup button disabled when no project selected
   - Progress modal with zero files (should never happen, but guard)

### Constraints

- Must work with existing IPC handlers (`trackerMindSetup`, `getPreferences`, `setPreference`)
- No backend changes to main.ts
- No changes to `assembleContext` or `ContextService`
- Must work in both IDEProjectsPage workspace view AND standalone TerminalPage
- Build must pass (`npm run build`)
- Follow existing glass-morphism design system
- Use lucide-react icons that already exist in the project
- The NewSessionDialog still needs its context config for new sessions — Setup settings become the DEFAULT values prepopulated in that dialog
