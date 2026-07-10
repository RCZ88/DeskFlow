// routes/learn.ts — 10 Lyceum learn endpoints
import type { FastifyInstance } from "fastify"
import { z } from "zod"
import { requireAuth } from "../auth.js"
import { getDb } from "../db/client.js"

// ── Zod schemas ────────────────────────────────────────────────────
const ImportBody = z.object({
  json: z.object({
    doc: z.literal("ldoc/1.0"),
    lesson: z.object({
      id: z.string(),
      title: z.string(),
      part: z.number(),
      version: z.string(),
      summary: z.string().optional(),
    }),
    nodes: z.array(z.object({
      id: z.string(),
      title: z.string(),
      mastery_target: z.string(),
      prereq: z.array(z.string()).optional(),
      content_hash: z.string().optional(),
      blocks: z.array(z.record(z.unknown())),
      grounding: z.record(z.unknown()),
    })),
  }),
})

const ValidateBody = z.object({
  doc: z.record(z.unknown()),
})

const TutorBody = z.object({
  nodeId: z.string(),
  blockId: z.string().optional(),
  question: z.string(),
  personaMd: z.string().optional(),
})

const QuizBody = z.object({
  nodeId: z.string(),
  blockId: z.string(),
  response: z.unknown(),
})

const BuildPromptBody = z.object({
  part: z.number(),
  nodeTarget: z.string(),
  personaMd: z.string(),
})

const GenerateBody = z.object({
  prompt: z.string(),
})

// ── Helpers ────────────────────────────────────────────────────────
function extractLessonSummary(row: any) {
  const doc = JSON.parse(row.lesson_json)
  return {
    id: row.id,
    title: row.title,
    part: row.part,
    version: row.version,
    summary: row.summary || doc.lesson?.summary || "",
    nodeCount: doc.nodes?.length || 0,
    nodeIds: (doc.nodes || []).map((n: any) => n.id),
  }
}

function validateLdoc(doc: any): { ok: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = []
  const warnings: string[] = []

  if (!doc || doc.doc !== "ldoc/1.0") errors.push("missing or invalid doc version (expected 'ldoc/1.0')")
  if (!doc?.lesson?.id) errors.push("missing lesson.id")
  if (!doc?.lesson?.title) errors.push("missing lesson.title")
  if (!Array.isArray(doc?.nodes)) errors.push("missing or invalid nodes array")

  if (doc?.nodes) {
    const nodeIds = new Set<string>()
    for (const node of doc.nodes) {
      if (!node.id) errors.push("node missing id")
      if (!node.title) errors.push(`node ${node.id || '?'} missing title`)
      if (!node.mastery_target) errors.push(`node ${node.id || '?'} missing mastery_target`)
      if (!Array.isArray(node.blocks)) errors.push(`node ${node.id || '?'} missing blocks array`)
      if (!node.grounding) errors.push(`node ${node.id || '?'} missing grounding`)
      if (nodeIds.has(node.id)) errors.push(`duplicate node id: ${node.id}`)
      nodeIds.add(node.id)
    }

    // Check prereq references
    for (const node of doc.nodes) {
      if (node.prereq) {
        for (const p of node.prereq) {
          if (!nodeIds.has(p)) warnings.push(`node ${node.id} has unresolved prereq: ${p}`)
        }
      }
    }
  }

  return { ok: errors.length === 0, errors, warnings }
}

