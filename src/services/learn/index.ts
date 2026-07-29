// Lyceum Learn module — IPC handler registration
// Call registerLearnHandlers(db, callAi) from main.ts during startup

import { ipcMain, dialog, app, BrowserWindow } from 'electron';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import type Database from 'better-sqlite3';
import { runMigration } from './db/repo';
import { ContentService } from './services/content.service';
import { ImportService } from './services/import.service';
import { ProgressService } from './services/progress.service';
import { TutorService } from './services/tutor.service';
import { TutorServiceV2 } from './services/tutorV2.service';
import { NoteService } from './services/note.service';
import { ConversationService } from './services/conversation.service';
import { PermissionService } from './services/permission.service';
import { DashboardService } from './services/dashboard.service';
import { validateFull } from './validator/validate';
import { toLdoc } from './lessonInput';
import { LessonMarkdownError } from './parseLessonMarkdown';

/** Pull the outermost {...} out of an LLM response, dropping fences/prose. */
function extractJsonObject(raw: string): string {
  let s = raw.trim();
  s = s.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
  const first = s.indexOf('{');
  const last = s.lastIndexOf('}');
  if (first !== -1 && last !== -1 && last > first) s = s.slice(first, last + 1);
  return s.trim();
}

/** Remove trailing commas before } or ]. */
function stripTrailingCommas(s: string): string {
  return s.replace(/,\s*([}\]])/g, '$1');
}

/** Defensive parse: raw → extracted → comma-stripped. Clear error on failure. */
function parseLessonJson(raw: string):
  | { ok: true; data: unknown }
  | { ok: false; error: string } {
  const attempts = [
    raw,
    extractJsonObject(raw),
    stripTrailingCommas(raw),
    stripTrailingCommas(extractJsonObject(raw)),
  ];
  for (const candidate of attempts) {
    try {
      return { ok: true, data: JSON.parse(candidate) };
    } catch {
      /* try next */
    }
  }
  const cleaned = stripTrailingCommas(extractJsonObject(raw));
  try {
    return { ok: true, data: JSON.parse(cleaned) };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      ok: false,
      error: `AI output was not valid JSON even after sanitisation: ${msg}. ` +
        `Cleaned preview (first 200 chars): ${cleaned.slice(0, 200)}`,
    };
  }
}

/**
 * Accept either compiled .ldoc JSON or raw .lmd Markdown and return an LdocDocument.
 * Detection: JSON documents start with '{'. Everything else is treated as .lmd
 * (which by spec starts with a '---' frontmatter fence).
 */
function toLdocDocument(raw: string):
  | { ok: true; data: import('../../shared/learn/types').LdocDocument }
  | { ok: false; error: string } {
  const trimmed = raw.trimStart();
  if (trimmed.startsWith('{')) {
    const parsed = parseLessonJson(raw);
    if (!parsed.ok) return parsed;
    return { ok: true, data: parsed.data as import('../../shared/learn/types').LdocDocument };
  }
  try {
    const { parseLessonMarkdown } = require('./parseLessonMarkdown');
    return { ok: true, data: parseLessonMarkdown(raw) };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: `Could not compile .lmd lesson: ${msg}` };
  }
}

