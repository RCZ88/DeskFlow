# Implementation Prompt: Line Counter & File Statistics Feature

## Overview
Add a "Code Stats" section to the IDE Projects page that scans a project's files, counts lines (code, comments, blank), categorizes by file type, and displays results in summary cards, a bar chart, and a sortable table. Results must be cached in SQLite to avoid re-scanning.

---

## Part 1: Database Schema

**File:** `main.ts` (in the existing DB initialization block, near `projects` table creation)

Add this table creation SQL near the existing `projects` table schema (around line 1962):

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
CREATE INDEX IF NOT EXISTS idx_line_stats_project ON project_line_stats(project_id);
CREATE INDEX IF NOT EXISTS idx_line_stats_type ON project_line_stats(project_id, file_type);
```

---

## Part 2: Backend -- IPC Handlers

### 2.1 Language-Aware Comment Detection Engine

**File:** `main.ts` (new helper functions, place near existing `walkDir` at line ~7981)

```typescript
// Comment style definitions by extension
const COMMENT_STYLES: Record<string, { single?: string; multiStart?: string; multiEnd?: string; docStart?: string; docEnd?: string }> = {
  '.ts':   { single: '//', multiStart: '/*', multiEnd: '*/' },
  '.tsx':  { single: '//', multiStart: '/*', multiEnd: '*/' },
  '.js':   { single: '//', multiStart: '/*', multiEnd: '*/' },
  '.jsx':  { single: '//', multiStart: '/*', multiEnd: '*/' },
  '.java': { single: '//', multiStart: '/*', multiEnd: '*/' },
  '.c':    { single: '//', multiStart: '/*', multiEnd: '*/' },
  '.cpp':  { single: '//', multiStart: '/*', multiEnd: '*/' },
  '.h':    { single: '//', multiStart: '/*', multiEnd: '*/' },
  '.cs':   { single: '//', multiStart: '/*', multiEnd: '*/' },
  '.go':   { single: '//', multiStart: '/*', multiEnd: '*/' },
  '.rs':   { single: '//', multiStart: '/*', multiEnd: '*/' },
  '.swift':{ single: '//', multiStart: '/*', multiEnd: '*/' },
  '.kt':   { single: '//', multiStart: '/*', multiEnd: '*/' },
  '.scala':{ single: '//', multiStart: '/*', multiEnd: '*/' },
  '.vue':  { single: '//', multiStart: '/*', multiEnd: '*/', docStart: '<!--', docEnd: '-->' },
  '.svelte':{ single: '//', multiStart: '/*', multiEnd: '*/' },
  '.py':   { single: '#', docStart: ', docEnd: ' },
  '.rb':   { single: '#' },
  '.sh':   { single: '#' },
  '.yaml': { single: '#' },
  '.yml':  { single: '#' },
  '.toml': { single: '#' },
  '.r':    { single: '#' },
  '.pl':   { single: '#' },
  '.css':  { multiStart: '/*', multiEnd: '*/' },
  '.scss': { single: '//', multiStart: '/*', multiEnd: '*/' },
  '.html': { docStart: '<!--', docEnd: '-->' },
  '.xml':  { docStart: '<!--', docEnd: '-->' },
  '.md':   { docStart: '<!--', docEnd: '-->' },
  '.lisp': { single: ';' },
  '.asm':  { single: ';' },
  '.json': {},
  '.lock': {},
  '.min.js': {},
};

// Binary / non-text extensions to skip entirely
const BINARY_EXTS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.svg', '.ico', '.webp',
  '.mp3', '.mp4', '.wav', '.ogg', '.mov', '.avi',
  '.zip', '.tar', '.gz', '.rar', '.7z',
  '.exe', '.dll', '.so', '.dylib', '.bin',
  '.pdf', '.doc', '.docx', '.xls', '.xlsx',
  '.ttf', '.otf', '.woff', '.woff2', '.eot',
  '.map', '.wasm', '.class', '.pyc', '.pyo',
]);

interface LineCountResult {
  filePath: string;
  fileType: string;
  totalLines: number;
  blankLines: number;
  commentLines: number;
  codeLines: number;
}

