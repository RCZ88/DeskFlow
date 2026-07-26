const CATEGORY_PATTERNS: Record<string, RegExp[]> = {
  goal: [/goal|objective|target|aim/i, /set a goal|new goal|goal for/i],
  preference: [/prefer|like|don't like|favorite|instead of/i, /i want|i would rather/i],
  decision: [/decided|choose|picked|went with|settled on/i, /decision|conclusion/i],
  context: [/project|client|team|deadline|meeting/i, /working on|assigned to/i],
  habit: [/every day|daily|routine|habit|usually|typically/i],
}

export interface MemoryEntry {
  id: string
  threadDate: string
  content: string
  category: "goal" | "preference" | "decision" | "context" | "project" | "habit"
  importance: number
  createdAt: number
}

export function extractMemoriesFromMessages(
  threadDate: string,
  messages: Array<{ content: string; parsed?: any }>
): MemoryEntry[] {
  const memories: MemoryEntry[] = []

  for (const msg of messages) {
    const content = msg.content

    for (const [category, patterns] of Object.entries(CATEGORY_PATTERNS)) {
      for (const pattern of patterns) {
        const match = content.match(pattern)
        if (match) {
          const sentenceStart = content.lastIndexOf(".", match.index) + 1
          const sentenceEnd = content.indexOf(".", match.index! + match[0].length)
          const sentence = content.slice(sentenceStart, sentenceEnd > -1 ? sentenceEnd + 1 : undefined).trim()

          if (sentence.length > 10 && sentence.length < 200) {
            const importance = calculateImportance(sentence, category, msg.parsed)
            memories.push({
              id: crypto.randomUUID(),
              threadDate,
              content: sentence,
              category: category as any,
              importance,
              createdAt: Date.now(),
            })
          }
          break
        }
      }
    }

    if (msg.parsed?.type === "goal_suggestion") {
      for (const goal of msg.parsed.goals ?? []) {
        memories.push({
          id: crypto.randomUUID(),
          threadDate,
          content: `Goal suggested: ${goal.title} (${goal.category})`,
          category: "goal",
          importance: 0.7,
          createdAt: Date.now(),
        })
      }
    }

    if (msg.parsed?.type === "plan_update") {
      memories.push({
        id: crypto.randomUUID(),
        threadDate,
        content: `Plan updated: ${msg.parsed.note || "schedule changes"}`,
        category: "decision",
        importance: 0.6,
        createdAt: Date.now(),
      })
    }
  }

  const seen = new Set<string>()
  return memories.filter(m => {
    const key = m.content.toLowerCase().slice(0, 40)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function calculateImportance(sentence: string, category: string, parsed?: any): number {
  let score = 0.5
  if (category === "goal") score += 0.2
  if (category === "decision") score += 0.15
  if (sentence.includes("important") || sentence.includes("critical")) score += 0.15
  if (parsed) score += 0.1
  return Math.min(1, Math.max(0, score))
}
