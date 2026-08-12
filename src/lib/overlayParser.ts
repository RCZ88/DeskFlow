// Clement Overlay Studio — Parse Pipeline (spec §2, §5)

// ─── Step 1-4: JSON extraction from pasted text ────────────────────────────
function cleanJson(text: string): string {
  let s = text.trim()
  // Remove BOM
  if (s.charCodeAt(0) === 0xFEFF) s = s.slice(1)
  // Curly quotes → straight
  s = s.replace(/[\u201C\u201D\u2018\u2019]/g, '"')
  // Remove trailing commas before } or ]
  s = s.replace(/,\s*([}\]])/g, '$1')
  // Remove comments (// ... and /* ... */)
  s = s.replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '')
  return s
}

export function extractJson(raw: string): any {
  const trimmed = raw.trim()
  // 1. Direct parse
  try { return JSON.parse(cleanJson(trimmed)) } catch {}
  // 2. Extract from ```json fences
  const fence = trimmed.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/)
  if (fence) { try { return JSON.parse(cleanJson(fence[1])) } catch {} }
  // 3. Find first { to last }
  const start = trimmed.indexOf('{')
  const end = trimmed.lastIndexOf('}')
  if (start >= 0 && end > start) {
    try { return JSON.parse(cleanJson(trimmed.slice(start, end + 1))) } catch {}
  }
  // 4. Brace-matching (handles nested)
  if (start >= 0) {
    let depth = 0
    for (let i = start; i < trimmed.length; i++) {
      if (trimmed[i] === '{') depth++
      else if (trimmed[i] === '}') depth--
      if (depth === 0) { try { return JSON.parse(cleanJson(trimmed.slice(start, i + 1))) } catch { break } }
    }
  }
  throw new Error('Could not extract valid JSON from the response.')
}

// ─── Step 5: Schema validation ──────────────────────────────────────────────
interface ValidationError { rule: string; message: string; passed: boolean }

export function validateCutPlan(data: any, transcript: any): ValidationError[] {
  const checks: ValidationError[] = []

  // Valid JSON structure
  checks.push({ rule: 'Valid JSON', message: 'Response parsed as valid JSON', passed: true })

  // Has kept array
  const hasKept = Array.isArray(data?.kept)
  checks.push({ rule: 'Has kept array', message: hasKept ? 'kept[] exists' : 'Missing "kept" array', passed: hasKept })

  // Has cut array
  const hasCut = Array.isArray(data?.cut)
  checks.push({ rule: 'Has cut array', message: hasCut ? 'cut[] exists' : 'Missing "cut" array', passed: hasCut })

  if (!hasKept || !hasCut) return checks

  // Segment IDs exist in transcript
  const transcriptIds = new Set(transcript?.segments?.map((s: any) => s.id) || [])
  const keptIds = new Set(data.kept.map((k: any) => k.segment_id))
  const cutIds = new Set(data.cut.map((c: any) => c.segment_id))
  const allUsed = [...keptIds, ...cutIds]
  const badIds = allUsed.filter(id => !transcriptIds.has(id))
  checks.push({ rule: 'Valid segment IDs', message: badIds.length === 0 ? `All ${allUsed.length} IDs exist in transcript` : `Invalid IDs: ${badIds.join(', ')}`, passed: badIds.length === 0 })

  // No overlap between kept and cut
  const overlap = [...keptIds].filter(id => cutIds.has(id))
  checks.push({ rule: 'No ID overlap', message: overlap.length === 0 ? 'No segment in both kept and cut' : `Overlapping IDs: ${overlap.join(', ')}`, passed: overlap.length === 0 })

  // Duration in range
  const totalKept = data.kept.reduce((sum: number, k: any) => sum + ((k.end || 0) - (k.start || 0)), 0)
  const inRange = totalKept >= 90 && totalKept <= 180
  checks.push({ rule: 'Duration 90–180s', message: `${totalKept.toFixed(1)}s ${inRange ? '✓' : '(out of range)'}`, passed: inRange })

  // No overlapping time ranges
  const sorted = [...data.kept].sort((a: any, b: any) => a.start - b.start)
  let overlaps = false
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].start < sorted[i - 1].end) { overlaps = true; break }
  }
  checks.push({ rule: 'No time overlaps', message: overlaps ? 'Overlapping time ranges found' : 'All time ranges are sequential', passed: !overlaps })

  // Every kept has role and reason
  const missingRole = data.kept.filter((k: any) => !k.role || !k.reason)
  checks.push({ rule: 'Roles & reasons', message: missingRole.length === 0 ? 'All kept segments have role + reason' : `${missingRole.length} missing role/reason`, passed: missingRole.length === 0 })

  return checks
}