function countLinesInFile(filePath: string, ext: string): LineCountResult {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const style = COMMENT_STYLES[ext] || {};

  let totalLines = lines.length;
  let blankLines = 0;
  let commentLines = 0;
  let inMultiLineComment = false;
  let multiStart = style.multiStart || style.docStart;
  let multiEnd = style.multiEnd || style.docEnd;

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (line.length === 0) {
      blankLines++;
      continue;
    }

    if (inMultiLineComment) {
      commentLines++;
      if (multiEnd && line.includes(multiEnd)) {
        inMultiLineComment = false;
      }
      continue;
    }

    if (multiStart && line.includes(multiStart)) {
      commentLines++;
      if (!line.includes(multiEnd || '') || (multiStart === multiEnd && line.split(multiStart).length - 1 === 1)) {
        inMultiLineComment = true;
      }
      continue;
    }

    if (style.single && line.startsWith(style.single)) {
      commentLines++;
      continue;
    }
  }

  return {
    filePath,
    fileType: EXT_TO_LANG[ext] || ext,
    totalLines,
    blankLines,
    commentLines,
    codeLines: totalLines - blankLines - commentLines
  };
}
```

### 2.2 File Walker with Line Counting

```typescript
interface ScanOptions {
  excludePatterns?: string[];
  excludeExtensions?: string[];
  includeExtensions?: string[];
  maxFiles?: number;
}

