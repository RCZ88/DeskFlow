# Vocabulary Resolver — Prompt

## Raw Request

> "based on the things that the user say it can be multiple words for the same meaning of like pointing towards the same thing"

## Problem

Users say the same thing different ways. "workspace" = "terminal" = "ws" = "that terminal area". The AI agent doesn't know they're synonyms. There's a `user_dictionary` table (term → definition) but no variant mapping. Need a system that auto-learns from corrections.

## Existing DB Schema

```sql
CREATE TABLE IF NOT EXISTS user_dictionary (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  term TEXT NOT NULL UNIQUE,
  definition TEXT NOT NULL,
  context TEXT DEFAULT '',
  aliases TEXT DEFAULT '[]',
  created_at DATETIME DEFAULT (datetime('now')),
  updated_at DATETIME DEFAULT (datetime('now'))
);
```

## Existing IPC Handlers (main.ts)

```typescript
electron_1.ipcMain.handle('user-dictionary:list', async () => {
    const rows = db.prepare('SELECT * FROM user_dictionary ORDER BY term ASC').all();
    return { ok: true, entries: rows };
});

electron_1.ipcMain.handle('user-dictionary:add', async (_event, data: { term: string; definition: string; context?: string; aliases?: string[] }) => {
    const { term, definition, context = '', aliases = [] } = data;
    db.prepare(`INSERT INTO user_dictionary (term, definition, context, aliases) VALUES (?, ?, ?, ?)
      ON CONFLICT(term) DO UPDATE SET definition = excluded.definition, context = excluded.context, aliases = excluded.aliases, updated_at = datetime('now')`)
      .run(term.trim(), definition.trim(), context, JSON.stringify(aliases));
    return { ok: true };
});
```

## Existing Preload Bridge (preload.ts)

```typescript
userDictionary: {
    list: () => ipcRenderer.invoke('user-dictionary:list'),
    add: (data: { term: string; definition: string; context?: string; aliases?: string[] }) => ipcRenderer.invoke('user-dictionary:add', data),
    update: (data: { id: number; term?: string; definition?: string; context?: string; aliases?: string[] }) => ipcRenderer.invoke('user-dictionary:update', data),
    delete: (id: number) => ipcRenderer.invoke('user-dictionary:delete', id),
},
```

## Existing assemble-context Injection (main.ts)

```typescript
// User Dictionary Injection
const dictEntries = db.prepare('SELECT term, definition, context, aliases FROM user_dictionary ORDER BY term ASC').all();
if (dictEntries.length > 0) {
    const lines = ['## User Dictionary\n'];
    for (const entry of dictEntries) {
        let line = `- **${entry.term}**: ${entry.definition}`;
        if (entry.context) line += ` (context: ${entry.context})`;
        lines.push(line);
    }
    parts.push(lines.join('\n'));
}
```

## Engineering Task

Build a **Vocabulary Resolver** extending user_dictionary with variant-to-canonical mapping.

### New DB Table

```sql
CREATE TABLE IF NOT EXISTS vocabulary_map (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  canonical_term TEXT NOT NULL,
  variant TEXT NOT NULL,
  confidence REAL DEFAULT 1.0,
  source TEXT DEFAULT 'manual',
  created_at DATETIME DEFAULT (datetime('now')),
  UNIQUE(canonical_term, variant)
);
```

### New IPC Handlers

