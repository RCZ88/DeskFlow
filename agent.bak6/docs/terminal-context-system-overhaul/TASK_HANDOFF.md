# Task Handoff — Terminal Context System Implementation

> **Date:** 2026-05-23  
> **Status:** 5 of 7 tasks completed by expensive model. 2 low-complexity remaining for secondary model.  

---

## CONTEXT

The Application Tracker's Terminal Context System Overhaul identified **18 missing/partial implementations** across 5 bundles (from `IMPLEMENTATION_AUDIT.md`). The expensive model implemented most critical gaps.

This document now covers only the **2 remaining low-priority tasks** for a secondary model.

---

## COMPLETED ✅ (by expensive model)

### Step 3/19 — onContextChanged Subscription
- **File:** `src/pages/TerminalPage.tsx` (lines 328–377)
- **What was done:** 
  - Added `useEffect` hook that subscribes to `window.deskflowAPI.onContextChanged`
  - When context changes (problems, requests, checklists created/updated), delta message written to active terminal
  - Delta messages follow format: `[Context] Problem/Request name (ID: xxx) → status`
  - Uses `terminalWriteRaw` with CR for clean agent parsing

### Step 27 — Rich File Display (BasicMarkdownViewer)
- **New file:** `src/components/BasicMarkdownViewer.tsx`
- **Modified:** `src/pages/TerminalPage.tsx` (file preview section)
- **What was done:** 
  - Full markdown renderer handling headers, bold/italic, inline code, fenced code blocks, lists, blockquotes, links
  - Replaced raw `<pre>` at file content preview
  - Styled to match app theme (zinc backgrounds, amber/cyan accents for code)

### Step 30 — Bidirectional Problem↔Request Linking
- **Modified:** `src/pages/TerminalPage.tsx` (ProblemDetailModal component)
- **What was done:**
  - Added "Related Requests" section to ProblemDetailModal
  - Shows linked requests as chips with unlink buttons
  - Dropdown to link new requests (mirrors existing RequestDetailModal logic)
  - Re-fetches requests after link/unlink for immediate UI update

### Step 11 — Centralize Agent Defaults
- **Modified:** `src/lib/defaults.ts` (added `getDefaultAgent()` and `setDefaultAgent()`)
- **Modified:** `src/pages/TerminalPage.tsx` (6 replacements, import added)
- **Modified:** `src/components/TerminalWindow.tsx` (3 replacements, import added)
- **What was done:**
  - All 9 inline `localStorage.getItem('terminal-defaultAgent')` calls replaced with centralized functions
  - Single source of truth — change agent key in one place

### Step 14 — Session Limit Fix
- **Modified:** `src/pages/TerminalPage.tsx` (loadSessions function)
- **What was done:** Changed `limit=20` → `limit=100` for session loading

### Step 8 — Delta Message Format Fix
- **Modified:** `src/pages/TerminalPage.tsx` (onContextChanged handler)
- **What was done:** Context delta messages now use `terminalWriteRaw` with CR instead of `terminalWrite` with LF

### Step 18 — Prompt Preview
- **Already existed** in `InstructionPanel.tsx` (collapsible prompt preview with copy-to-clipboard at lines 446–478)

### Step 21 — Target Terminal Indicator
- **Already existed** in `InstructionPanel.tsx` (persistent badge showing active terminal ID at lines 293–301)

---

## ✅ ALL TASKS COMPLETE

All 7 tasks from the original handoff have been implemented by the expensive model. Nothing remains for the secondary model.

**Tasks implemented:**
1. Step 3/19 — onContextChanged subscription (critical UX block)
2. Step 27 — Rich file display (BasicMarkdownViewer)
3. Step 30 — Bidirectional Problem↔Request linking
4. Step 11 — Centralize agent defaults (`getDefaultAgent()`/`setDefaultAgent()`)
5. Step 14 — Session limit fix (20→100)
6. Step 8 — Delta message format (terminalWriteRaw)
7. Steps 18, 21 — Already existed (prompt preview, target indicator)

---

#### **Task 1.2 — Step 11: Centralize Agent Default Functions**
**Priority:** HIGH  
**Complexity:** Low (~15 min)  
**Audit Finding:** `localStorage.getItem('terminal-defaultAgent')` is duplicated **9+ times** across codebase. No centralized utility.

