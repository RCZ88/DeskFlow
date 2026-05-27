# Terminal System — Implementation Roadmap

**Status:** Planning Phase
**Date:** 2026-05-22
**Priority:** CRITICAL — Core terminal functionality is broken
**Owner:** AI Agent + Human verification

---

## 🎯 Core Problems (User Perspective)

1. **Terminal height doesn't resize** — Terminal pane won't fill available space, can't resize with window
2. **Sessions don't resume** — Clicking "Resume" opens `opencode` instead of `opencode --resume <id>`
3. **Session IDs not saved** — Resume IDs exist but aren't being stored/retrieved
4. **AI agent doesn't understand workspace** — System prompt doesn't tell agent about problems, requests, checklists, workspace state
5. **No feedback loop** — When user changes problem status, agent doesn't know
6. **Confusing setup flow** — "Initialize" and "Create Session" are mixed up in the UI

---

## 🏗️ Architecture Overview

### Current Flow (Broken)
```
User clicks "Resume" → handleResumeSession()
  ↓
Session loaded from DB (has resume_id: "abc123")
  ↓
spawnTerminal() → initializeTerminal()
  ↓
Step 3 writes: "opencode\r\n"  ← WRONG! Resume ID never used!
  ↓
Agent launches without resume flag
  ↓
Session state lost, user has to re-explain everything
```

### Target Flow (Fixed)
```
User clicks "Resume" → handleResumeSession()
  ↓
Session loaded from DB (has resume_id: "abc123")
  ↓
spawnTerminal(terminalId, cwd, agent) → via IPC to main.ts
  ↓
main.ts initializeTerminal() receives resumeId param
  ↓
Step 3 writes: "opencode --resume abc123\r\n"  ← CORRECT!
  ↓
Agent launches WITH resume flag
  ↓
Agent context loaded from `${HOME}/.opencode/sessions/abc123/`
  ↓
Session state restored!
```

### System Prompt Flow (Missing)
```
Agent launched → onAgentReady event
  ↓
System prompt assembly begins
  ↓
DEFAULT_SYSTEM_PROMPT (static, 12KB)
+ GENERAL_ADDITIONS (user preferences)
+ PROJECT_ADDITIONS (project-specific)
+ SESSION_ADDITIONS (this session's custom instructions)
+ SESSION_CONTEXT (← MISSING!)
  - Current problems list
  - Current requests list
  - Checklist items for this session
  - Terminal bindings (which problem assigned to this terminal)
  - Workspace metadata
  ↓
Merged prompt sent to agent
  ↓
Agent understands: "Here are the problems I need to solve, here are the checklists..."
```

---

## 📋 Implementation Order (By Dependency)

### PHASE 1: Terminal Height (1-2 hours)
**Goal:** Terminal pane fills window correctly when resized

**Specific Changes:**
1. **TerminalPage.tsx line ~1452** — Terminal container needs `min-h-0`
   ```typescript
   <div className="flex-1 flex flex-col min-h-0 relative overflow-hidden bg-black">
   ```

2. **App.tsx line ~2312** — Route wrapper needs proper flex chain
   ```typescript
   {/* Instead of: flex-1 overflow-auto p-8 */}
   <div className="flex flex-col flex-1 min-h-0 p-8">
   ```

3. **Verify** — On mount, TerminalPane calls `terminal.fit()` in useEffect

**Why This Matters:** Without proper flex chain, `h-full` computes to `auto`, terminal doesn't fill space

**Verification:**
- [ ] Terminal renders at full height on first load
- [ ] Resize window horizontally — terminal width adjusts
- [ ] Resize window vertically — terminal height adjusts
- [ ] Split panes maintain proportional sizing

---

### PHASE 2: Session Resume ID Chain (2-3 hours)
**Goal:** Resume button launches `opencode --resume <id>` instead of plain `opencode`

**Three Sub-Tasks (In Order):**

