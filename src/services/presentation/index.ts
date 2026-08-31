// Presentation Service — Single authoritative implementation
// Handles: generation, import, export, persistence, validation

import { ipcMain } from 'electron';
import type Database from 'better-sqlite3';
import type { PresentationSpec, SlideSpec, PresentationFormat, PresentationGenerateRequest, SPEC_VERSION } from './spec';
import { SPEC_VERSION as CURRENT_SPEC_VERSION } from './spec';
import { parseDeckHtml, recomposeSlideHtml } from './deckParser';

let _db: Database.Database | null = null;
let _aiCall: ((prompt: string, systemPrompt: string, maxTokens?: number) => Promise<string>) | null = null;
let _buildChain: ((state: any, feature: string) => any) | null = null;
let _runWithFallback: ((chain: any, req: any) => Promise<any>) | null = null;
let _getProviderState: (() => any) | null = null;

function uid(): string {
  return crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function now(): string {
  return new Date().toISOString();
}

// ─── Schema Initialization ───

function ensurePresentationTables(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS presentations (
      id TEXT PRIMARY KEY,
      episode_id INTEGER,
      topic TEXT,
      title TEXT NOT NULL,
      status TEXT DEFAULT 'generating',
      slide_count INTEGER DEFAULT 0,
      format_mode TEXT DEFAULT 'html',
      spec_version INTEGER DEFAULT 1,
      error_message TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS presentation_slides (
      id TEXT PRIMARY KEY,
      presentation_id TEXT NOT NULL,
      index_order INTEGER NOT NULL,
      frame_type TEXT NOT NULL,
      format TEXT DEFAULT 'html',
      spec_version INTEGER DEFAULT 1,
      html_content TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (presentation_id) REFERENCES presentations (id) ON DELETE CASCADE
    );
  `);
  // Guarded ALTERs
  try {
    const presCols = db.prepare("PRAGMA table_info(presentations)").all().map((c: any) => c.name);
    if (!presCols.includes('topic')) db.exec(`ALTER TABLE presentations ADD COLUMN topic TEXT`);
    if (!presCols.includes('slide_count')) db.exec(`ALTER TABLE presentations ADD COLUMN slide_count INTEGER DEFAULT 0`);
    if (!presCols.includes('archived_at')) db.exec(`ALTER TABLE presentations ADD COLUMN archived_at TEXT`);
    if (!presCols.includes('format_mode')) db.exec(`ALTER TABLE presentations ADD COLUMN format_mode TEXT DEFAULT 'html'`);
    if (!presCols.includes('spec_version')) db.exec(`ALTER TABLE presentations ADD COLUMN spec_version INTEGER DEFAULT 1`);
    if (!presCols.includes('error_message')) db.exec(`ALTER TABLE presentations ADD COLUMN error_message TEXT`);
    if (!presCols.includes('shared_style')) db.exec(`ALTER TABLE presentations ADD COLUMN shared_style TEXT`);
  } catch {}
  try {
    const slideCols = db.prepare("PRAGMA table_info(presentation_slides)").all().map((c: any) => c.name);
    if (!slideCols.includes('format')) db.exec(`ALTER TABLE presentation_slides ADD COLUMN format TEXT DEFAULT 'html'`);
    if (!slideCols.includes('spec_version')) db.exec(`ALTER TABLE presentation_slides ADD COLUMN spec_version INTEGER DEFAULT 1`);
    if (!slideCols.includes('updated_at')) db.exec(`ALTER TABLE presentation_slides ADD COLUMN updated_at TEXT`);
  } catch {}
}

// ─── HTML Validation ───

function validateHtmlArtifact(html: string): { valid: boolean; error?: string } {
  if (!html || typeof html !== 'string') return { valid: false, error: 'Empty or non-string HTML' }
  if (html.length < 50) return { valid: false, error: 'HTML too short to be a valid slide' }
  const lower = html.toLowerCase()
  if (!lower.includes('<!doctype html') && !lower.includes('<html')) return { valid: false, error: 'Missing DOCTYPE or <html> tag' }
  if (!lower.includes('<body')) return { valid: false, error: 'Missing <body> tag' }
  if (!lower.includes('<style')) return { valid: false, error: 'Missing <style> tag — slides must be self-contained' }
  // Reject deck-level navigation structures (single-slide contract).
  // These markers are unambiguous; we deliberately avoid matching ordinary words
  // like "slide" or "next" to prevent false positives on legitimate content.
  if (lower.includes('<main class="deck"') || lower.includes("<main class='deck'") || lower.includes('class="deck"')) {
    return { valid: false, error: 'Generated HTML contains a deck container (<main class="deck">) — each slide must be standalone' }
  }
  if (lower.includes('<nav')) {
    return { valid: false, error: 'Generated HTML contains <nav> — deck navigation must live in the host app, not the slide' }
  }
  if (lower.includes('<section class="slide"') || lower.includes("<section class='slide'")) {
    return { valid: false, error: 'Generated HTML contains multiple <section class="slide"> blocks — only ONE slide per document allowed' }
  }
  if (lower.includes('slide-nav') || lower.includes('slide-counter')) {
    return { valid: false, error: 'Generated HTML contains deck navigation elements (slide-nav/slide-counter) — host owns navigation' }
  }
  if (lower.includes('show(i)') || lower.includes('function show(') || lower.includes('function showslide(')) {
    return { valid: false, error: 'Generated HTML contains slide-show navigation logic (show(i)) — host controls navigation' }
  }
  return { valid: true }
}

function extractHtmlFromResponse(raw: string): string {
  const fenceMatch = raw.match(/```(?:html)?\s*\n?([\s\S]*?)\n?\s*```/)
  if (fenceMatch) return fenceMatch[1].trim()
  const doctypeMatch = raw.match(/(<!DOCTYPE html>[\s\S]*<\/html>)/i)
  if (doctypeMatch) return doctypeMatch[1]
  if (raw.trim().startsWith('<')) return raw.trim()
  return raw.trim()
}

// ─── JSON Parsing ───

function parseJsonPresentation(raw: string): { ok: boolean; spec?: PresentationSpec; error?: string } {
  try {
    const spec = JSON.parse(raw)
    if (!spec || typeof spec !== 'object') return { ok: false, error: 'Not a valid JSON object' }
    if (typeof spec.title !== 'string') return { ok: false, error: 'title is required and must be a string' }
    if (typeof spec.slideCount !== 'number' || spec.slideCount < 1) return { ok: false, error: 'slideCount must be a positive integer' }
    if (!spec.themeId) return { ok: false, error: 'themeId is required' }
    if (!Array.isArray(spec.slides)) return { ok: false, error: 'slides must be an array' }
    if (spec.slides.length !== spec.slideCount) return { ok: false, error: `slides.length (${spec.slides.length}) !== slideCount (${spec.slideCount})` }
    // Validate each slide
    const validTypes = ['hook', 'value', 'transition', 'call_to_action', 'visual_only']
    const validLayouts = ['split-left', 'split-right', 'full-bleed', 'minimal']
    const validVisuals = ['hero-number', 'code-block', 'diagram', 'chart', 'progress-ring', 'step-through', 'comparison', 'timeline', 'quote', 'icon-grid', 'data-table', 'interactive-demo', 'none']
    for (let i = 0; i < spec.slides.length; i++) {
      const s = spec.slides[i]
      if (typeof s.index !== 'number') return { ok: false, error: `Slide ${i}: index must be a number` }
      if (!s.type || !validTypes.includes(s.type)) return { ok: false, error: `Slide ${i}: invalid type "${s.type}"` }
      if (!s.headline) return { ok: false, error: `Slide ${i}: headline is required` }
      if (!s.layout || !validLayouts.includes(s.layout)) return { ok: false, error: `Slide ${i}: invalid layout "${s.layout}"` }
      if (!s.visual || !s.visual.type || !validVisuals.includes(s.visual.type)) return { ok: false, error: `Slide ${i}: invalid visual type "${s.visual?.type}"` }
      if (!s.motion) return { ok: false, error: `Slide ${i}: motion is required` }
    }
    return { ok: true, spec }
  } catch (err: any) {
    return { ok: false, error: `JSON parse error: ${err.message}` }
  }
}

// ─── Generation Service ───

async function generatePresentation(request: PresentationGenerateRequest): Promise<{ ok: boolean; data?: any; error?: string }> {
  if (!_db || !_buildChain || !_runWithFallback || !_getProviderState) {
    return { ok: false, error: 'Presentation service not initialized' }
  }

  const { prompt, outputFormat, slideCount, topic, mode, themeId, aspectRatio } = request

  // Create presentation record
  const presId = uid()
  _db.prepare('INSERT INTO presentations (id, topic, title, status, slide_count, format_mode, spec_version) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(presId, topic || null, topic || 'Untitled', 'generating', slideCount, outputFormat, CURRENT_SPEC_VERSION)

  try {
    // Build provider chain
    const pState = _getProviderState()
    if (!pState || !pState.providers || pState.providers.filter((p: any) => p.enabled).length === 0) {
      _db.prepare("UPDATE presentations SET status = 'failed', error_message = ? WHERE id = ?").run('No AI provider configured', presId)
      return { ok: false, error: 'No AI provider configured' }
    }

    const chain = _buildChain(pState, 'presentation')
    if (chain.length === 0) {
      _db.prepare("UPDATE presentations SET status = 'failed', error_message = ? WHERE id = ?").run('No AI provider available for presentation', presId)
      return { ok: false, error: 'No AI provider available for presentation' }
    }

    // Call AI
    const { PROMPT_GENERATE_SLIDE, PROMPT_GENERATE_JSON } = require('./prompts')
    // systemPrompt is chosen by output format (HTML slide prompt vs JSON spec prompt)
    const actualSysPrompt = outputFormat === 'json' ? PROMPT_GENERATE_JSON : PROMPT_GENERATE_SLIDE

    const { result } = await _runWithFallback(chain, {
      systemPrompt: actualSysPrompt,
      messages: [{ role: 'user', content: prompt }],
      maxTokens: outputFormat === 'json' ? 8000 : 4000,
      temperature: 0.7,
    })

    const rawText = result.content

    if (outputFormat === 'json') {
      // JSON mode: parse, validate, persist per-slide
      const parsed = parseJsonPresentation(rawText)
      if (!parsed.ok) {
        _db.prepare("UPDATE presentations SET status = 'failed', error_message = ? WHERE id = ?").run(parsed.error, presId)
        return { ok: false, error: parsed.error }
      }
      const spec = parsed.spec!
      // Persist each slide
      for (const slide of spec.slides) {
        const slideId = uid()
        _db.prepare('INSERT INTO presentation_slides (id, presentation_id, index_order, frame_type, format, spec_version, html_content) VALUES (?, ?, ?, ?, ?, ?, ?)')
          .run(slideId, presId, slide.index, slide.type, 'json', CURRENT_SPEC_VERSION, JSON.stringify(slide))
      }
      _db.prepare("UPDATE presentations SET status = 'ready', title = ?, slide_count = ?, updated_at = ? WHERE id = ?")
        .run(spec.title || topic || 'Untitled', spec.slides.length, now(), presId)
      return { ok: true, data: { id: presId, title: spec.title, slideCount: spec.slides.length, format: 'json' } }
    } else {
      // HTML mode. Default to the HYBRID strategy: one deck-call → deterministic
      // parse → N independent slide artifacts, with a per-slide regeneration
      // fallback for any slot that fails validation. Large decks (>8 slides)
      // fall back to the legacy per-slide path automatically.
      const strategy = request.generationStrategy === 'per-slide' || slideCount > 8 ? 'per-slide' : 'hybrid'
      if (strategy === 'per-slide') {
        const total = Math.max(1, slideCount)
        for (let i = 0; i < total; i++) {
          const slidePrompt = prompt.replace(/\{\{CURRENT_SLIDE\}\}/g, String(i + 1))
          const html = await generatePerSlide(chain, slidePrompt, actualSysPrompt, i + 1)
          const slideId = uid()
          _db.prepare('INSERT INTO presentation_slides (id, presentation_id, index_order, frame_type, format, spec_version, html_content) VALUES (?, ?, ?, ?, ?, ?, ?)')
            .run(slideId, presId, i, 'value', 'html', CURRENT_SPEC_VERSION, html)
        }
        await finalizePresentation(presId, topic, total)
        return { ok: true, data: { id: presId, title: topic || 'Untitled', slideCount: total, format: 'html', strategy: 'per-slide' } }
      }

      // HYBRID: one deck call, then deterministic parse into N slides.
      const { PROMPT_GENERATE_DECK } = require('./prompts')
      let deckHtml: string | null = null
      let lastErr = ''
      for (let attempt = 0; attempt < 2 && !deckHtml; attempt++) {
        const { result: r } = await _runWithFallback(chain, {
          systemPrompt: PROMPT_GENERATE_DECK,
          messages: [{ role: 'user', content: attempt === 0 ? prompt : prompt + '\n\nYour previous output was invalid: ' + lastErr + '. Output exactly one HTML document with a single shared <style> and N <article data-slide="N"> blocks.' }],
          maxTokens: 8000,
          temperature: 0.7,
        })
        const candidate = extractHtmlFromResponse(r.content)
        const parsed = parseDeckHtml(candidate)
        if (parsed.slides.length === slideCount && parsed.errors.length === 0) {
          deckHtml = candidate
        } else {
          lastErr = parsed.errors.join('; ') || 'deck parse produced wrong slide count'
        }
      }

      if (!deckHtml) {
        // Full-deck failure → degrade to per-slide so the user still gets slides.
        for (let i = 0; i < slideCount; i++) {
          const slidePrompt = prompt.replace(/\{\{CURRENT_SLIDE\}\}/g, String(i + 1))
          const html = await generatePerSlide(chain, slidePrompt, actualSysPrompt, i + 1)
          const slideId = uid()
          _db.prepare('INSERT INTO presentation_slides (id, presentation_id, index_order, frame_type, format, spec_version, html_content) VALUES (?, ?, ?, ?, ?, ?, ?)')
            .run(slideId, presId, i, 'value', 'html', CURRENT_SPEC_VERSION, html)
        }
        await finalizePresentation(presId, topic, slideCount)
        return { ok: true, data: { id: presId, title: topic || 'Untitled', slideCount, format: 'html', strategy: 'per-slide-fallback' } }
      }

      // Parse succeeded → extract shared style + per-slide articles.
      const parsed = parseDeckHtml(deckHtml)
      const sharedStyle = parsed.sharedStyle

      // Per-slide validation + regeneration of any bad slot.
      const total = slideCount
      for (let n = 1; n <= total; n++) {
        const art = parsed.slides.find(s => s.dataSlide === n)
        let slideHtml = art ? art.html : ''
        const check = slideHtml ? validateHtmlArtifact(recomposeSlideHtml(sharedStyle, slideHtml)) : { valid: false, error: 'missing slide' }
        if (!check.valid) {
          // Regenerate this single slide with PROMPT_REGEN_SLIDE.
          const regenPrompt = prompt.replace(/\{\{CURRENT_SLIDE\}\}/g, String(n))
          const { PROMPT_REGEN_SLIDE } = require('./prompts')
          const regenSys = (PROMPT_REGEN_SLIDE as string)
            .replace('{{CONTENT}}', '')
            .replace('{{CURRENT_SLIDE}}', String(n))
            .replace('{{SLIDE_COUNT}}', String(total))
            .replace('{{MODE}}', mode)
          const regenOut = await regenerateOneSlide(chain, regenSys, regenPrompt, n)
          // Prefer the regenerated article; fall back to whatever we parsed.
          const regenParsed = regenOut ? parseDeckHtml(regenOut) : { slides: [] as any[] }
          slideHtml = (regenParsed.slides.find(s => s.dataSlide === n)?.html) || slideHtml || fallbackSlideHtml(n)
        }
        const slideId = uid()
        _db.prepare('INSERT INTO presentation_slides (id, presentation_id, index_order, frame_type, format, spec_version, html_content) VALUES (?, ?, ?, ?, ?, ?, ?)')
          .run(slideId, presId, n - 1, 'value', 'html', CURRENT_SPEC_VERSION, slideHtml)
      }

      _db.prepare("UPDATE presentations SET status = 'ready', title = ?, slide_count = ?, shared_style = ?, updated_at = ? WHERE id = ?")
        .run(topic || 'Untitled', total, sharedStyle, now(), presId)
      return { ok: true, data: { id: presId, title: topic || 'Untitled', slideCount: total, format: 'html', strategy: 'hybrid', sharedStyle } }
    }
  } catch (err: any) {
    _db.prepare("UPDATE presentations SET status = 'failed', error_message = ? WHERE id = ?").run(err.message, presId)
    return { ok: false, error: err.message }
  }
}

// ─── Helpers ───

function fallbackSlideHtml(n: number): string {
  return `<div class="slide-stage"><div style="font-size:13px;opacity:.6">Slide ${n} failed to generate.</div></div>`
}

// Legacy per-slide generation: one AI invocation per slide (one-call-per-slide
// contract). Used as the fallback path for large decks and full-deck failures.
async function generatePerSlide(chain: any, slidePrompt: string, sysPrompt: string, n: number): Promise<string> {
  let html: string | null = null
  let lastErr = ''
  for (let attempt = 0; attempt < 2 && !html; attempt++) {
    const { result: r } = await _runWithFallback(chain, {
      systemPrompt: sysPrompt,
      messages: [{
        role: 'user',
        content: attempt === 0
          ? slidePrompt
          : slidePrompt + '\n\nYour previous output was invalid: ' + lastErr + '. Output valid self-contained HTML starting with <!DOCTYPE html> containing exactly one slide.',
      }],
      maxTokens: 4000,
      temperature: 0.7,
    })
    const candidate = extractHtmlFromResponse(r.content)
    const check = validateHtmlArtifact(candidate)
    if (check.valid) html = candidate
    else lastErr = check.error || 'invalid HTML'
  }
  if (!html) {
    html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Slide ${n}</title><style>html,body{height:100%;margin:0;display:flex;align-items:center;justify-content:center;background:#0A0A0B;color:#FAFAFA;font-family:Inter,system-ui,sans-serif;text-align:center;padding:24px}</style></head><body><div style="font-size:13px;opacity:.6">Slide ${n} failed to generate.</div></body></html>`
  }
  return html
}

// Regenerate a single slide with PROMPT_REGEN_SLIDE. Returns the raw model
// output (an <article> or a document containing one). Returns '' on failure.
async function regenerateOneSlide(chain: any, regenSys: string, regenPrompt: string, n: number): Promise<string> {
  let out = ''
  let lastErr = ''
  for (let attempt = 0; attempt < 2 && !out; attempt++) {
    const { result: r } = await _runWithFallback(chain, {
      systemPrompt: regenSys,
      messages: [{ role: 'user', content: attempt === 0 ? regenPrompt : regenPrompt + '\n\nPrevious output invalid: ' + lastErr + '. Output exactly one <article data-slide="' + n + '">.' }],
      maxTokens: 4000,
      temperature: 0.7,
    })
    const candidate = extractHtmlFromResponse(r.content)
    const parsed = parseDeckHtml(candidate)
    if (parsed.slides.some(s => s.dataSlide === n)) out = candidate
    else lastErr = 'no <article data-slide="' + n + '"> found'
  }
  return out
}

async function finalizePresentation(presId: string, topic: string | undefined, total: number): Promise<void> {
  _db!.prepare("UPDATE presentations SET status = 'ready', title = ?, slide_count = ?, updated_at = ? WHERE id = ?")
    .run(topic || 'Untitled', total, now(), presId)
}

// Regenerate one slide of an existing presentation (Task 6 IPC backing).
async function regenerateSlide(req: any): Promise<{ ok: boolean; data?: any; error?: string }> {
  if (!_db || !_buildChain || !_runWithFallback || !_getProviderState) {
    return { ok: false, error: 'Presentation service not initialized' }
  }
  const { presentationId, slideId, index, count, prompt, outputFormat, mode, aspectRatio } = req
  const pres = _db.prepare('SELECT * FROM presentations WHERE id=?').get(presentationId) as any
  if (!pres) return { ok: false, error: 'Presentation not found' }
  const pState = _getProviderState()
  if (!pState || !pState.providers || pState.providers.filter((p: any) => p.enabled).length === 0) {
    return { ok: false, error: 'No AI provider configured' }
  }
  const chain = _buildChain(pState, 'presentation')
  if (chain.length === 0) return { ok: false, error: 'No AI provider available for presentation' }

  const sharedStyle = pres.shared_style || ''
  const n = index + 1
  const regenPrompt = (prompt || '').replace(/\{\{CURRENT_SLIDE\}\}/g, String(n))
  const { PROMPT_REGEN_SLIDE } = require('./prompts')
  const regenSys = (PROMPT_REGEN_SLIDE as string)
    .replace('{{CONTENT}}', '')
    .replace('{{CURRENT_SLIDE}}', String(n))
    .replace('{{SLIDE_COUNT}}', String(count))
    .replace('{{MODE}}', mode || '')
  const raw = await regenerateOneSlide(chain, regenSys, regenPrompt, n)
  const parsed = raw ? parseDeckHtml(raw) : { slides: [] as any[] }
  let slideHtml = parsed.slides.find(s => s.dataSlide === n)?.html || ''
  if (!slideHtml) {
    // Try per-slide fallback (PROMPT_GENERATE_SLIDE) if regen parser failed.
    const { PROMPT_GENERATE_SLIDE } = require('./prompts')
    slideHtml = await generatePerSlide(chain, prompt.replace(/\{\{CURRENT_SLIDE\}\}/g, String(n)), PROMPT_GENERATE_SLIDE, n)
  }
  const finalHtml = sharedStyle ? recomposeSlideHtml(sharedStyle, slideHtml) : slideHtml
  _db.prepare('UPDATE presentation_slides SET html_content = ?, format = ?, updated_at = ? WHERE id = ?')
    .run(finalHtml, 'html', now(), slideId)
  return { ok: true, data: { slideId, html: finalHtml } }
}

// ─── Registration ───

export function registerPresentationHandlers(
  db: Database.Database,
  aiCall: (prompt: string, systemPrompt: string, maxTokens?: number) => Promise<string>,
  buildChainFn: (state: any, feature: string) => any,
  runWithFallbackFn: (chain: any, req: any) => Promise<any>,
  getProviderStateFn: () => any,
) {
  console.log('[Presentation] registerPresentationHandlers called')
  _db = db
  _aiCall = aiCall
  _buildChain = buildChainFn
  _runWithFallback = runWithFallbackFn
  _getProviderState = getProviderStateFn

  ensurePresentationTables(db)

  // ── Generate ──
  ipcMain.handle('presentation:generate', async (_, request: PresentationGenerateRequest) => {
    return generatePresentation(request)
  })

  // ── Regenerate one slide ──
  ipcMain.handle('presentation:regenerate-slide', async (_, request: any) => {
    return regenerateSlide(request)
  })

  // ── Get ──
  ipcMain.handle('presentation:get', async (_, { presentationId }: any) => {
    if (!_db) return { ok: false, error: 'Not initialized' }
    const pres = _db.prepare('SELECT * FROM presentations WHERE id=?').get(presentationId) as any
    if (!pres) return { ok: false, error: 'Not found' }
    const slides = _db.prepare('SELECT * FROM presentation_slides WHERE presentation_id=? ORDER BY index_order ASC').all(presentationId)
    return { ok: true, data: { ...pres, slides } }
  })

  // ── List ──
  ipcMain.handle('presentation:list', async (_, opts?: any) => {
    if (!_db) return { ok: false, error: 'Not initialized' }
    ensurePresentationTables(_db)
    const filter = opts?.archived
    let list
    if (filter === true || filter === 'true') {
      list = _db.prepare('SELECT * FROM presentations WHERE archived_at IS NOT NULL ORDER BY archived_at DESC').all()
    } else if (filter === 'all') {
      list = _db.prepare('SELECT * FROM presentations ORDER BY archived_at DESC NULLS LAST, created_at DESC').all()
    } else {
      list = _db.prepare('SELECT * FROM presentations WHERE archived_at IS NULL ORDER BY created_at DESC').all()
    }
    return { ok: true, data: list }
  })

  // ── Import (format-aware) ──
  ipcMain.handle('presentation:import', async (_, { format, topic, slideCount, slides }: any) => {
    if (!_db) return { ok: false, error: 'Not initialized' }
    ensurePresentationTables(_db)
    try {
      const presId = uid()
      const resolvedFormat = format || 'html'
      _db.prepare('INSERT INTO presentations (id, topic, title, status, slide_count, format_mode, spec_version) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .run(presId, topic || null, topic || 'Imported', 'ready', slideCount || slides.length, resolvedFormat, CURRENT_SPEC_VERSION)
      for (let i = 0; i < slides.length; i++) {
        const s = slides[i]
        const slideId = uid()
        const slideFormat = s.format || resolvedFormat
        _db.prepare('INSERT INTO presentation_slides (id, presentation_id, index_order, frame_type, format, spec_version, html_content) VALUES (?, ?, ?, ?, ?, ?, ?)')
          .run(slideId, presId, i, s.frameType || 'value', slideFormat, CURRENT_SPEC_VERSION, s.html)
      }
      return { ok: true, data: { id: presId, slideCount: slides.length } }
    } catch (err: any) {
      return { ok: false, error: err.message }
    }
  })

  // ── Delete ──
  ipcMain.handle('presentation:delete', async (_, { presentationId }: any) => {
    if (!_db) return { ok: false, error: 'Not initialized' }
    ensurePresentationTables(_db)
    _db.prepare('DELETE FROM presentation_slides WHERE presentation_id=?').run(presentationId)
    _db.prepare('DELETE FROM presentations WHERE id=?').run(presentationId)
    return { ok: true }
  })

  // ── Archive ──
  ipcMain.handle('presentation:archive', async (_, { presentationId }: any) => {
    if (!_db) return { ok: false, error: 'Not initialized' }
    ensurePresentationTables(_db)
    _db.prepare("UPDATE presentations SET archived_at = datetime('now'), updated_at = datetime('now') WHERE id=?").run(presentationId)
    return { ok: true }
  })

  // ── Unarchive ──
  ipcMain.handle('presentation:unarchive', async (_, { presentationId }: any) => {
    if (!_db) return { ok: false, error: 'Not initialized' }
    ensurePresentationTables(_db)
    _db.prepare('UPDATE presentations SET archived_at = NULL, updated_at = datetime(\'now\') WHERE id=?').run(presentationId)
    return { ok: true }
  })

  // ── Update Slide (format-aware) ──
  ipcMain.handle('presentation:update-slide', async (_, { slideId, format, htmlContent }: any) => {
    if (!_db) return { ok: false, error: 'Not initialized' }
    ensurePresentationTables(_db)
    if (format === 'json') {
      const parsed = parseJsonPresentation(htmlContent)
      if (!parsed.ok) return { ok: false, error: parsed.error }
      _db.prepare('UPDATE presentation_slides SET html_content=?, format=?, spec_version=? WHERE id=?')
        .run(JSON.stringify(parsed.spec), 'json', CURRENT_SPEC_VERSION, slideId)
    } else {
      const check = validateHtmlArtifact(htmlContent)
      if (!check.valid) return { ok: false, error: check.error }
      _db.prepare('UPDATE presentation_slides SET html_content=?, format=?, updated_at=? WHERE id=?')
        .run(htmlContent, 'html', now(), slideId)
    }
    return { ok: true }
  })

  // ── Export Slide ──
  ipcMain.handle('presentation:export-slide', async (_, { slideId, transparent, aspectRatio }: any) => {
    if (!_db) return { ok: false, error: 'Not initialized' }
    const slide = _db.prepare('SELECT * FROM presentation_slides WHERE id=?').get(slideId) as any
    if (!slide) return { ok: false, error: 'Slide not found' }

    if (slide.format === 'json') {
      // JSON slides: render through React (future: export window with React renderer)
      return { ok: false, error: 'JSON slide export not yet implemented — use HTML mode for export' }
    }

    // HTML slides: existing export path
    const { exportSlideToPng, exportSlideToTransparentPng } = require('./export')
    const result = transparent
      ? await exportSlideToTransparentPng(slide.html_content)
      : await exportSlideToPng(slide.html_content)

    if (!result.ok) return { ok: false, error: result.error }

    const { dialog, BrowserWindow } = require('electron')
    const win = BrowserWindow.getFocusedWindow()
    const saveResult = await dialog.showSaveDialog(win, {
      title: 'Export Slide as PNG',
      defaultPath: `slide-${slide.index_order}.png`,
      filters: [{ name: 'PNG Image', extensions: ['png'] }],
    })
    if (saveResult.canceled || !saveResult.filePath) return { ok: false, error: 'Export cancelled' }

    const fs = require('fs')
    fs.writeFileSync(saveResult.filePath, result.data)
    return { ok: true, filePath: saveResult.filePath }
  })

  console.log('[DeskFlow] ✅ Presentation service registered')
}
