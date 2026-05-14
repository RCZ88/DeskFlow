# TERMINAL WORKSPACE IMPLEMENTATION ANALYSIS

## Current Implementation Overview

### 1. KEY FLOWS IDENTIFIED

#### CREATE TERMINAL (User clicks + button)
- Line 697-715 (TerminalPage.tsx): User clicks "Open Terminal" button
- Dispatches 'create-terminal' event with terminalId, projectPath, agent type
- TerminalLayout.tsx listens for this event (line 285)
- Calls spawnTerminal() which invokes IPC 'spawn-terminal' (main.ts:5130)
- Terminal manager creates PTY process
- Returns 'terminal-created' event
- TerminalPage.tsx adds tab and initializes terminal with system prompts

#### NEW SESSION BUTTON
- Lines 1113-1124 (TerminalPage.tsx)
- Shows dialog but NO actual terminal selection happens
- Just sets state; doesn't create terminal or show selector
- BROKEN: Needs terminal selector UI

#### SAVE BUTTON
- Lines 792-798 (TerminalPage.tsx)
- Calls handleSaveCheckpoint() (line 236)
- Invokes saveTerminalSession IPC (main.ts:5226)
- Saves to terminal_sessions table
- ISSUE: Doesn't actually save meaningful session data

#### SEND BUTTON
- Lines 785-831 (TerminalPage.tsx)
- Shows instruction input
- Calls sendInstruction() (line 216)
- Invokes terminalWrite() IPC
- Routes to terminal manager
- ISSUE: No validation; no problem binding context

---

### 2. KEY IPC HANDLERS

#### Terminal Spawning
- 'spawn-terminal' (line 5130): Main spawn handler
- 'write-terminal' (line 5171): Write to PTY
- 'kill-terminal' (line 5190): Kill process

#### Session Management (BROKEN)
- 'get-terminal-sessions' (line 5216): Returns all sessions for project
- 'save-terminal-session' (line 5226): Saves to DB
  - Called AUTOMATICALLY on every terminal creation (line 631)
  - Should only be called when user explicitly saves

#### Terminal Bindings (Problem linking)
- 'register-terminal' (line 8086): Register binding
- 'update-terminal-binding' (line 8115): Update binding
- 'save-terminal-binding' (line 7857): Save problem binding
- 'get-terminal-bindings' (line 7758): Get all bindings

---

### 3. CRITICAL ISSUES

#### Issue #1: Session Auto-Creation
**WHERE**: TerminalPage.tsx line 631-636, handleTerminalCreated event
**WHAT**: Every terminal automatically saves a session
**SYMPTOM**: Sessions table fills up; users can't control when sessions are created
**ROOT CAUSE**: saveTerminalSession called on 'terminal-created' event
**FIX**: Remove automatic call; only save when user clicks "New Session"

#### Issue #2: Missing "Create Session" Dialog with Terminal Selector
**WHERE**: TerminalPage.tsx line 1113-1247
**WHAT**: "New Session" button opens dialog but has NO terminal selector
**SYMPTOM**: Users can't select which terminal/context to save
**ROOT CAUSE**: Dialog only has agent dropdown; missing terminal list
**FIX NEEDED**:
  1. Show list of active terminals
  2. Show available presets
  3. Allow custom command
  4. Confirm to create session

#### Issue #3: Non-Functional Save Button
**WHERE**: TerminalPage.tsx line 236-256
**WHAT**: handleSaveCheckpoint saves but doesn't checkpoint properly
**SYMPTOM**: Save button doesn't create named checkpoints
**ISSUE**: 
  - No distinction between new vs update
  - No custom naming
  - No feedback to user
**FIX**: Add dialog to name checkpoint, then save with metadata

#### Issue #4: Send Button No Context Passing
**WHERE**: TerminalPage.tsx line 216-233
**WHAT**: sendInstruction just writes to terminal
**PROBLEM**: 
  - No problem binding context passed
  - No agent type awareness
  - No validation that terminal is spawned
