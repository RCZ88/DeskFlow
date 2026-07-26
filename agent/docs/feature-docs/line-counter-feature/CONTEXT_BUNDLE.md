# Context Bundle — Line Counter & File Statistics Feature

## User's Raw Request

> "i wnat a new feature for the line counter and like file counter as part of the statistics of a projcet. but weed to design an efficient system that is good and efficient at ocuting the number of files and especially their lines. i need you to generate prompt for this new feature. also like thecharts on how ur going to compare the files, or like jut displaying it on a table of files nad liek the empty space the comment, and like the actual code lines, and subtotal lienso f a file. it should exclude markdowns ((at least have the ability to exclude certain stuff. and it should categorize per filetype for example or something like that"

## Project Context

DeskFlow is an Electron + React + better-sqlite3 desktop productivity tracker. It tracks app usage, has a terminal workspace with AI agents, and manages projects. The project system stores file paths in SQLite (`projects.path` column).

## Existing Infrastructure

### 1. walkDir — File System Walker (main.ts:7981-8050)

Already exists for language detection. Reusable for line counting:

```typescript
// main.ts:7981
ipcMain.handle('detect-project-language', async (_, projectPath: string) => {
    const SKIP_DIRS = new Set(['node_modules', '.git', '.svn', 'dist', 'build',
        '.next', '.nuxt', 'out', 'target', 'bin', 'obj', 'venv', '.venv',
        '__pycache__', '.tox', '.mypy_cache', '.pytest_cache', 'coverage',
        '.idea', '.vscode', 'tmp', 'temp', '.cache', 'dist-electron']);
    
    const EXT_TO_LANG: Record<string, string> = {
        '.ts': 'TypeScript', '.tsx': 'TypeScript', '.js': 'JavaScript',
        '.jsx': 'JavaScript', '.py': 'Python', '.rs': 'Rust', '.go': 'Go',
        '.java': 'Java', '.c': 'C', '.cpp': 'C++', '.h': 'C/C++',
        '.cs': 'C#', '.rb': 'Ruby', '.php': 'PHP', '.swift': 'Swift',
        '.kt': 'Kotlin', '.scala': 'Scala', '.r': 'R', '.m': 'Objective-C',
        '.vue': 'Vue', '.svelte': 'Svelte', '.html': 'HTML', '.css': 'CSS',
        '.scss': 'SCSS', '.less': 'LESS', '.json': 'JSON', '.yaml': 'YAML',
        '.yml': 'YAML', '.toml': 'TOML', '.xml': 'XML', '.sql': 'SQL',
        '.sh': 'Shell', '.bash': 'Shell', '.zsh': 'Shell',
        '.md': 'Markdown', '.txt': 'Text', '.dockerfile': 'Dockerfile',
    };
    
    const maxFiles = 10000;
    let filesWalked = 0;
    
    function walkDir(dir: string, depth: number = 0): void {
        if (depth > 8 || filesWalked >= maxFiles) return;
        try {
            const entries = fs.readdirSync(dir, { withFileTypes: true });
            for (const entry of entries) {
                if (filesWalked >= maxFiles) break;
                if (entry.isDirectory()) {
                    if (!SKIP_DIRS.has(entry.name)) {
                        walkDir(path.join(dir, entry.name), depth + 1);
                    }
                } else {
                    filesWalked++;
                    const ext = path.extname(entry.name).toLowerCase();
                    const lang = EXT_TO_LANG[ext];
                    if (lang) { languageCounts[lang] = (languageCounts[lang] || 0) + 1; }
                }
            }
        } catch {}
    }
    
    walkDir(projectPath);
    // Returns: { success, language, fileCount, totalFiles }
});
```

### 2. Batch Language Detection (main.ts:8055-8149)

```typescript
ipcMain.handle('detect-projects-languages', async (_, projectPaths: string[]) => {
    // Walks each project, returns per-project language breakdown
    // Returns: { [projectPath]: { success, languages[], allLanguages[], totalFiles, codingFiles } }
});
```

### 3. Project Table Schema (main.ts:1962-1973)

```sql
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  path TEXT NOT NULL UNIQUE,
  repository_url TEXT,
  vcs_type TEXT,
  primary_language TEXT,
  default_ide TEXT,
  added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_activity_at DATETIME,
  deleted_at DATETIME
)
```

### 4. Preload Bridges for File Operations