#### 2A. Retrieve Resume ID When Resuming
**File:** `src/pages/TerminalPage.tsx` ~880–937 (`handleResumeSession`)

```typescript
const handleResumeSession = async (sessionId: string) => {
  const session = sessions.find(s => s.id === sessionId);
  if (!session) return;

  // ← ADD THIS LINE
  const resumeId = session.resume_id;

  // Find/create terminal
  let terminalId = /* ... existing logic ... */;
  
  // ← CHANGE THIS CALL: add resumeId param
  await initializeTerminal(
    terminalId, 
    session.agent || 'opencode',
    resumeId,  // ← PASS IT HERE
    session.initContent,
    session.systemPrompt
  );
};
```

#### 2B. Receive Resume ID in initializeTerminal
**File:** `src/pages/TerminalPage.tsx` ~245–318 (`initializeTerminal` function)

```typescript
async function initializeTerminal(
  terminalId: string, 
  agent: string = 'opencode',
  resumeId?: string,  // ← ADD PARAM
  initContent?: string,
  systemPrompt?: string
) {
  // ... existing steps 1-2 ...
  
  // Step 3: Write launch command WITH resume flag
  const launchCommand = resumeId 
    ? `${agent} --resume ${resumeId}${NL}`  // ← USE IT HERE
    : `${agent}${NL}`;
  
  await window.deskflowAPI?.terminalWriteRaw?.(terminalId, launchCommand);
  
  // ... rest of function ...
}
```

#### 2C. Generate & Save Resume ID on Session Create
**File:** `src/main.ts` (~5952, `save-terminal-session` handler)

```typescript
ipcMain.handle('save-terminal-session', async (event, sessionData) => {
  // ← ADD THESE LINES
  const resumeId = sessionData.resume_id || `resume-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Existing code...
  const result = db.prepare(`
    INSERT OR REPLACE INTO terminal_sessions 
    (id, agent, topic, category, status, product_area, resume_id, ...)
    VALUES (?, ?, ?, ?, ?, ?, ?, ...)
  `).run(
    sessionData.id || generateId(),
    agent,
    topic,
    category,
    productArea,
    resumeId,  // ← SAVE IT
    // ... other fields ...
  );
  
  return { success: true, data: { id: result.lastID, resume_id: resumeId } };
});
```

**Verification:**
- [ ] Create a new session → session gets a resume_id in DB
- [ ] Close and reopen the app → resume_id persists
- [ ] Click "Resume" → terminal launches with `opencode --resume <id>`
- [ ] Agent can restore session state (verify via agent output)

---

### PHASE 3: Dynamic System Prompt (2-3 hours)
**Goal:** System prompt includes current session context

**File:** `src/pages/TerminalPage.tsx` ~288–318 (system prompt assembly)

**Current Code:**
```typescript
let mergedPrompt = DEFAULT_SYSTEM_PROMPT;
if (generalAdditions) mergedPrompt += `\n\n## General Instructions\n${generalAdditions}`;
if (projectAdditions) mergedPrompt += `\n\n## Project Instructions\n${projectAdditions}`;
if (systemPrompt) mergedPrompt += `\n\n## Session Instructions\n${systemPrompt}`;
```

**New Code:**
```typescript
let mergedPrompt = DEFAULT_SYSTEM_PROMPT;
if (generalAdditions) mergedPrompt += `\n\n## General Instructions\n${generalAdditions}`;
if (projectAdditions) mergedPrompt += `\n\n## Project Instructions\n${projectAdditions}`;

// ← ADD THIS BLOCK
const contextAddition = await buildSessionContext(terminalId, selectedProject);
if (contextAddition) mergedPrompt += `\n\n## Current Session Context\n${contextAddition}`;