function shouldExcludeFile(fileName: string, relativePath: string, options: ScanOptions): boolean {
  const ext = path.extname(fileName).toLowerCase();

  if (BINARY_EXTS.has(ext)) return true;
  if (options.excludeExtensions?.includes(ext)) return true;
  if (options.includeExtensions?.length && !options.includeExtensions.includes(ext)) return true;

  if (options.excludePatterns) {
    for (const pattern of options.excludePatterns) {
      const cleanPattern = pattern.replace(/^\*\./, '\.').replace(/\//g, '\\');
      const regex = new RegExp(cleanPattern.replace(/\./g, '\\.').replace(/\*/g, '.*'));
      if (regex.test(fileName) || regex.test(relativePath)) return true;
    }
  }

  return false;
}

async function scanProjectLines(
  projectPath: string, 
  projectId: string,
  options: ScanOptions = {}
): Promise<{ files: LineCountResult[]; summary: Record<string, { count: number; totalLines: number; codeLines: number; commentLines: number; blankLines: number }> }> {

  const maxFiles = options.maxFiles || 10000;
  let filesWalked = 0;
  const results: LineCountResult[] = [];
  const summary: Record<string, { count: number; totalLines: number; codeLines: number; commentLines: number; blankLines: number }> = {};

  function walkAndCount(dir: string, depth: number = 0): void {
    if (depth > 8 || filesWalked >= maxFiles) return;
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (filesWalked >= maxFiles) break;
        const fullPath = path.join(dir, entry.name);
        const relativePath = path.relative(projectPath, fullPath);

        if (entry.isDirectory()) {
          if (!SKIP_DIRS.has(entry.name)) {
            walkAndCount(fullPath, depth + 1);
          }
        } else {
          filesWalked++;
          const ext = path.extname(entry.name).toLowerCase();

          if (shouldExcludeFile(entry.name, relativePath, options)) continue;
          if (!EXT_TO_LANG[ext] && !options.includeExtensions?.includes(ext)) continue;

          try {
            const result = countLinesInFile(fullPath, ext);
            results.push(result);

            const lang = EXT_TO_LANG[ext] || ext;
            if (!summary[lang]) {
              summary[lang] = { count: 0, totalLines: 0, codeLines: 0, commentLines: 0, blankLines: 0 };
            }
            summary[lang].count++;
            summary[lang].totalLines += result.totalLines;
            summary[lang].codeLines += result.codeLines;
            summary[lang].commentLines += result.commentLines;
            summary[lang].blankLines += result.blankLines;
          } catch (e) {
            // Skip unreadable files
          }
        }
      }
    } catch {}
  }

  walkAndCount(projectPath);

  const db = getDatabase();
  const deleteStmt = db.prepare('DELETE FROM project_line_stats WHERE project_id = ?');
  deleteStmt.run(projectId);

  const insertStmt = db.prepare(`
    INSERT INTO project_line_stats 
    (project_id, file_path, file_type, total_lines, blank_lines, comment_lines, code_lines, scanned_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `);

  const insertMany = db.transaction((rows: LineCountResult[]) => {
    for (const row of rows) {
      insertStmt.run(projectId, row.filePath, row.fileType, row.totalLines, row.blankLines, row.commentLines, row.codeLines);
    }
  });

  insertMany(results);

  return { files: results, summary };
}
```

### 2.3 IPC Handlers

**File:** `main.ts` (add after existing `detect-projects-languages` handler, around line ~8150)

```typescript
ipcMain.handle('count-project-lines', async (_event, projectPath: string, projectId: string, options?: ScanOptions) => {
  try {
    if (!projectPath || !fs.existsSync(projectPath)) {
      return { success: false, error: 'Invalid project path' };
    }

    const defaultExcludes = ['.md', '.json', '.lock', '.min.js'];
    const mergedOptions: ScanOptions = {
      excludeExtensions: [...(options?.excludeExtensions || []), ...defaultExcludes],
      excludePatterns: options?.excludePatterns || [],
      maxFiles: options?.maxFiles || 10000
    };

    const result = await scanProjectLines(projectPath, projectId, mergedOptions);
    return { success: true, data: result };
  } catch (err: any) {
    console.error('[DeskFlow] count-project-lines error:', err.message);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('get-project-line-stats', async (_event, projectId: string) => {
  try {
    const db = getDatabase();
    const rows = db.prepare(`
      SELECT file_path, file_type, total_lines, blank_lines, comment_lines, code_lines, scanned_at
      FROM project_line_stats
      WHERE project_id = ?
      ORDER BY code_lines DESC
    `).all(projectId) as any[];

    if (rows.length === 0) {
      return { success: true, data: null };
    }

    const summary: Record<string, any> = {};
    for (const row of rows) {
      const lang = row.file_type;
      if (!summary[lang]) {
        summary[lang] = { count: 0, totalLines: 0, codeLines: 0, commentLines: 0, blankLines: 0 };
      }
      summary[lang].count++;
      summary[lang].totalLines += row.total_lines;
      summary[lang].codeLines += row.code_lines;
      summary[lang].commentLines += row.comment_lines;
      summary[lang].blankLines += row.blank_lines;
    }

    const scannedAt = rows[0]?.scanned_at;

    return { 
      success: true, 
      data: { 
        files: rows.map(r => ({
          filePath: r.file_path,
          fileType: r.file_type,
          totalLines: r.total_lines,
          blankLines: r.blank_lines,
          commentLines: r.comment_lines,
          codeLines: r.code_lines
        })),
        summary,
        scannedAt,
        totalFiles: rows.length
      } 
    };
  } catch (err: any) {
    console.error('[DeskFlow] get-project-line-stats error:', err.message);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('delete-project-line-stats', async (_event, projectId: string) => {
  try {
    const db = getDatabase();
    db.prepare('DELETE FROM project_line_stats WHERE project_id = ?').run(projectId);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});
```

### 2.4 Preload Bridge

**File:** `preload.ts` (add to the existing `contextBridge.exposeInMainWorld` API object)

```typescript
countProjectLines: (projectPath: string, projectId: string, options?: any) => 
  ipcRenderer.invoke('count-project-lines', projectPath, projectId, options),
getProjectLineStats: (projectId: string) => 
  ipcRenderer.invoke('get-project-line-stats', projectId),
deleteProjectLineStats: (projectId: string) => 
  ipcRenderer.invoke('delete-project-line-stats', projectId),
```

---

## Part 3: Frontend -- React Components

### 3.1 Types

**File:** `src/types/line-stats.ts` (new file)

```typescript
export interface LineCountResult {
  filePath: string;
  fileType: string;
  totalLines: number;
  blankLines: number;
  commentLines: number;
  codeLines: number;
}

export interface FileTypeSummary {
  count: number;
  totalLines: number;
  codeLines: number;
  commentLines: number;
  blankLines: number;
}

export interface LineStatsData {
  files: LineCountResult[];
  summary: Record<string, FileTypeSummary>;
  scannedAt: string;
  totalFiles: number;
}

export interface ScanOptions {
  excludePatterns?: string[];
  excludeExtensions?: string[];
  includeExtensions?: string[];
  maxFiles?: number;
}
```

### 3.2 Summary Cards Component

**File:** `src/components/line-stats/LineStatsCards.tsx`

```tsx
import { useEffect, useState, useRef } from 'react';
import { FileCode, Code, MessageSquare, Minus } from 'lucide-react';
import { motion } from 'framer-motion';

interface Props {
  totalFiles: number;
  totalLines: number;
  codeLines: number;
  commentLines: number;
  blankLines: number;
}

function AnimatedNumber({ value, duration = 1500 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(0);
  const startTime = useRef<number | null>(null);
  const startValue = useRef(0);

  useEffect(() => {
    startTime.current = null;
    startValue.current = display;

    const animate = (timestamp: number) => {
      if (!startTime.current) startTime.current = timestamp;
      const progress = Math.min((timestamp - startTime.current) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.floor(startValue.current + (value - startValue.current) * eased));
      if (progress < 1) requestAnimationFrame(animate);
    };

    requestAnimationFrame(animate);
  }, [value, duration]);

  return <span>{display.toLocaleString()}</span>;
}

const cards = [
  { key: 'files', label: 'Total Files', sub: 'scanned files', icon: FileCode, color: 'text-cyan-400', bg: 'bg-cyan-400/10', ring: 'ring-cyan-400/20' },
  { key: 'code', label: 'Code Lines', sub: 'actual code', icon: Code, color: 'text-emerald-400', bg: 'bg-emerald-400/10', ring: 'ring-emerald-400/20' },
  { key: 'comments', label: 'Comment Lines', sub: 'documentation', icon: MessageSquare, color: 'text-purple-400', bg: 'bg-purple-400/10', ring: 'ring-purple-400/20' },
  { key: 'blank', label: 'Blank Lines', sub: 'whitespace', icon: Minus, color: 'text-zinc-400', bg: 'bg-zinc-400/10', ring: 'ring-zinc-400/20' },
];

export default function LineStatsCards({ totalFiles, totalLines, codeLines, commentLines, blankLines }: Props) {
  const values = { files: totalFiles, code: codeLines, comments: commentLines, blank: blankLines };

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
      {cards.map((card, i) => (
        <motion.div
          key={card.key}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1, duration: 0.4 }}
          className={`rounded-xl bg-zinc-900/50 ring-1 ring-inset ${card.ring} p-4 backdrop-blur-sm`}
        >
          <div className="flex items-center gap-3 mb-2">
            <div className={`p-2 rounded-lg ${card.bg}`}>
              <card.icon className={`w-4 h-4 ${card.color}`} />
            </div>
            <span className="text-xs font-medium text-zinc-400">{card.label}</span>
          </div>
          <div className={`text-2xl font-bold ${card.color} tabular-nums`}>
            <AnimatedNumber value={values[card.key as keyof typeof values]} />
          </div>
          <div className="text-xs text-zinc-500 mt-1">{card.sub}</div>
        </motion.div>
      ))}
    </div>
  );
}
```

### 3.3 File Type Bar Chart

**File:** `src/components/line-stats/FileTypeChart.tsx`

```tsx
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { motion } from 'framer-motion';

interface ChartData {
  name: string;
  code: number;
  comments: number;
  blank: number;
  count: number;
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const data = payload[0].payload;
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 shadow-xl">
      <div className="text-sm font-semibold text-zinc-100 mb-2">{label} ({data.count} files)</div>
      {payload.map((entry: any) => (
        <div key={entry.name} className="flex items-center gap-2 text-xs">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-zinc-400 capitalize">{entry.name}:</span>
          <span className="text-zinc-200 font-mono">{entry.value.toLocaleString()}</span>
        </div>
      ))}
      <div className="mt-1 pt-1 border-t border-zinc-800 text-xs text-zinc-500">
        Total: {data.code + data.comments + data.blank}
      </div>
    </div>
  );
}

interface Props {
  summary: Record<string, { count: number; codeLines: number; commentLines: number; blankLines: number }>;
}

export default function FileTypeChart({ summary }: Props) {
  const data: ChartData[] = Object.entries(summary)
    .map(([name, stats]) => ({
      name,
      code: stats.codeLines,
      comments: stats.commentLines,
      blank: stats.blankLines,
      count: stats.count,
    }))
    .sort((a, b) => (b.code + b.comments + b.blank) - (a.code + a.comments + a.blank))
    .slice(0, 12);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.3, duration: 0.5 }}
      className="rounded-xl bg-zinc-900/50 ring-1 ring-inset ring-zinc-800/70 p-4 mb-6"
    >
      <h3 className="text-sm font-semibold text-zinc-300 mb-4">Lines by File Type</h3>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} layout="vertical" margin={{ left: 20, right: 20, top: 5, bottom: 5 }}>
          <XAxis type="number" hide />
          <YAxis 
            dataKey="name" 
            type="category" 
            width={100}
            tick={{ fill: '#a1a1aa', fontSize: 12 }}
            axisLine={{ stroke: '#3f3f46' }}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
          <Bar dataKey="code" stackId="a" fill="#34d399" radius={[0, 4, 4, 0]} name="code" />
          <Bar dataKey="comments" stackId="a" fill="#a855f7" radius={[0, 0, 0, 0]} name="comments" />
          <Bar dataKey="blank" stackId="a" fill="#71717a" radius={[4, 0, 0, 4]} name="blank" />
        </BarChart>
      </ResponsiveContainer>
    </motion.div>
  );
}
```

### 3.4 File Detail Table

**File:** `src/components/line-stats/FileDetailTable.tsx`

```tsx
import { useState, useMemo } from 'react';
import { ArrowUpDown, Search, FileText } from 'lucide-react';
import { motion } from 'framer-motion';
import { LineCountResult } from '../../types/line-stats';

