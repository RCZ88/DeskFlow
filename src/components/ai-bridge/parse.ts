// Shared, robust parser for External AI Bridge paste-back responses.
// Used by EVERY feature so parsing behavior is identical across the app.

export interface ParseResult {
  ok: boolean
  /** field key -> string value extracted from the AI response */
  values: Record<string, string>
  error?: string
  /** fields we asked for but the response didn't contain */
  missing?: string[]
  rawJson?: any
}

/**
 * Extract the first JSON object `{...}` or array `[...]` from arbitrary text.
 * Handles ```json fences, surrounding prose, and trailing commentary.
 */
export function extractJsonBlock(raw: string): string | null {
  if (!raw || !raw.trim()) return null
  let s = raw.trim()
  // Strip ```json ... ``` or ``` ... ``` fences (possibly multiple)
  s = s.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '')
  const obj = s.match(/\{[\s\S]*\}/)
  if (obj) return obj[0]
  const arr = s.match(/\[[\s\S]*\]/)
  if (arr) return arr[0]
  return null
}

/**
 * Parse an AI response and map it onto the requested field keys.
 * - If some keys are present -> returns ok with those values (missing listed).
 * - If NONE of the keys are present but exactly one key was requested -> treat
 *   the raw text as the value (the AI sometimes returns plain text).
 * - If none present and multiple keys requested -> error with a helpful message.
 */
export function parseBridgeResponse(raw: string, fieldKeys: string[]): ParseResult {
  const block = extractJsonBlock(raw)
  if (!block) {
    if (fieldKeys.length === 1) {
      return { ok: true, values: { [fieldKeys[0]]: (raw || '').trim() } }
    }
    return { ok: false, values: {}, error: 'No JSON found in the response. Paste the raw JSON the AI returned.' }
  }
  let parsed: any
  try {
    parsed = JSON.parse(block)
  } catch {
    if (fieldKeys.length === 1) {
      return { ok: true, values: { [fieldKeys[0]]: (raw || '').trim() } }
    }
    return { ok: false, values: {}, error: 'The JSON is malformed — paste the raw JSON output from the AI.' }
  }

  const values: Record<string, string> = {}
  const missing: string[] = []
  for (const k of fieldKeys) {
    const v = parsed?.[k]
    if (v === undefined || v === null) {
      missing.push(k)
      continue
    }
    values[k] = typeof v === 'string' ? v : JSON.stringify(v)
  }

  if (missing.length === fieldKeys.length) {
    if (fieldKeys.length === 1) {
      return { ok: true, values: { [fieldKeys[0]]: (raw || '').trim() }, rawJson: parsed }
    }
    return {
      ok: false,
      values: {},
      error: `The response JSON does not contain any of the expected fields: ${fieldKeys.join(', ')}.`,
      missing,
      rawJson: parsed,
    }
  }
  return { ok: true, values, rawJson: parsed, missing: missing.length ? missing : undefined }
}

/** Normalize a string for safe embedding inside a JSON string literal. */
export function jsonSafe(str: string): string {
  return (str || '').replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '')
}