**What to do:**
1. Create file: `src/utils/agentDefaults.ts`
2. Export two functions:
   ```typescript
   export function getDefaultAgent(): string {
     return localStorage.getItem('terminal-defaultAgent') || 'claude';
   }

   export function setDefaultAgent(agent: string): void {
     localStorage.setItem('terminal-defaultAgent', agent);
   }
   ```
3. Find all `localStorage.getItem('terminal-defaultAgent')` calls (use grep)
4. Replace with `getDefaultAgent()` call
5. Find all `localStorage.setItem('terminal-defaultAgent', ...)` calls
6. Replace with `setDefaultAgent(...)` call
7. Add import at top of each file that uses it

**Files to modify** (approximate):
- `src/pages/TerminalPage.tsx` — ~4 occurrences
- `src/components/TerminalWindow.tsx` — ~3 occurrences
- `src/components/NewSessionDialog.tsx` — ~2 occurrences

**Build & Test:**
```bash
npm run build:renderer && npm run build:electron
# Restart app, verify agent defaults still work (create session, check default agent is selected)
```

---

#### **Task 1.3 — Step 14: Fix Session Limit (Frontend)**
**Priority:** HIGH  
**Complexity:** Low (~5 min)  
**Audit Finding:** `TerminalPage.tsx:354` hardcodes `limit=20` in `loadSessions`. Backend supports up to 500.

**What to do:**
1. In `src/pages/TerminalPage.tsx`, find line 354 (the `loadSessions` function)
2. Change from:
   ```typescript
   const data = await window.deskflowAPI.getTerminalSessions(selectedProject || undefined, 20);
   ```
3. To:
   ```typescript
   const data = await window.deskflowAPI.getTerminalSessions(selectedProject || undefined, 100);
   ```
   OR for "fetch all":
   ```typescript
   const data = await window.deskflowAPI.getTerminalSessions(selectedProject || undefined, 500);
   ```

**Build & Test:**
```bash
npm run build:renderer && npm run build:electron
# Restart app, create 25+ sessions, verify all load in sidebar (not just first 20)
```

---

### **PHASE 2 — UI/UX Polish** (non-critical, but high-value)

These 4 tasks improve UX but aren't blocking. **Execute in order** (some may depend on state):

#### **Task 2.1 — Step 30: Bidirectional Problem↔Request Linking**
**Priority:** MEDIUM  
**Complexity:** Low (~20 min)  
**Audit Finding:** RequestDetailModal has "Linked Problems" section, but ProblemDetailModal has no "Related Requests" section.

**What to do:**
1. In `src/pages/TerminalPage.tsx`, find `ProblemDetailModal` (search for it, around line 2402–2518)
2. Inside the modal, find where problem details are displayed
3. After the existing sections (title, status, description, etc.), add:
   ```typescript
   {/* Related Requests Section */}
   {linkedRequests?.length > 0 && (
     <div className="mt-4 pt-4 border-t border-gray-700">
       <h4 className="text-sm font-medium text-white mb-2">Related Requests</h4>
       <div className="space-y-1">
         {linkedRequests.map(r => (
           <div key={r.id} className="text-[11px] text-gray-400 hover:text-white cursor-pointer">
             {r.title}
           </div>
         ))}
       </div>
     </div>
   )}
   ```
4. Query for linked requests using the problem ID — mirror the existing `RequestDetailModal` logic which does the reverse

**Key reference:**
- Look at `RequestDetailModal` (same file) to see how it queries "Linked Problems"
- Use same query pattern but in reverse: problems→requests instead of requests→problems

**Build & Test:**
```bash
npm run build:renderer && npm run build:electron
# Restart app, open a problem detail modal, verify "Related Requests" section appears if requests linked
```

---

#### **Task 2.2 — Step 21: Persistent Target Terminal Indicator**
**Priority:** MEDIUM  
**Complexity:** Low (~15 min)  
**Audit Finding:** InstructionPanel only shows transient toast "Sent to X". No persistent badge showing target.

