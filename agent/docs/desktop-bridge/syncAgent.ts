// syncAgent.ts — add to the Electron MAIN process.
//
// Bridges your local better-sqlite3 DB <-> the sync server. The desktop stays the
// primary writer; this pushes local changes up and pulls remote (mobile) changes down.
//
// Strategy (offline-first, last-write-wins):
//   * Local rows already have updated_at; we track a per-table "last pushed cursor".
//   * Sensitive free-text (terminal message content) is ENCRYPTED on the desktop
//     before it ever leaves the machine. The server only stores ciphertext, so a
//     server breach cannot read your terminal output. (E2E-leaning.)
//
// Wire this to a 15-30s interval and to your existing "row changed" events.

import type Database from "better-sqlite3"

type Fetcher = typeof fetch

export class SyncAgent {
	private cursor = 0
	constructor(
		private db: Database.Database,
		private baseUrl: string,
		private getAccessToken: () => Promise<string>,
		private encryptField: (plain: string) => string, // returns base64 ciphertext
		private decryptField: (b64: string) => string,
		private fetcher: Fetcher = fetch,
	) {}

	private async authHeaders() {
		return {
			"content-type": "application/json",
			authorization: `Bearer ${await this.getAccessToken()}`,
		}
	}

	// Push local changes newer than cursor.
	async push() {
		const changes: Array<{ table: string; row: Record<string, unknown> }> = []

		const sessions = this.db
			.prepare("SELECT * FROM terminal_sessions WHERE updated_at > ? LIMIT 500")
			.all(this.cursor) as any[]
		for (const r of sessions) changes.push({ table: "terminal_sessions", row: r })

		const msgs = this.db
			.prepare("SELECT * FROM terminal_messages WHERE updated_at > ? LIMIT 500")
			.all(this.cursor) as any[]
		for (const r of msgs) {
			changes.push({
				table: "terminal_messages",
				row: {
					id: r.id, session_id: r.session_id, role: r.role,
					content_enc: this.encryptField(r.content ?? ""), // encrypt before upload
					updated_at: r.updated_at, deleted: r.deleted ?? 0,
				},
			})
		}
		// problems / requests / stats_daily: same pattern (omitted for brevity).

		if (changes.length === 0) return { applied: 0 }
		const res = await this.fetcher(`${this.baseUrl}/v1/sync/push`, {
			method: "POST",
			headers: await this.authHeaders(),
			body: JSON.stringify({ changes }),
		})
		if (!res.ok) throw new Error(`push failed ${res.status}`)
		return res.json()
	}

	// Pull remote changes and merge into local (LWW by updated_at).
	async pull() {
		const res = await this.fetcher(
			`${this.baseUrl}/v1/sync/pull?since=${this.cursor}`,
			{ headers: await this.authHeaders() },
		)
		if (!res.ok) throw new Error(`pull failed ${res.status}`)
		const { changes, cursor } = (await res.json()) as any
		const upsertSession = this.db.prepare(
			`INSERT INTO terminal_sessions (id, updated_at) VALUES (@id, @updated_at)
			 ON CONFLICT(id) DO UPDATE SET updated_at=@updated_at WHERE @updated_at > terminal_sessions.updated_at`,
		)
		const tx = this.db.transaction((rows: any[]) => {
			for (const r of rows) upsertSession.run(r)
		})
		tx(changes.terminal_sessions ?? [])
		// decrypt incoming terminal_messages with this.decryptField before storing locally.
		if (typeof cursor === "number") this.cursor = cursor
		return { cursor }
	}
}
