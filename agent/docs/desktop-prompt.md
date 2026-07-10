# Desktop version — implementation prompt

Implement all missing pieces of the DeskFlow desktop app (Electron main process) and the sync server so that the mobile app can fully connect. Below is everything that needs to be built.

---

## PART A — Sync server additions (cloud-accessible Fastify server)

The sync server lives at `sync-server/`. It's a Fastify v5 server on Node.js with libSQL/SQLite, JWT auth (jose, HS256), and already has:
- `POST /v1/auth/pair` + `POST /v1/auth/refresh`
- `GET /v1/sync/pull` + `POST /v1/sync/push`
- `requireAuth` middleware (puts `req.user.sub` and `req.user.did` on the request)

### A1. Add `POST /v1/relay/ticket`

File: `sync-server/src/routes/relay.ts`

```ts
import type { FastifyInstance } from "fastify"
import { requireAuth } from "../auth.js"
import { SignJWT } from "jose"
```

- Authenticated (`requireAuth`)
- Signs a JWT with `RELAY_TICKET_SECRET` (new env var, shared with desktop Electron app), algorithm HS256, 60s TTL
- Payload: `{ sub: req.user.sub }` (the user ID from the auth token)
- Log to `audit_log` with event `relay_ticket`
- Return `{ ticket: string }`

Add env var to `.env`:
```
RELAY_TICKET_SECRET=generate-a-256-bit-base64url-random-string-here
```

Register in `sync-server/src/index.ts`:
```ts
import { relayRoutes } from "./routes/relay.js"
await app.register(relayRoutes, { prefix: "/v1/relay" })
```

### A2. Add 10 Lyceum endpoints under `POST /v1/learn/*`

File: `sync-server/src/routes/learn.ts`

Add a database table `learn_lessons` (stores imported `.ldoc` documents per user) and `learn_progress` (stores node progress per user).

All endpoints authenticated with `requireAuth`. All bodies are JSON. All `.ldoc` content uses the `LdocDocument` schema defined below.

Types (copy these type definitions from `mobile-app/src/lyceum/types.ts` into a shared types file in the sync server):

```
LessonSummary  = { id: string, title: string, part: number, version: string, summary?: string, nodeCount: number, nodeIds: string[] }
LessonWithNodes = LessonSummary & { nodes: LdocNode[] }
LdocNode = { id: string, title: string, mastery_target: MasteryLevel, prereq?: string[], content_hash?: string, blocks: LdocBlock[], grounding: Grounding }
LdocBlock = A discriminated union. See mobile-app/src/lyceum/types.ts lines 58-77 for the 11 block variants.
NodeProgress = { node_id: string, level: MasteryLevel, stability: number, last_seen?: string, due_at?: string, belief: Record<string, BetaBelief> }
NodeRef = { nodeId: string, lessonId: string, title: string, due_at?: string }
TutorAnswer = { answer: string, sources?: GroundingSource[] }
ImportResult = { ok: boolean, lessonId?: string, errors?: string[], warnings?: string[] }
ValidationReport = { ok: boolean, errors: string[], warnings: string[] }
LdocDocument = { doc: "ldoc/1.0", lesson: LdocLesson, nodes: LdocNode[] }
```

| Method | Path | Request → Response | Details |
|--------|------|---|---|
| `GET` | `/v1/learn/lessons?part=` | → `LessonSummary[]` | List all lessons for the user. Optional `part` (number) query param to filter by curriculum part. |
| `GET` | `/v1/learn/lessons/:id` | → `LessonWithNodes \| null` | Get a single lesson with all its nodes. `id` is the lesson ID from `LdocLesson.id`. |
| `GET` | `/v1/learn/progress` | → `Record<string, NodeProgress>` | Return all node progress records for this user, keyed by `node_id` |
| `GET` | `/v1/learn/due` | → `NodeRef[]` | Return nodes due for review (where `due_at <= now`), sorted by `due_at` ascending |
| `POST` | `/v1/learn/import` | `{ json: LdocDocument }` → `ImportResult` | Validate the `.ldoc` doc, persist it to `learn_lessons` table, return the lesson ID |
| `POST` | `/v1/learn/validate` | `{ doc: LdocDocument }` → `ValidationReport` | Server-side validation of an `.ldoc` doc (check required fields, block structure, references) |
| `POST` | `/v1/learn/tutor` | `{ nodeId: string, blockId?: string, question: string, personaMd?: string }` → `TutorAnswer` | Call an LLM (e.g., OpenAI) to answer the question. Ground the answer on the node's `grounding` block — do NOT answer outside `grounding.scope`. Include `personaMd` (learner profile markdown) if provided. |
| `POST` | `/v1/learn/quiz` | `{ nodeId: string, blockId: string, response: unknown }` → `{ correct: boolean, progress?: NodeProgress }` | Grade the quiz response. Look up the quiz block by `blockId`, compare `response` against `quiz.choices` / `quiz.answer`. Compute new `NodeProgress` with spaced repetition. |
| `POST` | `/v1/learn/build-prompt` | `{ part: number, nodeTarget: string, personaMd: string }` → `{ prompt: string }` | Build an authoring prompt that instructs an LLM to produce `.lmd` text for a new lesson node. |
| `POST` | `/v1/learn/generate` | `{ prompt: string }` → `{ lmd: string }` | Call an LLM with the prompt, return raw `.lmd` text (not JSON). The mobile client compiles `.lmd` → `.ldoc` locally. |

