# Model Improvement Verification & Demonstration Prompt

## Raw Request

> "how does it actually improve the stuff? there should be some things that can be viewed to see the concrete prove of the system existing."

---

## Context

Read `agent/docs/model-improvements-verification/CONTEXT_BUNDLE.md` first. It contains the exact file paths, line numbers, and code snippets for every improvement implemented from `agent/docs/model_improv.md`.

All 12 items in the plan have been implemented across 8 files. This prompt tasks you with producing a **Verification & Walkthrough Document** that proves the system exists and shows the user how to see each piece working.

---

## The Mandate

Design a comprehensive **Verification Guide** — a single document the user can open to see concrete evidence of every improvement, with:

### 1. Tangible File Evidence
For each of the 10 items in CONTEXT_BUNDLE.md, produce:
- **What to open** — exact file path
- **What to look for** — exact line numbers, strings to search for, or content patterns
- **How to verify it's working** — what they should see when they look

### 2. UI Walkthrough
Produce a step-by-step visual walkthrough showing how to see each improvement in the running app:
- "Open New Session Dialog → look for Model Tier dropdown below the AI Agent selector"
- "Look at terminal tab bar → see the colored badge (green=top, blue=mid, yellow=low)"
- "Go to Configs tab → Presets → click `[SYSTEM] Remind`"

### 3. "What Changed" Summary Table
A table mapping each improvement to:
- What the user sees now (visible evidence)
- Where the code lives (file:line)
- How to tweak it (settings, thresholds, toggles)

### 4. Engineering Specifications
Include the exact mechanics for each system:
- **Auto-reinjection**: Counter increments per `write-terminal` IPC call, threshold=10, reads RULES_COMPACT.md from project dir, counter cleared on terminal kill
- **Tier-aware assembly**: Layer 0-2 always injected (forceAdd bypasses budget), Layer 4 trimmed per tier profile
- **Actions feedback**: Per-action success/fail tracking, summary written as `[SYSTEM]` message, partial recovery on failures
- **Remind preset**: Reads files at execution time (not stored), writes to active terminal via `terminalWrite`

### 5. Configurable Parameters
List every tunable setting and where to change it:
| Parameter | Location | Default | How to change |
|-----------|----------|---------|---------------|
| RULES_REINJECT_THRESHOLD | main.ts:6717 | 10 | Edit number |
| modelTier | NewSessionDialog | 'mid' | Dropdown in UI |
| total_token_budget | ContextConfig.ts:TIER_PROFILES | varies per tier | Edit TIER_PROFILES |
| ... | | | |

---

## Requirements Checklist

- [ ] File evidence table (what to open, what to search for)
- [ ] UI walkthrough with step-by-step navigation
- [ ] Engineering specs for each system (how it works internally)
- [ ] Configurable parameters table
- [ ] "How to verify" for each item — what the user should see
- [ ] Build verification step at the end

---

## Constraints

- All file paths are relative to the project root (C:\Users\cleme\Documents\COMPUTAH_SAYENCE\App Tracker)
- The app is an Electron desktop app with Vite bundler
- All file operations in main.ts use `fs.existsSync`, `fs.readFileSync`, etc.
- Renderer communicates with main process exclusively through IPC (preload bridge)
- Terminal writes go through `terminalManager.write()` or `terminalWrite` IPC
- The CONTEXT_BUNDLE.md is the single source of truth for all code references
