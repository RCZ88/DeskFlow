// agentOutput.ts — Incremental parser for agent (CLI TUI) output in the Electron main process.
//
// The old system wrote prompt text blind (Bracketed Paste) and fetched opencode session IDs
// by path-matching a separate SQLite DB. This module is the real interaction layer:
//   * parseSessionIdFromOutput — extract the agent's REAL session id from PTY output (primary).
//   * parseAgentOutput          — incremental parse of each chunk: session id, errors,
//                                 action-required prompts, and structured file-change events.
// Pure module: no electron/better-sqlite3 imports, so it can be unit-tested via
// `node scripts/verify-parser.mjs` without launching the app.

export interface ParsedAgentOutput {
  sessionId?: string;
  actionRequired?: boolean;
  fileChanges?: Array<{ action: 'edit' | 'create' | 'delete' | 'rename'; filePath: string }>;
  errors?: string[];
  promptDetected?: boolean;
  agentVersion?: string;
}

// Minimal structural subset of the main-process AgentState the parser depends on.
// main.ts passes its full AgentState; this keeps the module decoupled (no circular import).
export interface ParsedAgentState {
  sessionIdCaptured?: boolean;
  phase?: string;
}

/**
 * Strip ANSI escape sequences so UUIDs rendered inside TUI header/footer frames
 * (Ink/BubbleTea) become plain text the regexes can match. Pure local impl so the
 * module stays importable from `node scripts/verify-parser.mjs`.
 */
function stripAnsi(s: string): string {
  return s
    .replace(/\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)/g, '')
    .replace(/\x1b[@-Z\\-_]/g, '')
    .replace(/\x1b\[[0-9;?]*[ -/]*[@-~]/g, '')
    .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, '');
}

/**
 * Extract a session id from agent output.
 *  1. Short-circuits for agents whose sessionIdSource is 'db-pid' (opencode):
 *     it does NOT print its session id to stdout, so output parsing is a dead end.
 *  2. Strips ANSI first (Ink TUIs render the id inside escape-coded frames).
 *  3. Labeled patterns first (e.g. "Session: <uuid>", "session_id=<uuid>").
 *  4. Fallback: any bare UUID in the FIRST 2000 chars of a fresh session.
 * Returns null when nothing confident is found.
 */
export function parseSessionIdFromOutput(output: string, agentType?: string, sessionIdSource?: 'output' | 'db-pid'): string | null {
  if (!output || typeof output !== 'string') return null;

  // CRITICAL PIVOT (Correction Packet G1): opencode does not print its session id
  // to stdout during normal operation. It only writes it to its SQLite DB.
  // Do not waste CPU cycles parsing its output for a UUID.
  if (sessionIdSource === 'db-pid') {
    return null;
  }

  // For Ink-based TUIs (claude, gemini, codex), the session id is rendered in the
  // ANSI header/footer. We must strip ANSI before matching.
  const cleanOutput = stripAnsi(output);

  const labeledMatch = cleanOutput.match(
    /(?:session[_-]?id|session)[:\s]+([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i
  );
  if (labeledMatch) return labeledMatch[1];

  const earlyOutput = cleanOutput.slice(0, 2000);
  const uuidRegex = /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/i;
  const uuidMatch = earlyOutput.match(uuidRegex);

  if (uuidMatch && !uuidMatch[0].startsWith('session-')) {
    return uuidMatch[0];
  }
  return null;
}

/**
 * Incremental parse of a chunk of agent output. Safe to call repeatedly with a growing
 * buffer (main.ts accumulates `state.dataBuffer` and passes it each time); the parser is
 * idempotent for session-id extraction thanks to `state.sessionIdCaptured`.
 * `sessionIdSource` is passed through to the session-id extractor ('output' | 'db-pid').
 */
export function parseAgentOutput(output: string, agentType: string, state: ParsedAgentState, sessionIdSource?: 'output' | 'db-pid'): ParsedAgentOutput {
  const result: ParsedAgentOutput = {
    actionRequired: false,
    errors: [],
    promptDetected: false,
    fileChanges: [],
  };

  // 1. Session ID extraction (only until captured)
  if (!state.sessionIdCaptured) {
    const sid = parseSessionIdFromOutput(output, agentType, sessionIdSource);
    if (sid) result.sessionId = sid;
  }

  // 2. Error detection (launch failures, permission errors, command-not-found)
  if (/error:|Error:|✗|FAILED|Permission denied|command not found|is not recognized/i.test(output)) {
    result.errors.push('Detected error signature in output');
    result.actionRequired = true;
  }

  // 3. Action required (confirmation prompts)
  if (/\(y\/N\)|\[Y\/n\]|Continue\?|\[y\/n\]|\(yes\/no\)/i.test(output)) {
    result.actionRequired = true;
  }

  // 4. File changes (structural parsing extension of detectEditsInOutput)
  const fileEditRegex = /(?:wrote|created|updated|deleted|renamed)\s+([^\s\n]+)/gi;
  let match;
  while ((match = fileEditRegex.exec(output)) !== null) {
    const verb = match[0].split(/\s/)[0].toLowerCase();
    const actionMap: Record<string, 'edit' | 'create' | 'delete' | 'rename'> = {
      wrote: 'edit',
      created: 'create',
      updated: 'edit',
      deleted: 'delete',
      renamed: 'rename',
    };
    const action = actionMap[verb] || 'edit';
    const filePath = match[1].trim();
    if (filePath && !/^[<[>(]/.test(filePath)) {
      result.fileChanges!.push({ action, filePath });
    }
  }

  return result;
}
