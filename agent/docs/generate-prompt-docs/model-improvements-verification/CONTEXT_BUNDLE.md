# Context Bundle — Model Improvement Verification

## 1. RULES_COMPACT.md (agent/RULES_COMPACT.md)
```
# AGENT RULES (read first — always)
1. At session start: read state.md, context.md, active problem, active checklist.
2. At session end: write ## Session Metadata block. Write actions.json if changes.
3. actions.json format: { "actions": [ { "type": "...", "payload": {...} } ] }
4. Never guess file paths. Use list-agent-dir-files if unsure.
5. Current bound problem: {{PROBLEM_ID}} — {{PROBLEM_TITLE}}
6. If unsure about a term: check glossary.md before asking the user.
7. After code changes: run `npm run build` to verify.
8. NEVER use git checkout, git restore, git reset, git stash.
9. NEVER change `@import "tailwindcss"` in src/index.css.
```
**Location:** `agent/RULES_COMPACT.md` (10 lines)
**Template vars:** `{{PROBLEM_ID}}`, `{{PROBLEM_TITLE}}` — filled at session creation

---

## 2. Layered Context Assembly (src/services/ContextService.ts:149-275)
```
LAYER 0 — IDENTITY & CONSTRAINTS   ← RULES_COMPACT.md injected via forceAdd (always, uncounted)
LAYER 1 — CURRENT STATE SNAPSHOT    ← state.md injected via forceAdd (always, max 2000 chars)
LAYER 2 — PATTERNS & CONVENTIONS    ← patterns.md injected via forceAdd (always, max 1500 chars)
LAYER 3 — ACTIVE PROBLEM            ← Full problem record + checklist items (if problem bound)
LAYER 4 — REFERENCE MATERIAL        ← Tier-aware: LLM wiki, skills, graphify, PARA, QMD, etc.
```
- Layers 0-2: always injected regardless of token budget (`forceAdd`)
- Layers 3-4: subject to token budget; trimming starts from outer layers
- Tier-aware: low tier gets compressed wiki, top-5 relevant skills only; top tier gets full everything

---

## 3. Model Tier Profiles (src/services/ContextConfig.ts:1-98)
```typescript
export type ModelTier = 'top' | 'mid' | 'low';
// model_tier field in ContextConfig
// TIER_PROFILES define defaults per tier:
//   top:  10000 budget, all systems enabled, detailed summaries
//   mid:  7000 budget, core systems, excerpts
//   low:  4000 budget, compressed wiki, top-3 relevant skills only
```
**UI:** NewSessionDialog.tsx:493-504 — dropdown below AI Agent selector

---

## 4. Model Tier Badge in Terminal Tabs (src/pages/TerminalPage.tsx:1511-1518)
```tsx
{tab.modelTier && (
  <span className={`text-[9px] px-1 rounded font-medium ${
    tab.modelTier === 'top' ? 'bg-green-500/20 text-green-400' :
    tab.modelTier === 'low' ? 'bg-yellow-500/20 text-yellow-400' :
    'bg-blue-500/20 text-blue-400'
  }`}>
    {tab.modelTier}
  </span>
)}
```
Colored badge: top=green, mid=blue, low=yellow

---

## 5. Auto Re-injection Middleware (src/main.ts:6716-6730)
```typescript
const terminalMessageCounts = new Map<string, number>();
const RULES_REINJECT_THRESHOLD = 10;

function maybeReinjectRules(terminalId: string): boolean {
  const t = terminalManager.terminals.get(terminalId);
  if (!t?.cwd) return false;
  const rulesPath = path_1.default.join(t.cwd, 'agent', 'RULES_COMPACT.md');
  if (!fs_1.default.existsSync(rulesPath)) return false;
  try {
    const content = fs_1.default.readFileSync(rulesPath, 'utf-8').trim();
    const reminder = `[SYSTEM] Rules reminder (auto-injected):\n${content}\n`;
    t.pty.write(reminder);
    return true;
  } catch { return false; }
}
```
Triggered from `write-terminal` IPC handler at line 5993-5998:
```typescript
const count = (terminalMessageCounts.get(terminalId) || 0) + 1;
terminalMessageCounts.set(terminalId, count);
if (count % RULES_REINJECT_THRESHOLD === 0) {
  maybeReinjectRules(terminalId);
}
```
Counter cleared on terminal kill (`terminalMessageCounts.delete(id)` in `kill()`)

---

## 6. Actions Parse Feedback (src/main.ts:6485-6564)
`parseAndExecuteActions()` tracks `actionCount`, `failCount`, `errors[]` per ## Actions block.
When any action fails, writes: `[SYSTEM] Actions block: N succeeded, M failed. Errors: ... Please re-emit valid actions.`

Same pattern exists for `executeActionsFromFile()` (actions.json) at line 6585-6687:
- Logs raw content to `agent/actions_error.log` with timestamp
- Writes `[SYSTEM] actions.json parse error — {reason}` to terminal
- Executes valid actions even when some fail (partial recovery)
- Clears actions.json after execution

---

## 7. `[SYSTEM] Remind` Preset (src/pages/TerminalPage.tsx:549, 968-997)
```typescript
{ id: 'builtin-remind', name: 'Remind', command: '', category: 'system', isBuiltIn: true },
```
Handler reads RULES_COMPACT.md + state.md at execution time and writes to terminal:
- `## [SYSTEM] Remind — Current Session Context` header
- Full RULES_COMPACT.md content
- state.md truncated to 1500 chars
- Shown with `[SYSTEM]` blue badge in UI, delete button hidden

---

## 8. ACTIONS_SCHEMA.md (agent/ACTIONS_SCHEMA.md — 48 lines)
JSON schema + 3 examples for actions.json format:
```json
{
  "actions": [
    { "type": "create_problem", "title": "...", "priority": "high", ... },
    { "type": "update_problem", "id": "1.5", "status": "FIXED" },
    { "type": "complete_checklist", "id": "problem-1.5-step-1" },
    { "type": "update_request", "id": "1", "status": "IMPLEMENTED" }
  ]
}
```

---

## 9. Structured state.md Format (agent/state.md:1-31)
```markdown
## Metadata
- version: 3.66
- last_updated: 2026-05-28
- agent: opencode

## Active Work
- active_problem_id: null
- active_problem_title: null
- current_phase: "implementation"
- blocked: false

## Session Continuity
- last_session_summary: "..."

## Progress
- problems_solved_this_sprint: []
- files_modified: [...]
```
Machine-parseable key-value format (not prose paragraphs)

---

## 10. Configs Tab Functions (src/pages/TerminalPage.tsx)
Four previously-broken functions now implemented:
- `handleSaveWorkspace` — saves terminal layout + active sessions + presets
- `handleLoadWorkspace` — restores layout + spawns terminals + loads presets
- `handleTerminalMoveToGroup` — tree manipulation with findLeafInTree/removeLeafFromTree/addLeafToGroup
- `loadSavedConfigs` — loads terminal presets from DB via IPC