if (systemPrompt) mergedPrompt += `\n\n## Session Instructions\n${systemPrompt}`;
```

**New Function:** Add to `src/pages/TerminalPage.tsx`

```typescript
async function buildSessionContext(terminalId: string, projectId: string): Promise<string> {
  let context = '### Your Task\n\n';
  
  try {
    // Get problems assigned to this terminal
    const problemsRes = await window.deskflowAPI?.getProblems?.({ projectId });
    const problems = problemsRes?.data || [];
    const activeProblems = problems.filter(p => 
      p.terminal_id === terminalId && p.status !== 'Fixed' && p.status !== 'Irrelevant'
    );
    
    if (activeProblems.length > 0) {
      context += '**Active Problems to Solve:**\n';
      for (const p of activeProblems) {
        context += `- **#${p.id}** [${p.status}] ${p.title}\n`;
        context += `  Priority: ${p.priority}, Category: ${p.category}\n`;
        if (p.description) context += `  Details: ${p.description.substring(0, 200)}...\n`;
      }
      context += '\n';
    }
    
    // Get checklists for those problems
    const checklistsRes = await window.deskflowAPI?.getChecklists?.({ projectId });
    const checklists = checklistsRes?.data || [];
    const relatedChecklists = checklists.filter(c => 
      c.parentType === 'problem' && 
      activeProblems.some(p => p.id === c.parentId) && 
      c.status !== 'completed'
    );
    
    if (relatedChecklists.length > 0) {
      context += '**Implementation Checklist (This Session):**\n';
      for (const c of relatedChecklists) {
        const status = c.status === 'completed' ? '✓' : '◯';
        context += `- [${status}] ${c.description}\n`;
        if (c.notes) context += `  Notes: ${c.notes.substring(0, 100)}\n`;
      }
      context += '\n';
    }
    
    // Get active requests
    const requestsRes = await window.deskflowAPI?.getRequests?.({ projectId });
    const requests = requestsRes?.data || [];
    const activeRequests = requests.filter(r => 
      r.status !== 'Completed' && r.status !== 'Cancelled'
    ).slice(0, 3);  // Limit to 3
    
    if (activeRequests.length > 0) {
      context += '**Related Feature Requests:**\n';
      for (const r of activeRequests) {
        context += `- [${r.status}] ${r.title}\n`;
      }
      context += '\n';
    }
    
    // Guidance for agent
    context += '**What to do:**\n';
    context += '1. Review the problems and checklists above\n';
    context += '2. For each checklist item, implement the solution\n';
    context += '3. After each change, update the checklist status\n';
    context += '4. When a problem is solved, update its status to "FIXED"\n';
    context += '\n**How to update status:**\n';
    context += 'After completing a task, include a summary block:\n';
    context += '```\n';
    context += '## Status Update\n';
    context += '[update-problem][<id>][IN_PROGRESS|FIXED]\n';
    context += '[complete-checklist][<id>][completed]\n';
    context += '```\n';
    
    return context;
  } catch (err) {
    console.error('Failed to build session context:', err);
    return ''; // Return empty string on error, don't break prompt assembly
  }
}
```

**Verification:**
- [ ] System prompt includes problem title and ID
- [ ] System prompt includes checklist items
- [ ] System prompt includes guidance on how to update status
- [ ] Agent can see which problems are assigned to this terminal

---

### PHASE 4: Setup vs Initialize (1-2 hours)
**Goal:** Clear separation between workspace initialization and session creation

**Current State:**
- "Setup" button opens NewSessionDialog in 'initialize' mode
- 'initialize' mode is confusing (reads agents.md, creates session)
- 'create' mode is also confusing (creates terminal + session together)

**Target State:**
```
FIRST TIME:
User clicks "Setup" button
  ↓
Dialog shows:
  - "Initialize Workspace" message
  - AI agent selector (Claude/OpenCode)
  - System prompt preview
  - Context system toggles
  ↓
"Initialize" button → writes AGENTS.md, state.md, context/, etc.
  ↓
Toast: "Workspace ready! You can now create sessions."

NEXT TIMES:
User clicks "+ New Session" button
  ↓
Dialog shows:
  - Session name input
  - Terminal selector ("Create new" or "Use existing")
  - Custom prompt input (optional)
  ↓
