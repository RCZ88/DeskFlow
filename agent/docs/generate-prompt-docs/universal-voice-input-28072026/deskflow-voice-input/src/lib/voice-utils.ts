/**
 * Voice Input Utilities
 * Sentence boundary detection, cursor management, localStorage helpers
 */

const SENTENCE_BOUNDARIES = /[.!?。！？\n]+/;
const SECONDARY_BOUNDARIES = /[,;，；]+/;

export interface CursorPosition {
  start: number;
  end: number;
}

/**
 * Split text into sentences based on natural boundaries.
 * Primary: . ! ? newline
 * Secondary: , ; (used when no primary found)
 */
export function splitIntoSentences(text: string): string[] {
  if (!text.trim()) return [];

  // First try primary boundaries
  const primary = text.split(SENTENCE_BOUNDARIES).map(s => s.trim()).filter(Boolean);
  if (primary.length > 1) return primary;

  // Fallback to secondary boundaries for long segments
  const secondary = text.split(SECONDARY_BOUNDARIES).map(s => s.trim()).filter(Boolean);
  if (secondary.length > 1) return secondary;

  // Final fallback: whole text as one sentence
  return [text.trim()];
}

/**
 * Remove the last sentence from text and return the new text + removed sentence.
 */
export function removeLastSentence(text: string): { newText: string; removed: string } {
  const sentences = splitIntoSentences(text);
  if (sentences.length === 0) return { newText: text, removed: '' };
  if (sentences.length === 1) {
    const removed = sentences[0];
    return { newText: '', removed };
  }
  const removed = sentences[sentences.length - 1];
  const newText = sentences.slice(0, -1).join('. ') + '.';
  return { newText, removed };
}

/**
 * Insert text at cursor position within a string.
 */
export function insertAtCursor(
  value: string,
  insertion: string,
  cursor: CursorPosition,
  mode: 'append' | 'replace' = 'append'
): { newValue: string; newCursor: CursorPosition } {
  if (mode === 'replace' && cursor.start !== cursor.end) {
    const before = value.slice(0, cursor.start);
    const after = value.slice(cursor.end);
    const newValue = before + insertion + after;
    const pos = cursor.start + insertion.length;
    return { newValue, newCursor: { start: pos, end: pos } };
  }

  const before = value.slice(0, cursor.start);
  const after = value.slice(cursor.start);
  // Add space if inserting mid-text and no space exists
  const spacer = before.length > 0 && !before.endsWith(' ') && !before.endsWith('\n') && insertion.length > 0 ? ' ' : '';
  const newValue = before + spacer + insertion + after;
  const pos = cursor.start + spacer.length + insertion.length;
  return { newValue, newCursor: { start: pos, end: pos } };
}

/**
 * Get cursor position from an input/textarea element.
 */
export function getCursorPosition(el: HTMLInputElement | HTMLTextAreaElement): CursorPosition {
  return {
    start: el.selectionStart ?? 0,
    end: el.selectionEnd ?? 0,
  };
}

/**
 * Set cursor position on an input/textarea element.
 */
export function setCursorPosition(
  el: HTMLInputElement | HTMLTextAreaElement,
  pos: CursorPosition
): void {
  el.setSelectionRange(pos.start, pos.end);
}

// ── LocalStorage Helpers ──────────────────────────────────────────────

const LANG_KEY = 'voice-lang';

export function getStoredLanguage(): string {
  try {
    const stored = localStorage.getItem(LANG_KEY);
    if (stored) return stored;
  } catch { /* ignore */ }
  return navigator.language || 'en-US';
}

export function setStoredLanguage(lang: string): void {
  try {
    localStorage.setItem(LANG_KEY, lang);
  } catch { /* ignore */ }
}

// Supported language list
export const SUPPORTED_LANGUAGES = [
  { code: 'en-US', label: 'English (US)' },
  { code: 'en-GB', label: 'English (UK)' },
  { code: 'es-ES', label: 'Español' },
  { code: 'fr-FR', label: 'Français' },
  { code: 'de-DE', label: 'Deutsch' },
  { code: 'ja-JP', label: '日本語' },
  { code: 'ko-KR', label: '한국어' },
  { code: 'zh-CN', label: '中文' },
  { code: 'pt-BR', label: 'Português (BR)' },
] as const;

export type SupportedLanguage = typeof SUPPORTED_LANGUAGES[number]['code'];

// ── Smooth interpolation for audio bars ───────────────────────────────

export function lerpArray(
  current: Uint8Array,
  target: Uint8Array,
  factor: number
): Uint8Array {
  const result = new Uint8Array(current.length);
  for (let i = 0; i < current.length; i++) {
    result[i] = Math.round(current[i] + (target[i] - current[i]) * factor);
  }
  return result;
}

/**
 * Clamp a value between min and max.
 */
export function clamp(val: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, val));
}

/**
 * Format milliseconds as MM:SS
 */
export function formatTimer(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}