```typescript
// preload.ts
detectProjectLanguage: (projectPath) => ipcRenderer.invoke('detect-project-language', projectPath),
detectProjectsLanguages: (projectPaths) => ipcRenderer.invoke('detect-projects-languages', projectPaths),
readProjectFile: (relativePath, projectPath?) => ipcRenderer.invoke('read-project-file', relativePath, projectPath),
listDirectory: (projectPath, relativePath) => ipcRenderer.invoke('list-directory', { projectPath, relativePath }),
listProjectFiles: (subDir?, projectPath?) => ipcRenderer.invoke('list-project-files', subDir, projectPath),
```

### 5. Existing IPC Pattern (main.ts)

All IPC handlers follow this pattern:
```typescript
electron_1.ipcMain.handle('channel-name', async (_event, ...args) => {
    try {
        // Validation
        if (!isPathWithin(basePath, targetPath)) return { success: false, error: 'Path traversal' };
        // Logic
        const result = ...;
        return { success: true, data: result };
    } catch (err: any) {
        console.error('[DeskFlow] handler error:', err.message);
        return { success: false, error: err.message };
    }
});
```

### 6. IDEProjectsPage.tsx — Current Project Stats Display

The IDE page has an overview section with metric cards:
```tsx
// IDEProjectsPage.tsx:1610-1614
const overview = {
    ides: detectedIDEs,
    tools: detectedTools,
    aiUsage: { totalTokens, totalCost },
    commits: { totalCommits, totalAdditions, totalDeletions },
};
// Displays: Environment card, AI Usage card, Commits card, Last Backup card
```

### 7. Design System

- Colors: zinc-900/950 backgrounds, emerald-400/cyan-400/purple-400 accents
- Typography: Inter font, `text-sm`/`text-xs` sizes, `font-medium`/`font-semibold` weights
- Cards: `rounded-xl bg-zinc-900/50 ring-1 ring-inset ring-zinc-800/70 p-3`
- Charts: Uses recharts (already installed) or CSS-based bar charts
- Component patterns: `GlassCard`, toggle switches, slider rows

### 8. Dependencies Already Installed

- `recharts` — charting library (already in package.json)
- `lucide-react` — icons
- `tailwindcss` — styling
- `framer-motion` — animations

## What Needs to Be Built

### Backend (main.ts + preload.ts)

1. **New IPC handler: `count-project-lines`**
   - Input: `projectPath: string`, `options: { excludePatterns: string[], includeExtensions?: string[] }`
   - Walk the project tree (reuse walkDir pattern + SKIP_DIRS)
   - For each file, count:
     - Total lines
     - Blank lines (empty or whitespace-only)
     - Comment lines (language-aware: `//`, `#`, `/* */`, `<!-- -->`, etc.)
     - Code lines (total - blank - comment)
   - Categorize by file extension
   - Return: per-file breakdown + summary by filetype

2. **New IPC handler: `get-project-line-stats`**
   - Cached version that stores results in a new DB table
   - Input: `projectId: string`
   - Returns cached stats or triggers fresh scan

3. **New DB table: `project_line_stats`**
   - `project_id`, `file_path`, `file_type`, `total_lines`, `blank_lines`, `comment_lines`, `code_lines`, `scanned_at`

4. **Language-aware comment detection**
   - Support for: `//`, `#`, `/* */`, `<!-- -->`, `""" """`, `''' '''`, `;`
   - Map file extensions to comment styles

### Frontend (new component or section in IDEProjectsPage)

1. **Line counter summary cards**
   - Total files scanned
   - Total lines (code + comments + blank)
   - Code lines only
   - Comment lines only

2. **File type breakdown chart**
   - Bar chart: lines per filetype (TypeScript, Python, etc.)
   - Or pie chart: code vs comments vs blank

3. **File table**
   - Columns: filename, filetype, blank lines, comment lines, code lines, total lines
   - Sortable by any column
   - Filterable by filetype
   - Searchable by filename

4. **Exclude/include controls**
   - Toggle to exclude markdown files
   - Toggle to exclude other file types
   - Custom exclude patterns (glob-like)

5. **Scan trigger button**
   - "Scan Project" button that triggers the count
   - Loading state during scan
   - Last scanned timestamp

## Constraints

- Must reuse existing `walkDir` pattern and `SKIP_DIRS` set
- Must follow existing IPC handler pattern in main.ts
- Must use existing design system (zinc/emerald/cyan palette)
- Must work with existing project path resolution (`propProjectPath` or `selectedProject`)
- Should cache results in DB to avoid re-scanning on every page load
- Should handle large projects (10k+ files) without freezing UI (use web worker or chunked processing)