/** Load learner profile from DB, returns null if not set. */
function loadLearnerProfile(db: Database): import('../../shared/learn/types').LearnerProfile | null {
  const KEY = 'lyceum.learnerProfile.v1';
  try {
    const { getProfileValue } = require('./db/repo');
    const raw = getProfileValue(db, KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const { DEFAULT_PROFILE } = require('../../shared/learn/types');
    return { ...DEFAULT_PROFILE, ...parsed, priorKnowledge: { ...(parsed.priorKnowledge ?? {}) } };
  } catch {
    return null;
  }
}

export function registerLearnHandlers(
  db: Database,
  callAi: (prompt: string, systemPrompt: string, maxTokens?: number) => Promise<any>,
  streamAi?: (prompt: string, systemPrompt: string, onToken: (chunk: string) => void) => Promise<string>,
) {
  // Run migration
  runMigration(db);

  const content = new ContentService(db);
  const importer = new ImportService(db);
  const progress = new ProgressService(db);

  // Load prompt library and compose tutor persona
  const readResource = (rel: string) => {
    const fp = resourcePath(rel);
    return existsSync(fp) ? readFileSync(fp, 'utf-8') : null;
  };
  const { loadPromptLibrary, composeTutorPersona } = require('./promptLibrary');
  const lib = loadPromptLibrary(readResource);
  const profile = loadLearnerProfile(db);
  const tutorPersona = composeTutorPersona(lib, profile ?? undefined);

  const tutor = new TutorService(db, callAi, tutorPersona);
  const tutorV2 = new TutorServiceV2(db, callAi, streamAi, tutorPersona);
  const noteService = new NoteService(db);
  const conversationService = new ConversationService(db);
  const permissionService = new PermissionService(db);
  const dashboardService = new DashboardService(db);

  // ── Import & Validate ──
  console.log('[learn] IPC handlers registered — lmd-import v2 (accepts { source })');

  ipcMain.handle('learn:importLdoc', (_event, payload: { source?: string; json?: unknown }) => {
    if (typeof payload.source === 'string') {
      const doc = toLdocDocument(payload.source);
      if (!doc.ok) return { ok: false, error: doc.error };
      return importer.importLdoc(doc.data);
    }
    if (payload.json && typeof payload.json === 'object') {
      return importer.importLdoc(payload.json);
    }
    return { ok: false, error: 'Invalid payload: expected source (string) or json (object)' };
  });

  ipcMain.handle('learn:validate', (_event, payload: { source?: string; json?: unknown }) => {
    if (typeof payload.source === 'string') {
      const doc = toLdocDocument(payload.source);
      if (!doc.ok) return { ok: false, errors: [{ rule: 'parse', message: doc.error }], warnings: [] };
      return validateFull(doc.data);
    }
    if (payload.json && typeof payload.json === 'object') {
      return validateFull(payload.json);
    }
    return { ok: false, errors: [{ rule: 'parse', message: 'Invalid payload: expected source (string) or json (object)' }], warnings: [] };
  });

  // ── File picker & bundled resources ──

  ipcMain.handle('learn:pick-file', async () => {
    const win = BrowserWindow.getFocusedWindow();
    const result = await dialog.showOpenDialog(win!, {
      title: 'Select a lesson file (.lmd or .ldoc)',
      filters: [{ name: 'Lyceum Lesson', extensions: ['lmd', 'ldoc', 'json', 'md'] }],
      properties: ['openFile'],
    });
    if (result.canceled || result.filePaths.length === 0) return { canceled: true };
    const content = readFileSync(result.filePaths[0], 'utf-8');
    return { canceled: false, content, filePath: result.filePaths[0] };
  });

  function resourcePath(name: string) {
    const dev = resolve(app.getAppPath(), 'resources/learn', name);
    if (existsSync(dev)) return dev;
    return resolve(app.getAppPath(), 'dist-electron/resources/learn', name);
  }

  ipcMain.handle('learn:get-worked-example', () => {
    const fp = resourcePath('memory-hierarchy.ldoc');
    if (!existsSync(fp)) return { found: false, content: null };
    return { found: true, content: readFileSync(fp, 'utf-8') };
  });

  ipcMain.handle('learn:get-schema', () => {
    const fp = resourcePath('ldoc.schema.json');
    if (!existsSync(fp)) return { found: false, content: null };
    return { found: true, content: readFileSync(fp, 'utf-8') };
  });

  ipcMain.handle('learn:get-author-guide', () => {
    const fp = resourcePath('author-guide.md');
    if (!existsSync(fp)) return { found: false, content: null };
    return { found: true, content: readFileSync(fp, 'utf-8') };
  });

  // ── Content ──

  ipcMain.handle('learn:listLessons', (_event, { part }: { part?: number } = {}) => {
    return content.listLessons(part);
  });

  ipcMain.handle('learn:listChapters', (_event, { part }: { part?: number } = {}) => {
    try {
      let rows: any[];
      if (part != null) {
        rows = db.prepare("SELECT DISTINCT chapter FROM learn_lessons WHERE part = ? AND chapter != '' ORDER BY chapter").all(part);
      } else {
        rows = db.prepare("SELECT DISTINCT chapter, part FROM learn_lessons WHERE chapter != '' ORDER BY part, chapter").all();
      }
      return { ok: true, data: rows.map((r: any) => r.chapter) };
    } catch (e: any) {
      return { ok: false, error: e.message };
    }
  });

  ipcMain.handle('learn:getLesson', (_event, { lessonId }: { lessonId: string }) => {
    return content.getLesson(lessonId);
  });

  ipcMain.handle('learn:getNode', (_event, { nodeId }: { nodeId: string }) => {
    return content.getNode(nodeId);
  });

  ipcMain.handle('learn:getGraph', (_event, { part }: { part?: number } = {}) => {
    return content.getGraph(part);
  });

  // ── Tutor ──

  ipcMain.handle('learn:askTutor', (_event, params: { nodeId: string; blockId?: string; question: string; personaMd?: string; mode?: 'explain' | 'ask' | 'simpler' | 'deeper' }) => {
    return tutor.ask(params);
  });

  ipcMain.handle('learn:getTutorConfig', () => {
    try {
      const aiSettings = db.prepare("SELECT value FROM learn_profile WHERE key = 'ai_provider'").get() as any;
      const modelSettings = db.prepare("SELECT value FROM learn_profile WHERE key = 'ai_model'").get() as any;
      return {
        ok: true,
        data: {
          provider: aiSettings?.value || 'AI Provider',
          model: modelSettings?.value || 'default model',
        },
      };
    } catch {
      return { ok: true, data: { provider: 'AI Provider', model: 'default model' } };
    }
  });

  ipcMain.handle('learn:submitQuiz', (_event, params: { nodeId: string; blockId: string; response: string }) => {
    return tutor.submitQuiz(params);
  });

  // ── Tutor V2 (streaming) ──

  ipcMain.handle('learn:tutorStream', async (event, params: {
    nodeId: string; blockId: string; question: string; convId?: string;
    mode?: 'explain' | 'ask' | 'simpler' | 'deeper';
  }) => {
    if (!streamAi) {
      const result = await tutorV2.ask({ nodeId: params.nodeId, blockId: params.blockId, question: params.question, mode: params.mode });
      if (result.ok) {
        event.sender.send('learn:tutorToken', { blockId: params.blockId, token: result.data.answer_md, done: true });
      } else {
        event.sender.send('learn:tutorToken', { blockId: params.blockId, token: `Error: ${result.error}`, done: true });
      }
      return result;
    }
    const result = await tutorV2.askStream({ nodeId: params.nodeId, blockId: params.blockId, question: params.question, convId: params.convId, mode: params.mode }, (token: string) => {
      event.sender.send('learn:tutorToken', { blockId: params.blockId, token, done: false });
    });
    event.sender.send('learn:tutorToken', { blockId: params.blockId, token: '', done: true });
    return result;
  });

  ipcMain.handle('learn:tutorAskV2', (_event, params: { nodeId: string; blockId?: string; question: string }) => {
    return tutorV2.ask(params);
  });

  ipcMain.handle('learn:createProposal', (_event, params: { nodeId: string; blockId: string; title: string; bodyMd: string; actions: string[] }) => {
    return tutorV2.createProposal(params);
  });

  ipcMain.handle('learn:decideProposal', (_event, params: { proposal_id: string; approved: boolean; reason?: string }) => {
    return tutorV2.decideProposal(params);
  });

  // ── Conversation ──

  ipcMain.handle('learn:startConversation', (_event, params: { id: string; nodeId: string; blockId: string }) => {
    return conversationService.startConversation(params);
  });

  ipcMain.handle('learn:addMessage', (_event, params: { nodeId: string; blockId?: string; role: string; text: string }) => {
    return conversationService.addMessage(params);
  });

  ipcMain.handle('learn:getConversation', (_event, { blockId }: { blockId: string }) => {
    return conversationService.getConversationHistory(blockId);
  });

  ipcMain.handle('learn:resolveConversation', (_event, { convId }: { convId: string }) => {
    return conversationService.resolveConversation(convId);
  });

  // ── Notes ──

  ipcMain.handle('learn:addNote', (_event, params: { nodeId: string; text: string; tags?: string[]; blockRef?: string }) => {
    return noteService.addNote(params);
  });

  ipcMain.handle('learn:getNotes', (_event, { nodeId }: { nodeId: string }) => {
    return noteService.getNotesForNode(nodeId);
  });

  ipcMain.handle('learn:getAllNotes', (_event, { limit }: { limit?: number } = {}) => {
    return noteService.getAllNotes(limit);
  });

  ipcMain.handle('learn:deleteNote', (_event, { noteId }: { noteId: string }) => {
    return noteService.deleteNote(noteId);
  });

  ipcMain.handle('learn:toggleNotePin', (_event, { noteId, pinned }: { noteId: string; pinned: boolean }) => {
    return noteService.togglePin(noteId, pinned);
  });

  // ── Permissions ──

  ipcMain.handle('learn:getPermissions', () => {
    return permissionService.getAll();
  });

  ipcMain.handle('learn:setPermission', (_event, perm: { resource: string; grant: string; rationale?: string }) => {
    return permissionService.set(perm as any);
  });

  // ── Dashboard ──

  ipcMain.handle('learn:getTutorDashboard', () => {
    return dashboardService.getDashboardData();
  });

  // ── Progress ──

  ipcMain.handle('learn:getProgress', (_event, { nodeId }: { nodeId: string }) => {
    return progress.getProgress(nodeId);
  });

  ipcMain.handle('learn:getDueReviews', () => {
    return progress.getDueReviews();
  });

  // ── Prompt Library ──

  ipcMain.handle('learn:listRecipes', () => {
    const { listRecipes } = require('./promptLibrary');
    return listRecipes();
  });

  ipcMain.handle('learn:buildPromptFromRecipe', (_event, params: {
    recipeSlug: string;
    topic?: string;
    userInput?: string;
  }) => {
    const { buildPrompt } = require('./promptLibrary');
    const result = buildPrompt(params.recipeSlug, params.topic, params.userInput);
    if (!result) return { ok: false, error: `Recipe "${params.recipeSlug}" not found` };
    return { ok: true, ...result };
  });

  // ── Content Generation ──

  ipcMain.handle('learn:buildPrompt', async (_event, params: {
    userInput?: string;
    topic?: string;
    description?: string;
    contextDoc?: string;
    numNodes?: number;
    masteryTargets?: string[];
  }) => {
    // Use composed prompt library when available
    const readResource = (rel: string) => {
      const fp = resourcePath(rel);
      return existsSync(fp) ? readFileSync(fp, 'utf-8') : null;
    };

    const { loadPromptLibrary, composeAuthorSystemPrompt, composeTopicUserPrompt } = require('./promptLibrary');
    const { CURRICULUM_BLUEPRINT } = require('./curriculum');

    const lib = loadPromptLibrary(readResource);

    // Determine curriculum part from topic slug
    const part = params.topic
      ? CURRICULUM_BLUEPRINT.find((p: any) => p.slug === params.topic || p.title === params.topic)
      : undefined;

    const profile = loadLearnerProfile(db);
    const systemPrompt = composeAuthorSystemPrompt(lib, { part: part?.part, profile: profile ?? undefined });

    let userPrompt: string;

    if (params.userInput !== undefined) {
      userPrompt = `The learner has described what they want to learn below. Infer the appropriate number of concepts (3-6), mastery targets, lesson structure, and depth from their description. Create a comprehensive lesson that covers exactly what they've asked for.\n\n--- LEARNER'S REQUEST ---\n${params.userInput.trim()}\n`;
      if (params.contextDoc && params.contextDoc.trim()) {
        userPrompt += `\n--- REFERENCE MATERIAL (use these facts and cite sources where relevant) ---\n"""\n${params.contextDoc.trim()}\n"""\n`;
      }
      // Append topic-specific user prompt when a curriculum part matches
      if (part) {
        const topicPrompt = composeTopicUserPrompt(part.part, profile ?? undefined);
        if (topicPrompt) userPrompt = `${topicPrompt}\n\n---\n\n${userPrompt}`;
      }
    } else {
      userPrompt = part
        ? composeTopicUserPrompt(part.part, profile ?? undefined)
        : `Author a lesson on: ${params.topic}\n`;

      if (params.description && params.description.trim()) {
        userPrompt += `\nAdditional context from the learner:\n${params.description.trim()}\n`;
      }
      if (params.contextDoc && params.contextDoc.trim()) {
        userPrompt += `\nReference material provided by the learner (use these facts and cite sources):\n"""\n${params.contextDoc.trim()}\n"""\n`;
      }
      if (params.numNodes && params.numNodes > 0) {
        userPrompt += `\nStructure: create exactly ${params.numNodes} concepts/nodes.`;
      }
      if (params.masteryTargets && params.masteryTargets.length > 0) {
        userPrompt += `\nMastery targets: use these levels for your nodes — ${params.masteryTargets.join(', ')}.`;
      }
    }

    // Inject all published node IDs so the AI can use exact slugs in @prereq lines
    const allNodes = db.prepare(
      'SELECT n.id, n.title, l.part FROM learn_nodes n JOIN learn_lessons l ON n.lesson_id = l.id ORDER BY l.part, n.id'
    ).all() as any[];
    if (allNodes.length > 0) {
      const nodeList = allNodes.map((n: any) => `  ${n.id}  ("${n.title}", part ${n.part})`).join('\n');
      userPrompt += `\n\n--- EXISTING NODE IDs (use EXACTLY these in @prereq lines) ---\n${nodeList}\n`;
      userPrompt += `\nIMPORTANT: When referencing a prerequisite from another lesson, use the EXACT node ID from the list above. Do NOT guess or modify the ID — copy it character-for-character.`;
    }

    // Inject existing chapters so the AI can assign lessons to them or suggest new ones
    const existingChapters = db.prepare(
      "SELECT DISTINCT chapter, part FROM learn_lessons WHERE chapter != '' ORDER BY part, chapter"
    ).all() as any[];
    if (existingChapters.length > 0) {
      const chapterList = existingChapters.map((c: any) => `  Part ${c.part}: "${c.chapter}"`).join('\n');
      userPrompt += `\n\n--- EXISTING CHAPTERS (assign this lesson to one of these if it fits, otherwise create a new chapter name) ---\n${chapterList}\n`;
      userPrompt += `\nIMPORTANT: Include a "chapter" field in the lesson metadata with the chapter name you chose.`;
    } else {
      userPrompt += `\n\nIMPORTANT: Include a "chapter" field in the lesson metadata with a descriptive chapter name for this lesson (e.g. "Introduction", "Core Concepts", "Advanced Topics").`;
    }

    const fullPrompt = systemPrompt + '\n\n---\n\n' + userPrompt;
    return { ok: true, prompt: fullPrompt, systemPrompt, userPrompt };
  });

  ipcMain.handle('learn:generateLdoc', async (_event, { prompt, systemPrompt }: {
    prompt: string;
    systemPrompt: string;
  }) => {
    try {
      const raw = await callAi(prompt, systemPrompt, 8000);
      if (!raw || typeof raw !== 'string') {
        return { ok: false, error: 'AI returned an empty response. Check your AI provider settings.' };
      }

      // Compile Lesson Markdown (preferred) or fall back to raw .ldoc JSON.
      let parsed: unknown;
      try {
        parsed = toLdoc(raw).doc;
      } catch (e) {
        const msg = e instanceof LessonMarkdownError ? e.message : (e as Error).message;
        return { ok: false, error: `Could not compile the lesson: ${msg}`, raw };
      }

      const valResult = validateFull(parsed, new Set(db.prepare('SELECT id FROM learn_nodes').all().map((r: any) => r.id)));
      if (!valResult.ok) {
        return { ok: false, error: 'AI-generated lesson failed validation', validation: valResult, raw };
      }

      const result = importer.importLdoc(parsed);

      // Store the original prompt used to generate this lesson
      if (result.ok && result.data?.lessonId) {
        try {
          db.prepare('UPDATE learn_lessons SET original_prompt = ? WHERE id = ?').run(prompt, result.data.lessonId);
        } catch { /* non-critical */ }
      }

      return result;
    } catch (e: any) {
      return { ok: false, error: e.message };
    }
  });

  // ── Learner Profile (key-value, replaces localStorage) ──
  const { getProfileValue, setProfileValue, deleteProfileValue, getAllProfileValues } = require('./db/repo');

  ipcMain.handle('learn:getProfile', (_event, { key }: { key: string }) => {
    try { return getProfileValue(db, key); } catch { return null; }
  });

  ipcMain.handle('learn:setProfile', (_event, { key, value }: { key: string; value: string }) => {
    try { setProfileValue(db, key, value); return { ok: true }; } catch (e: any) { return { ok: false, error: e.message }; }
  });

  ipcMain.handle('learn:deleteProfile', (_event, { key }: { key: string }) => {
    try { deleteProfileValue(db, key); return { ok: true }; } catch (e: any) { return { ok: false, error: e.message }; }
  });

  ipcMain.handle('learn:getAllProfile', () => {
    try { return getAllProfileValues(db); } catch { return {}; }
  });

  // ── Flashcard & Visualization endpoints ──
  const flashcardService = require('./services/flashcard.service');

  ipcMain.handle('learn:getDueCards', async (_event, args: { deckId?: string; limit?: number }) => {
    return flashcardService.getDueCards(db, args.deckId, args.limit);
  });

  ipcMain.handle('learn:submitCardReview', async (_event, args: { cardId: string; rating: number }) => {
    return flashcardService.processReview(db, args.cardId, args.rating);
  });

  ipcMain.handle('learn:generateCards', async (_event, args: { deckId: string; nodeContent: string }) => {
    try {
      const aiResult = await callAi(`Generate flashcards for this content:\n${args.nodeContent}`);
      const parsed = JSON.parse(aiResult);
      return flashcardService.importGeneratedCards(db, args.deckId, parsed.cards || []);
    } catch (e: any) {
      return { ok: false, error: e.message };
    }
  });

  ipcMain.handle('learn:getDeckStats', async (_event, args: { deckId: string }) => {
    return flashcardService.getDeckStats(db, args.deckId);
  });

  ipcMain.handle('learn:getStudyHeatmap', async (_event, args: { days: number }) => {
    try {
      const days = args.days || 90;
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
      const rows = db.prepare('SELECT date, duration, nodes_seen, quizzes_taken, cards_reviewed, mastery_gained FROM learn_sessions WHERE date >= ? ORDER BY date').all(startDate) as any[];
      const heatmap = rows.map((r: any) => ({
        date: r.date,
        value: Math.min(1, (r.duration + r.quizzes_taken * 10 + r.cards_reviewed * 5) / 120),
        details: {
          nodesStudied: JSON.parse(r.nodes_seen || '[]').length,
          quizzesTaken: r.quizzes_taken,
          cardsReviewed: r.cards_reviewed,
          masteryGain: JSON.parse(r.mastery_gained || '[]').reduce((s: number, v: any) => s + (v.gain || 0), 0),
        },
      }));
      return { ok: true, data: heatmap };
    } catch (e: any) {
      return { ok: false, error: e.message };
    }
  });

  ipcMain.handle('learn:saveVizState', async (_event, args: { vizType: string; vizId: string; state: any }) => {
    try {
      db.prepare('INSERT OR REPLACE INTO learn_viz_state (id, user_id, viz_type, viz_id, state_json, updated_at) VALUES (?, ?, ?, ?, ?, ?)')
        .run(`viz_${args.vizId}`, 'default', args.vizType, args.vizId, JSON.stringify(args.state), new Date().toISOString());
      return { ok: true, data: null };
    } catch (e: any) {
      return { ok: false, error: e.message };
    }
  });

  // ── Copy Lesson Prompt (standalone system prompt for external AI chats) ──
  ipcMain.handle('learn:getLessonSystemPrompt', () => {
    const { composeAuthorSystemPrompt } = require('./promptLibrary');
    const prompt = composeAuthorSystemPrompt(lib);
    return { ok: true, data: prompt };
  });

  // ── Image Generation Settings ──
  ipcMain.handle('learn:getImageGenSettings', () => {
    try {
      const row = db.prepare("SELECT value FROM learn_profile WHERE key = 'imageGenSettings'").get() as { value: string } | undefined;
      const defaults = { enabled: false, model: 'dall-e-3', style: 'ian-xiaohei', costWarning: true };
      if (!row) return { ok: true, data: defaults };
      return { ok: true, data: { ...defaults, ...JSON.parse(row.value) } };
    } catch (e: any) {
      return { ok: false, error: e.message };
    }
  });

  ipcMain.handle('learn:setImageGenSettings', (_event, args: { enabled?: boolean; model?: string; style?: string }) => {
    try {
      const existing = db.prepare("SELECT value FROM learn_profile WHERE key = 'imageGenSettings'").get() as { value: string } | undefined;
      const current = existing ? JSON.parse(existing.value) : {};
      const updated = { ...current, ...args };
      const now = new Date().toISOString();
      if (existing) {
        db.prepare("UPDATE learn_profile SET value = ?, updated_at = ? WHERE key = 'imageGenSettings'").run(JSON.stringify(updated), now);
      } else {
        db.prepare("INSERT INTO learn_profile (key, value, created_at, updated_at) VALUES (?, ?, ?, ?)").run('imageGenSettings', JSON.stringify(updated), now, now);
      }
      return { ok: true, data: updated };
    } catch (e: any) {
      return { ok: false, error: e.message };
    }
  });

  // ── Learning Intents (saved ideas for future lessons) ──
  ipcMain.handle('learn:saveIntent', async (_event, args: { title: string; description?: string; context?: string; category?: string }) => {
    try {
      const id = `intent_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
      const now = new Date().toISOString();
      db.prepare('INSERT INTO learn_intents (id, title, description, context, category, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
        .run(id, args.title, args.description || '', args.context || '', args.category || 'idea', 'saved', now, now);
      return { ok: true, data: { id, created_at: now } };
    } catch (e: any) {
      return { ok: false, error: e.message };
    }
  });

  ipcMain.handle('learn:listIntents', async () => {
    try {
      const rows = db.prepare('SELECT * FROM learn_intents ORDER BY created_at DESC').all();
      return { ok: true, data: rows };
    } catch (e: any) {
      return { ok: false, error: e.message };
    }
  });

  ipcMain.handle('learn:deleteIntent', async (_event, args: { id: string }) => {
    try {
      db.prepare('DELETE FROM learn_intents WHERE id = ?').run(args.id);
      return { ok: true, data: null };
    } catch (e: any) {
      return { ok: false, error: e.message };
    }
  });

  ipcMain.handle('learn:updateIntent', async (_event, args: { id: string; status?: string; title?: string }) => {
    try {
      const updates: string[] = ['updated_at = ?'];
      const params: any[] = [new Date().toISOString()];
      if (args.status) { updates.push('status = ?'); params.push(args.status); }
      if (args.title) { updates.push('title = ?'); params.push(args.title); }
      params.push(args.id);
      db.prepare(`UPDATE learn_intents SET ${updates.join(', ')} WHERE id = ?`).run(...params);
      return { ok: true, data: null };
    } catch (e: any) {
      return { ok: false, error: e.message };
    }
  });

  // ── Lesson management (view source, edit, delete) ──
  ipcMain.handle('learn:getLessonSource', async (_event, args: { lessonId: string }) => {
    try {
      const row = db.prepare('SELECT doc_json FROM learn_lessons WHERE id = ?').get(args.lessonId) as any;
      if (!row) return { ok: false, error: 'Lesson not found' };
      return { ok: true, data: row.doc_json };
    } catch (e: any) {
      return { ok: false, error: e.message };
    }
  });

  ipcMain.handle('learn:updateLessonMeta', async (_event, args: { lessonId: string; title?: string; part?: number; summary?: string; chapter?: string }) => {
    try {
      const updates: string[] = ['updated_at = ?'];
      const params: any[] = [new Date().toISOString()];
      if (args.title !== undefined) { updates.push('title = ?'); params.push(args.title); }
      if (args.part !== undefined) { updates.push('part = ?'); params.push(args.part); }
      if (args.summary !== undefined) { updates.push('summary = ?'); params.push(args.summary); }
      if (args.chapter !== undefined) { updates.push('chapter = ?'); params.push(args.chapter); }
      params.push(args.lessonId);
      db.prepare(`UPDATE learn_lessons SET ${updates.join(', ')} WHERE id = ?`).run(...params);

      // Also update title in doc_json if changed
      if (args.title !== undefined) {
        const row = db.prepare('SELECT doc_json FROM learn_lessons WHERE id = ?').get(args.lessonId) as any;
        if (row) {
          const doc = JSON.parse(row.doc_json);
          if (doc.lesson) doc.lesson.title = args.title;
          if (args.part !== undefined) doc.lesson.part = args.part;
          if (args.summary !== undefined) doc.lesson.summary = args.summary;
          if (args.chapter !== undefined) doc.lesson.chapter = args.chapter;
          db.prepare('UPDATE learn_lessons SET doc_json = ? WHERE id = ?').run(JSON.stringify(doc), args.lessonId);
        }
      }

      return { ok: true, data: null };
    } catch (e: any) {
      return { ok: false, error: e.message };
    }
  });

  ipcMain.handle('learn:deleteLesson', async (_event, args: { lessonId: string }) => {
    try {
      // Cascade: delete nodes, prereqs, sources, chunks, progress, evidence
      const nodeIds = db.prepare('SELECT id FROM learn_nodes WHERE lesson_id = ?').all(args.lessonId) as any[];
      for (const n of nodeIds) {
        db.prepare('DELETE FROM learn_node_prereqs WHERE node_id = ?').run(n.id);
        db.prepare('DELETE FROM learn_sources WHERE node_id = ?').run(n.id);
        db.prepare('DELETE FROM learn_chunks WHERE node_id = ?').run(n.id);
        db.prepare('DELETE FROM learn_progress WHERE node_id = ?').run(n.id);
        db.prepare('DELETE FROM learn_evidence WHERE node_id = ?').run(n.id);
        db.prepare('DELETE FROM learn_notes WHERE node_id = ?').run(n.id);
        db.prepare('DELETE FROM learn_actions WHERE node_id = ?').run(n.id);
        db.prepare('DELETE FROM learn_conversations WHERE node_id = ?').run(n.id);
      }
      db.prepare('DELETE FROM learn_nodes WHERE lesson_id = ?').run(args.lessonId);
      db.prepare('DELETE FROM learn_lessons WHERE id = ?').run(args.lessonId);
      return { ok: true, data: null };
    } catch (e: any) {
      return { ok: false, error: e.message };
    }
  });

  // ── Image Generation ──
  ipcMain.handle('learn:generateIllustration', async (_event, args: { prompt: string; nodeId?: string; lessonId?: string }) => {
    try {
      const { generateImage } = require('./services/imageGen.service');
      
      // Load image gen settings
      const settingsRow = db.prepare("SELECT value FROM learn_profile WHERE key = 'imageGenSettings'").get() as { value: string } | undefined;
      const settings = settingsRow ? JSON.parse(settingsRow.value) : { enabled: false };
      if (!settings.enabled) return { ok: false, error: 'Image generation is disabled. Enable it in Learn → Profile → AI Illustrations.' };
      if (!settings.providerId || !settings.model) return { ok: false, error: 'No provider or model selected. Configure in Learn → Profile → AI Illustrations.' };

      // Load provider config from preferences
      const prefs = db.prepare("SELECT value FROM learn_profile WHERE key = 'aiProviders'").get() as { value: string } | undefined;
      // Also try the main preferences table
      let providerConfig: any = null;
      try {
        const mainPrefs = require('electron').app.getPath('userData');
        const prefsPath = require('path').join(mainPrefs, 'preferences.json');
        const { readFileSync } = require('fs');
        if (require('fs').existsSync(prefsPath)) {
          const allPrefs = JSON.parse(readFileSync(prefsPath, 'utf-8'));
          const providers = allPrefs.aiProviders ? JSON.parse(allPrefs.aiProviders) : { providers: [] };
          providerConfig = providers.providers?.find((p: any) => p.id === settings.providerId && p.apiKey);
        }
      } catch { /* ignore */ }

      if (!providerConfig) return { ok: false, error: `Provider "${settings.providerId}" not found or has no API key. Add it in Settings → AI Providers.` };

      // Determine save directory
      const lessonId = args.lessonId || args.nodeId?.split('-')[0] || 'general';
      const assetsDir = require('path').join(require('electron').app.getPath('userData'), 'lyceum', 'illustrations', lessonId);

      const result = await generateImage(
        { prompt: args.prompt, style: settings.style || 'ian-xiaohei' },
        { id: providerConfig.id, apiKey: providerConfig.apiKey, baseUrl: providerConfig.baseUrl, model: settings.model },
        assetsDir,
      );

      return result;
    } catch (e: any) {
      return { ok: false, error: e.message };
    }
  });

  ipcMain.handle('learn:explainWithImage', async (_event, args: { selectedText: string; contextText: string; nodeId?: string }) => {
    try {
      const { generateExplainPrompt, generateImage } = require('./services/imageGen.service');

      // Step 1: AI generates illustration prompt from confused text
      const promptResult = await generateExplainPrompt(args.selectedText, args.contextText, callAi);
      if (!promptResult.ok) return { ok: false, error: promptResult.error };
      if (!promptResult.data) return { ok: false, error: 'No prompt generated' };

      // Step 2: Load image gen settings
      const settingsRow = db.prepare("SELECT value FROM learn_profile WHERE key = 'imageGenSettings'").get() as { value: string } | undefined;
      const settings = settingsRow ? JSON.parse(settingsRow.value) : { enabled: false };
      if (!settings.enabled) return { ok: false, error: 'Image generation is disabled.' };
      if (!settings.providerId || !settings.model) return { ok: false, error: 'No provider or model selected.' };

      // Step 3: Load provider config
      let providerConfig: any = null;
      try {
        const prefsPath = require('path').join(require('electron').app.getPath('userData'), 'preferences.json');
        const { readFileSync, existsSync } = require('fs');
        if (existsSync(prefsPath)) {
          const allPrefs = JSON.parse(readFileSync(prefsPath, 'utf-8'));
          const providers = allPrefs.aiProviders ? JSON.parse(allPrefs.aiProviders) : { providers: [] };
          providerConfig = providers.providers?.find((p: any) => p.id === settings.providerId && p.apiKey);
        }
      } catch { /* ignore */ }

      if (!providerConfig) return { ok: false, error: `Provider "${settings.providerId}" not found or has no API key.` };

      // Step 4: Generate image
      const assetsDir = require('path').join(require('electron').app.getPath('userData'), 'lyceum', 'illustrations', 'explained');
      const imageResult = await generateImage(
        { prompt: promptResult.data.prompt, style: settings.style || 'ian-xiaohei' },
        { id: providerConfig.id, apiKey: providerConfig.apiKey, baseUrl: providerConfig.baseUrl, model: settings.model },
        assetsDir,
      );

      return {
        ok: imageResult.ok,
        data: {
          ...promptResult.data,
          imagePath: imageResult.imagePath,
        },
        error: imageResult.error,
      };
    } catch (e: any) {
      return { ok: false, error: e.message };
    }
  });

  // ── Timer System ──
  ipcMain.handle('learn:timerStart', async (_event, args: { lessonId?: number }) => {
    try {
      const now = new Date().toISOString();
      const result = db.prepare("INSERT INTO learn_sessions (date, duration, nodes_seen, quizzes_taken, cards_reviewed, mastery_gained, lesson_id) VALUES (?, 0, '[]', 0, 0, 0, ?)").run(now.split('T')[0], args.lessonId || null);
      db.prepare("INSERT INTO learn_timer_queue (event_type, lesson_id, timestamp) VALUES (?, ?, ?)").run('start', args.lessonId || null, now);
      return { ok: true, data: { sessionId: result.lastInsertRowid, startedAt: now } };
    } catch (e: any) {
      return { ok: false, error: e.message };
    }
  });

  ipcMain.handle('learn:timerPause', async (_event, args: { sessionId: number }) => {
    try {
      const now = new Date().toISOString();
      db.prepare('INSERT INTO learn_timer_queue (event_type, timestamp, duration_delta) VALUES (?, ?, 0)').run('pause', now);
      return { ok: true, data: { pausedAt: now } };
    } catch (e: any) {
      return { ok: false, error: e.message };
    }
  });

  ipcMain.handle('learn:timerResume', async (_event, args: { sessionId: number }) => {
    try {
      const now = new Date().toISOString();
      db.prepare('INSERT INTO learn_timer_queue (event_type, timestamp, duration_delta) VALUES (?, ?, 0)').run('resume', now);
      return { ok: true, data: { resumedAt: now } };
    } catch (e: any) {
      return { ok: false, error: e.message };
    }
  });

  ipcMain.handle('learn:timerStop', async (_event, args: { sessionId: number; duration: number; nodesSeen?: number[]; quizzesTaken?: number; cardsReviewed?: number; masteryGained?: number }) => {
    try {
      const now = new Date().toISOString();
      db.prepare('UPDATE learn_sessions SET duration = ?, nodes_seen = ?, quizzes_taken = ?, cards_reviewed = ?, mastery_gained = ? WHERE id = ?')
        .run(args.duration, JSON.stringify(args.nodesSeen || []), args.quizzesTaken || 0, args.cardsReviewed || 0, args.masteryGained || 0, args.sessionId);
      db.prepare('INSERT INTO learn_timer_queue (event_type, timestamp, duration_delta) VALUES (?, ?, ?)').run('stop', now, args.duration);
      
      // Update streak
      const today = now.split('T')[0];
      const streak = db.prepare('SELECT * FROM learn_streaks WHERE user_id = 1').get() as any;
      if (streak) {
        const lastDate = streak.last_study_date;
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
        let newStreak = streak.current_streak;
        if (lastDate === today) {
          // Already studied today, no change
        } else if (lastDate === yesterday) {
          newStreak = streak.current_streak + 1;
        } else {
          newStreak = 1; // Streak broken
        }
        db.prepare('UPDATE learn_streaks SET current_streak = ?, longest_streak = MAX(longest_streak, ?), last_study_date = ?, updated_at = ? WHERE user_id = 1')
          .run(newStreak, newStreak, today, now);
      } else {
        db.prepare('INSERT INTO learn_streaks (user_id, current_streak, longest_streak, last_study_date) VALUES (1, 1, 1, ?)').run(today);
      }

      // Update lesson stats
      if (args.sessionId) {
        const session = db.prepare('SELECT lesson_id FROM learn_sessions WHERE id = ?').get(args.sessionId) as any;
        if (session?.lesson_id) {
          const existing = db.prepare('SELECT * FROM learn_lesson_stats WHERE lesson_id = ?').get(session.lesson_id) as any;
          if (existing) {
            db.prepare('UPDATE learn_lesson_stats SET total_study_seconds = total_study_seconds + ?, sessions_count = sessions_count + 1, quizzes_taken = quizzes_taken + ?, cards_reviewed = cards_reviewed + ?, mastery_gained = mastery_gained + ?, last_studied_at = ? WHERE lesson_id = ?')
              .run(args.duration, args.quizzesTaken || 0, args.cardsReviewed || 0, args.masteryGained || 0, now, session.lesson_id);
          } else {
            db.prepare('INSERT INTO learn_lesson_stats (lesson_id, total_study_seconds, sessions_count, quizzes_taken, cards_reviewed, mastery_gained, first_studied_at, last_studied_at) VALUES (?, ?, 1, ?, ?, ?, ?, ?)')
              .run(session.lesson_id, args.duration, args.quizzesTaken || 0, args.cardsReviewed || 0, args.masteryGained || 0, now, now);
          }
        }
      }

      return { ok: true, data: { duration: args.duration, sessionLogged: true } };
    } catch (e: any) {
      return { ok: false, error: e.message };
    }
  });

  ipcMain.handle('learn:timerGetState', async () => {
    try {
      const lastEvent = db.prepare('SELECT * FROM learn_timer_queue ORDER BY id DESC LIMIT 1').get() as any;
      const activeSession = lastEvent?.event_type === 'start' || lastEvent?.event_type === 'resume'
        ? { startedAt: lastEvent.timestamp, lessonId: lastEvent.lesson_id }
        : null;
      return { ok: true, data: { activeSession } };
    } catch (e: any) {
      return { ok: false, error: e.message };
    }
  });

  // ── Goals System ──
  ipcMain.handle('learn:getGoals', async (_event, args: { type?: string; date?: string }) => {
    try {
      let query = 'SELECT * FROM learn_goals WHERE user_id = 1';
      const params: any[] = [];
      if (args.type) { query += ' AND type = ?'; params.push(args.type); }
      if (args.date) { query += ' AND period_start <= ? AND (period_end IS NULL OR period_end >= ?)'; params.push(args.date, args.date); }
      query += ' ORDER BY created_at DESC';
      const goals = db.prepare(query).all(...params);
      return { ok: true, data: goals };
    } catch (e: any) {
      return { ok: false, error: e.message };
    }
  });

  ipcMain.handle('learn:setGoal', async (_event, args: { type: string; metric: string; target: number; periodStart: string; periodEnd?: string; deadline?: string }) => {
    try {
      const result = db.prepare('INSERT INTO learn_goals (user_id, type, metric, target, period_start, period_end, deadline) VALUES (1, ?, ?, ?, ?, ?, ?)')
        .run(args.type, args.metric, args.target, args.periodStart, args.periodEnd || null, args.deadline || null);
      const goal = db.prepare('SELECT * FROM learn_goals WHERE id = ?').get(result.lastInsertRowid);
      return { ok: true, data: goal };
    } catch (e: any) {
      return { ok: false, error: e.message };
    }
  });

  ipcMain.handle('learn:updateGoalProgress', async (_event, args: { goalId: number; delta: number }) => {
    try {
      db.prepare('UPDATE learn_goals SET current = current + ? WHERE id = ?').run(args.delta, args.goalId);
      const goal = db.prepare('SELECT * FROM learn_goals WHERE id = ?').get(args.goalId) as any;
      if (goal && goal.current >= goal.target && !goal.completed_at) {
        db.prepare('UPDATE learn_goals SET completed_at = ? WHERE id = ?').run(new Date().toISOString(), args.goalId);
      }
      const updated = db.prepare('SELECT * FROM learn_goals WHERE id = ?').get(args.goalId);
      return { ok: true, data: updated };
    } catch (e: any) {
      return { ok: false, error: e.message };
    }
  });

  ipcMain.handle('learn:getGoalSuggestions', async () => {
    try {
      const avgSession = db.prepare('SELECT AVG(duration) as avg FROM learn_sessions WHERE duration > 0').get() as any;
      const avgCards = db.prepare('SELECT AVG(cards_reviewed) as avg FROM learn_sessions WHERE cards_reviewed > 0').get() as any;
      const suggestions = [];
      if (avgSession?.avg) {
        suggestions.push({ metric: 'study_minutes', target: Math.ceil(avgSession.avg / 60 * 1.2), reason: 'Based on your average session' });
      }
      if (avgCards?.avg) {
        suggestions.push({ metric: 'cards_reviewed', target: Math.ceil(avgCards.avg * 1.2), reason: 'Based on your review pace' });
      }
      return { ok: true, data: suggestions };
    } catch (e: any) {
      return { ok: false, error: e.message };
    }
  });

  // ── Streak System ──
  ipcMain.handle('learn:getStreak', async () => {
    try {
      const streak = db.prepare('SELECT * FROM learn_streaks WHERE user_id = 1').get();
      return { ok: true, data: streak || { current_streak: 0, longest_streak: 0, last_study_date: null, streak_freezes: 0 } };
    } catch (e: any) {
      return { ok: false, error: e.message };
    }
  });

  // ── Achievements System ──
  ipcMain.handle('learn:getAchievements', async (_event, args: { viewed?: boolean }) => {
    try {
      let query = 'SELECT * FROM learn_achievements WHERE user_id = 1';
      if (args.viewed !== undefined) {
        query += args.viewed ? ' WHERE viewed_at IS NOT NULL' : ' WHERE viewed_at IS NULL';
      }
      query += ' ORDER BY earned_at DESC';
      const achievements = db.prepare(query).all();
      return { ok: true, data: achievements };
    } catch (e: any) {
      return { ok: false, error: e.message };
    }
  });

  ipcMain.handle('learn:checkAchievements', async (_event, args: { trigger: string; metadata?: any }) => {
    try {
      const newAchievements = [];
      const badges: Record<string, { key: string; condition: () => boolean }> = {
        first_card: { key: 'first_card', condition: () => (db.prepare('SELECT COUNT(*) as c FROM learn_card_reviews').get() as any).c >= 1 },
        first_quiz: { key: 'first_quiz', condition: () => (db.prepare('SELECT COUNT(*) as c FROM learn_evidence').get() as any).c >= 1 },
        streak_7: { key: 'streak_7', condition: () => ((db.prepare('SELECT current_streak FROM learn_streaks WHERE user_id = 1').get() as any)?.current_streak || 0) >= 7 },
        cards_100: { key: 'cards_100', condition: () => (db.prepare('SELECT COUNT(*) as c FROM learn_card_reviews').get() as any).c >= 100 },
      };
      
      for (const [name, badge] of Object.entries(badges)) {
        const exists = db.prepare('SELECT id FROM learn_achievements WHERE badge_key = ?').get(badge.key);
        if (!exists && badge.condition()) {
          db.prepare('INSERT INTO learn_achievements (user_id, badge_key) VALUES (1, ?)').run(badge.key);
          newAchievements.push(badge.key);
        }
      }
      return { ok: true, data: newAchievements };
    } catch (e: any) {
      return { ok: false, error: e.message };
    }
  });

  ipcMain.handle('learn:markAchievementViewed', async (_event, args: { badgeKey: string }) => {
    try {
      db.prepare('UPDATE learn_achievements SET viewed_at = ? WHERE badge_key = ? AND user_id = 1').run(new Date().toISOString(), args.badgeKey);
      return { ok: true, data: true };
    } catch (e: any) {
      return { ok: false, error: e.message };
    }
  });

  // ── Analytics ──
  ipcMain.handle('learn:getSessionHistory', async (_event, args: { limit?: number; lessonId?: number }) => {
    try {
      let query = 'SELECT * FROM learn_sessions WHERE duration > 0';
      const params: any[] = [];
      if (args.lessonId) { query += ' AND lesson_id = ?'; params.push(args.lessonId); }
      query += ' ORDER BY date DESC LIMIT ?';
      params.push(args.limit || 20);
      const sessions = db.prepare(query).all(...params);
      return { ok: true, data: sessions };
    } catch (e: any) {
      return { ok: false, error: e.message };
    }
  });

  ipcMain.handle('learn:getLessonStats', async (_event, args: { lessonId: number }) => {
    try {
      const stats = db.prepare('SELECT * FROM learn_lesson_stats WHERE lesson_id = ?').get(args.lessonId);
      return { ok: true, data: stats || null };
    } catch (e: any) {
      return { ok: false, error: e.message };
    }
  });

  ipcMain.handle('learn:getVelocity', async () => {
    try {
      const last7 = db.prepare("SELECT SUM(duration) as total_time, COUNT(*) as sessions FROM learn_sessions WHERE date >= date('now', '-7 days') AND duration > 0").get() as any;
      const cards7 = db.prepare("SELECT SUM(cards_reviewed) as total FROM learn_sessions WHERE date >= date('now', '-7 days')").get() as any;
      const nodes7 = db.prepare("SELECT SUM(JSON_ARRAY_LENGTH(nodes_seen)) as total FROM learn_sessions WHERE date >= date('now', '-7 days')").get() as any;
      const studyDays = db.prepare("SELECT COUNT(DISTINCT date) as days FROM learn_sessions WHERE date >= date('now', '-7 days') AND duration > 0").get() as any;
      
      return { ok: true, data: {
        cards_per_day: (cards7?.total || 0) / 7,
        nodes_per_week: nodes7?.total || 0,
        avg_session_minutes: last7?.sessions > 0 ? (last7.total_time / 60) / last7.sessions : 0,
        study_days_per_week: studyDays?.days || 0,
      }};
    } catch (e: any) {
      return { ok: false, error: e.message };
    }
  });
}
