# Context Bundle — Presentation Studio: Current Code State

> REQUEST FROM SPECIALIST AI: "Give me the complete current implementation of the presentation generation service. I need to see exactly how `presentation:generate` / `api()?.generate()` reaches the external AI, how the prompt is selected, how the AI response is received, how HTML vs JSON is detected, how parsing and validation are performed, how slides are persisted to the database, and what happens on malformed, partial, or failed AI output."

---

## File 1: `src/services/presentation/index.ts` (280 lines — COMPLETE)

```typescript
import { ipcMain, app } from 'electron';
import type Database from 'better-sqlite3';

let _db: Database.Database | null = null;
let _aiCall: ((prompt: string, systemPrompt: string, maxTokens?: number) => Promise<string>) | null = null;

function uid(): string {
  return crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function now(): string {
  return new Date().toISOString();
}

function ensurePresentationTables(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS presentations (
      id TEXT PRIMARY KEY,
      episode_id INTEGER,
      topic TEXT,
      title TEXT NOT NULL,
      status TEXT DEFAULT 'generating',
      slide_count INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS presentation_slides (
      id TEXT PRIMARY KEY,
      presentation_id TEXT NOT NULL,
      index_order INTEGER NOT NULL,
      frame_type TEXT NOT NULL,
      html_content TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (presentation_id) REFERENCES presentations (id) ON DELETE CASCADE
    );
  `);
  const presCols = db.prepare("PRAGMA table_info(presentations)").all().map((c: any) => c.name);
  if (!presCols.includes('topic')) {
    try { db.exec(`ALTER TABLE presentations ADD COLUMN topic TEXT`); } catch {}
  }
  if (!presCols.includes('slide_count')) {
    try { db.exec(`ALTER TABLE presentations ADD COLUMN slide_count INTEGER DEFAULT 0`); } catch {}
  }
}

function extractHtml(raw: string): string {
  const fenceMatch = raw.match(/```(?:html)?\s*\n?([\s\S]*?)\n?\s*```/);
  if (fenceMatch) return fenceMatch[1].trim();
  const doctypeMatch = raw.match(/(<!DOCTYPE html>[\s\S]*<\/html>)/i);
  if (doctypeMatch) return doctypeMatch[1];
  if (raw.trim().startsWith('<')) return raw.trim();
  return raw.trim();
}

function validateHtml(html: string): { valid: boolean; error?: string } {
  try {
    if (!html.includes('<!DOCTYPE html>') && !html.includes('<!doctype html>')) {
      return { valid: false, error: 'Missing DOCTYPE declaration' };
    }
    if (!html.includes('<html')) {
      return { valid: false, error: 'Missing <html> tag' };
    }
    if (!html.includes('<body')) {
      return { valid: false, error: 'Missing <body> tag' };
    }
    if (!html.includes('<style')) {
      return { valid: false, error: 'Missing <style> tag — slides must be self-contained' };
    }
    return { valid: true };
  } catch (err: any) {
    return { valid: false, error: err.message };
  }
}

