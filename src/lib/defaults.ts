export const DEFAULT_AGENT = 'opencode';

export function getDefaultAgent(): string {
  return localStorage.getItem('terminal-defaultAgent') || DEFAULT_AGENT;
}

export function setDefaultAgent(agent: string): void {
  localStorage.setItem('terminal-defaultAgent', agent);
}

// SINGLE SOURCE OF TRUTH: agent/DEFAULT_SYSTEM_PROMPT.md
// Vite inlines this at build time; opencode.json loads the same file at runtime.
import promptMd from "../../agent/DEFAULT_SYSTEM_PROMPT.md?raw"

/** Do NOT rename: imported elsewhere. Value now sourced from the .md file. */
export const DEFAULT_SYSTEM_PROMPT: string = promptMd