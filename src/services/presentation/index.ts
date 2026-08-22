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

  // Guarded ALTER for columns that may not exist on older DBs
  const presCols = db.prepare("PRAGMA table_info(presentations)").all().map((c: any) => c.name);
  if (!presCols.includes('topic')) {
    try { db.exec(`ALTER TABLE presentations ADD COLUMN topic TEXT`); } catch {}
  }
  if (!presCols.includes('slide_count')) {
    try { db.exec(`ALTER TABLE presentations ADD COLUMN slide_count INTEGER DEFAULT 0`); } catch {}
  }
}

function extractHtml(raw: string): string {
  // Try to extract HTML from AI response (may be wrapped in markdown fences)
  const fenceMatch = raw.match(/```(?:html)?\s*\n?([\s\S]*?)\n?\s*```/);
  if (fenceMatch) return fenceMatch[1].trim();

  const doctypeMatch = raw.match(/(<!DOCTYPE html>[\s\S]*<\/html>)/i);
  if (doctypeMatch) return doctypeMatch[1];

  // If it looks like raw HTML, return as-is
  if (raw.trim().startsWith('<')) return raw.trim();

  return raw.trim();
}

function validateHtml(html: string): { valid: boolean; error?: string } {
  try {
    // Basic structural checks
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
        // Episode-based: read script frames from DB
        const ep = _db.prepare('SELECT * FROM content_episodes WHERE id=?').get(episodeId) as any;
        if (!ep) return { ok: false, error: 'Episode not found' };
        frames = JSON.parse(ep.script || '[]');
        title = ep.title || 'Untitled Episode';
      } else if (topic) {
        // Topic-based: generate frames from topic first
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

      // Create presentation record
      const presId = uid();
      _db.prepare('INSERT INTO presentations (id, episode_id, topic, title, status, slide_count) VALUES (?, ?, ?, ?, ?, ?)')
        .run(presId, episodeId || null, topic || null, title, 'generating', frames.length);

      // Import the prompt
      const { PROMPT_GENERATE_SLIDE, buildSlidePrompt } = require('./prompts');

      // Generate HTML for each frame
      const slides: { id: string; index: number; frame_type: string; html: string }[] = [];

      for (let i = 0; i < frames.length; i++) {
        const frame = frames[i];
        try {
          console.log(`[Presentation] Generating slide ${i + 1}/${frames.length} (type: ${frame.frame_type})`);
          const prompt = buildSlidePrompt(frame);
          const rawHtml = await (_aiCall as any)(prompt, PROMPT_GENERATE_SLIDE, 4000);
          const html = extractHtml(rawHtml);

          // Validate
          const check = validateHtml(html);
          if (!check.valid) {
            console.warn(`[Presentation] Slide ${i} validation failed: ${check.error}, retrying once...`);
            const retryPrompt = prompt + `\n\nYour previous output was invalid: ${check.error}. Please output valid HTML starting with <!DOCTYPE html>.`;
            const retryRaw = await (_aiCall as any)(retryPrompt, PROMPT_GENERATE_SLIDE, 4000);
            const retryHtml = extractHtml(retryRaw);
            const retryCheck = validateHtml(retryHtml);
            if (!retryCheck.valid) {
              console.error(`[Presentation] Slide ${i} retry also failed: ${retryCheck.error}`);
              // Save with error indicator
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
          // Save error slide
          const slideId = uid();
          _db.prepare('INSERT INTO presentation_slides (id, presentation_id, index_order, frame_type, html_content) VALUES (?, ?, ?, ?, ?)')
            .run(slideId, presId, frame.index ?? i, frame.frame_type, `<html><body style="background:#0A0A0B;color:#FAFAFA;font-family:Inter;display:flex;align-items:center;justify-content:center;height:960px;"><div style="text-align:center;"><h1 style="color:#ef4444;">Error</h1><p style="color:#8B8B8B;">${err.message}</p></div></body></html>`);
        }
      }

      // Update presentation status
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
    if (!pres) return { ok: false, error: 'Presentation not found' };
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

    // Save to user's Desktop or app data
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