**FIX**: Check if problem bound, pass context if available

#### Issue #5: MISSING DATABASE TABLE
**WHERE**: main.ts initialization (line 1352-1783)
**WHAT**: Code references terminal_bindings table but it's NEVER created
**SYMPTOM**: IPC handlers crash when trying to access bindings
**FIX**: Add CREATE TABLE statement to initializeStorage()

---

### 4. DATABASE ISSUES

#### Missing Table Creation
The code uses 'terminal_bindings' table in:
- Line 7758: SELECT FROM terminal_bindings
- Line 7862: SELECT FROM terminal_bindings WHERE terminal_id
- Line 8096: INSERT INTO terminal_bindings

But table NEVER created in initializeStorage() (lines 1352-1783)

Needed schema:
`sql
CREATE TABLE IF NOT EXISTS terminal_bindings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  terminal_id TEXT NOT NULL UNIQUE,
  project_id TEXT,
  agent_type TEXT,
  status TEXT DEFAULT 'active',
  active_problem_id TEXT,
  active_request_id TEXT,
  session_context TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_activity_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
`

---

### 5. EXECUTION FLOWS SUMMARY

#### Current: Create Terminal
1. User clicks + in tab bar or header
2. Generates terminalId with timestamp
3. Dispatches 'create-terminal' custom event
4. TerminalLayout hears event, calls spawnTerminal()
5. spawnTerminal() invokes 'spawn-terminal' IPC
6. main.ts spawns PTY with TerminalManager.spawn()
7. Terminal ready → sends 'terminal-created' event
8. TerminalPage AUTOMATICALLY saves session (BUG!)
9. Terminal appears in tab bar
10. Registers terminal binding (line 629)

#### Current: Save Session
1. User clicks save button
2. Calls handleSaveCheckpoint()
3. Finds session by resume_id (searches sessions array)
4. Calls saveTerminalSession IPC
5. Saves to terminal_sessions table with auto-generated ID
6. No feedback to user
7. No named checkpoint created

#### Current: Send Instruction
1. User types in send input
2. Clicks send or presses Enter
3. Calls sendInstruction()
4. Gets active terminal ID
5. Calls terminalWrite(activeTerminalId, text)
6. Invokes 'write-terminal' IPC
7. TerminalManager writes to PTY stdin
8. Output appears on screen
9. No problem context passed

---

### 6. WHAT MUST CHANGE

#### Priority 1: Stop Auto-Session Creation
- Remove line 631-636 saveTerminalSession call
- Only save when user explicitly requests

#### Priority 2: Implement Terminal Selector Dialog
- Show active terminals in UI
- Show available presets
- Allow custom command
- Generate proper session record

#### Priority 3: Create Missing Database Table
- Add terminal_bindings table to initializeStorage()
- Include all columns referenced in handlers

#### Priority 4: Fix Save Button
- Add naming UI
- Create proper session checkpoint
- Show confirmation

#### Priority 5: Add Problem Context to Send
- Check for problem binding
- Pass context to terminal
- Validate terminal is spawned

---

### 7. KEY COMPONENTS

**TerminalPage.tsx** (~1300 lines)
- Main UI component
- Handles tabs, sidebar, instruction input
- Problem: auto-saves sessions, no save dialog, missing terminal selector

**TerminalWindow.tsx** (~429 lines)
- Layout management with split panes
- Terminal rendering with xterm
- Handles resize, split, close operations

**main.ts** (~8300 lines)
- TerminalManager: PTY spawning & management
- IPC handlers: spawn-terminal, write-terminal, save-terminal-session
- Database: terminal_sessions, terminal_presets, terminal_layouts tables
- Missing: terminal_bindings table creation

**preload.ts** (~369 lines)
- Defines IPC API for renderer
- Defines spawnTerminal, saveTerminalSession, etc.