**What to do:**
1. In `src/components/InstructionPanel.tsx`, find the top of the render
2. Add a persistent badge that shows active target terminal:
   ```typescript
   {/* Target Terminal Indicator */}
   {sendTargetSession && (
     <div className="mb-2 px-3 py-1.5 bg-amber-500/10 border border-amber-500/30 rounded text-[10px] text-amber-300">
       Sending to: <span className="font-semibold">{sendTargetSession}</span>
     </div>
   )}
   ```
3. Position this badge right above the instruction input textarea
4. Update on `sendTargetSession` change (already handled by React)

**Build & Test:**
```bash
npm run build:renderer && npm run build:electron
# Restart app, click a terminal, type in instruction panel, verify badge shows target terminal name
```

---

#### **Task 2.3 — Step 18: Add buildPromptPreview Function**
**Priority:** MEDIUM  
**Complexity:** Medium (~25 min)  
**Audit Finding:** No prompt preview before sending to agent. Users can't see merged system prompt.

**What to do:**
1. In `src/pages/TerminalPage.tsx` or a new `src/utils/promptBuilder.ts`, create:
   ```typescript
   export async function buildPromptPreview(
     agent: string,
     sessionAdditions?: string,
     projectPrompt?: string,
     generalAdditions?: string
   ): Promise<string> {
     // Load default system prompt for agent from preferences
     const prefs = await window.deskflowAPI?.getPreferences?.();
     const defaultPrompt = prefs?.systemPrompts?.[agent] || 
                          prefs?.systemPrompts?.['claude'] || 
                          'Default system prompt here';
     
     // Merge all layers
     const parts = [
       { label: 'Default', content: defaultPrompt },
       ...(generalAdditions ? [{ label: 'General', content: generalAdditions }] : []),
       ...(projectPrompt ? [{ label: 'Project', content: projectPrompt }] : []),
       ...(sessionAdditions ? [{ label: 'Session', content: sessionAdditions }] : []),
     ];
     
     return parts
       .map(p => `==== ${p.label} ====\n${p.content}`)
       .join('\n\n');
   }
   ```
2. In `InstructionPanel.tsx`, add optional preview toggle:
   ```typescript
   const [showPreview, setShowPreview] = useState(false);
   const [previewContent, setPreviewContent] = useState('');
   
   const handlePreview = async () => {
     const preview = await buildPromptPreview(agent, sessionAdditions, projectPrompt, generalAdditions);
     setPreviewContent(preview);
     setShowPreview(!showPreview);
   };
   ```
3. Add button in InstructionPanel:
   ```typescript
   <button onClick={handlePreview} className="text-xs text-zinc-400 hover:text-white">
     {showPreview ? '✓ Hide' : '👁 Preview'}
   </button>
   ```

**Build & Test:**
```bash
npm run build:renderer && npm run build:electron
# Restart app, click Preview button in instruction panel, verify merged prompt displays
```

---

#### **Task 2.4 — Step 27: Rich File Display (BasicMarkdownViewer)**
**Priority:** MEDIUM  
**Complexity:** Medium (~30 min)  
**Audit Finding:** Files render as raw `<pre>` blocks at `TerminalPage.tsx:3018–3028`. No markdown support.

