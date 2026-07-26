# RESULT: Session Categorization & @mention Routing System

## 1. Database Schema Changes

### terminal_sessions — add columns

```sql
-- Migration: safe ALTER TABLE (wrapped in try/catch in main.ts)
ALTER TABLE terminal_sessions ADD COLUMN category TEXT DEFAULT 'other';
ALTER TABLE terminal_sessions ADD COLUMN status TEXT DEFAULT 'active';
ALTER TABLE terminal_sessions ADD COLUMN product_area TEXT DEFAULT '';
ALTER TABLE terminal_sessions ADD COLUMN description TEXT DEFAULT '';
ALTER TABLE terminal_sessions ADD COLUMN auto_tags TEXT DEFAULT '[]';  -- JSON array
ALTER TABLE terminal_sessions ADD COLUMN category_confirmed INTEGER DEFAULT 0;  -- boolean: user accepted suggestion
```

Category enum enforced application-side: `bug-fix | feature | refactor | research | review | other`
Status enum: `active | paused | completed | archived`

### session_parsed_items — new table

```sql
CREATE TABLE IF NOT EXISTS session_parsed_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL REFERENCES terminal_sessions(id),
  item_type TEXT NOT NULL CHECK(item_type IN ('decision', 'action_item', 'status_change', 'reference')),
  content TEXT NOT NULL,
  source_message_id INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### workspace_problems — add session_id column

```sql
ALTER TABLE workspace_problems ADD COLUMN session_id TEXT;
```

---

## 2. Data Processing Pipeline

### 2a. Category Auto-Assignment Algorithm

```
INPUT: session messages (array of {role, content})
OUTPUT: { category, product_area, tags, confidence }

ALGORITHM:
1. Collect ALL message content from session (last N=50 messages, or all if fewer)
2. Build keyword scorecard per category:
   - bug-fix: ["bug", "fix", "error", "crash", "broken", "issue #", "regression", "not working"] → +2 each
   - feature: ["add", "new", "implement", "feature", "create", "build"] → +2 each
   - refactor: ["refactor", "clean", "rename", "extract", "move", "simplify", "restructure"] → +2 each
   - research: ["research", "investigate", "explore", "how to", "learn", "evaluate", "compare"] → +2 each
   - review: ["review", "check", "audit", "verify", "validate", "approve"] → +2 each
3. File path detection → lang/framework tags (".tsx" → "React", "main.ts" → "Electron")
4. Issue number detection /#\d+/ → tags + links to workspace_problems
5. Score normalization: divide each category score by total matches → confidence %
6. If confidence < 40% → category = "other" (needs manual)
7. If confidence >= 40% → suggest top category
```

Implementation: A function `analyzeSessionCategory(sessionId)` in main.ts that reads `terminal_messages` for the session, applies keyword scoring, and returns a suggestion. Called on-demand (not real-time) — triggered after every 5th message in a session (track via message count check).

### 2b. @mention Parsing Algorithm

```
INPUT: raw input string from Send bar (e.g. "@Terminal 3 fix the bug")
OUTPUT: { targetTerminalId, message, isAtMention: boolean }

ALGORITHM:
1. Check if string starts with '@' or contains ' @' (mid-line mention)
2. Extract mention token: text from '@' to next whitespace or end
3. If match found via regex /@([^\s]+)/:
   a. Try exact match: look up terminalTabs where name === token
   b. Try number match: "@term3" or "@3" → find by index in tabs order
   c. Try fuzzy match: token normalized (lowercase, remove special chars) → tab.name normalized includes token
4. If no match found:
   a. Return { isAtMention: false } — treat input as regular send to active terminal
5. If match found:
   a. Strip @mention token from input → remaining is message
   b. Return { targetTerminalId, message, isAtMention: true }
```

### 2c. Message Content Parsing

```
INPUT: single message text
OUTPUT: array of parsed items { type, content }

PARSING RULES (applied to each assistant message on insert):
1. Decision detection: lines containing /(?:^|\s)(decision:|chose|going with|let's use|we'll use)(?:\s|$)/i
   → item_type: "decision"
2. Action item detection: lines containing /(?:^|\s)(todo:|next step|need to|should|must|action item)(?:\s|$)/i
   → item_type: "action_item"
3. Status change detection: lines containing /(?:^|\s)(fixed|done|complete|blocked on|wontfix)(?:\s|$)/i
   → item_type: "status_change"
4. Reference detection: /#\d+/ → issue references, /[\w/]+\.\w+/ → file paths
   → item_type: "reference"

