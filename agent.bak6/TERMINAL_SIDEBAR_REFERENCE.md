# TerminalPage Sidebar & Header — Complete Reference

**Last Updated:** 2026-05-26
**Source:** `agent/docs/TERMINAL_AND_WORKSPACE_FEATURES.md` + git analysis

---

## Status: What Exists vs What's Missing

### Currently PRESENT in git HEAD (3134 lines)
| Feature | Tab/Area | Status |
|---------|----------|--------|
| Project Selector | Header | ✅ Present |
| Project Info Badge | Header | ⚠️ Verify |
| Open Terminal Button | Header | ✅ Present |
| Terminal Tabs (+ New) | Tab bar | ✅ Present |
| Terminal Layout/Xterm | Main | ✅ Present |
| Sidebar Resize/Collapse | Sidebar | ✅ Present |
| **Presets Tab** | Sidebar | ✅ Present |
| **Sessions Tab** | Sidebar | ✅ Present |
| **Map Tab** | Sidebar | ✅ Present |
| **Analytics Tab** | Sidebar | ✅ Present |
| **Problems Tab** | Sidebar | ✅ Present |
| **Requests Tab** | Sidebar | ✅ Present |
| **Files Tab** | Sidebar | ✅ Present |
| NewSessionDialog | Dialog | ✅ Present |
| Confirm Dialog | Dialog | ✅ Present |

### REMOVED in current session (were in HEAD)
| Feature | Tab/Area | Restore Priority |
|---------|----------|-----------------|
| **Setup Button** | Header — triggers Initialize mode | 🔴 High |
| **Terminal Binding Badge** | Header — shows agent/problem binding | 🔴 High |
| **Compose Button** | Header — opens full InstructionPanel | 🔴 High |
| **Quick Send Button** | Header — inline text input bar | 🔴 High |
| **Save Checkpoint Button** | Header — save session checkpoint | 🔴 High |
| Compose/Send/Save/Close in Quick Bar | Quick instruction input bar | 🟡 Medium |

### MISSING from both HEAD and current (planned from docs)
| Feature | Tab/Area | Implementation Priority |
|---------|----------|----------------------|
| **Configs Tab** (Layers icon) | Sidebar — project prompt + saved workspaces | 🟡 Medium |
| **Prompts Tab** (ScrollText) | Sidebar — prompt history (basic version added) | 🟡 Medium |
| **Checklists Tab** (CheckSquare) | Sidebar — grouped checklist view | 🟡 Medium |
| **Skills Tab** (BookOpen) | Sidebar — skill cards grid | 🟡 Medium |
| **History Tab** (MessageSquare) | Sidebar — prompt history viewer | 🟡 Medium |
| Skills inline list in sidebar | Was in HEAD as inline, needs refactor | 🟢 Low |
| PromptHistoryTab component | External component import | 🟢 Low |
| ModalChecklist | Reusable checklist component | 🟢 Low |

---

## Exact Restoration Plan (git HEAD features)

### 1. Header Features — Restore from git HEAD

Location: TerminalPage.tsx ~1070–1250 area (search for "Project Selector" in HEAD)

**Features to restore from HEAD:**
1. `initStatus` state (was removed, replaced with `provisionStatus`)
2. Setup Button — shows NewSessionDialog in 'initialize' mode
3. Terminal Binding Badge — agent type + problem binding dropdown
4. Compose Button — opens InstructionPanel
5. Quick Send Button — toggles inline input bar
6. Save Checkpoint Button — checkpoint dialog
7. Session Target Selector dropdown
8. Instruction Textarea with @mention routing
9. Save Checkpoint (quick bar duplicate)
10. Close Button for quick bar

### 2. Restore Modes

In committed HEAD, the mode was `'create' | 'initialize'`. Current code changed this to `'create' | 'new-agent'`. Restore to `'create' | 'initialize'`.

---

## New Tab Implementation (from docs, add to current)

### 1. Configs Tab — Layers icon, cyan highlight
- Project Prompt Editor textarea (auto-save on blur)
- Saved Workspaces list with Load/Delete
- IPC: getPreferences, setPreference, saveTerminalLayout, getTerminalLayouts, deleteTerminalLayout

### 2. Checklists Tab — CheckSquare icon, amber highlight
- Summary bar: "X done / Y total" + progress bar
- Grouped by parent (Problem/Request), collapsible
- Reuse ModalChecklist component
- IPC: getChecklists, createChecklistItem, updateChecklistItem, deleteChecklistItem

### 3. Skills Tab — BookOpen icon, cyan highlight
- Search bar
- + New Skill button → SkillFormModal
- Category filter pills (dynamic from loaded skills)
- Skill cards: 2-column grid with name, description, category badge, "Use" button
- Skill detail modal with markdown content
- IPC: getSkills, createSkill, updateSkill
- State was already in HEAD: `skills` state + loadSkills from IPC

### 4. History Tab — MessageSquare icon, cyan highlight
- Import PromptHistoryTab component
- IPC: getPromptHistory, getPromptStatus, deleteTerminalMessage

---

## Build Fix: IDEProjectsPage.tsx

Unmatched `<motion.div>` tags. Check balance at lines 763, 2583.

---

## Tab Registration Pattern (copy existing, replace icon/color)

```tsx
// Tab button (add after files tab, before terminals divider)
<button
  onClick={() => setActiveTab('checklists')}
  className={`...`}
>
  <CheckSquare className="w-4 h-4" />
  <span>Checklists</span>
</button>

// Content (add in sidebar content section)
{activeTab === 'checklists' && (
  <div className="space-y-2">
    {/* Summary bar */}
    {/* Grouped checklist view */}
  </div>
)}
```

All 4 new tabs follow this exact pattern. Icons: Layers, CheckSquare, BookOpen, MessageSquare.
Colors: Cyan (#22d3ee) for configs/skills/history, Amber (#f59e0b) for checklists/prompts.

---

File: `agent/TERMINAL_SIDEBAR_REFERENCE.md`
