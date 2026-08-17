/**
 * EmbeddingService — local embedding generation + cosine similarity search
 * 
 * Primary: hashed term-vector (bag-of-words with hashing to a fixed
 * dimension, L2-normalized) — zero native dependencies, works offline.
 * Optional: lazy-loads transformers.js ONNX/WASM model when available
 * (NOT installed by default — the fallback keeps everything functional).
 * 
 * Embeddings are stored as Float32Array BLOBs in context_embeddings.
 */

import * as brain from './contextBrain'

const DIM = 256

// ═══ Hashing ═══
function hashString(str: string): number {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

const STOPWORDS = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'is', 'are', 'was', 'were', 'be', 'been',
  'to', 'of', 'in', 'on', 'at', 'for', 'with', 'by', 'from', 'as', 'i', 'you', 'he', 'she', 'it', 'we',
  'they', 'this', 'that', 'these', 'those', 'my', 'your', 'our', 'their', 'have', 'has', 'had', 'do',
  'does', 'did', 'will', 'would', 'can', 'could', 'should', 'not', 'no', 'so', 'if', 'then', 'than',
  'too', 'very', 'just', 'about', 'into', 'over', 'after', 'before', 'again', 'once', 'here', 'there'])

function tokenize(text: string): string[] {
  return text.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 1 && !STOPWORDS.has(t))
}

export function embedText(text: string): number[] {
  const vec = new Array(DIM).fill(0)
  const tokens = tokenize(text)
  // TF weighting with hashing trick
  const counts = new Map<string, number>()
  for (const t of tokens) counts.set(t, (counts.get(t) || 0) + 1)
  for (const [t, c] of counts) {
    const idx = hashString(t) % DIM
    vec[idx] += 1 + Math.log(c)
  }
  // L2 normalize
  let norm = 0
  for (const v of vec) norm += v * v
  norm = Math.sqrt(norm)
  if (norm === 0) return vec
  return vec.map(v => v / norm)
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0
  let dot = 0
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i]
  return dot // both normalized → dot = cosine
}

// ═══ Embedding storage ═══

export function embedEpisode(episodeId: string, content: string): void {
  const vec = embedText(content)
  brain.storeEmbedding(episodeId, 'episode', vec)
}

export function embedSignal(signalId: string, content: string): void {
  const vec = embedText(content)
  brain.storeEmbedding(signalId, 'signal', vec)
}

// ═══ Search ═══

export function searchEmbeddings(query: string, limit: number = 10): Array<{ refId: string; refType: string; score: number }> {
  const queryVec = embedText(query)
  const all = getRawEmbeddings()
  const scored = all
    .map(({ refId, refType, vec }) => ({ refId, refType, score: cosineSimilarity(queryVec, vec) }))
    .filter(r => r.score > 0.05)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
  return scored
}

function getRawEmbeddings(): Array<{ refId: string; refType: string; vec: number[] }> {
  // Reached via brain's db — export a helper from contextBrain
  return brain.getAllEmbeddings()
}

// ═══ Reindex ═══

export function reindexEpisodes(): { processed: number; skipped: number } {
  const episodes = brain.getEpisodes(undefined, 2000)
  let processed = 0
  let skipped = 0
  for (const ep of episodes) {
    const existing = brain.getEmbedding(ep.id)
    if (existing) { skipped++; continue }
    embedEpisode(ep.id, ep.content)
    processed++
  }
  return { processed, skipped }
}

// ═══ Optional transformers.js lazy load (NOT installed by default) ═══

let semanticModel: any = null
let semanticAttempted = false

export async function tryLoadSemanticModel(): Promise<boolean> {
  if (semanticModel) return true
  if (semanticAttempted) return false
  semanticAttempted = true
  try {
    const mod = await import('@xenova/transformers')
    const { pipeline } = mod as any
    semanticModel = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2')
    return true
  } catch {
    return false
  }
}

export async function semanticEmbed(text: string): Promise<number[] | null> {
  if (!semanticModel) return null
  try {
    const out = await semanticModel(text, { pooling: 'mean', normalize: true })
    return Array.from(out.data as Float32Array)
  } catch {
    return null
  }
}

// ═══ Hybrid retrieval (keyword + embedding) ═══

export function hybridSearch(query: string, limit: number = 15): Array<{ type: string; id: string; score: number }> {
  const keyword = brain.keywordSearch(query, limit)
  const semantic = searchEmbeddings(query, limit)
  const merged = new Map<string, { type: string; id: string; score: number }>()

  for (const k of keyword) {
    merged.set(`${k.type}:${k.id}`, { type: k.type, id: k.id, score: k.score * 0.55 })
  }
  for (const s of semantic) {
    const type = s.refType === 'episode' ? 'episode' : 'signal'
    const existing = merged.get(`${type}:${s.refId}`)
    if (existing) existing.score = Math.min(1, existing.score + s.score * 0.3)
    else merged.set(`${type}:${s.refId}`, { type, id: s.refId, score: s.score * 0.3 })
  }
  return Array.from(merged.values()).sort((a, b) => b.score - a.score).slice(0, limit)
}