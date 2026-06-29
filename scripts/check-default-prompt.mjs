import { readFileSync } from "node:fs"

const src = readFileSync("src/lib/defaults.ts", "utf8")
if (!src.includes('DEFAULT_SYSTEM_PROMPT.md?raw')) {
	console.error("defaults.ts must import agent/DEFAULT_SYSTEM_PROMPT.md?raw (single source of truth).")
	process.exit(1)
}
console.log("OK: Default prompt single-sourced.")
