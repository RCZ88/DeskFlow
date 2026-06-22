# Tracker Mind - Feature Checklist

## Core Features

### 1. Problems Tab in Workspace Sidebar
- [ ] Problems tab visible in Terminal workspace sidebar
- [ ] Shows parsed issues from agent/PROBLEMS.md
- [ ] Groups by status (NEW, In Progress, Fixed, etc.)
- [ ] Click to view problem details
- [ ] Create new problem via UI
- [ ] Change status via UI
- [ ] Auto-creates/updates PROBLEMS.md

### 2. Requests Tab in Workspace Sidebar  
- [ ] Requests tab visible in Terminal workspace sidebar
- [ ] Shows parsed requests from agent/REQUESTS.md
- [ ] Groups by status (pending, in_progress, implemented)
- [ ] Create new request via UI
- [ ] Change status via UI
- [ ] Auto-creates/updates REQUESTS.md

### 3. Terminal-Problem Binding
- [ ] Terminal shows what problem it's working on (purple badge)
- [ ] Can assign problem to terminal from Problems panel
- [ ] If no matching terminal exists, can create new terminal for problem
- [ ] Terminal binding stored and displayed

### 4. Send Instructions to Terminal
- [ ] In problem detail, can type instructions
- [ ] Instructions sent to the bound terminal
- [ ] Works with active terminal

### 5. Live Parsing from AI Agents
- [ ] UI refreshes to read markdown files written by AI
- [ ] When AI updates PROBLEMS.md, UI shows changes
- [ ] Status changes from AI reflected in UI

### 6. Skill Selection
- [ ] Can select skill when creating problem/request
- [ ] Skill passed to terminal as context
- [ ] Skills listed from agent/skills/ directory

### 7. Session Context Display
- [ ] Terminal header shows session topic/context
- [ ] Shows last activity time
- [ ] Shows status (idle, working, waiting_input)

## Secondary Features

### 8. Quick View in Header
- [ ] Active terminals shown in header area
- [ ] Can click to switch terminals
- [ ] Shows what problem each terminal is working on

### 9. Agent Status Display
- [ ] Shows current status of each agent (opencode, claude, etc.)
- [ ] Status indicator (working, idle, error)

### 10. Report/Feedback Panel
- [ ] Shows recent AI actions
- [ ] Shows what needs user testing
- [ ] Clear display of AI output summary

## Technical Requirements

### Parser
- [ ] Handles existing PROBLEMS.md format (Issue X.Y)
- [ ] Handles inline **Issue X:** format
- [ ] Handles section headers like ## 🚨 2026-05-06 SESSION
- [ ] Extracts status, priority, user notes

### File Management
- [ ] Creates files if missing (agent/ directory)
- [ ] Writes updates back to markdown
- [ ] Maintains format consistency

### Terminal Integration
- [ ] Spawns new terminal when needed
- [ ] Writes prompts to terminal
- [ ] Binds terminal to problem in DB

## Testing Steps

### Step 1: Basic UI
1. Open Terminal page
2. Click "Problems" tab → Should see problems from PROBLEMS.md
3. Click "Requests" tab → Should show requests (or empty if none)

### Step 2: Create Problem
1. Click "New" button
2. Fill form (title, priority, category)
3. Submit
4. Check agent/PROBLEMS.md was updated

### Step 3: Assign to Terminal
1. Click on a problem
2. Click "Send to Terminal" or select terminal
3. New terminal created OR existing terminal used
4. Terminal shows purple badge with problem ID

### Step 4: Status Update
1. Change status from NEW to In Progress
2. Check PROBLEMS.md was updated
3. UI reflects change

### Step 5: AI Integration
1. Have AI agent update PROBLEMS.md
2. Refresh problems tab
3. Changes should appear in UI

### Step 6: Skills
1. Create problem with skill selection
2. Check skill appears in terminal prompt
3. Skills loaded from agent/skills/ directory

---

## Current Status (2026-05-08)

| Feature | Status |
|---------|--------|
| Problems tab in sidebar | ✅ Working |
| Parser for PROBLEMS.md | ✅ Working |
| Create new problem | ✅ Working |
| Change status | ✅ Working |
| Requests tab | ❌ Not implemented |
| Terminal binding | ❌ Not implemented |
| Send instructions | ❌ Not implemented |
| Live parsing | ❌ Needs testing |
| Skill selection | ❌ Not implemented |
| Auto-create terminal | ❌ Not implemented |
