// Add these handlers to src/services/learn/index.ts

import * as flashcardService from './services/flashcard.service';
import { Rating } from 'ts-fsrs';

// Flashcards
ipcMain.handle('learn:getDueCards', async (_event, args: { deckId?: string; limit?: number }) => {
  return flashcardService.getDueCards(db, args.deckId, args.limit);
});

ipcMain.handle('learn:submitCardReview', async (_event, args: { cardId: string; rating: number }) => {
  return flashcardService.processReview(db, args.cardId, args.rating as Rating);
});

ipcMain.handle('learn:generateCards', async (_event, args: { deckId: string; nodeContent: string }) => {
  const aiResult = await callAi(buildFlashcardPrompt(args.nodeContent));
  return flashcardService.importGeneratedCards(db, args.deckId, aiResult.cards);
});

ipcMain.handle('learn:getDeckStats', async (_event, args: { deckId: string }) => {
  return flashcardService.getDeckStats(db, args.deckId);
});

// Visualizations
ipcMain.handle('learn:getStudyHeatmap', async (_event, args: { days: number }) => {
  return dashboardService.getHeatmapData(db, args.days);
});

ipcMain.handle('learn:getConceptMap', async (_event, args: { nodeId: string }) => {
  const cached = db.prepare('SELECT state_json FROM learn_viz_state WHERE viz_id = ?').get(args.nodeId);
  if (cached) return { ok: true, data: JSON.parse(cached.state_json) };
  const node = contentService.getNode(db, args.nodeId);
  const conceptMap = await callAi(buildConceptMapPrompt(node.blocks));
  db.prepare('INSERT OR REPLACE INTO learn_viz_state (id, user_id, viz_type, viz_id, state_json, updated_at) VALUES (?, ?, ?, ?, ?, ?)')
    .run(`viz_${args.nodeId}`, 'default', 'concept_map', args.nodeId, JSON.stringify(conceptMap), new Date().toISOString());
  return { ok: true, data: conceptMap };
});

ipcMain.handle('learn:saveVizState', async (_event, args: { vizType: string; vizId: string; state: any }) => {
  db.prepare('INSERT OR REPLACE INTO learn_viz_state (id, user_id, viz_type, viz_id, state_json, updated_at) VALUES (?, ?, ?, ?, ?, ?)')
    .run(`viz_${args.vizId}`, 'default', args.vizType, args.vizId, JSON.stringify(args.state), new Date().toISOString());
  return { ok: true, data: null };
});
