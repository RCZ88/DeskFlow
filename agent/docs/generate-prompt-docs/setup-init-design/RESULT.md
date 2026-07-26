# Setup vs Initialize — Separation Design

## 1. Recommendation: Keep Separate, Rename, Redistribute

**Keep them as two separate operations.** They have fundamentally different purposes:

| Dimension | Setup (-> Rename) | Initialize |
|-----------|------------------|------------|
| **Target** | Project filesystem | Terminal session |
| **Scope** | Agent directory structure | Agent runtime session |
| **Effect** | Creates AGENTS.md, INITIALIZE.md, PROBLEMS.md, REQUESTS.md, state.md on disk | Spawns a PTY, writes init content, starts a new session in the DB |
| **How often** | Once per project (or when re-initializing) | Every time you want a new AI agent conversation |
| **Dialog?** | Optional — can be one-click or show a confirmation | Yes — needs agent/name/terminal choices |

The problem is **naming and feature ownership** — not that they should be merged.

---

## 2. New Naming

| Old Name | New Name | Button Style |
|----------|----------|--------------|
| **Setup** | **Provision** | Green, `Package` or `FolderTree` icon |
| **Initialize** | **New Agent** | Amber, `Bot` or `Sparkles` icon |
| *(mode='setup' in dialog, no button)* | **Configure** | Button inside the "New Agent" dialog as an expandable section |

**Rationale:**
- "Provision" = creating infrastructure (files, directories, config). Clear one-click action.
- "New Agent" = starting a new AI agent session. Clear what it does.
- "Configure" = advanced context system settings (LLM Wiki, Graphify, etc.). Exposed as an expandable section within the New Agent dialog — not a separate entry point.

---

## 3. Feature Matrix

| Feature | Current Home | New Home | Notes |
|---------|-------------|----------|-------|
| Create agent directory files (AGENTS.md, etc.) | Setup button | **Provision** button | One-click, stays the same |
| Create new terminal session | Initialize dialog | **New Agent** dialog | Rename, stays functionally similar |
| AI Agent dropdown (Claude Code, OpenCode, etc.) | Initialize dialog | **New Agent** dialog | Keep |
| Session Name input | Initialize dialog | **New Agent** dialog | Keep |
| Terminal selector (new/existing) | Initialize dialog | **New Agent** dialog | Keep |
| System Prompt preview | Initialize dialog | **New Agent** dialog | Keep |
| Session Additions textarea | Initialize dialog | **New Agent** dialog | Keep |
| Context Systems toggles (LLM Wiki, Graphify, etc.) | mode='setup' in dialog (no button) | **New Agent** dialog → expandable "Configure" section | Add a toggle/collapse to show/hide these |
| Context Map visualization | mode='setup' in dialog | **New Agent** dialog → "Configure" section | Keep |
| Behavior toggles (auto-summarize, deep memory) | mode='setup' in dialog | **New Agent** dialog → "Configure" section | Keep |
| Additional Agent Files checkboxes | mode='setup' in dialog | **New Agent** dialog → "Configure" section | Keep |
| Preview Init Content button | mode='setup' in dialog | **New Agent** dialog → "Configure" section | Keep |
| Default INITIALIZE.md checkbox + custom init file | Create mode in dialog | **New Agent** dialog → "Configure" section | Keep |
| Problem/request linking | Create mode in dialog | **New Agent** dialog → "Configure" section | Already exists in the dialog's onCreate |

---

## 4. UX Flow

### Flow A: Provision (formerly "Setup")
```
User clicks Provision → trackerMindSetup('init-all') → Success toast → Button shows "Re-provision"
```
- **One-click.** No dialog needed. The operation is deterministic and outcomes are predictable.
- **Status states:** `idle` → `provisioning` → `provisioned` (currently `checking` → `init-ok`)
- **When to show:** Always visible. Disabled during provisioning.

### Flow B: New Agent (formerly "Initialize")
```
User clicks "New Agent" →
  Dialog opens with:
    [Session Name]
    [AI Agent ▼]
    [Terminal: ○ New  ○ Existing ▼]
    [▸ Advanced Configuration]  ← collapsible, contains all the context system stuff
  User fills in basics, optionally expands Advanced →
  Clicks "Start Agent" →
    Dialog closes →
    Terminal tab created →
    Session spawned with init content + system prompt →
    Agent session running in terminal
```

### Flow C: What about the old "Setup" mode in dialog?
The old `mode='setup'` in NewSessionDialog was an orphan — no button triggered it. Now it becomes the **Advanced Configuration** section inside the New Agent dialog. Default collapsed — users who just want a quick agent session see the simple form. Users who want to configure context systems, behaviors, and files expand it.

---

## 5. Implementation Sketch

### Changes to `src/pages/TerminalPage.tsx`

**Button 1 (old Setup, new Provision):**
- Rename text from "Setup" / "Re-init" → "Provision" / "Re-provision"
- Optionally change icon from `Zap` → `Package` or keep `Zap`
- Same handler, same logic

**Button 2 (old Initialize, new New Agent):**
- Rename text from "Initialize" → "New Agent"
- Change icon from `FileText` → `Bot` or `Sparkles`
- `newSessionMode` stays `'initialize'` (or rename to `'new-agent'`)

**NewSessionDialog props:**
- Add `showAdvanced: boolean` prop (default `false`)
- `mode='setup'` content (context systems, behaviors, files) moves behind `showAdvanced` toggle
- Inside the dialog, add a collapsible `<details>` or button-toggle for "Advanced Configuration"

### Changes to `src/components/NewSessionDialog.tsx`
- Add a "Advanced Configuration" toggle button that shows/hides the context system cards, behavior toggles, and additional files checkboxes
- Default state: collapsed (user sees just the basics)
- The toggle is NOT mode-dependent — it's available in any mode

### State changes
- `initStatus` → rename to `provisionStatus` (optional, internal)
- `newSessionMode` → `'create' | 'new-agent'` (instead of `'create' | 'initialize'`)

### What stays the same
- All IPC handlers (`trackerMindSetup`, `terminal:create`, `initializeTerminal`, etc.)
- All backend logic (agent file creation, session creation, context system config)
- The `onCreate` callback in NewSessionDialog — it already handles all the logic