```typescript
// Resolve variant → canonical
ipcMain.handle('vocab:resolve', async (_event, term: string) => {
    const clean = term.trim().toLowerCase();
    const row = db.prepare('SELECT canonical_term FROM vocabulary_map WHERE LOWER(variant) = ?').get(clean);
    if (row) return { ok: true, canonical: row.canonical_term, confidence: 1.0 };
    const fuzzy = db.prepare('SELECT canonical_term, confidence FROM vocabulary_map WHERE LOWER(variant) LIKE ? LIMIT 1').get(`%${clean}%`);
    if (fuzzy) return { ok: true, canonical: fuzzy.canonical_term, confidence: fuzzy.confidence };
    return { ok: false, canonical: term, confidence: 0 };
});

// List all mappings
ipcMain.handle('vocab:list', async () => {
    const rows = db.prepare('SELECT * FROM vocabulary_map ORDER BY canonical_term, variant').all();
    return { ok: true, mappings: rows };
});

// Add mapping
ipcMain.handle('vocab:add', async (_event, data: { canonical: string; variant: string; source?: string }) => {
    db.prepare(`INSERT INTO vocabulary_map (canonical_term, variant, confidence, source) VALUES (?, ?, ?, ?)
      ON CONFLICT(canonical_term, variant) DO UPDATE SET confidence = excluded.confidence, source = excluded.source`)
      .run(data.canonical.toLowerCase(), data.variant.toLowerCase(), 1.0, data.source || 'manual');
    return { ok: true };
});

// Auto-learn from correction
ipcMain.handle('vocab:correct', async (_event, data: { wrong: string; correct: string }) => {
    const wrongClean = data.wrong.trim().toLowerCase();
    const correctClean = data.correct.trim().toLowerCase();
    db.prepare(`INSERT INTO vocabulary_map (canonical_term, variant, confidence, source) VALUES (?, ?, 0.9, 'auto-learned')
      ON CONFLICT(canonical_term, variant) DO UPDATE SET confidence = MAX(confidence, 0.9), source = 'auto-learned'`)
      .run(correctClean, wrongClean);
    const existing = db.prepare('SELECT canonical_term FROM vocabulary_map WHERE LOWER(variant) = ?').get(correctClean);
    if (existing && existing.canonical_term !== correctClean) {
        db.prepare(`INSERT INTO vocabulary_map (canonical_term, variant, confidence, source) VALUES (?, ?, 0.85, 'auto-learned')
          ON CONFLICT(canonical_term, variant) DO UPDATE SET confidence = MAX(confidence, 0.85), source = 'auto-learned'`)
          .run(existing.canonical_term, wrongClean);
    }
    return { ok: true };
});

// Delete
ipcMain.handle('vocab:delete', async (_event, id: number) => {
    db.prepare('DELETE FROM vocabulary_map WHERE id = ?').run(id);
    return { ok: true };
});

// Bulk resolve
ipcMain.handle('vocab:resolve-bulk', async (_event, terms: string[]) => {
    const results = {};
    for (const term of terms) {
        const clean = term.trim().toLowerCase();
        const row = db.prepare('SELECT canonical_term FROM vocabulary_map WHERE LOWER(variant) = ?').get(clean);
        results[term] = row ? row.canonical_term : term;
    }
    return { ok: true, resolved: results };
});
```

### New Preload Bridges

```typescript
vocab: {
  resolve: (term: string) => ipcRenderer.invoke('vocab:resolve', term),
  list: () => ipcRenderer.invoke('vocab:list'),
  add: (data: { canonical: string; variant: string; source?: string }) => ipcRenderer.invoke('vocab:add', data),
  correct: (data: { wrong: string; correct: string }) => ipcRenderer.invoke('vocab:correct', data),
  delete: (id: number) => ipcRenderer.invoke('vocab:delete', id),
  resolveBulk: (terms: string[]) => ipcRenderer.invoke('vocab:resolve-bulk', terms),
},
```

### assemble-context Injection (add after user dictionary block)

```typescript
// Vocabulary Resolver Injection
const vocabMappings = db.prepare('SELECT DISTINCT canonical_term, variant FROM vocabulary_map ORDER BY canonical_term').all();
if (vocabMappings.length > 0) {
    const byCanonical = {};
    for (const m of vocabMappings) {
        if (!byCanonical[m.canonical_term]) byCanonical[m.canonical_term] = [];
        byCanonical[m.canonical_term].push(m.variant);
    }
    const lines = ['## Vocabulary (variant → canonical)\n'];
    for (const [canonical, variants] of Object.entries(byCanonical)) {
        lines.push(`- **${canonical}** ← ${variants.join(', ')}`);
    }
    parts.push(lines.join('\n'));
}
```

### Auto-learning Hook

```typescript
function detectVocabularyCorrection(output) {
    const patterns = [
        /(?:i meant|it(?:'s| is)|no,?\s*)(.+?)\s+(?:not|instead of)\s+(.+)/i,
        /(?:don'?t say|stop saying|wrong)\s+"?(.+?)"?\s*,?\s*(?:it(?:'s| is)|say|use)\s+"?(.+?)"?/i,
        /(.+?)\s+means\s+(.+)/i,
    ];
    for (const p of patterns) {
        const m = output.match(p);
        if (m) return { wrong: m[1].trim(), correct: m[2].trim() };
    }
    return null;
}
```

## Constraints

- DB migration goes in main.ts ~line 3803 (after user_dictionary CREATE TABLE)
- IPC handlers go after user-dictionary:import (~line 16553)
- Preload bridges go after userDictionary section
- Build: `npx vite build` + `npx esbuild src/preload.ts --bundle --platform=node --format=cjs --external:electron --outfile=dist-electron/preload.cjs` + `node scripts/rebuild-main.mjs`
