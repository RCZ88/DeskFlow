# Prompt: Line Counter & File Statistics Feature

## Raw Request

> "i wnat a new feature for the line counter and like file counter as part of the statistics of a projcet. but weed to design an efficient system that is good and efficient at ocuting the number of files and especially their lines. i need you to generate prompt for this new feature. also like thecharts on how ur going to compare the files, or like jut displaying it on a table of files nad liek the empty space the comment, and like the actual code lines, and subtotal lienso f a file. it should exclude markdowns ((at least have the ability to exclude certain stuff. and it should categorize per filetype for example or something like that"

## Problem Statement

The project statistics page currently shows time-tracking data, AI usage, and git commits — but has zero visibility into the actual codebase. Users have no way to see how many files their project has, how many lines are code vs comments vs blank, or which file types dominate the codebase. There is no line counting, no file analysis, and no code metrics of any kind.

## Context Bundle Reference

Read `agent/docs/line-counter-feature/CONTEXT_BUNDLE.md` first. It contains:
- Existing `walkDir` function with `SKIP_DIRS` and `EXT_TO_LANG` maps (reuse these)
- Project table schema (`projects.path` column)
- Existing IPC handler patterns
- Design system tokens and component patterns
- Preload bridge conventions
- Dependencies already installed (recharts, lucide-react, tailwindcss)

## Engineering Task — Data Processing Pipeline

Design a complete backend system for counting lines across an entire project:

1. **File walker with line counting**: Extend the existing `walkDir` pattern to read each file and count:
   - Total lines (`fileContent.split('\n').length`)
   - Blank lines (empty or whitespace-only)
   - Comment lines (language-aware detection — see below)
   - Code lines (`total - blank - comment`)

2. **Language-aware comment detection**: Create a mapping of file extensions to comment styles:
   - `//` single-line: `.ts`, `.tsx`, `.js`, `.jsx`, `.java`, `.c`, `.cpp`, `.cs`, `.go`, `.rs`, `.swift`, `.kt`, `.scala`, `.vue`, `.svelte`
   - `#` single-line: `.py`, `.rb`, `.sh`, `.yaml`, `.yml`, `.toml`, `.r`, `.pl`
   - `/* */` block: `.c`, `.cpp`, `.h`, `.java`, `.css`, `.scss`
   - `<!-- -->`: `.html`, `.xml`, `.md`, `.vue` (template section)
   - `""" """` / `''' '''`: `.py` (docstrings)
   - `;` comment: `.lisp`, `.asm`
   - No comments: `.json`, `.lock`, `.min.js`

3. **Exclude/include system**: Support these exclusion patterns:
   - By extension: exclude `.md`, `.json`, `.lock`, `.min.js`
   - By directory: exclude `node_modules`, `dist`, `build` (already in SKIP_DIRS)
   - By glob-like pattern: `*.test.ts`, `*.spec.js`, `__tests__/`
   - Default exclusions: `node_modules`, `.git`, `dist`, `build`, `.next`, `dist-electron`

4. **Filetype categorization**: Group results by file extension, then by language:
   ```
   TypeScript (.ts, .tsx): 12,340 lines across 89 files
   Python (.py): 5,670 lines across 34 files
   Markdown (.md): excluded
   ```

5. **DB caching**: Store scan results in a new table to avoid re-scanning:
   ```sql
   CREATE TABLE IF NOT EXISTS project_line_stats (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     project_id TEXT NOT NULL,
     file_path TEXT NOT NULL,
     file_type TEXT NOT NULL,
     total_lines INTEGER DEFAULT 0,
     blank_lines INTEGER DEFAULT 0,
     comment_lines INTEGER DEFAULT 0,
     code_lines INTEGER DEFAULT 0,
     scanned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
     FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
   );
   CREATE INDEX idx_line_stats_project ON project_line_stats(project_id);
   ```

6. **Performance**: For large projects (10k+ files), process in chunks to avoid blocking the main process. Use `setImmediate` or batch reads.

## Design Task — High-Fidelity Visual Specs

Design the frontend for the line counter feature as a new section/tab within the IDE Projects page:

### Summary Cards (top row)
Four metric cards in a grid:
| Card | Value | Subtitle | Icon | Color |
|------|-------|----------|------|-------|
| Total Files | `1,234` | "scanned files" | `FileCode` | cyan-400 |
| Code Lines | `45,678` | "actual code" | `Code` | emerald-400 |
| Comment Lines | `8,901` | "documentation" | `MessageSquare` | purple-400 |
| Blank Lines | `12,345` | "whitespace" | `Empty` | zinc-400 |

Card style: `rounded-xl bg-zinc-900/50 ring-1 ring-inset ring-zinc-800/70 p-4`

### File Type Breakdown Chart
- **Bar chart** (horizontal): Each bar = one file type, length = total lines
- Color per type: TypeScript = cyan-400, Python = emerald-400, JavaScript = amber-400, etc.
- Show file count in parentheses next to the type name
- Use recharts `BarChart` with custom tooltip showing code/comment/blank breakdown

### File Detail Table
Columns:
| Column | Type | Sortable | Description |
|--------|------|----------|-------------|
| File | string | Yes | Filename with extension icon |
| Type | string | Yes | Language/filetype badge |
| Total | number | Yes | Total lines |
| Code | number | Yes | Code lines (green badge) |
| Comments | number | Yes | Comment lines (purple badge) |
| Blank | number | Yes | Blank lines (zinc badge) |
| % Code | number | Yes | Code percentage (visual bar) |

Table features:
- Sortable by clicking column headers
- Filter dropdown for file type
- Search input for filename
- Row hover shows file path
- Alternating row colors: `bg-zinc-900/30` / `bg-zinc-900/60`

### Exclusion Controls
- Toggle switches for common exclusions:
  - "Exclude Markdown" (default: ON)
  - "Exclude JSON" (default: ON)
  - "Exclude Lock files" (default: ON)
  - "Exclude Minified" (default: ON)
- Custom exclude input: comma-separated extensions (e.g., `.md, .json, .lock`)
- "Scan" button triggers fresh scan
- "Last scanned: 2 minutes ago" timestamp

### Empty State
When no scan has been run:
```
[FileCode icon, 48px, zinc-600]
"No scan data yet"
"Click 'Scan Project' to analyze your codebase"
[Scan Project button]
```

## UX Task — Interaction Flow

1. User navigates to IDE Projects page → sees "Code Stats" tab or section
2. If no scan exists → shows empty state with scan button
3. User clicks "Scan Project" → loading spinner → results appear
4. Summary cards animate in (count-up animation)
5. Bar chart renders with staggered animation
6. Table populates with sortable columns
7. User can filter by file type → chart + table update
8. User can exclude file types → re-scan or filter existing results
9. Results are cached → next visit shows instant results
10. "Re-scan" button for manual refresh

## Constraints

- Must reuse existing `walkDir` pattern and `SKIP_DIRS` from `detect-project-language` handler
- Must follow existing IPC handler pattern in main.ts (try/catch, `{ success, data }` return shape)
- Must use existing design system: zinc-900 backgrounds, emerald/cyan/purple accents, Inter font
- Must work with existing project path resolution (`propProjectPath` or `selectedProject`)
- Must cache in DB (`project_line_stats` table) to avoid re-scanning
- Must handle 10k+ files without UI freeze
- Must exclude binary files (images, fonts, compiled JS) from line counting
- Default exclusions: `node_modules`, `.git`, `dist`, `build`, `.next`, `dist-electron`, `.md`, `.json`, `.lock`
