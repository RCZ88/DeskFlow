export type BlockType =
  | 'goal-list' | 'goal-create' | 'goal-delete'
  | 'news-item' | 'data-summary' | 'error'
  | 'navigation' | 'text'

export interface Item {
  checked: boolean
  label: string
  category?: string
}

export interface Block {
  type: BlockType
  fields: Record<string, string | Item[]>
}

export function parseBlocks(raw: string): Block[] {
  try {
    const lines = raw.split('\n')
    const blocks: Block[] = []
    let current: { type: BlockType; fields: Record<string, string | Item[]> } | null = null
    let proseLines: string[] = []
    let inItems = false
    let itemsKey = ''
    let items: Item[] = []

    const flushProse = () => {
      if (proseLines.length > 0) {
        blocks.push({ type: 'text', fields: { body: proseLines.join('\n').trim() } })
        proseLines = []
      }
    }

    const flushItems = () => {
      if (inItems && current && itemsKey) {
        current.fields[itemsKey] = items
        items = []
        itemsKey = ''
        inItems = false
      }
    }

    for (const line of lines) {
      const typeMatch = line.match(/^\[type:\s*(\S+)\]/)
      if (typeMatch) {
        flushProse()
        flushItems()
        current = { type: typeMatch[1] as BlockType, fields: {} }
        blocks.push(current as Block)
        continue
      }

      if (!current) {
        proseLines.push(line)
        continue
      }

      if (line.trim() === '[items:') {
        flushProse()
        inItems = true
        itemsKey = 'items'
        items = []
        continue
      }

      if (inItems) {
        if (line.trim() === ']') {
          flushItems()
          continue
        }
        const itemMatch = line.match(/^-\s*(\[.?\])\s*(.+)/)
        if (itemMatch) {
          const checked = itemMatch[1] === '[x]' || itemMatch[1] === '[X]'
          const rest = itemMatch[2].trim()
          const catMatch = rest.match(/^(.+?)\s*\((\w+)\)$/)
          if (catMatch) {
            items.push({ checked, label: catMatch[1].trim(), category: catMatch[2] })
          } else {
            items.push({ checked, label: rest })
          }
        }
        continue
      }

      const kvMatch = line.match(/^\[(\w+):\s*(.*)\]/)
      if (kvMatch) {
        flushProse()
        current.fields[kvMatch[1]] = kvMatch[2].trim()
        continue
      }

      proseLines.push(line)
    }

    flushProse()
    flushItems()

    return blocks
  } catch {
    return [{ type: 'text', fields: { body: raw } }]
  }
}