PARSING TIMING: On insert of each assistant message (synchronous, fast regex — under 5ms)
If performance is a concern, batch-parse every 10 messages on a 2s debounce.
```

---

## 3. Backend IPC Changes

### New IPC Handlers (in main.ts)

| Handler | Request | Response | Purpose |
|---------|---------|----------|---------|
| `update-session-category` | `{ sessionId, category, productArea, description }` | `{ success }` | Manual category update |
| `confirm-session-category` | `{ sessionId }` | `{ success }` | Accept auto-suggested category |
| `get-session-category-suggestion` | `{ sessionId }` | `{ category, productArea, tags, confidence }` | Get auto-analysis result |
| `set-session-status` | `{ sessionId, status }` | `{ success }` | Change active/paused/completed/archived |
| `get-parsed-session-items` | `{ sessionId }` | `{ items: [{ type, content }] }` | Get decisions/actions for a session |
| `resolve-at-mention` | `{ input }` | `{ terminalId, message, resolved }` | Parse @mention from Send bar input |
| `send-to-mention` | `{ terminalId, message }` | `{ success }` | Write to specific terminal (not just active) |

### Modified IPC Handlers

| Handler | Change | Reason |
|---------|--------|--------|
| `save-terminal-session` | Accept + persist new fields (category, status, etc.) | Need to save categorization |
| `save-terminal-message` | After insert, trigger content parsing → insert into `session_parsed_items` | Extract decisions in real-time |
| `tracker-mind-setup` | Added `session-metadata` section to AGENTS.md | Instruct AI agents |
| `get-terminal-sessions` | Return all new fields in response | Frontend needs new data |

---

## 4. Frontend Component Architecture

### Component Tree (additions/changes in TerminalPage.tsx)

```
TerminalPage
├── TerminalHeader (existing)
│   ├── SendBar (existing — enhanced with @mention)
│   │   └── AtMentionDropdown (NEW) — autocomplete popup
│   └── ...
├── TerminalLayout (existing)
│   └── TerminalTabs (existing — enhanced)
│       └── SessionCategoryBadge (NEW) — per-terminal badge
├── Sidebar (existing)
│   ├── ... existing tabs ...
│   ├── SessionsTab (existing — redesigned)
│   │   ├── CategoryFilterPills (NEW) — filter bar
│   │   └── SessionCard (NEW) — redesigned session list item
│   │       ├── CategoryBadge
│   │       ├── StatusDot
│   │       └── TagPills
│   ├── TerminalsTab (existing — enhanced)
│   │   └── SessionBindingCard (enhanced — shows category)
│   └── SessionMetadataPanel (NEW) — edit category/status/area dialog
└── ToastContainer (existing — extended for @mention confirmations)
```

### Key Props / State Changes

```typescript
// New state in TerminalPage
const [sessionCategories, setSessionCategories] = useState<Record<string, SessionCategory>>({});
// SessionCategory = { category, status, productArea, description, tags, categoryConfirmed }

const [mentionDropdown, setMentionDropdown] = useState<{
  visible: boolean;
  query: string;
  results: Array<{ terminalId: string; name: string; agent: string; sessionTopic: string }>;
  cursor: number;
}>({ visible: false, query: '', results: [], cursor: 0 });

// Enhanced session type
interface Session {
  id: string;
  agent: string;
  topic: string;
  resume_id?: string;
  created_at: string;
  total_cost?: number;
  total_tokens?: number;
  terminal_id?: string;
  // NEW:
  category?: 'bug-fix' | 'feature' | 'refactor' | 'research' | 'review' | 'other';
  status?: 'active' | 'paused' | 'completed' | 'archived';
  product_area?: string;
  description?: string;
  auto_tags?: string[];
  category_confirmed?: boolean;
}
```

---

## 5. Visual Design Spec

### Category Badge Component

```
Category    | Hex (bg)      | Hex (text)   | Icon              | Border
------------|---------------|--------------|-------------------|--------
bug-fix     | #dc2626/15    | #fca5a5      | Bug (lucide)      | 1px #dc2626/30
feature     | #2563eb/15    | #93c5fd      | Sparkles          | 1px #2563eb/30
refactor    | #9333ea/15    | #c4b5fd      | RefactorIcon      | 1px #9333ea/30
research    | #0d9488/15    | #5eead4      | Search            | 1px #0d9488/30
review      | #d97706/15    | #fbbf24      | Eye               | 1px #d97706/30
other       | #52525b/15    | #a1a1aa      | MoreHorizontal    | 1px #52525b/30

Dimensions: 16px height, 4px horizontal padding (left=4px for icon, right=6px for text)
Font: text-[9px] leading-none font-medium
Border-radius: 4px (rounded)
Layout: flex row, icon (8px) + gap(2px) + label text
```

### Status Dot Component

```
Status    | Hex         | Animation
----------|-------------|----------
active    | #10b981     | animate-pulse (green)
paused    | #eab308     | static (yellow)
completed | #6b7280     | static (gray) + checkmark icon
archived  | #52525b     | static (darker gray) + archive icon

