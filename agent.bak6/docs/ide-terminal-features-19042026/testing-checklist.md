# Testing Checklist: AI Session Commander Terminal Features

## Phase 1: The Terminal Engine (Recursive Splits)

- [ ] **Terminal Page**: Navigate to the Terminal page and verify:
  - [ ] Single terminal pane renders correctly with xterm.js
  - [ ] Terminal accepts input and displays output
  - [ ] PTY connection works (commands execute in real shell)

- [ ] **Split Functionality**: Test splitting terminals:
  - [ ] "Split Horizontal" button appears on hover (or split controls on pane borders)
  - [ ] Clicking split creates two panes side by side
  - [ ] "Split Vertical" creates panes stacked top/bottom
  - [ ] Both terminals are independently functional
  - [ ] Close button removes a pane

- [ ] **Layout Persistence**: Test that layout saves/restores:
  - [ ] Create several splits
  - [ ] Refresh the application page
  - [ ] Layout should restore (or load from localStorage)

- [ ] **Data Structure**: Verify recursive tree structure:
  - [ ] Create nested splits (split a split)
  - [ ] All panes render correctly in tree hierarchy

## Phase 2: The "Project Workspace" Page

- [ ] **Project Selection**: Test selecting a project:
  - [ ] Navigate to IDE Projects page
  - [ ] Click on a project in the projects list
  - [ ] Can view project details (name, path, IDE)

- [ ] **Add Project Modal**: Test adding a new project:
  - [ ] Click "Add Project" button
  - [ ] Modal opens without background overlay issues
  - [ ] Can enter project name
  - [ ] Can browse for project path via folder picker
  - [ ] Can select default IDE from dropdown
  - [ ] Can enter repository URL (optional)
  - [ ] Click "Add Project" saves to database
  - [ ] Modal closes after successful add
  - [ ] New project appears in list

- [ ] **Open Project in IDE**:
  - [ ] Click "Open" button on a project with default IDE set
  - [ ] Project opens in the specified IDE

## Phase 3: Usage Analytics & History

- [ ] **AI Sync**: Test scanning AI agents:
  - [ ] Click "Sync AI" button in AI tab
  - [ ] Progress indicator shows during sync
  - [ ] Agent usage data appears after sync completes
  - [ ] Can view tokens, cost, sessions per agent

- [ ] **Usage Charts**: Test analytics display:
  - [ ] AI usage chart renders (tokens/cost/sessions)
  - [ ] Daily breakdown data shows in charts
  - [ ] Can toggle between token/cost/sessions views

- [ ] **Terminal Layout Persistence**: Test localStorage save:
  - [ ] Create a terminal layout
  - [ ] Refresh page
  - [ ] Layout should load from localStorage

- [ ] **Terminal Presets**:
  - [ ] Can add a new preset (name: "Run Tests", command: "npm test")
  - [ ] Presets persist in database
  - [ ] Can delete a preset

## Phase 4: Session Management & Resume

- [ ] **Terminal Sessions Database**:
  - [ ] Database table `terminal_sessions` exists
  - [ ] Can query sessions via IPC

- [ ] **Project Health Score**:
  - [ ] Calculate health score IPC returns activity level
  - [ ] Health score displays in project view (if implemented)

## Phase 5: Project Management

- [ ] **Project List**:
  - [ ] All added projects display in list
  - [ ] Can remove a project
  - [ ] Can view project tools

- [ ] **IDE Detection**:
  - [ ] Click "Scan" detects IDEs
  - [ ] Detected IDEs appear in IDEs list

- [ ] **Tool Detection**:
  - [ ] Click "Scan" detects tools
  - [ ] Tools display by category

## Database Schema Verification

Test each new table exists and works:

- [ ] `terminal_layouts` table:
  ```sql
  SELECT * FROM terminal_layouts;
  ```

- [ ] `terminal_presets` table:
  ```sql
  SELECT * FROM terminal_presets;
  ```

- [ ] `terminal_sessions` table:
  ```sql
  SELECT * FROM terminal_sessions;
  ```

- [ ] `projects.health_score` column exists:
  ```sql
  SELECT health_score FROM projects;
  ```

## UI/UX Verification

- [ ] **Error Handling**: Test graceful failures:
  - [ ] Missing directories logged gracefully
  - [ ] No crashes on invalid paths

- [ ] **Feedback Indicators**:
  - [ ] Loading states show during async operations
  - [ ] Sync progress displays during AI sync

## Integration Tests

- [ ] **IDE → Terminal Flow**:
  - [ ] Open project in IDE
  - [ ] Execute terminal preset in that project's context

- [ ] **AI Usage Attribution**:
  - [ ] AI usage syncs correctly
  - [ ] Usage attributed to correct agent
  - [ ] Daily breakdown works

---

## Expected Outcomes After Full Implementation

| Feature | Status | Notes |
|---------|--------|-------|
| Terminal splits | Implemented | Basic functionality exists |
| Layout persistence | Implemented | Via localStorage hook |
| Add Project modal | Fixed | Modal now displays correctly |
| Project database | Schema updated | New tables exist |
| Terminal presets | API ready | IPC handlers implemented |
| Terminal sessions | API ready | IPC handlers implemented |
| Health score | API ready | IPC handler implemented |
| Project Workspace UI | Partially implemented | Basic project list/details works |
| Visual terminal map | Not started | Ph 2 requirement |
| Drag & drop rearrange | Not started | Ph 2 requirement |
| History Tab UI | Not started | Ph 3 requirement |
| Resume functionality | Not started | Ph 4 requirement |
| Daily usage charts | Partially implemented | Basic chart exists |

## How to Test Each Item

1. Navigate to the relevant page in the application
2. Perform the described action
3. Verify the expected result
4. Mark as passing or failing

For any failures, document:
- What you expected to happen
- What actually happened
- Any error messages displayed

Report all findings to confirm the implementation is complete.