"Create Session" button → spawns terminal, saves session
```

**Implementation:**
1. Create separate `InitializeDialog` component (workspace setup)
2. Rename `NewSessionDialog` to be clear it's session creation only
3. Add check in TerminalPage header: if workspace not initialized, show "Setup" button, else show "+ New Session" button
4. Add `isInitialized` state that checks for `agent/state.md` or `agent/AGENTS.md` existence

**Files to modify:**
- `src/pages/TerminalPage.tsx` — Header button logic
- `src/components/NewSessionDialog.tsx` — Remove initialize mode, focus on session creation
- `src/components/InitializeDialog.tsx` (NEW) — Separate initialization flow

---

### PHASE 5: Status Update Events (1-2 hours)
**Goal:** When user changes problem status, terminal is notified

**User Flow:**
```
1. Problems tab → Click problem → Change status "NEW" → "IN_PROGRESS"
2. UI sends IPC to update DB
3. After DB update succeeds → Send status notification to active terminal
4. Terminal displays: "Problem #52 status changed to IN_PROGRESS"
5. Agent reads this and acknowledges
```

**Implementation:**

**File:** `src/pages/TerminalPage.tsx` (Problems tab status button click handler)

```typescript
const handleProblemStatusChange = async (problemId: string, newStatus: string) => {
  // Update DB
  const result = await window.deskflowAPI?.updateProblemStatus?.({ 
    problemId, 
    status: newStatus 
  });
  
  if (!result?.success) return; // Only notify if DB update succeeded
  
  // Find the problem to get context
  const problem = problems.find(p => p.id === problemId);
  if (!problem) return;
  
  // If this problem is assigned to the active terminal, notify agent
  if (activeTerminalId && problem.terminal_id === activeTerminalId) {
    const message = [
      '',
      '## ─────────────────────────────────────',
      `## Problem Status Update`,
      `## Problem #${problemId}: "${problem.title}"`,
      `## New Status: **${newStatus}**`,
      '## ─────────────────────────────────────',
      ''
    ].join('\n');
    
    await window.deskflowAPI?.terminalWriteRaw?.(activeTerminalId, message + '\r\n');
  }
  
  // Refresh UI
  await loadProblems();
};
```

**Similar for checklist updates:**

```typescript
const handleChecklistItemStatusChange = async (itemId: string, newStatus: string) => {
  const result = await window.deskflowAPI?.updateChecklistItem?.({ 
    id: itemId, 
    status: newStatus 
  });
  
  if (!result?.success) return;
  
  const item = checklists.find(c => c.id === itemId);
  if (!item) return;
  
  // Notify active terminal if checklist belongs to active problem
  if (activeTerminalId) {
    const problem = problems.find(p => p.id === item.parentId);
    if (problem?.terminal_id === activeTerminalId) {
      const message = [
        '',
        '## ─────────────────────────────────────',
        `## Checklist Item Status Update`,
        `## Item: "${item.description}"`,
        `## New Status: **${newStatus}**`,
        '## ─────────────────────────────────────',
        ''
      ].join('\n');
      
      await window.deskflowAPI?.terminalWriteRaw?.(activeTerminalId, message + '\r\n');
    }
  }
  
  await loadChecklists();
};
```

---

### PHASE 6: Metadata Parsing from Agent Output (2-3 hours)
**Goal:** Parse structured blocks from agent output to auto-update DB

**Agent Output Format:**

The agent should include status blocks like:

```
## Problem Summary

I've fixed the authentication bug. The issue was in the JWT validation middleware.

## Status Update
[update-problem][52][FIXED]
[complete-checklist][104][completed]

