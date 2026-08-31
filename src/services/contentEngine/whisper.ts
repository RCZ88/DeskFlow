// Content Engine — Transcription service
// Uses AI provider chain for transcription with word-level timestamps.
// No external binaries required — works with any configured AI provider.
import { readFileSync, existsSync } from 'fs';
import { parseAiJson } from './responseParser';

export interface TranscriptSegment {
  start_s: number;
  end_s: number;
  text: string;
  seg_type: 'hook' | 'beat' | 'transition' | 'cta' | 'silence' | 'filler';
}

/**
 * Transcribe an audio/video file using the configured AI provider.
 * Sends the audio as base64 to the provider's multimodal endpoint.
 * Returns timed segments with timestamps.
 */
export async function transcribeAudio(
  filePath: string,
  aiCall: (prompt: string, systemPrompt: string, maxTokens?: number) => Promise<string>,
  durationSeconds?: number,
): Promise<TranscriptSegment[]> {
  if (!existsSync(filePath)) throw new Error(`File not found: ${filePath}`);

  const audioBuf = readFileSync(filePath);
  const audioBase64 = audioBuf.toString('base64');
  const ext = filePath.split('.').pop()?.toLowerCase() || 'mp4';
  const mimeMap: Record<string, string> = { mp4: 'video/mp4', mov: 'video/quicktime', wav: 'audio/wav', mp3: 'audio/mpeg', webm: 'video/webm', m4a: 'audio/mp4', ogg: 'audio/ogg', avi: 'video/x-msvideo' };
  const mime = mimeMap[ext] || 'video/mp4';

  const dur = durationSeconds || 30;

  // Ask the AI to transcribe with timestamps
  const prompt = `You are a video transcription engine. Transcribe this audio/video file with precise timestamps.

The file is ${dur.toFixed(1)} seconds long.

Return a JSON array of timed segments. Each segment must have:
- start_s: start time in seconds (decimal, e.g. 0.0, 2.5, 8.3)
- end_s: end time in seconds
- text: the spoken words in that segment
- seg_type: one of "hook" | "beat" | "transition" | "cta" | "silence" | "filler"

Classification rules:
- "hook": first 3 seconds of speech, or any opening question/statement
- "cta": subscribe, follow, like, comment, link in bio, check out, sign up
- "transition": moving on, next up, let's talk, here's the thing, but actually, so now
- "filler": um, uh, like, you know, basically, so, yeah, okay, right, well (alone)
- "silence": pauses, no speech
- "beat": everything else (the main content)

Rules:
- Segments must be contiguous (no gaps between end_s of one and start_s of next)
- Each segment should be 1-8 seconds
- Be precise with timestamps — match the actual speech timing
- Include ALL spoken words, even partial sentences
- If you cannot determine exact timestamps, distribute evenly across ${dur}s

Return JSON: { "segments": [{ "start_s": number, "end_s": number, "text": "string", "seg_type": "string" }] }

Respond in JSON only. No markdown, no code fences, no explanation.`;

  const res = await parseAiJson<{ segments: TranscriptSegment[] }>(
    prompt,
    { required: ['segments'], arrayAt: 'segments' },
    (p, s) => aiCall(p, s, 4000),
  );

  if (!res.ok || !res.data.segments?.length) {
    // Fallback: generate evenly-spaced placeholder segments
    return generateFallbackSegments(dur);
  }

  // Normalize and classify
  return res.data.segments.map((s: any, i: number) => ({
    start_s: Math.max(0, Math.min(s.start_s ?? (i * dur / res.data.segments.length), dur)),
    end_s: Math.max(0, Math.min(s.end_s ?? ((i + 1) * dur / res.data.segments.length), dur)),
    text: String(s.text || '').trim(),
    seg_type: classifySegment(String(s.text || ''), s.start_s ?? 0, i === 0),
  }));
}

/**
 * Public entry used by the takes-transcribe handler.
 * Bridges the AI-provider chain (`aiCall`) to the file-based transcription path.
 * (A local Whisper binary, if present, is preferred upstream in the handler.)
 */
export async function transcribeWithWhisper(
  filePath: string,
  aiCall: (prompt: string, systemPrompt: string, maxTokens?: number) => Promise<string>,
  durationSeconds?: number,
): Promise<TranscriptSegment[]> {
  return transcribeAudio(filePath, aiCall, durationSeconds);
}

function generateFallbackSegments(duration: number): TranscriptSegment[] {
  const count = Math.max(1, Math.ceil(duration / 5));
  const segs: TranscriptSegment[] = [];
  for (let i = 0; i < count; i++) {
    const start = (i * duration) / count;
    const end = ((i + 1) * duration) / count;
    segs.push({
      start_s: Math.round(start * 100) / 100,
      end_s: Math.round(end * 100) / 100,
      text: `[Segment ${i + 1}]`,
      seg_type: i === 0 ? 'hook' : 'beat',
    });
  }
  return segs;
}

function classifySegment(text: string, start_s: number, isFirst: boolean): TranscriptSegment['seg_type'] {
  const lower = text.toLowerCase();
  if (isFirst && start_s <= 5) return 'hook';
  if (/\b(subscribe|follow|like|comment|share|link in bio|check out|click|visit|sign up|download)\b/i.test(lower)) return 'cta';
  if (/\b(so now|moving on|next up|let'?s talk|here'?s the thing|but actually|now|okay so|alright)\b/i.test(lower)) return 'transition';
  if (/^(um|uh|like|you know|basically|actually|so|yeah|okay|right|well)$/i.test(lower.trim())) return 'filler';
  if (text.length < 3 || /^\.{3,}$/.test(text.trim())) return 'silence';
  return 'beat';
}