// ── Routes ─────────────────────────────────────────────────────────
export async function learnRoutes(app: FastifyInstance) {
  // GET /v1/learn/lessons?part= — list all lessons
  app.get("/lessons", { preHandler: requireAuth }, async (req) => {
    const { sub: userId } = (req as any).user
    const part = (req.query as any).part
    const db = getDb()

    let sql = "SELECT * FROM learn_lessons WHERE user_id = ?"
    const args: any[] = [userId]
    if (part !== undefined) {
      sql += " AND part = ?"
      args.push(Number(part))
    }
    sql += " ORDER BY part, title"

    const result = await db.execute({ sql, args })
    return result.rows.map(extractLessonSummary)
  })

  // GET /v1/learn/lessons/:id — get single lesson with nodes
  app.get("/lessons/:id", { preHandler: requireAuth }, async (req, reply) => {
    const { sub: userId } = (req as any).user
    const { id } = req.params as any
    const db = getDb()

    const result = await db.execute({
      sql: "SELECT * FROM learn_lessons WHERE id = ? AND user_id = ?",
      args: [id, userId],
    })
    if (result.rows.length === 0) return reply.status(404).send({ error: "lesson not found" })

    const row = result.rows[0]
    const doc = JSON.parse(row.lesson_json as string)
    return {
      ...extractLessonSummary(row),
      nodes: doc.nodes || [],
    }
  })

  // GET /v1/learn/progress — all node progress for user
  app.get("/progress", { preHandler: requireAuth }, async (req) => {
    const { sub: userId } = (req as any).user
    const db = getDb()

    const result = await db.execute({
      sql: "SELECT node_id, progress_json FROM learn_progress WHERE user_id = ?",
      args: [userId],
    })

    const progress: Record<string, any> = {}
    for (const row of result.rows) {
      progress[row.node_id as string] = JSON.parse(row.progress_json as string)
    }
    return progress
  })

  // GET /v1/learn/due — nodes due for review
  app.get("/due", { preHandler: requireAuth }, async (req) => {
    const { sub: userId } = (req as any).user
    const db = getDb()

    const result = await db.execute({
      sql: `SELECT p.node_id, p.progress_json, l.id as lesson_id, l.title as lesson_title
            FROM learn_progress p
            JOIN learn_lessons l ON l.user_id = p.user_id
            WHERE p.user_id = ?
              AND json_extract(p.progress_json, '$.due_at') <= datetime('now')
            ORDER BY json_extract(p.progress_json, '$.due_at') ASC`,
      args: [userId],
    })

    return result.rows.map((row) => {
      const prog = JSON.parse(row.progress_json as string)
      return {
        nodeId: row.node_id,
        lessonId: row.lesson_id,
        title: row.lesson_title,
        due_at: prog.due_at,
      }
    })
  })

  // POST /v1/learn/import — import an .ldoc document
  app.post("/import", { preHandler: requireAuth }, async (req, reply) => {
    const parsed = ImportBody.safeParse(req.body)
    if (!parsed.success) {
      return reply.status(400).send({ ok: false, errors: parsed.error.flatten().fieldErrors })
    }
    const { sub: userId } = (req as any).user
    const doc = parsed.data.json
    const db = getDb()

    // Validate
    const validation = validateLdoc(doc)
    if (!validation.ok) {
      return { ok: false, errors: validation.errors, warnings: validation.warnings }
    }

    try {
      // Upsert lesson
      await db.execute({
        sql: `INSERT INTO learn_lessons (id, user_id, title, part, version, summary, node_count, lesson_json, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, unixepoch())
              ON CONFLICT(id) DO UPDATE SET
                title=excluded.title, part=excluded.part, version=excluded.version,
                summary=excluded.summary, node_count=excluded.node_count,
                lesson_json=excluded.lesson_json, updated_at=excluded.updated_at`,
        args: [
          doc.lesson.id, userId, doc.lesson.title, doc.lesson.part,
          doc.lesson.version, doc.lesson.summary || null,
          doc.nodes.length, JSON.stringify(doc),
        ],
      })

      return { ok: true, lessonId: doc.lesson.id, errors: [], warnings: validation.warnings }
    } catch (err: any) {
      req.log.error(err, "import failed")
      return { ok: false, errors: [err.message], warnings: validation.warnings }
    }
  })

  // POST /v1/learn/validate — validate an .ldoc document
  app.post("/validate", { preHandler: requireAuth }, async (req) => {
    const parsed = ValidateBody.safeParse(req.body)
    if (!parsed.success) {
      return { ok: false, errors: ["invalid request body"], warnings: [] }
    }
    return validateLdoc(parsed.data.doc)
  })

  // POST /v1/learn/tutor — ask a tutor question
  app.post("/tutor", { preHandler: requireAuth }, async (req, reply) => {
    const parsed = TutorBody.safeParse(req.body)
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.flatten() })
    }
    const { nodeId, blockId, question, personaMd } = parsed.data
    const { sub: userId } = (req as any).user
    const db = getDb()

    // Look up the node's grounding from the lesson
    const nodeResult = await db.execute({
      sql: `SELECT l.lesson_json FROM learn_lessons l
            JOIN learn_lessons l2 ON l2.user_id = l.user_id
            WHERE l.user_id = ? AND l.lesson_json LIKE ?`,
      args: [userId, `%${nodeId}%`],
    })

    let groundingContext = ""
    if (nodeResult.rows.length > 0) {
      const doc = JSON.parse(nodeResult.rows[0].lesson_json as string)
      const node = doc.nodes?.find((n: any) => n.id === nodeId)
      if (node?.grounding) {
        groundingContext = JSON.stringify(node.grounding)
      }
    }

    // In production, call an LLM here with the grounding context.
    // For now, return a placeholder indicating the system is ready.
    return {
      answer: `Tutor response for node ${nodeId}: "${question}". Grounding context loaded: ${groundingContext.length > 0 ? 'yes' : 'no'}. Connect an AI provider for live answers.`,
      sources: [],
    }
  })

  // POST /v1/learn/quiz — grade a quiz response
  app.post("/quiz", { preHandler: requireAuth }, async (req, reply) => {
    const parsed = QuizBody.safeParse(req.body)
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.flatten() })
    }
    const { nodeId, blockId, response } = parsed.data
    const { sub: userId } = (req as any).user
    const db = getDb()

    // Look up the quiz block
    const nodeResult = await db.execute({
      sql: "SELECT lesson_json FROM learn_lessons WHERE user_id = ? AND lesson_json LIKE ?",
      args: [userId, `%${nodeId}%`],
    })

    let correct = false
    if (nodeResult.rows.length > 0) {
      const doc = JSON.parse(nodeResult.rows[0].lesson_json as string)
      const node = doc.nodes?.find((n: any) => n.id === nodeId)
      const block = node?.blocks?.find((b: any) => b.id === blockId)
      if (block?.quiz) {
        // Simple answer check
        correct = JSON.stringify(response) === JSON.stringify(block.quiz.answer)
      }
    }

    // Update progress
    const existingProgress = await db.execute({
      sql: "SELECT progress_json FROM learn_progress WHERE node_id = ? AND user_id = ?",
      args: [nodeId, userId],
    })

    let progress: any = {
      node_id: nodeId,
      level: "L0",
      stability: 0,
      belief: {},
      last_seen: new Date().toISOString(),
      due_at: new Date(Date.now() + 86400000).toISOString(), // +1 day
    }

    if (existingProgress.rows.length > 0) {
      progress = JSON.parse(existingProgress.rows[0].progress_json as string)
      progress.last_seen = new Date().toISOString()
      if (correct) {
        progress.stability = Math.max(1, (progress.stability || 1) * 2)
      } else {
        progress.stability = Math.max(0.5, (progress.stability || 1) * 0.5)
      }
      progress.due_at = new Date(Date.now() + progress.stability * 86400000).toISOString()
    }

    await db.execute({
      sql: `INSERT INTO learn_progress (node_id, user_id, progress_json, updated_at)
            VALUES (?, ?, ?, unixepoch())
            ON CONFLICT(node_id, user_id) DO UPDATE SET
              progress_json=excluded.progress_json, updated_at=excluded.updated_at`,
      args: [nodeId, userId, JSON.stringify(progress)],
    })

    return { correct, progress }
  })

  // POST /v1/learn/build-prompt — build an authoring prompt
  app.post("/build-prompt", { preHandler: requireAuth }, async (req, reply) => {
    const parsed = BuildPromptBody.safeParse(req.body)
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.flatten() })
    }
    const { part, nodeTarget, personaMd } = parsed.data

    const prompt = `You are an expert instructional designer. Create a lesson node for the following topic:

Topic: ${nodeTarget}
Curriculum Part: ${part}
Learner Profile:
${personaMd}

Produce the content in Lesson Markdown (.lmd) format. The node should include:
1. A clear title
2. Mastery target (L0-L5)
3. Content blocks: prose, mermaid diagrams, images where appropriate
4. A grounding section with must_know facts and sources
5. At least one quiz (mix of closed and open-ended)
6. Common misconceptions

Output ONLY the .lmd markdown text, no JSON.`

    return { prompt }
  })

  // POST /v1/learn/generate — call LLM to generate .lmd text
  app.post("/generate", { preHandler: requireAuth }, async (req, reply) => {
    const parsed = GenerateBody.safeParse(req.body)
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.flatten() })
    }

    // In production, call an LLM here. For now, return a placeholder.
    return {
      lmd: `# Generated Lesson\n\n> This is a placeholder. Connect an AI provider to generate real content.\n\nPrompt was: ${parsed.data.prompt.slice(0, 100)}...`,
    }
  })
}
