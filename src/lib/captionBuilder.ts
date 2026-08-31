import type { CaptionLine, CaptionTrack } from '../features/overlay-studio/state/studioTypes';

/**
 * Deterministic caption generation from a transcript.
 * NO AI — fully §0c-compliant, instant, runs entirely in the renderer.
 *
 * Transcript shape (matches main.ts overlay-studio:transcribe + readTranscript output):
 *   { video_id?, duration?: number, segments: Array<{ id: number; start: number; end: number; text: string }> }
 *
 * CaptionTrack shape:
 *   { sessionId: string; source: 'transcript' | 'bridge_styled'; lines: CaptionLine[]; createdAt: string }
 *   each CaptionLine: { id: string; start: number; end: number; text: string; highlight?: string[] }
 *
 * Rules (per CORRECTED_SPEC.md §4 + overlay prompt word limits from MEMORY.md:192):
 *   - caption line text ≤ 14 words
 *   - timing = first segment start .. last segment end for each merged line
 *   - highlight = intersection with seoPhrases when linked, else longest content word in the line
 */

const MAX_WORDS_PER_LINE = 14;
const WORD_SEP = /\s+/;

function countWords(text: string): number {
  const t = text.trim();
  if (!t) return 0;
  return t.split(WORD_SEP).length;
}

function longestWord(text: string): string {
  const words = text.trim().split(WORD_SEP).filter(Boolean);
  if (words.length === 0) return '';
  let best = '';
  for (const w of words) {
    const clean = w.replace(/^[^a-zA-Z0-9]+|[^a-zA-Z0-9]+$/g, '');
    if (clean.length > best.length) best = clean;
  }
  return best;
}

/**
 * Build a CaptionTrack from a raw transcript, deterministically.
 *
 * @param transcript  - the raw transcript object from the backend
 * @param sessionId   - the StudioSession id this track belongs to
 * @param seoPhrases  - optional array of SEO phrases (lowercased) to highlight;
 *                      when provided and a caption line contains a phrase, that phrase
 *                      is marked as highlight; when absent, the longest content word is used
 * @returns a CaptionTrack ready to store under deskflow.caption.<sessionId>
 */
export function buildCaptionFromTranscript(
  transcript: any,
  sessionId: string,
  seoPhrases?: string[],
): CaptionTrack {
  const segments: Array<{ id: number; start: number; end: number; text: string }> =
    Array.isArray(transcript?.segments)
      ? transcript.segments.map((s: any, idx: number) => ({
          id: s.id != null ? Number(s.id) : idx,
          start: Number(s.start) || 0,
          end: Number(s.end) || 0,
          text: String(s.text || '').trim(),
        }))
      : [];

  const prepared = segments.filter((s) => s.text.length > 0 && s.end > s.start);
  if (prepared.length === 0) {
    return mkEmptyTrack(sessionId);
  }

  const lines: CaptionLine[] = [];
  let i = 0;
  while (i < prepared.length) {
    const group: Array<{ id: number; start: number; end: number; text: string }> = [];
    let wordCount = 0;
    let j = i;
    while (j < prepared.length) {
      const seg = prepared[j];
      const needed = Math.max(1, MAX_WORDS_PER_LINE - wordCount);
      const segWords = seg.text.split(WORD_SEP).filter(Boolean);
      if (segWords.length <= needed) {
        group.push(seg);
        wordCount += segWords.length;
        j++;
      } else {
        break;
      }
    }
    // If the current segment alone exceeds the limit, split it.
    if (group.length === 0 && j < prepared.length) {
      const seg = prepared[j];
      const words = seg.text.split(WORD_SEP).filter(Boolean);
      let taken = 0;
      const chunks: string[] = [];
      while (taken < words.length) {
        const chunkWords: string[] = [];
        while (taken < words.length && chunkWords.length < MAX_WORDS_PER_LINE) {
          chunkWords.push(words[taken]);
          taken++;
        }
        chunks.push(chunkWords.join(' '));
      }
      for (let k = 0; k < chunks.length; k++) {
        const text = chunks[k];
        const start = k === 0 ? seg.start : (k === chunks.length - 1 ? seg.end : (seg.start + seg.end) / 2);
        const end = k === chunks.length - 1 ? seg.end : (k === 0 ? (seg.start + seg.end) / 2 : seg.end);
        lines.push(mkLine(text, start, end, seoPhrases));
      }
      i = j + 1;
      continue;
    }
    const first = group[0];
    const last = group[group.length - 1];
    const text = group.map((g) => g.text).join(' ');
    lines.push(mkLine(text, first.start, last.end, seoPhrases));
    i = j;
  }

  return {
    sessionId,
    source: 'transcript',
    lines,
    createdAt: new Date().toISOString(),
  };
}

function mkEmptyTrack(sessionId: string): CaptionTrack {
  return {
    sessionId,
    source: 'transcript',
    lines: [],
    createdAt: new Date().toISOString(),
  };
}

function mkLine(text: string, start: number, end: number, seoPhrases?: string[]): CaptionLine {
  const id = `cap-${start}-${end}-${Math.random().toString(36).slice(2, 8)}`;
  let highlight: string[] | undefined;
  if (seoPhrases && seoPhrases.length > 0) {
    const lower = text.toLowerCase();
    const matched: string[] = [];
    for (const phrase of seoPhrases) {
      const p = String(phrase).trim().toLowerCase();
      if (p && lower.includes(p)) matched.push(p);
    }
    if (matched.length > 0) highlight = matched;
  }
  if (!highlight) {
    const lw = longestWord(text);
    if (lw.length > 1) highlight = [lw];
  }
  return { id, start, end, text, highlight };
}

/**
 * Validate a single caption line against the 14-word limit.
 * Returns true when the line is valid; false when it needs repair.
 */
export function captionLineValid(line: CaptionLine): boolean {
  return countWords(line.text) <= MAX_WORDS_PER_LINE;
}

/**
 * Validate a whole track; returns the list of invalid line ids.
 */
export function captionTrackValid(track: CaptionTrack): string[] {
  return track.lines.filter((l) => !captionLineValid(l)).map((l) => l.id);
}

/**
 * Re-validate a track after an inline edit; repair by truncating to MAX_WORDS_PER_LINE words.
 */
export function repairCaptionLine(text: string): { ok: boolean; text: string } {
  const words = text.trim().split(WORD_SEP).filter(Boolean);
  if (words.length <= MAX_WORDS_PER_LINE) return { ok: true, text };
  const truncated = words.slice(0, MAX_WORDS_PER_LINE).join(' ');
  return { ok: false, text: truncated };
}
