// knowledge-store.ts — Self-Contained Context/RAG System (RESULT.md R5)
// Main-process JSON store + simplified BM25 retrieval. Zero external deps.
import { app, ipcMain } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import * as crypto from 'crypto'

interface KBDocument { id: string; name: string; type: 'pdf' | 'md' | 'txt'; addedAt: number }
interface KBChunk { id: string; docId: string; content: string; tokens: string[] }
interface KnowledgeBase { documents: KBDocument[]; chunks: KBChunk[] }

let db: KnowledgeBase = { documents: [], chunks: [] }
let saveTimer: NodeJS.Timeout | null = null

// Inverted Index: Map<token, Set<chunkId>>
const invertedIndex = new Map<string, Set<string>>()
const idfScores = new Map<string, number>()

function kbFilePath(): string {
  return path.join(app.getPath('userData'), 'deskflow-kb.json')
}

// ── Tokenization / Chunking ──

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
}

function splitIntoChunks(text: string, maxTokens = 500): string[] {
  const paragraphs = text.split(/\n{2,}/)
  const chunks: string[] = []
  let current = ''
  for (const para of paragraphs) {
    const trimmed = para.trim()
    if (!trimmed) continue
    if (tokenize(trimmed).length > maxTokens) {
      // Split oversized paragraphs by sentences
      const sentences = trimmed.split(/(?<=[.!?])\s+/)
      for (const sentence of sentences) {
        if (tokenize(sentence).length > maxTokens) {
          // Last resort: hard word-split
          const words = sentence.split(/\s+/)
          for (let i = 0; i < words.length; i += maxTokens) {
            chunks.push(words.slice(i, i + maxTokens).join(' '))
          }
        } else {
          chunks.push(sentence)
        }
      }
      continue
    }
    const candidate = current ? `${current}\n\n${trimmed}` : trimmed
    if (tokenize(candidate).length <= maxTokens) {
      current = candidate
    } else {
      if (current) chunks.push(current)
      current = trimmed
    }
  }
  if (current) chunks.push(current)
  return chunks
}

// ── BM25 index ──

function buildBM25Index(): void {
  invertedIndex.clear()
  idfScores.clear()
  const N = db.chunks.length
  const docFrequency = new Map<string, number>()

  db.chunks.forEach(chunk => {
    const uniqueTokens = new Set(chunk.tokens)
    uniqueTokens.forEach(token => {
      if (!invertedIndex.has(token)) invertedIndex.set(token, new Set())
      invertedIndex.get(token)!.add(chunk.id)
      docFrequency.set(token, (docFrequency.get(token) || 0) + 1)
    })
  })

  // IDF: log(N / df)
  docFrequency.forEach((df, token) => {
    idfScores.set(token, Math.log((N - df + 0.5) / (df + 0.5) + 1))
  })
}

// ── Persistence ──

function scheduleSave(): void {
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    try {
      fs.writeFileSync(kbFilePath(), JSON.stringify(db), 'utf-8')
    } catch (e) {
      console.error('[KB] save failed:', e)
    }
    saveTimer = null
  }, 500)
}

// ── Public API ──

export function initKnowledgeStore(): void {
  try {
    if (fs.existsSync(kbFilePath())) {
      const raw = fs.readFileSync(kbFilePath(), 'utf-8')
      const parsed = JSON.parse(raw)
      if (parsed && Array.isArray(parsed.documents) && Array.isArray(parsed.chunks)) {
        db = { documents: parsed.documents, chunks: parsed.chunks }
      }
    }
  } catch (e) {
    console.error('[KB] init failed:', e)
  }
  buildBM25Index()
}

export function registerKnowledgeHandlers(): void {
  ipcMain.handle('kb:ingest', async (_event, file: { name: string; type: string; content: string }) => {
    if (!file || typeof file.name !== 'string' || typeof file.content !== 'string') {
      return { success: false, error: 'Invalid file payload' }
    }
    const type = ['pdf', 'md', 'txt'].includes(file.type) ? file.type : 'txt'
    const content = file.content.slice(0, 2_000_000) // 2MB cap
    if (content.trim().length === 0) return { success: false, error: 'File is empty' }

    // 1. Chunking (paragraph/sentence split, ~500 tokens max)
    const rawChunks = splitIntoChunks(content, 500)

    // 2. Tokenization
    const docId = crypto.randomUUID()
    const newChunks: KBChunk[] = rawChunks.map(text => ({
      id: crypto.randomUUID(),
      docId,
      content: text,
      tokens: tokenize(text),
    }))

    // 3. Update memory & disk
    db.documents.push({ id: docId, name: file.name, type: type as KBDocument['type'], addedAt: Date.now() })
    db.chunks.push(...newChunks)
    scheduleSave()

    // 4. Rebuild index
    buildBM25Index()
    console.log(`[KB] ingested "${file.name}" (${newChunks.length} chunks, ${db.documents.length} docs)`)
    return { success: true, docId, chunkCount: newChunks.length }
  })

  ipcMain.handle('kb:query', async (_event, query: string, limit = 5) => {
    if (typeof query !== 'string' || !query.trim()) return []
    const queryTokens = tokenize(query)
    const scores = new Map<string, number>()

    queryTokens.forEach(qt => {
      const chunkIds = invertedIndex.get(qt)
      if (!chunkIds) return
      const idf = idfScores.get(qt) || 0
      chunkIds.forEach(chunkId => {
        scores.set(chunkId, (scores.get(chunkId) || 0) + idf)
      })
    })

    const sorted = Array.from(scores.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)

    return sorted
      .map(([chunkId]) => db.chunks.find(c => c.id === chunkId))
      .filter((c): c is KBChunk => !!c)
      .map(({ id, docId, content }) => {
        const doc = db.documents.find(d => d.id === docId)
        return { id, docId, docName: doc?.name || 'unknown', content }
      })
  })

  ipcMain.handle('kb:list', async () => {
    return db.documents.map(({ id, name, type, addedAt }) => ({ id, name, type, addedAt }))
  })

  ipcMain.handle('kb:remove', async (_event, docId: string) => {
    if (typeof docId !== 'string') return { success: false, error: 'Invalid doc id' }
    const before = db.documents.length
    db.documents = db.documents.filter(d => d.id !== docId)
    db.chunks = db.chunks.filter(c => c.docId !== docId)
    if (db.documents.length === before) return { success: false, error: 'Document not found' }
    scheduleSave()
    buildBM25Index()
    console.log(`[KB] removed doc ${docId} (${db.documents.length} docs left)`)
    return { success: true }
  })
}

// Flush any pending debounced write on quit
export function flushKnowledgeStore(): void {
  if (saveTimer) {
    clearTimeout(saveTimer)
    saveTimer = null
    try {
      fs.writeFileSync(kbFilePath(), JSON.stringify(db), 'utf-8')
    } catch (e) {
      console.error('[KB] flush failed:', e)
    }
  }
}