export function registerPresentationHandlers(db: Database.Database, aiCall: typeof _aiCall extends infer T ? T : never) {
  console.log('[Presentation] registerPresentationHandlers called');
  _db = db;
  _aiCall = aiCall as any;
  ensurePresentationTables(db);

  // ── Generate Presentation from Episode ──
  ipcMain.handle('presentation:generate', async (_, { episodeId, topic, slideCount }: any) => {
    if (!_db || !_aiCall) return { ok: false, error: 'Presentation service not initialized' };
    try {
      let frames: any[] = [];
      let title = '';
      if (episodeId) {
        const ep = _db.prepare('SELECT * FROM content_episodes WHERE id=?').get(episodeId) as any;
        if (!ep) return { ok: false, error: 'Episode not found' };
        frames = JSON.parse(ep.script || '[]');
        title = ep.title || 'Untitled Episode';
      } else if (topic) {
        title = topic;
        const count = Math.min(slideCount || 8, 20);
        const frameGenPrompt = `Generate ${count} ScriptFrame objects for a presentation about "${topic}". Each frame should have: index (0-based), text (spoken words), duration_seconds (1-8), frame_type (hook for first, value for middle, call_to_action for last, visual_only where appropriate), visual (description of what to render), timestamp ("MM:SS"). First frame must be type "hook". Last frame must be type "call_to_action". Return ONLY a JSON array of frames.`;
        const rawFrames = await (_aiCall as any)(frameGenPrompt, 'You are a script writer. Return ONLY a JSON array.', 4000);
        const parsed = rawFrames.match(/\[[\s\S]*\]/);
        if (parsed) {
          frames = JSON.parse(parsed[0]);
        } else {
          return { ok: false, error: 'Failed to generate frames from topic' };
        }
      } else {
        return { ok: false, error: 'Either episodeId or topic is required' };
      }

      if (frames.length === 0) {
        return { ok: false, error: 'No script frames found. Generate a script first in the Content Engine.' };
      }

      const presId = uid();
      _db.prepare('INSERT INTO presentations (id, episode_id, topic, title, status, slide_count) VALUES (?, ?, ?, ?, ?, ?)')
        .run(presId, episodeId || null, topic || null, title, 'generating', frames.length);

      const { PROMPT_GENERATE_SLIDE, buildSlidePrompt } = require('./prompts');
      const slides: { id: string; index: number; frame_type: string; html: string }[] = [];

      for (let i = 0; i < frames.length; i++) {
        const frame = frames[i];
        try {
          console.log(`[Presentation] Generating slide ${i + 1}/${frames.length} (type: ${frame.frame_type})`);
          const prompt = buildSlidePrompt(frame);
          const rawHtml = await (_aiCall as any)(prompt, PROMPT_GENERATE_SLIDE, 4000);
          const html = extractHtml(rawHtml);
          const check = validateHtml(html);
          if (!check.valid) {
            console.warn(`[Presentation] Slide ${i} validation failed: ${check.error}, retrying once...`);
            const retryPrompt = prompt + `\n\nYour previous output was invalid: ${check.error}. Please output valid HTML starting with <!DOCTYPE html>.`;
            const retryRaw = await (_aiCall as any)(retryPrompt, PROMPT_GENERATE_SLIDE, 4000);
            const retryHtml = extractHtml(retryRaw);
            const retryCheck = validateHtml(retryHtml);
            if (!retryCheck.valid) {
              console.error(`[Presentation] Slide ${i} retry also failed: ${retryCheck.error}`);
              const slideId = uid();
              _db.prepare('INSERT INTO presentation_slides (id, presentation_id, index_order, frame_type, html_content) VALUES (?, ?, ?, ?, ?)')
                .run(slideId, presId, frame.index ?? i, frame.frame_type, `<html><body style="background:#0A0A0B;color:#FAFAFA;font-family:Inter;display:flex;align-items:center;justify-content:center;height:960px;"><div style="text-align:center;"><h1 style="color:#f59e0b;">Slide Generation Failed</h1><p style="color:#8B8B8B;">${check.error}</p></div></body></html>`);
              slides.push({ id: slideId, index: frame.index ?? i, frame_type: frame.frame_type, html: '' });
              continue;
            }
            slides.push({ id: uid(), index: frame.index ?? i, frame_type: frame.frame_type, html: retryHtml });
            const slideId = uid();
            _db.prepare('INSERT INTO presentation_slides (id, presentation_id, index_order, frame_type, html_content) VALUES (?, ?, ?, ?, ?)')
              .run(slideId, presId, frame.index ?? i, frame.frame_type, retryHtml);
          } else {
            const slideId = uid();
            _db.prepare('INSERT INTO presentation_slides (id, presentation_id, index_order, frame_type, html_content) VALUES (?, ?, ?, ?, ?)')
              .run(slideId, presId, frame.index ?? i, frame.frame_type, html);
            slides.push({ id: slideId, index: frame.index ?? i, frame_type: frame.frame_type, html });
          }
        } catch (err: any) {
          console.error(`[Presentation] Slide ${i} generation error:`, err.message);
          const slideId = uid();
          _db.prepare('INSERT INTO presentation_slides (id, presentation_id, index_order, frame_type, html_content) VALUES (?, ?, ?, ?, ?)')
            .run(slideId, presId, frame.index ?? i, frame.frame_type, `<html><body style="background:#0A0A0B;color:#FAFAFA;font-family:Inter;display:flex;align-items:center;justify-content:center;height:960px;"><div style="text-align:center;"><h1 style="color:#ef4444;">Error</h1><p style="color:#8B8B8B;">${err.message}</p></div></body></html>`);
        }
      }

      _db.prepare("UPDATE presentations SET status = 'ready', slide_count = ?, updated_at = ? WHERE id = ?")
        .run(slides.length, now(), presId);
      console.log(`[Presentation] Presentation ${presId} generated: ${slides.length} slides`);
      return { ok: true, data: { id: presId, title, slideCount: slides.length } };
    } catch (err: any) {
      console.error('[Presentation] Generation failed:', err.message);
      return { ok: false, error: err.message };
    }
  });

  // ── Get Presentation & Slides ──
  ipcMain.handle('presentation:get', async (_, { presentationId }: any) => {
    if (!_db) return { ok: false, error: 'Not initialized' };
    const pres = _db.prepare('SELECT * FROM presentations WHERE id=?').get(presentationId) as any;
    if (!pres) return { ok: false, error: 'Not found' };
    const slides = _db.prepare('SELECT * FROM presentation_slides WHERE presentation_id=? ORDER BY index_order ASC').all(presentationId);
    return { ok: true, data: { ...pres, slides } };
  });

  // ── List All Presentations ──
  ipcMain.handle('presentation:list', async () => {
    if (!_db) return { ok: false, error: 'Not initialized' };
    const list = _db.prepare('SELECT * FROM presentations ORDER BY created_at DESC').all();
    return { ok: true, data: list };
  });

  // ── Delete Presentation ──
  ipcMain.handle('presentation:delete', async (_, { presentationId }: any) => {
    if (!_db) return { ok: false, error: 'Not initialized' };
    _db.prepare('DELETE FROM presentation_slides WHERE presentation_id=?').run(presentationId);
    _db.prepare('DELETE FROM presentations WHERE id=?').run(presentationId);
    return { ok: true };
  });

  // ── Import HTML Slides ──
  ipcMain.handle('presentation:import', async (_, { topic, slideCount, slides }: any) => {
    if (!_db) return { ok: false, error: 'Not initialized' };
    try {
      const presId = uid();
      _db.prepare('INSERT INTO presentations (id, topic, title, status, slide_count) VALUES (?, ?, ?, ?, ?)')
        .run(presId, topic || null, topic || 'Imported Presentation', 'ready', slideCount || slides.length);
      for (let i = 0; i < slides.length; i++) {
        const s = slides[i];
        const slideId = uid();
        _db.prepare('INSERT INTO presentation_slides (id, presentation_id, index_order, frame_type, html_content) VALUES (?, ?, ?, ?, ?)')
          .run(slideId, presId, i, s.frameType || 'value', s.html);
      }
      return { ok: true, data: { id: presId, slideCount: slides.length } };
    } catch (err: any) {
      return { ok: false, error: err.message };
    }
  });

  // ── Export Slide as PNG ──
  ipcMain.handle('presentation:export-slide', async (_, { slideId, transparent }: any) => {
    if (!_db) return { ok: false, error: 'Not initialized' };
    const slide = _db.prepare('SELECT * FROM presentation_slides WHERE id=?').get(slideId) as any;
    if (!slide) return { ok: false, error: 'Slide not found' };
    const { exportSlideToPng, exportSlideToTransparentPng } = require('./export');
    const result = transparent
      ? await exportSlideToTransparentPng(slide.html_content)
      : await exportSlideToPng(slide.html_content);
    if (!result.ok) return { ok: false, error: result.error };
    const { dialog } = require('electron');
    const { BrowserWindow } = require('electron');
    const win = BrowserWindow.getFocusedWindow();
    const saveResult = await dialog.showSaveDialog(win, {
      title: 'Export Slide as PNG',
      defaultPath: `slide-${slide.index_order}.png`,
      filters: [{ name: 'PNG Image', extensions: ['png'] }],
    });
    if (saveResult.canceled || !saveResult.filePath) {
      return { ok: false, error: 'Export cancelled' };
    }
    const fs = require('fs');
    fs.writeFileSync(saveResult.filePath, result.data);
    return { ok: true, filePath: saveResult.filePath };
  });

  // ── Update Slide HTML (Code View editing) ──
  ipcMain.handle('presentation:update-slide', async (_, { slideId, htmlContent }: any) => {
    if (!_db) return { ok: false, error: 'Not initialized' };
    const check = validateHtml(htmlContent);
    if (!check.valid) return { ok: false, error: check.error };
    _db.prepare('UPDATE presentation_slides SET html_content=? WHERE id=?').run(htmlContent, slideId);
    return { ok: true };
  });

  console.log('[DeskFlow] ✅ Presentation module registered');
}
```

---

## File 2: `src/main.ts` (lines 1908-1975 — the ACTUAL registered handlers)

> CRITICAL: `index.ts` is NOT the actual registered handler. `main.ts` module top level IS.
> `registerPresentationHandlers` from index.ts is NEVER called — its handlers are dead code.
> The REAL handlers are in main.ts block starting at line 1908.

```typescript
// Presentation IPC — registered at module top level, db accessed lazily
{
  const crypto = require('crypto');
  const presUid = () => crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  function ensurePresTables() {
    if (!db) return;
    try { db.exec(`CREATE TABLE IF NOT EXISTS presentations (id TEXT PRIMARY KEY, episode_id INTEGER, topic TEXT, title TEXT NOT NULL, status TEXT DEFAULT 'generating', slide_count INTEGER DEFAULT 0, created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')))`) } catch {}
    try { db.exec(`CREATE TABLE IF NOT EXISTS presentation_slides (id TEXT PRIMARY KEY, presentation_id TEXT NOT NULL, index_order INTEGER DEFAULT 0, frame_type TEXT DEFAULT 'value', html_content TEXT, created_at TEXT DEFAULT (datetime('now'))`) } catch {}
    try {
      const cols = db.prepare("PRAGMA table_info(presentations)").all().map((c: any) => c.name);
      if (!cols.includes('archived_at')) {
        db.exec(`ALTER TABLE presentations ADD COLUMN archived_at TEXT`);
      }
    } catch {}
  }
  electron_1.ipcMain.handle('presentation:list', async (_, opts?: any) => {
    if (!db) return { ok: false, error: 'DB not ready' };
    ensurePresTables();
    const filter = opts?.archived;
    let list;
    if (filter === true || filter === 'true') {
      list = db.prepare('SELECT * FROM presentations WHERE archived_at IS NOT NULL ORDER BY archived_at DESC').all();
    } else if (filter === 'all') {
      list = db.prepare('SELECT * FROM presentations ORDER BY archived_at DESC NULLS LAST, created_at DESC').all();
    } else {
      list = db.prepare('SELECT * FROM presentations WHERE archived_at IS NULL ORDER BY created_at DESC').all();
    }
    return { ok: true, data: list };
  });
  electron_1.ipcMain.handle('presentation:get', async (_, { presentationId }: any) => {
    if (!db) return { ok: false, error: 'DB not ready' };
    ensurePresTables();
    const pres = db.prepare('SELECT * FROM presentations WHERE id=?').get(presentationId) as any;
    if (!pres) return { ok: false, error: 'Not found' };
    const slides = db.prepare('SELECT * FROM presentation_slides WHERE presentation_id=? ORDER BY index_order ASC').all(presentationId);
    return { ok: true, data: { ...pres, slides } };
  });
  electron_1.ipcMain.handle('presentation:import', async (_, { topic, slideCount, slides }: any) => {
    if (!db) return { ok: false, error: 'DB not ready' };
    ensurePresTables();
    const presId = presUid();
    db.prepare('INSERT INTO presentations (id, topic, title, status, slide_count) VALUES (?, ?, ?, ?, ?)').run(presId, topic || null, topic || 'Imported', 'ready', slideCount || slides.length);
    for (let i = 0; i < slides.length; i++) {
      db.prepare('INSERT INTO presentation_slides (id, presentation_id, index_order, frame_type, html_content) VALUES (?, ?, ?, ?, ?)').run(presUid(), presId, i, slides[i].frameType || 'value', slides[i].html);
    }
    return { ok: true, data: { id: presId, slideCount: slides.length } };
  });
  electron_1.ipcMain.handle('presentation:delete', async (_, { presentationId }: any) => {
    if (!db) return { ok: false, error: 'DB not ready' };
    ensurePresTables();
    db.prepare('DELETE FROM presentation_slides WHERE presentation_id=?').run(presentationId);
    db.prepare('DELETE FROM presentations WHERE id=?').run(presentationId);
    return { ok: true };
  });
  electron_1.ipcMain.handle('presentation:archive', async (_, { presentationId }: any) => {
    if (!db) return { ok: false, error: 'DB not ready' };
    ensurePresTables();
    db.prepare("UPDATE presentations SET archived_at = datetime('now'), updated_at = datetime('now') WHERE id=?").run(presentationId);
    return { ok: true };
  });
  electron_1.ipcMain.handle('presentation:unarchive', async (_, { presentationId }: any) => {
    if (!db) return { ok: false, error: 'DB not ready' };
    ensurePresTables();
    db.prepare('UPDATE presentations SET archived_at = NULL, updated_at = datetime(\'now\') WHERE id=?').run(presentationId);
    return { ok: true };
  });
  electron_1.ipcMain.handle('presentation:update-slide', async (_, { slideId, htmlContent }: any) => {
    if (!db) return { ok: false, error: 'DB not ready' };
    ensurePresTables();
    db.prepare('UPDATE presentation_slides SET html_content=? WHERE id=?').run(htmlContent, slideId);
    return { ok: true };
  });
  electron_1.ipcMain.handle('presentation:generate', async () => ({ ok: false, error: 'Use auto-generate' }));
  electron_1.ipcMain.handle('presentation:export-slide', async () => ({ ok: false, error: 'Not implemented' }));
  console.log('[DeskFlow] ✅ Presentation IPC registered (module top level)');
}
```

---

## CRITICAL FINDING: TWO CONFLICTING IMPLEMENTATIONS

1. `src/services/presentation/index.ts` — has `registerPresentationHandlers()` with full generate logic (AI call, frame generation, slide-by-slide generation, validation, retry). BUT this function is NEVER called from main.ts.

2. `src/main.ts` lines 1908-1975 — has its OWN inline handlers that OVERRIDE the channel names. The `presentation:generate` handler here is a STUB: `return { ok: false, error: 'Use auto-generate' }`. The `presentation:export-slide` is also a stub.

**The actual generation path:**
- `api()?.generate()` → preload bridge → `ipcRenderer.invoke('presentation:generate', opts)` → main.ts stub → returns `{ ok: false, error: 'Use auto-generate' }`
- The frontend `handleAuto()` in PresentationWorkspace.tsx calls `api()?.generate()` which hits the STUB
- The real generation logic in `index.ts` is DEAD CODE — `registerPresentationHandlers` is exported but never imported/called from main.ts

**For HTML paste import:**
- User pastes HTML → `handlePasteImport()` → `api()?.import()` → preload bridge → main.ts `presentation:import` handler → stores raw HTML in DB → returns `{ ok: true, data: { id, slideCount } }`
- This path WORKS — it's the only functional generation path

**For auto-generate:**
- BROKEN — the generate handler is a stub