Dimensions: 6px diameter circle (w-1.5 h-1.5 rounded-full) for list, 8px for tab bar
```

### @mention Autocomplete Dropdown

```
Position: absolute, below Send input bar, left=0, width=100% of input container
Z-index: 50
Background: #18181b (zinc-900)
Border: 1px solid #27272a (zinc-800)
Border-radius: 8px (rounded-lg)
Max-height: 200px, overflow-y-auto
Shadow: 0 4px 20px rgba(0,0,0,0.4)

Each item:
  Height: 36px
  Padding: 6px 10px
  Flex row with: [status dot 6px] [gap 8px] [terminal name bold 12px] [gap 4px] [agent tag] [gap auto] [category badge]
  Hover: bg-zinc-800
  Active/selected: bg-zinc-700 + #3b82f6 left border 2px

Empty state: "No terminals found" text in zinc-500, 12px, centered
```

### Session Card (Redesigned)

```
Container: bg-zinc-800/50, rounded, border-l-2
  Active: border-l-green-700/30, bg-zinc-800/30
  Closed: border-l-zinc-700/20, bg-zinc-800/10

Layout (flex row):
  Left (flex-1 min-w-0):
    Row 1 (flex row, gap-2, items-center):
      [CategoryBadge] [Title 13px font-medium text-zinc-200 truncate]
    Row 2 (12px text-zinc-400, line-clamp-1):
      Description preview (first 80 chars of description or topic)
    Row 3 (flex row, gap-2, items-center, 10px text-zinc-500):
      [StatusDot] [agent tag] [timestamp] [gap-auto] [tag pills]
  
  Right (flex-shrink-0, gap-1, opacity-0 group-hover:opacity-100):
    [Focus/Open button] [Messages button] [Edit button] [Delete button]

Spacing: 8px padding all sides, 4px gap between rows
```

### Category Filter Pills

```
Container: flex row, gap-2, mb-3, overflow-x-auto
Each pill:
  Height: 24px
  Padding: 4px 10px
  Border-radius: 9999px (rounded-full)
  Font: text-[10px] font-medium whitespace-nowrap

  Active pill: fill bg + white text (e.g. bug-fix = bg-red-600/80 text-white)
  Inactive pill: transparent bg + zinc-400 text, 1px border zinc-700
  Hover inactive: bg-zinc-800
```

### Session Metadata Edit Dialog

```
Overlay: fixed inset-0 bg-black/60 z-50
Dialog: centered, max-w-md, bg-zinc-900, rounded-xl, border border-zinc-800
Padding: 20px

Title: "Edit Session" 14px font-semibold
Form:
  Label 11px text-zinc-400 → Field
  Category: select dropdown (pill-styled options with colors)
  Status: radio group (active/paused/completed/archived)
  Product Area: text input 12px
  Description: textarea 12px, 3 rows
  Tags: comma-separated input + display of current tags

Actions:
  [Cancel] text button → [Save] primary filled button
```

---

## 6. Interaction Flow Diagrams

### Flow A: @mention Send

```
[User types "@" in Send bar]
  → @mention dropdown appears
  → User continues typing "term3"
  → Dropdown filters to show "Terminal 3" + its session info
  → User presses Enter (or clicks)
  → Text bar updates: "@Terminal 3 >> "
  → User types message + presses Send
  → resolve-at-mention IPC called → returns resolved terminalId
  → send-to-mention IPC called → writes to target terminal
  → Toast: "Sent to Terminal 3" (green, 3s)
  → If target has no session → auto-create session
    → Auto-analyze message → assign tentative category
  → If target has session → log message to session_messages
```

### Flow B: Category Auto-Suggestion

```
[Session has accumulated 5+ messages]
  → get-session-category-suggestion IPC called
  → Backend runs keyword analysis on session messages
  → Returns { category: "bug-fix", confidence: 72%, tags: ["React", "#123"], productArea: "Dashboard" }
  → Frontend shows subtle suggestion bar on the session card:
    "Suggested: Bug Fix (72% confidence) — [Accept] [Change]"
  → If user clicks "Accept":
    → update-session-category IPC → category_confirmed = true
    → Badge appears, suggestion bar disappears
  → If user clicks "Change":
    → Open SessionMetadataPanel for manual edit
  → If user ignores: suggestion bar shows for 3 sessions then auto-dismisses
```

### Flow C: Session Status Lifecycle

```
[Session created] → status = "active", green pulse dot
  
[User clicks Pause on session]
  → set-session-status IPC → status = "paused"
  → Dot changes to yellow (static)
  → Tab shows muted styling

