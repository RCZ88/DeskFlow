# Covenant & Memories -- DeskFlow patch

Two new self-contained modules for DeskFlow, built to match its existing conventions (GlassCard/PageShell/TabBar system, framer-motion, canvas-confetti, the `--page-accent` CSS-var pattern, lucide-react icons).

## How to apply

1. Copy `src/features/warmth/`, `src/features/covenant/`, and `src/features/memories/` into your project's `src/features/`.
2. Replace your `src/App.tsx` and `src/index.css` with the versions here -- they are your original files with a small, clearly-commented patch:
   - Two new lazy routes (`/covenant`, `/memories`) and two new sidebar entries (Covenant, Memories), added next to Focus.
   - `HeartHandshake` and `Images` added to the existing lucide-react import.
   - A new `@import` for `features/warmth/warmth-tokens.css`, and two new `[data-page]` accent rules.
   - Everything else in both files is untouched -- diff against your original if you want to confirm.
3. No new npm dependencies. Both modules reuse framer-motion, canvas-confetti, and lucide-react, which are already in this codebase.
4. No Electron main-process or preload changes required. This zip only contains what you shared (the renderer source), so both modules are intentionally self-contained:
   - Commitments, streaks, and journal text: `localStorage` (namespaced `deskflow.covenant.*`).
   - Voice notes and photo/video bytes: a small local-only IndexedDB store (`src/features/warmth/localBlobStore.ts`). Nothing here ever leaves the device -- no network calls anywhere in either module.
   - Optional "auto-detect" commitment tracking reuses your existing `window.deskflowAPI.onForegroundChange` bridge -- no new IPC needed.
5. If/when you want this backed by your real SQLite db instead of localStorage/IndexedDB, `src/features/covenant/storage.ts` and `src/features/memories/mediaStore.ts` are the only files that need to change -- every component calls through those, never `localStorage`/`indexedDB` directly.

## What's inside

- `src/features/warmth/` -- shared "warm corner" primitives: `localBlobStore.ts` (local-only IndexedDB), `celebrate.ts` (warm-palette confetti), `WarmCard.tsx` (extends your existing GlassCard), `warmth-tokens.css` (ambient aurora/breathe/shimmer keyframes, reduced-motion safe).
- `src/features/covenant/` -- the commitment + streak + reflection + journal module.
- `src/features/memories/` -- the photo/video collage + timeline module.

See the in-app rationale in the chat response for the research, palette, and animation reasoning behind these choices.
