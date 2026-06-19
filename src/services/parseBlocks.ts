import { parseBlocks as legacyParse } from './parseBlocks.legacy'
import type {
  ParsedResponse, WireNode, WireBlock, WireGroup,
  BlockMeta, AccentToken, Priority, InlineNode, BlockType,
} from './wireFormat'
export type { BlockType, Item, Block } from './parseBlocks.legacy'
export { parseBlocks as parseBlocksLegacy } from './parseBlocks.legacy'

const HAS_V2 = /(^|\n)\s*>>{1,2}\w/

function parseHeader(rest: string): { type: BlockType; meta: BlockMeta } {
  const [typeTok, ...attrs] = rest.trim().split(/\s+/)
  const meta: BlockMeta = { priority: 'secondary' }
  for (const a of attrs) {
    if (a === 'p1') meta.priority = 'primary'
    else if (a === 'p2') meta.priority = 'secondary'
    else if (a === 'p3') meta.priority = 'tertiary'
    else if (a.startsWith('#')) meta.icon = a.slice(1)
    else if (a.startsWith('~')) meta.accent = a.slice(1) as AccentToken
  }
  return { type: typeTok as BlockType, meta }
}

function parseInline(str: string): InlineNode[] {
  const nodes: InlineNode[] = []
  let i = 0

  while (i < str.length) {
    const r = str.slice(i)

    const cite = r.match(/^<s\s+id=(\d+)>([^<]+)<\/s>/)
    if (cite) {
      nodes.push({ t: 'cite', id: cite[1], v: cite[2] })
      i += cite[0].length
      continue
    }

    const metric = r.match(/^<m>([^<]+)<\/m>/)
    if (metric) {
      nodes.push({ t: 'metric', v: metric[1] })
      i += metric[0].length
      continue
    }

    const code = r.match(/^`([^`]+)`/)
    if (code) {
      nodes.push({ t: 'code', v: code[1] })
      i += code[0].length
      continue
    }

    const link = r.match(/^\[([^\]]+)\]\(([^)]+)\)/)
    if (link) {
      nodes.push({ t: 'link', v: link[1], href: link[2] })
      i += link[0].length
      continue
    }

    const bold = r.match(/^\*\*([^*]+)\*\*/)
    if (bold) {
      nodes.push({ t: 'bold', v: bold[1] })
      i += bold[0].length
      continue
    }

    const italic = r.match(/^_([^_]+)_/)
    if (italic) {
      nodes.push({ t: 'italic', v: italic[1] })
      i += italic[0].length
      continue
    }

    const strike = r.match(/^~~([^~]+)~~/)
    if (strike) {
      nodes.push({ t: 'strike', v: strike[1] })
      i += strike[0].length
      continue
    }

    if (r[0] === '\n') { nodes.push({ t: 'text', v: '\n' }); i += 1; continue }

    const chunkEnd = r.search(/[`<\[*_~]/)
    if (chunkEnd === 0) { i += 1; continue }
    const chunk = chunkEnd === -1 ? r : r.slice(0, chunkEnd)
    if (chunk) nodes.push({ t: 'text', v: chunk })
    i += chunkEnd === -1 ? r.length : chunkEnd
  }

  return nodes
}

export function parseStructuredResponse(raw: string): ParsedResponse {
  if (!HAS_V2.test(raw)) {
    const legacy = legacyParse(raw)
    return {
      version: 1, refs: {},
      nodes: legacy.map((b): WireBlock => ({
        kind: 'block',
        type: b.type as BlockType,
        meta: { priority: 'secondary' },
        fields: Object.fromEntries(
          Object.entries(b.fields).map(([k, v]) => [k, Array.isArray(v) ? '' : v])
        ),
        items: Array.isArray((b.fields as any).items) ? (b.fields as any).items : undefined,
        prose: b.type === 'text' ? parseInline(String((b.fields as any).body ?? '')) : undefined,
      })),
    }
  }

  const lines = raw.split(/\r?\n/)
  const nodes: WireNode[] = []
  const refs: ParsedResponse['refs'] = {}
  let group: WireGroup | null = null
  let cur: WireBlock | null = null
  let inRefs = false

  const push = (b: WireBlock) => (group ? group.children.push(b) : nodes.push(b))
  const flush = () => { if (cur) { push(cur); cur = null } }

  for (const line of lines) {
    const t = line.trimEnd()
    if (t.startsWith('>>>group')) {
      flush()
      const title = t.match(/title="([^"]*)"/)?.[1]
      const accent = t.match(/~(\w+)/)?.[1] as AccentToken | undefined
      group = { kind: 'group', title, accent, children: [] }
      continue
    }
    if (t.startsWith('<<<')) { flush(); if (group) nodes.push(group); group = null; continue }
    if (t.startsWith('>>refs')) { flush(); inRefs = true; continue }
    if (inRefs && /^\d+:/.test(t.trim())) {
      const [id, body] = t.trim().split(/:\s*/, 2)
      if (body) {
        const [label, meta] = body.split(/\s*\|\s*/)
        refs[id] = { label, href: meta?.match(/route:(\S+)/)?.[1] }
      }
      continue
    }
    if (t.startsWith('>>')) {
      flush(); inRefs = false
      const { type, meta } = parseHeader(t.slice(2))
      cur = {
        kind: 'block', type: type as BlockType, meta,
        fields: {},
        items: type === 'goal-list' ? [] : undefined,
        prose: type === 'text' ? [] : undefined,
        rows: type === 'table' ? [] : undefined,
      }
      continue
    }
    if (!cur) {
      cur = { kind: 'block', type: 'text', meta: { priority: 'secondary' }, fields: {}, prose: [] }
    }

    const item = t.match(/^\s*-\s*\[( |x)\]\s*(.+?)(?:\s*\(([^)]+)\))?$/)
    const kv = t.match(/^([a-zA-Z][\w-]*):\s*(.*)$/)
    if (cur.items && item) cur.items.push({ checked: item[1] === 'x', label: item[2], category: item[3] })
    else if (cur.rows && t.includes('|')) cur.rows.push(t.split('|').map(c => c.trim()))
    else if (cur.type !== 'text' && kv) cur.fields[kv[1]] = kv[2]
    else if (cur.prose) cur.prose.push(...parseInline(t), { t: 'text', v: '\n' })
  }
  flush(); if (group) nodes.push(group)
  return { version: 2, nodes, refs }
}