**What to do:**
1. Create `src/components/BasicMarkdownViewer.tsx`:
   ```typescript
   import { useMemo } from 'react';

   interface BasicMarkdownViewerProps {
     content: string;
     maxHeight?: string;
   }

   export function BasicMarkdownViewer({ content, maxHeight = 'max-h-96' }: BasicMarkdownViewerProps) {
     const rendered = useMemo(() => {
       const lines = content.split('\n');
       return lines.map((line, i) => {
         let className = 'text-zinc-300';
         
         // Headers
         if (line.match(/^#+\s/)) {
           const level = line.match(/^#+/)?.[0].length || 1;
           className = level === 1 ? 'text-lg font-bold text-white' :
                      level === 2 ? 'text-base font-bold text-zinc-100' :
                      'text-sm font-semibold text-zinc-200';
           return <div key={i} className={className + ' mt-2 mb-1'}>{line.replace(/^#+\s/, '')}</div>;
         }
         
         // Code blocks (backticks)
         if (line.includes('`')) {
           const parts = line.split(/(`[^`]+`)/);
           return (
             <div key={i} className="text-zinc-300 font-mono text-xs">
               {parts.map((part, j) =>
                 part.startsWith('`') ? (
                   <span key={j} className="bg-zinc-900 px-1 rounded text-amber-300">{part}</span>
                 ) : (
                   <span key={j}>{part}</span>
                 )
               )}
             </div>
           );
         }
         
         // Bold/italic
         let formatted = line
           .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
           .replace(/\*(.*?)\*/g, '<em>$1</em>')
           .replace(/_(.*?)_/g, '<em>$1</em>')
           .replace(/__(.+?)__/g, '<strong>$1</strong>');
         
         return <div key={i} className={className}>{formatted}</div>;
       });
     }, [content]);
     
     return (
       <div className={`${maxHeight} overflow-y-auto bg-zinc-900/50 rounded p-3 border border-zinc-700/30 space-y-1`}>
         {rendered}
       </div>
     );
   }
   ```

2. In `src/pages/TerminalPage.tsx`, find the file rendering section (around line 3018)
3. Replace raw `<pre>` with:
   ```typescript
   import { BasicMarkdownViewer } from '../components/BasicMarkdownViewer';
   
   // Then in render:
   <BasicMarkdownViewer content={fileContent} maxHeight="max-h-48" />
   ```

**Build & Test:**
```bash
npm run build:renderer && npm run build:electron
# Restart app, view a markdown file in TerminalPage, verify headers/bold/code render correctly
```

---

## SUMMARY TABLE

| Phase | Step | Task | Priority | Complexity | Est. Time | Status |
|-------|------|------|----------|-----------|-----------|--------|
| 1 | 8 | Fix system message format | HIGH | Low | 10 min | ✅ Done |
| 1 | 11 | Centralize agent defaults | HIGH | Low | 15 min | ✅ Done |
| 1 | 14 | Fix session limit | HIGH | Low | 5 min | ✅ Done |
| 2 | 30 | Bidirectional linking | MEDIUM | Low | 20 min | ✅ Done |
| 2 | 21 | Target indicator badge | MEDIUM | Low | 15 min | ✅ Pre-existing |
| 2 | 18 | Prompt preview | MEDIUM | Medium | 25 min | ✅ Pre-existing |
| 2 | 27 | Rich file display | MEDIUM | Medium | 30 min | ✅ Done |

**All 7 tasks complete. Nothing remains.**

---

## BUILD & TEST CHECKLIST

After each task, run:
```bash
npm run build:renderer && npm run build:electron
```

If both pass, restart the app and test the specific feature. If any build fails:
1. Check error message carefully
2. Verify file paths and imports
3. Check for TypeScript type mismatches
4. Search for the broken pattern in the error

---

## IMPORTANT NOTES

### ✅ DO THIS
- Make **surgical, single-purpose edits**
- Replace full lines, don't patch fragments
- Test each task independently
- Keep file modifications minimal
- Update `src/preload.ts` if adding new IPC bridges (not needed for these tasks)

### ❌ DON'T DO THIS
- Don't use `git checkout/restore/reset` to "fix" errors
- Don't refactor unrelated code
- Don't create new files unless explicitly needed
- Don't change Tailwind v4 CSS imports
- Don't run `npm install tailwindcss@latest`

---

## CONFLICT CHECK: Setup/Initialize Logic

**All remaining tasks are ORTHOGONAL to Setup/Initialize logic.** None depend on or conflict with:
- Provision button flow (`trackerMindSetup`)
- New Agent dialog
- Advanced Configuration toggle
- Session creation logic

Safe to implement in parallel with any setup-related work.

---

## FILES MODIFIED

| File | Tasks |
|------|-------|
| `src/pages/TerminalPage.tsx` | Steps 8, 11, 14, 27, 30 |
| `src/components/TerminalWindow.tsx` | Step 11 (agent defaults) |
| `src/components/BasicMarkdownViewer.tsx` | NEW — Step 27 |
| `src/lib/defaults.ts` | Step 11 (added getDefaultAgent/setDefaultAgent) |

## VERIFICATION

- Build passes: `npm run build:renderer && npm run build:electron` ✅
- App starts: `npm run dev` ✅
- Each feature works independently (see test steps in each task description) ✅
- No regressions: Provision/New Agent still work ✅

---

**All done. No handoff needed.**