export function validateSceneDSL(data: any, transcript?: any): ValidationError[] {
  const checks: ValidationError[] = []

  checks.push({ rule: 'Valid JSON', message: 'Response parsed as valid JSON', passed: true })

  const hasScenes = Array.isArray(data?.scenes)
  checks.push({ rule: 'Has scenes array', message: hasScenes ? 'scenes[] exists' : 'Missing "scenes" array', passed: hasScenes })

  if (!hasScenes) return checks

  // Valid renderers
  const validRenderers = new Set(['card', 'mermaid', 'equation', 'chart', 'board', 'manim'])
  const badRenderers = data.scenes.filter((s: any) => !validRenderers.has(s.renderer))
  checks.push({ rule: 'Valid renderers', message: badRenderers.length === 0 ? `All ${data.scenes.length} scenes use valid renderers` : `Invalid renderers: ${[...new Set(badRenderers.map((s: any) => s.renderer))].join(', ')}`, passed: badRenderers.length === 0 })

  // No overlapping times
  const sorted = [...data.scenes].sort((a: any, b: any) => a.start_time - b.start_time)
  let overlaps = false
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].start_time < sorted[i - 1].end_time) { overlaps = true; break }
  }
  checks.push({ rule: 'No time overlaps', message: overlaps ? 'Overlapping scenes found' : 'All scenes sequential', passed: !overlaps })

  // Max 2 card scenes
  const cardCount = data.scenes.filter((s: any) => s.renderer === 'card').length
  checks.push({ rule: 'Max 2 cards', message: `${cardCount} card scenes ${cardCount <= 2 ? '✓' : '(limit is 2)'}`, passed: cardCount <= 2 })

  // Hook in first 5s
  const hasHook = data.scenes.some((s: any) => s.start_time <= 5)
  checks.push({ rule: 'Hook in first 5s', message: hasHook ? 'A scene covers the opening 5s' : 'No scene in the first 5 seconds', passed: hasHook })

  // Max 1 scene per 3s
  let maxDensity = 0
  for (let t = 0; t < 600; t += 3) {
    const count = data.scenes.filter((s: any) => s.start_time >= t && s.start_time < t + 3).length
    if (count > maxDensity) maxDensity = count
  }
  checks.push({ rule: 'Density ≤ 1/3s', message: maxDensity <= 1 ? 'Max 1 scene per 3s ✓' : `Found ${maxDensity} scenes in a 3s window`, passed: maxDensity <= 1 })

  return checks
}

// ─── Step 7: Generate repair prompt ─────────────────────────────────────────
export function generateRepairPrompt(failedOutput: string, errors: ValidationError[]): string {
  const failed = errors.filter(e => !e.passed)
  const errorList = failed.map(e => `${e.rule}: ${e.message}`)
  return `Your previous response failed validation. You are a JSON-only API: return ONLY the corrected JSON in ONE \`\`\`json fence. No apologies, no explanations.

VALIDATION ERRORS:
${errorList.map((e, i) => `${i + 1}. ${e}`).join('\n')}

YOUR PREVIOUS OUTPUT:
${failedOutput.slice(0, 4000)}

Return the complete corrected JSON now.`
}

// ─── Helpers ────────────────────────────────────────────────────────────────
export function allPassed(checks: ValidationError[]): boolean {
  return checks.every(c => c.passed)
}

export function passedCount(checks: ValidationError[]): { passed: number; total: number } {
  return { passed: checks.filter(c => c.passed).length, total: checks.length }
}