Register in `sync-server/src/index.ts`:
```ts
import { learnRoutes } from "./routes/learn.js"
await app.register(learnRoutes, { prefix: "/v1/learn" })
```

Data tables needed:
- `learn_lessons`: `id TEXT PK`, `user_id TEXT FK->users`, `lesson_json TEXT` (serialized LdocDocument), `created_at INTEGER`, `updated_at INTEGER`
- `learn_progress`: `node_id TEXT`, `user_id TEXT`, `progress_json TEXT` (serialized NodeProgress), `updated_at INTEGER`, composite PK on `(node_id, user_id)`

---

## PART B — Desktop Electron app (main process)

### B1. Integrate `syncAgent.ts` (already written, just needs wiring)

Source file: `desktop-bridge/syncAgent.ts` — copy this into the Electron main process.

Required dependencies (install in the Electron app's package.json):
- `better-sqlite3` (for the local DB)
- `@types/better-sqlite3`

Wire it up:
```ts
import { SyncAgent } from "./syncAgent"      // after copying the file
import { encrypt, decrypt } from "./your-crypto-module" // your existing AES-256-GCM functions
import { getAccessToken } from "./your-auth-module"     // reads from your token store

const db = /* your existing better-sqlite3 handle */
const agent = new SyncAgent(
  db,
  process.env.SYNC_URL!,        // e.g. "https://sync-server.example.com"
  getAccessToken,
  encrypt,
  decrypt,
)

// Run every 20 seconds
setInterval(() => agent.push().then(() => agent.pull()).catch(console.error), 20000)

// Also run after every local write to terminal_sessions / terminal_messages
// await agent.push()
```

The `SyncAgent` already handles:
- Incremental push (only rows with `updated_at > cursor`)
- Client-side encryption of `terminal_messages.content` before upload (E2E-leaning)
- Last-write-wins pull merged by `updated_at`
- 500-row batch limits per table per cycle

### B2. Integrate `terminalRelay.ts` (already written, just needs wiring)

Source file: `desktop-bridge/terminalRelay.ts` — copy into the Electron main process.

Required dependencies (install):
- `ws` (WebSocket server)
- `jose` (JWT verification)

Wire it up:
```ts
import { startTerminalRelay } from "./terminalRelay"

// You must have a terminalManager that wraps node-pty instances:
type TerminalManager = {
  write(id: string, data: string): boolean
  resize(id: string, cols: number, rows: number): void
  onData(id: string, cb: (d: string) => void): () => void
  has(id: string): boolean
}
const terminalManager: TerminalManager = /* your existing PTY manager adapted to this interface */;

startTerminalRelay(terminalManager, 8788)
```

Set env vars:
```
RELAY_TICKET_SECRET=must-match-sync-server-value
```

Security notes (already implemented in the file):
- Binds to `127.0.0.1:8788` only — no public exposure
- Validates relay ticket JWT before accepting any connection
- Only attaches to existing, owned terminal sessions (no remote spawn)
- Idle timeout 5 min, absolute session timeout 60 min
- Audit logging for every open/deny
- Client input capped at 8192 bytes per message

Access from phone: use Tailscale — phone reaches the laptop's tailnet IP on port 8788. Never port-forward to the public internet.

### B3. (Optional) Add a `/v1/learn/*` HTTP server in the Electron app

If you choose to run the Lyceum endpoints on the desktop instead of the sync server (Option 2 from the analysis), add a small Fastify or plain Node.js HTTP server that serves the 10 learn endpoints listed in A2. The mobile app's `BASE_URL` would then point to the desktop's IP on the tailnet. This approach means auth/sync requests also need to be proxied to the sync server.

---

## PART C — Environment variables summary

### Sync server `.env` additions:
```
RELAY_TICKET_SECRET=<base64url-random-256-bit-string>
```

### Desktop Electron app env vars:
```
SYNC_URL=https://<sync-server-host>:8787
RELAY_TICKET_SECRET=<same-as-sync-server>
```

---

## Implementation order

1. Add the `learn_lessons` and `learn_progress` tables to the sync server database schema
2. Add `POST /v1/relay/ticket` to the sync server
3. Add all 10 Lyceum endpoints to the sync server
4. Copy and wire `syncAgent.ts` into the desktop Electron app
5. Adapt the desktop's terminal PTY manager to the `TerminalManager` interface
6. Copy and wire `terminalRelay.ts` into the desktop Electron app
7. Set up Tailscale between desktop and phone for terminal relay access

---

## Reference files in the repo

| File | Purpose |
|------|---------|
| `desktop-bridge/syncAgent.ts` | Sync agent class — ready to copy |
| `desktop-bridge/terminalRelay.ts` | Terminal relay — ready to copy |
| `desktop-bridge/README.md` | Usage instructions for both |
| `sync-server/src/index.ts` | Main server file — register routes here |
| `sync-server/src/routes/auth.ts` | Example of how routes are structured |
| `sync-server/src/routes/sync.ts` | Example of a route module with `requireAuth` |
| `sync-server/src/auth.ts` | `requireAuth` middleware + `signAccess` |
| `sync-server/src/validation.ts` | Zod schemas — pattern for input validation |
| `mobile-app/src/lyceum/types.ts` | All Lyceum domain types (LdocDocument, LdocBlock, NodeProgress, etc.) |
| `mobile-app/src/lyceum/data/lessons.ts` | Client-side API calls showing exact request/response shapes |
| `agent/docs/deskflow-lyceum/README.md` | Full Lyceum module docs including endpoint details in §6 |