type SortKey = 'filePath' | 'fileType' | 'totalLines' | 'codeLines' | 'commentLines' | 'blankLines' | 'codePercent';
type SortDir = 'asc' | 'desc';

interface Props {
  files: LineCountResult[];
}

export default function FileDetailTable({ files }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('codeLines');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const fileTypes = useMemo(() => {
    const types = new Set(files.map(f => f.fileType));
    return ['all', ...Array.from(types).sort()];
  }, [files]);

  const sortedFiles = useMemo(() => {
    let filtered = files.filter(f => {
      if (filterType !== 'all' && f.fileType !== filterType) return false;
      if (searchQuery && !f.filePath.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });

    return filtered.sort((a, b) => {
      let aVal: number | string = a[sortKey === 'codePercent' ? 'codeLines' : sortKey];
      let bVal: number | string = b[sortKey === 'codePercent' ? 'codeLines' : sortKey];

      if (sortKey === 'codePercent') {
        aVal = (a.codeLines / a.totalLines) * 100;
        bVal = (b.codeLines / b.totalLines) * 100;
      }

      if (typeof aVal === 'string') {
        return sortDir === 'asc' ? aVal.localeCompare(bVal as string) : (bVal as string).localeCompare(aVal);
      }
      return sortDir === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
    });
  }, [files, sortKey, sortDir, filterType, searchQuery]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const SortIcon = ({ col }: { col: SortKey }) => (
    <ArrowUpDown className={`w-3 h-3 ml-1 transition-colors ${sortKey === col ? 'text-cyan-400' : 'text-zinc-600'}`} />
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.5, duration: 0.5 }}
      className="rounded-xl bg-zinc-900/50 ring-1 ring-inset ring-zinc-800/70 overflow-hidden"
    >
      <div className="p-4 border-b border-zinc-800/70 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Search files..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-950/50 border border-zinc-800 rounded-lg pl-9 pr-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-cyan-400/50"
          />
        </div>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="bg-zinc-950/50 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-300 focus:outline-none focus:ring-1 focus:ring-cyan-400/50"
        >
          {fileTypes.map(t => (
            <option key={t} value={t}>{t === 'all' ? 'All Types' : t}</option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800/70 text-zinc-500 text-xs uppercase tracking-wider">
              <th className="text-left px-4 py-3 font-medium cursor-pointer hover:text-zinc-300" onClick={() => handleSort('filePath')}>
                <span className="flex items-center">File <SortIcon col="filePath" /></span>
              </th>
              <th className="text-left px-4 py-3 font-medium cursor-pointer hover:text-zinc-300" onClick={() => handleSort('fileType')}>
                <span className="flex items-center">Type <SortIcon col="fileType" /></span>
              </th>
              <th className="text-right px-4 py-3 font-medium cursor-pointer hover:text-zinc-300" onClick={() => handleSort('totalLines')}>
                <span className="flex items-center justify-end">Total <SortIcon col="totalLines" /></span>
              </th>
              <th className="text-right px-4 py-3 font-medium cursor-pointer hover:text-zinc-300" onClick={() => handleSort('codeLines')}>
                <span className="flex items-center justify-end">Code <SortIcon col="codeLines" /></span>
              </th>
              <th className="text-right px-4 py-3 font-medium cursor-pointer hover:text-zinc-300" onClick={() => handleSort('commentLines')}>
                <span className="flex items-center justify-end">Comments <SortIcon col="commentLines" /></span>
              </th>
              <th className="text-right px-4 py-3 font-medium cursor-pointer hover:text-zinc-300" onClick={() => handleSort('blankLines')}>
                <span className="flex items-center justify-end">Blank <SortIcon col="blankLines" /></span>
              </th>
              <th className="text-right px-4 py-3 font-medium cursor-pointer hover:text-zinc-300" onClick={() => handleSort('codePercent')}>
                <span className="flex items-center justify-end">% Code <SortIcon col="codePercent" /></span>
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedFiles.map((file, i) => {
              const codePercent = file.totalLines > 0 ? (file.codeLines / file.totalLines) * 100 : 0;
              const fileName = file.filePath.split('/').pop() || file.filePath;
              return (
                <tr
                  key={file.filePath}
                  className={`group border-b border-zinc-800/30 hover:bg-zinc-800/40 transition-colors ${i % 2 === 0 ? 'bg-zinc-900/30' : 'bg-zinc-900/60'}`}
                  title={file.filePath}
                >
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <FileText className="w-3.5 h-3.5 text-zinc-500 group-hover:text-cyan-400 transition-colors" />
                      <span className="text-zinc-300 font-medium truncate max-w-[200px]" title={file.filePath}>{fileName}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-zinc-800 text-zinc-400">
                      {file.fileType}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right text-zinc-300 tabular-nums">{file.totalLines.toLocaleString()}</td>
                  <td className="px-4 py-2.5 text-right">
                    <span className="text-emerald-400 tabular-nums">{file.codeLines.toLocaleString()}</span>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <span className="text-purple-400 tabular-nums">{file.commentLines.toLocaleString()}</span>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <span className="text-zinc-500 tabular-nums">{file.blankLines.toLocaleString()}</span>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-16 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-emerald-400 rounded-full transition-all"
                          style={{ width: `${codePercent}%` }}
                        />
                      </div>
                      <span className="text-zinc-400 text-xs tabular-nums w-8">{codePercent.toFixed(0)}%</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {sortedFiles.length === 0 && (
        <div className="p-8 text-center text-zinc-500 text-sm">No files match your filters</div>
      )}

      <div className="px-4 py-2 border-t border-zinc-800/70 text-xs text-zinc-600">
        Showing {sortedFiles.length} of {files.length} files
      </div>
    </motion.div>
  );
}
```

### 3.5 Exclusion Controls & Scan Button

**File:** `src/components/line-stats/ScanControls.tsx`

```tsx
import { useState } from 'react';
import { RefreshCw, Settings, ScanLine } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  onScan: (options: { excludeExtensions: string[]; excludePatterns: string[] }) => void;
  isScanning: boolean;
  lastScanned: string | null;
  hasData: boolean;
}

const DEFAULT_EXCLUDES = [
  { key: 'md', label: 'Exclude Markdown', ext: '.md', default: true },
  { key: 'json', label: 'Exclude JSON', ext: '.json', default: true },
  { key: 'lock', label: 'Exclude Lock files', ext: '.lock', default: true },
  { key: 'min', label: 'Exclude Minified', ext: '.min.js', default: true },
];

export default function ScanControls({ onScan, isScanning, lastScanned, hasData }: Props) {
  const [showSettings, setShowSettings] = useState(false);
  const [excludes, setExcludes] = useState<Record<string, boolean>>(
    Object.fromEntries(DEFAULT_EXCLUDES.map(e => [e.key, e.default]))
  );
  const [customExts, setCustomExts] = useState('');
  const [customPatterns, setCustomPatterns] = useState('');

  const handleScan = () => {
    const excludeExtensions: string[] = [];
    for (const item of DEFAULT_EXCLUDES) {
      if (excludes[item.key]) excludeExtensions.push(item.ext);
    }
    if (customExts.trim()) {
      customExts.split(',').map(e => e.trim()).filter(Boolean).forEach(e => {
        if (!e.startsWith('.')) e = '.' + e;
        excludeExtensions.push(e);
      });
    }

    const excludePatterns = customPatterns.split(',').map(p => p.trim()).filter(Boolean);
    onScan({ excludeExtensions, excludePatterns });
  };

  const formatLastScanned = () => {
    if (!lastScanned) return 'Never scanned';
    const date = new Date(lastScanned);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <button
            onClick={handleScan}
            disabled={isScanning}
            className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            {isScanning ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ScanLine className="w-4 h-4" />}
            {isScanning ? 'Scanning...' : hasData ? 'Re-scan Project' : 'Scan Project'}
          </button>
          <span className="text-xs text-zinc-500">Last scanned: {formatLastScanned()}</span>
        </div>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className={`p-2 rounded-lg transition-colors ${showSettings ? 'bg-zinc-800 text-zinc-200' : 'text-zinc-500 hover:text-zinc-300'}`}
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>

      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="rounded-xl bg-zinc-900/50 ring-1 ring-inset ring-zinc-800/70 p-4 space-y-4">
              <div>
                <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-2 block">Default Exclusions</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {DEFAULT_EXCLUDES.map(item => (
                    <label key={item.key} className="flex items-center gap-2 cursor-pointer group">
                      <div className={`relative w-8 h-4 rounded-full transition-colors ${excludes[item.key] ? 'bg-cyan-500/30' : 'bg-zinc-700'}`}>
                        <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-cyan-400 transition-all ${excludes[item.key] ? 'left-4.5' : 'left-0.5'}`} />
                      </div>
                      <input
                        type="checkbox"
                        checked={excludes[item.key]}
                        onChange={(e) => setExcludes(prev => ({ ...prev, [item.key]: e.target.checked }))}
                        className="sr-only"
                      />
                      <span className="text-xs text-zinc-400 group-hover:text-zinc-300">{item.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-zinc-400 mb-1 block">Custom Extensions (comma-separated)</label>
                  <input
                    type="text"
                    value={customExts}
                    onChange={(e) => setCustomExts(e.target.value)}
                    placeholder=".log, .tmp, .env"
                    className="w-full bg-zinc-950/50 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-300 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-cyan-400/50"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-zinc-400 mb-1 block">Custom Patterns (comma-separated)</label>
                  <input
                    type="text"
                    value={customPatterns}
                    onChange={(e) => setCustomPatterns(e.target.value)}
                    placeholder="*.test.ts, __tests__/"
                    className="w-full bg-zinc-950/50 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-300 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-cyan-400/50"
                  />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
```

### 3.6 Empty State

**File:** `src/components/line-stats/EmptyLineStats.tsx`

```tsx
import { FileCode, ScanLine } from 'lucide-react';
import { motion } from 'framer-motion';

interface Props {
  onScan: () => void;
}

export default function EmptyLineStats({ onScan }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-16 px-4 rounded-xl bg-zinc-900/50 ring-1 ring-inset ring-zinc-800/70"
    >
      <div className="p-4 rounded-2xl bg-zinc-800/50 mb-4">
        <FileCode className="w-12 h-12 text-zinc-600" />
      </div>
      <h3 className="text-lg font-semibold text-zinc-300 mb-1">No scan data yet</h3>
      <p className="text-sm text-zinc-500 mb-6 text-center max-w-sm">
        Analyze your codebase to see file counts, line breakdowns, and language distribution.
      </p>
      <button
        onClick={onScan}
        className="inline-flex items-center gap-2 px-5 py-2.5 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded-lg text-sm font-medium transition-colors"
      >
        <ScanLine className="w-4 h-4" />
        Scan Project
      </button>
    </motion.div>
  );
}
```

### 3.7 Main Container

**File:** `src/components/line-stats/ProjectLineStats.tsx`

```tsx
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import LineStatsCards from './LineStatsCards';
import FileTypeChart from './FileTypeChart';
import FileDetailTable from './FileDetailTable';
import ScanControls from './ScanControls';
import EmptyLineStats from './EmptyLineStats';
import { LineStatsData, ScanOptions } from '../../types/line-stats';

interface Props {
  projectId: string;
  projectPath: string;
}

export default function ProjectLineStats({ projectId, projectPath }: Props) {
  const [data, setData] = useState<LineStatsData | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCached = useCallback(async () => {
    try {
      const result = await window.electron.getProjectLineStats(projectId);
      if (result.success && result.data) {
        setData(result.data);
      }
    } catch (e) {
      console.error('Failed to load cached stats:', e);
    }
  }, [projectId]);

  useEffect(() => {
    loadCached();
  }, [loadCached]);

  const handleScan = async (options: ScanOptions) => {
    setIsScanning(true);
    setError(null);
    try {
      const result = await window.electron.countProjectLines(projectPath, projectId, options);
      if (result.success) {
        setData({
          files: result.data.files,
          summary: result.data.summary,
          scannedAt: new Date().toISOString(),
          totalFiles: result.data.files.length
        });
      } else {
        setError(result.error || 'Scan failed');
      }
    } catch (e: any) {
      setError(e.message || 'Scan failed');
    } finally {
      setIsScanning(false);
    }
  };

  const totals = data ? data.files.reduce((acc, f) => ({
    totalLines: acc.totalLines + f.totalLines,
    codeLines: acc.codeLines + f.codeLines,
    commentLines: acc.commentLines + f.commentLines,
    blankLines: acc.blankLines + f.blankLines,
  }), { totalLines: 0, codeLines: 0, commentLines: 0, blankLines: 0 }) : null;

  return (
    <div className="space-y-4">
      <ScanControls
        onScan={handleScan}
        isScanning={isScanning}
        lastScanned={data?.scannedAt || null}
        hasData={!!data}
      />

      {error && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/30 p-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <AnimatePresence mode="wait">
        {!data ? (
          <EmptyLineStats key="empty" onScan={() => handleScan({ excludeExtensions: ['.md', '.json', '.lock', '.min.js'] })} />
        ) : (
          <motion.div
            key="results"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            {totals && (
              <LineStatsCards
                totalFiles={data.totalFiles}
                totalLines={totals.totalLines}
                codeLines={totals.codeLines}
                commentLines={totals.commentLines}
                blankLines={totals.blankLines}
              />
            )}
            <FileTypeChart summary={data.summary} />
            <FileDetailTable files={data.files} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
```

### 3.8 Integration into IDEProjectsPage

**File:** `src/pages/IDEProjectsPage.tsx`

Add import:
```typescript
import ProjectLineStats from '../components/line-stats/ProjectLineStats';
```

Add a new tab:
```typescript
const tabs = ['overview', 'files', 'commits', 'ai', 'code-stats'];
```

In the tab content area:
```tsx
{activeTab === 'code-stats' && selectedProject && (
  <ProjectLineStats 
    projectId={selectedProject.id} 
    projectPath={selectedProject.path} 
  />
)}
```

Tab button:
```tsx
<button
  onClick={() => setActiveTab('code-stats')}
  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
    activeTab === 'code-stats' 
      ? 'bg-cyan-500/10 text-cyan-400 ring-1 ring-cyan-500/30' 
      : 'text-zinc-500 hover:text-zinc-300'
  }`}
>
  Code Stats
</button>
```

---

## Part 4: Window API Type Declaration

**File:** `src/types/electron.d.ts`

Add to the `ElectronAPI` interface:

```typescript
countProjectLines: (projectPath: string, projectId: string, options?: any) => Promise<{ success: boolean; data?: any; error?: string }>;
getProjectLineStats: (projectId: string) => Promise<{ success: boolean; data?: any; error?: string }>;
deleteProjectLineStats: (projectId: string) => Promise<{ success: boolean; error?: string }>;
```

---

## Part 5: Performance & Edge Cases

1. **Chunked processing**: Add `setImmediate` yielding after every 500 files for large projects.
2. **Binary file detection**: The `BINARY_EXTS` set skips known binary extensions.
3. **Comment detection**: Handles single-line, multi-line, and docstring comments. Does not handle comments inside string literals (acceptable for v1).
4. **Memory safety**: Results stored in DB. For 10000 files, memory usage is ~1-2MB.
5. **Path security**: Scan scoped to projectPath only.

---

## Part 6: Testing Checklist

- [ ] Scan TypeScript project => verify comments counted correctly
- [ ] Scan Python project => verify docstrings counted
- [ ] Exclude .md => no markdown files in results
- [ ] Exclude *.test.ts => test files excluded
- [ ] Re-scan => old DB rows deleted, new rows inserted
- [ ] Load page with cached data => instant display
- [ ] Sort table by Code column => sorts correctly
- [ ] Filter by TypeScript => only TS files shown
- [ ] Search main => only matching files shown
- [ ] 10000+ file project => completes without UI freeze

---

## Summary of Files to Create/Modify

| File | Action | Est. Lines |
|------|--------|------------|
| `main.ts` | Add DB schema, comment engine, scan functions, 3 IPC handlers | ~200 |
| `preload.ts` | Add 3 bridge methods | ~3 |
| `src/types/line-stats.ts` | New types file | ~25 |
| `src/types/electron.d.ts` | Add API types | ~3 |
| `src/components/line-stats/LineStatsCards.tsx` | New | ~70 |
| `src/components/line-stats/FileTypeChart.tsx` | New | ~80 |
| `src/components/line-stats/FileDetailTable.tsx` | New | ~140 |
| `src/components/line-stats/ScanControls.tsx` | New | ~120 |
| `src/components/line-stats/EmptyLineStats.tsx` | New | ~30 |
| `src/components/line-stats/ProjectLineStats.tsx` | New | ~80 |
| `src/pages/IDEProjectsPage.tsx` | Add tab + component | ~10 |