[User marks Complete]
  → set-session-status IPC → status = "completed"
  → Dot changes to gray + checkmark
  → Session moves to "Completed" section in sidebar
  → Terminal tab shows gray dot

[14 days since last message in completed session]
  → On app init or periodic check: set-session-status → "archived"
  → Session moves to "Archived" section (collapsed by default)
  → User can restore: set-session-status → "active" again
```

### Flow D: AI Agent Metadata Contract

```
[Workspace init runs (tracker-mind-setup)]
  → AGENTS.md includes new section "## Session Metadata Requirements"
  → Section instructs AI to output:
    ```
    ## Session Metadata
    - Title: ...
    - Description: ...
    - Status: active
    - Product Area: ...
    - Category: bug-fix
    ```

[AI outputs metadata at start of session]
  → Terminal messages save via save-terminal-message IPC
  → On insert, regex-parsed for "## Session Metadata" section
  → Fields extracted → update-session-category IPC called automatically
  → Session shows parsed metadata with confirmed badge (green check)
  → Suggestion never shown for AI-provided metadata (auto-accepted)

[AI doesn't output metadata]
  → Fallback to auto-analysis after 5 messages (Flow B)
  → User sees suggestion bar instead of confirmed badge
```

---

## 7. AGENT.md Template Update

Add this section to the auto-generated AGENTS.md during `tracker-mind-setup`:

```markdown
## Session Metadata Requirements

This project requires structured session metadata from AI agents.

### Required Output Format

At the **start of each session** (or when switching tasks), output a metadata block:

```
## Session Metadata
- Title: Short descriptive title of what this session is working on
- Description: 1-2 sentences explaining the goal and scope
- Status: active | paused | completed (use active unless resuming)
- Product Area: Which part of the application this targets (e.g., Dashboard, Settings, Terminal, Database, External Page, IDE Page, etc.)
- Category: bug-fix | feature | refactor | research | review
```

### Guidelines

- **Title**: Be specific. "Fix heatmap day click" not "Fix bug" or "Work on app"
- **Product Area**: Use known app areas. If multiple, list the primary one
- **Category**: Match the nature of the work:
  - `bug-fix` → fixing something that's broken
  - `feature` → adding something new
  - `refactor` → improving existing code without changing behavior
  - `research` → investigating, learning, evaluating options
  - `review` → code review, checking work, validation
- **When resuming a session**: Keep the original metadata. Update Status to "active"

### Why This Matters

This metadata powers the session categorization system:
- It helps identify which terminal is working on what
- It enables filtering and organizing sessions by product area
- It auto-populates the session list with meaningful titles
- It allows @mention routing to target the right terminal

### Fallback

If you don't provide this metadata, the system will auto-analyze your messages to infer the category. Providing it explicitly is more accurate.
```

---

## 8. Migration Plan

### Phase 1 — Schema + Backend (Estimated: 1 session)
1. Add new columns to `terminal_sessions` in `main.ts` (safe ALTER TABLE with try/catch)
2. Create `session_parsed_items` table
3. Add `session_id` to `workspace_problems`
4. Implement `analyzeSessionCategory()` function
5. Implement `parseMessageContent()` function on message insert
6. Add all 8 new/modified IPC handlers
7. Update `save-terminal-session` to persist new fields

### Phase 2 — Frontend Components (Estimated: 2 sessions)
1. Create `CategoryBadge` component
2. Create `StatusDot` component
3. Create `AtMentionDropdown` component
4. Create `CategoryFilterPills` component
5. Redesign session card in sidebar
6. Create `SessionMetadataPanel` dialog
7. Implement `SessionMetadataPanel` for editing
8. Enhance terminal tabs with category badge + status dot

### Phase 3 — @mention Routing (Estimated: 1 session)
1. Enhance SendBar input to detect @mention
2. Wire up `resolve-at-mention` IPC
3. Implement `send-to-mention` IPC handler
4. Auto-create session on @mention to unbound terminal
5. Toast confirmation on send

### Phase 4 — AI Metadata Contract (Estimated: 1 session)
1. Update AGENTS.md template in `tracker-mind-setup`
2. Parse metadata from terminal_messages on insert
3. Auto-confirm category when AI provides metadata
4. Fallback to auto-analysis when no metadata

### No-Break Guarantees
- All existing sessions get default values: `category='other'`, `status='active'`, `category_confirmed=0`
- Existing save/resume/delete flows unchanged — new fields are additive
- @mention is entirely optional — typing without `@` works exactly as before
- Filter pills default to "All" — no filtering until user explicitly clicks one
- AGENTS.md update only affects NEW inits — existing AGENTS.md unchanged