The next step would be to add unit tests.
```

**Parser Implementation:**

**File:** `src/main.ts` (in the PTY data handlers ~5700–5800)

```typescript
function parseAgentStatusUpdates(buffer: string, sessionId: string) {
  try {
    // Look for [update-problem][id][status] blocks
    const problemMatches = buffer.matchAll(/\[update-problem\]\[(\d+)\]\[([\w_]+)\]/g);
    for (const match of problemMatches) {
      const [, problemId, newStatus] = match;
      
      // Update DB
      db.prepare('UPDATE workspace_problems SET status = ?, updated_at = datetime("now") WHERE id = ?')
        .run(newStatus.toUpperCase(), problemId);
      
      console.log(`[Agent] Problem #${problemId} → ${newStatus}`);
    }
    
    // Look for [complete-checklist][id][status] blocks
    const checklistMatches = buffer.matchAll(/\[complete-checklist\]\[(\d+)\]\[([\w_]+)\]/g);
    for (const match of checklistMatches) {
      const [, itemId, newStatus] = match;
      
      db.prepare('UPDATE checklists SET status = ?, updated_at = datetime("now") WHERE id = ?')
        .run(newStatus.toLowerCase(), itemId);
      
      console.log(`[Agent] Checklist #${itemId} → ${newStatus}`);
    }
    
    // Look for session metadata block
    const metadataMatch = buffer.match(/## Session Metadata\n([\s\S]*?)(?=##|$)/);
    if (metadataMatch) {
      const metadata = {};
      const lines = metadataMatch[1].split('\n');
      for (const line of lines) {
        const [key, ...valueParts] = line.split(':');
        if (key && valueParts.length) {
          metadata[key.trim()] = valueParts.join(':').trim();
        }
      }
      
      // Update session with agent-provided metadata
      if (metadata.title) {
        db.prepare('UPDATE terminal_sessions SET topic = ? WHERE id = ?')
          .run(metadata.title, sessionId);
      }
      if (metadata.category) {
        db.prepare('UPDATE terminal_sessions SET category = ? WHERE id = ?')
          .run(metadata.category, sessionId);
      }
      if (metadata.status) {
        db.prepare('UPDATE terminal_sessions SET status = ? WHERE id = ?')
          .run(metadata.status, sessionId);
      }
      
      console.log('[Agent] Session metadata updated:', metadata);
    }
    
  } catch (err) {
    console.error('Error parsing agent status updates:', err);
  }
}
```

**Call this function in PTY data handlers:**

```typescript
// In both 'terminal:create' and 'spawn-terminal' handlers
ipcMain.handle('spawn-terminal', async (event, { terminalId, cwd, agentType }) => {
  const pty = pty.spawn(...);
  
  // When data arrives from agent
  pty.on('data', (data) => {
    const buffer = data.toString();
    
    // ... existing agent signature detection ...
    
    // ADD THIS LINE
    parseAgentStatusUpdates(buffer, terminalId);  // ← Parse metadata/status updates
    
    // ... emit to renderer ...
  });
});
```

---

## 📊 Testing Checklist

After each phase, verify:

### PHASE 1 Tests (Terminal Height)
- [ ] Window is 1920x1080, terminal fills it
- [ ] Resize window to 1024x768, terminal shrinks accordingly
- [ ] Split panes horizontally, both panes resize together
- [ ] Split panes vertically, both panes resize proportionally
- [ ] Close one pane, remaining pane fills space

### PHASE 2 Tests (Session Resume)
- [ ] Create session "Test Session 1"
- [ ] Check DB → session has non-null `resume_id`
- [ ] Close terminal
- [ ] Click "Resume" button on session
- [ ] Terminal launches with `opencode --resume <id>` visible in PTY
- [ ] Agent loads previous session state

### PHASE 3 Tests (System Prompt Context)
- [ ] Create problem #52 "Auth Bug", assign to active terminal
- [ ] Create checklist items for problem
- [ ] Start new session → check system prompt in terminal
- [ ] Verify system prompt includes problem #52 title and checklist items
- [ ] Agent can reference problem by ID without re-explaining

### PHASE 4 Tests (Setup vs Initialize)
- [ ] First launch: "Setup" button visible
- [ ] Click Setup → Initialize dialog appears
- [ ] Complete setup → "Setup" button disappears, "+ New Session" appears
- [ ] Click "+ New Session" → Create dialog (not initialize mode)
- [ ] Session created successfully

### PHASE 5 Tests (Status Updates)
- [ ] Active terminal visible
- [ ] Change problem status → terminal receives status message
- [ ] Agent can read and acknowledge status change
- [ ] Multiple status changes → agent sees all updates

### PHASE 6 Tests (Metadata Parsing)
- [ ] Agent outputs `[update-problem][52][FIXED]` in response
- [ ] Check DB → problem #52 status is now "FIXED" (not user-initiated)
- [ ] Problems tab UI reflects the change
- [ ] Agent outputs session metadata → session topic/category updates

---

## 🔄 Dependency Order

```
PHASE 1 (Terminal Height)
  ↓
PHASE 2 (Session Resume)
  ↓
PHASE 3 (System Prompt Context)
  ↓
PHASE 4 (Setup vs Initialize)
  ├→ Can work in parallel
  ├→ PHASE 5 (Status Updates)
  ├→ PHASE 6 (Metadata Parsing)
  ↓
Integration & Testing
```

**Parallelizable:** Phases 4, 5, 6 can be worked on simultaneously after Phase 3 is complete.

---

## 📝 Key Engineering Decisions

### 1. Why Resume ID is a String, Not an Integer
- **Why:** Makes it portable across agents (Claude Code, OpenCode, Aider, etc.). Some agents expect string session IDs.
- **Pattern:** `resume-<timestamp>-<random>` gives uniqueness + readability

### 2. Why System Prompt Assembly is Async
- **Why:** Needs to fetch problems/requests/checklists from DB before merging into prompt
- **Issue:** Don't block agent initialization too long (8s timeout on step 4)
- **Solution:** `buildSessionContext` uses `Promise.all()` to fetch all three in parallel

### 3. Why Status Updates Are Sent as Terminal Messages, Not DB-Only
- **Why:** Agent needs to be notified synchronously when user changes status
- **Edge Case:** Without notification, agent might make a decision based on old status, then be surprised when DB shows different value
- **Pattern:** Terminal message → Agent acknowledges → No confusion

### 4. Why Metadata Parsing is Added to PTY Handler, Not a Separate Service
- **Why:** Metadata blocks come mixed with regular PTY output (not separate IPC)
- **Performance:** Parse once during PTY handling, not twice (once for display, once for DB)

---

## 🚨 Known Risks

| Risk | Mitigation |
|------|-----------|
| Terminal height fix might break other pages that use flex | Test all pages after Phase 1, undo if needed |
| Resume ID timeout after certain time | Document that resume IDs have TTL (default 30 days) |
| System prompt too large after adding context | Implement `condenseProblems()` to summarize if context > 5000 chars |
| Agent parsing fails on malformed status blocks | Add regex validation, log errors to console |
| Status updates race condition (user + agent both update) | Add version field to problems, implement optimistic update |

---

## 🎯 Success Criteria

✅ **PHASE 1 Complete:** Terminal height adjusts on window resize  
✅ **PHASE 2 Complete:** Resume button launches session with `--resume` flag  
✅ **PHASE 3 Complete:** Agent receives current problems/checklists in system prompt  
✅ **PHASE 4 Complete:** Clear separation between setup and session creation  
✅ **PHASE 5 Complete:** Status updates in UI are sent to active terminal  
✅ **PHASE 6 Complete:** Agent output automatically updates DB status fields  

**OVERALL SUCCESS:** User can create a session, assign a problem, update checklist items, and the AI agent is aware of all context changes throughout the interaction.

---

## 📚 Related Documentation

- `agent/docs/TERMINAL_SYSTEM_FIX_PLAN.md` — Detailed technical spec
- `agent/docs/TERMINAL_AND_WORKSPACE_FEATURES.md` — Complete feature inventory
- `agent/state.md` — Project state and recent changes
- `agent/PROBLEMS.md` — Active issue tracker

