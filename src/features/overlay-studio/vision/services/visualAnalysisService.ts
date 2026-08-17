/**
 * Visual Analysis Service — manages visual analysis state and provider orchestration.
 */
import type { VisualAnalysis, FrameManifest, VisualDigest, ShotMap, DetectedObject, FaceRegion, TextRegion, ProtectedRegion, BoundingBox } from '../types/vision'

const STORAGE_KEY = 'rheo-overlay-studio-vision'

function loadVisionState(): Record<string, VisualAnalysis> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch { return {} }
}

function saveVisionState(state: Record<string, VisualAnalysis>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

export function getVisualAnalysis(videoId: string): VisualAnalysis | null {
  return loadVisionState()[videoId] || null
}

export function saveVisualAnalysis(analysis: VisualAnalysis) {
  const state = loadVisionState()
  state[analysis.video_id] = analysis
  saveVisionState(state)
}

export function setDigest(videoId: string, digest: VisualDigest) {
  const existing = getVisualAnalysis(videoId) || {
    video_id: videoId, status: 'partial', created_at: new Date().toISOString(), providers: [],
    frame_manifest_path: null, digest: null, shots: [], objects: [], text_regions: [], faces: [], style: null, warnings: [],
  }
  existing.digest = digest
  existing.status = 'partial'
  if (!existing.providers.includes('manual-visual-bridge')) existing.providers.push('manual-visual-bridge')
  saveVisualAnalysis(existing)
}

export function addObject(videoId: string, obj: DetectedObject) {
  const existing = getVisualAnalysis(videoId)
  if (!existing) return
  existing.objects.push(obj)
  saveVisualAnalysis(existing)
}

export function addFace(videoId: string, face: FaceRegion) {
  const existing = getVisualAnalysis(videoId)
  if (!existing) return
  existing.faces.push(face)
  saveVisualAnalysis(existing)
}

export function addTextRegion(videoId: string, region: TextRegion) {
  const existing = getVisualAnalysis(videoId)
  if (!existing) return
  existing.text_regions.push(region)
  saveVisualAnalysis(existing)
}

export function getProtectedRegions(videoId: string): ProtectedRegion[] {
  const analysis = getVisualAnalysis(videoId)
  if (!analysis) return []
  const regions: ProtectedRegion[] = []
  const STRENGTH: Record<string, number> = { face: 0.95, text: 0.90, product: 0.85, screen: 0.80, person: 0.65, logo: 0.55 }

  for (const face of analysis.faces) {
    regions.push({
      id: face.id, start_sec: face.timestamp_sec,
      end_sec: face.end_timestamp_sec || face.timestamp_sec + 3,
      label: 'face', box: face.box, strength: STRENGTH.face, source: face.source,
    })
  }
  for (const text of analysis.text_regions) {
    regions.push({
      id: text.id, start_sec: text.timestamp_sec,
      end_sec: text.end_timestamp_sec || text.timestamp_sec + 3,
      label: text.kind || 'text', box: text.box, strength: STRENGTH.text, source: text.source,
    })
  }
  for (const obj of analysis.objects) {
    regions.push({
      id: obj.id, start_sec: obj.timestamp_sec,
      end_sec: obj.end_timestamp_sec || obj.timestamp_sec + 3,
      label: obj.label, box: obj.box, strength: STRENGTH[obj.label] || 0.7, source: obj.source,
    })
  }
  return regions
}

export function checkOverlayCollision(
  overlayBox: BoundingBox, overlayStart: number, overlayEnd: number, videoId: string,
): { safe: boolean; collisions: Array<{ label: string; overlap: number; severity: string }> } {
  const regions = getProtectedRegions(videoId)
  const collisions: Array<{ label: string; overlap: number; severity: string }> = []

  for (const r of regions) {
    const timeOverlap = Math.max(0, Math.min(overlayEnd, r.end_sec) - Math.max(overlayStart, r.start_sec))
    if (timeOverlap <= 0) continue
    const xOverlap = Math.max(0, Math.min(overlayBox.x + overlayBox.w, r.box.x + r.box.w) - Math.max(overlayBox.x, r.box.x))
    const yOverlap = Math.max(0, Math.min(overlayBox.y + overlayBox.h, r.box.y + r.box.h) - Math.max(overlayBox.y, r.box.y))
    const area = xOverlap * yOverlap
    if (area > 0.01) {
      const severity = area > 0.3 && r.strength > 0.8 ? 'error' : area > 0.1 && r.strength > 0.6 ? 'warning' : 'info'
      collisions.push({ label: r.label, overlap: Math.round(area * 1000) / 1000, severity })
    }
  }

  return { safe: !collisions.some(c => c.severity === 'error' || c.severity === 'warning'), collisions }
}

export const VISUAL_BRIDGE_PROMPT = `You are a visual analysis engine.

Analyze the attached video frames and transcript metadata.

Return only valid JSON.
Do not include markdown fences.
Do not include comments.

Use this schema exactly:
{
  "gist": "One sentence describing what is happening visually.",
  "summary": "Two to three sentences about visual content.",
  "keywords": ["word1", "word2", "..."],
  "topics": ["topic1", "topic2"],
  "entities": ["entity1", "entity2"],
  "setting": "Description of the visual setting.",
  "actions": ["action1", "action2"],
  "objects_visible": ["object1", "object2"],
  "text_on_screen": ["text1", "text2"],
  "visual_complexity": "low | medium | high",
  "motion_level": "low | medium | high",
  "color_palette": ["#hex1", "#hex2", "#hex3"],
  "frames": [
    {
      "frame_id": "f_00000",
      "timestamp_sec": 0.0,
      "caption": "What is happening in this frame.",
      "objects": ["face", "laptop"],
      "text_visible": ["slide heading"],
      "composition": "center, top-right, etc.",
      "motion": "static, panning, zoom"
    }
  ]
}

Return ONLY the JSON object. Nothing else.`

export function buildVisualBridgePrompt(videoId: string, transcript?: any, frameManifest?: FrameManifest): string {
  const parts = [VISUAL_BRIDGE_PROMPT, '\n\n================ INPUT DATA ================', `video_id: ${videoId}`]
  if (transcript) {
    parts.push('\ntranscript:')
    parts.push(JSON.stringify(transcript, null, 2).slice(0, 3000))
  }
  if (frameManifest) {
    parts.push('\nframe_manifest:')
    parts.push(`  frame_count: ${frameManifest.frame_count}`)
    parts.push('  frames:')
    for (const f of frameManifest.frames.slice(0, 24)) {
      parts.push(`    ${f.frame_id}: ${f.timestamp_sec}s (${f.reason})`)
    }
  }
  return parts.join('\n')
}

export function validateVisualDigestJson(data: any): Array<{ rule: string; passed: boolean; message: string }> {
  const checks: Array<{ rule: string; passed: boolean; message: string }> = []
  checks.push({ rule: 'Valid JSON', passed: true, message: 'Parsed successfully' })
  checks.push({ rule: 'Has gist', passed: !!data?.gist, message: data?.gist ? 'Present' : 'Missing gist' })
  checks.push({ rule: 'Has keywords', passed: Array.isArray(data?.keywords) && data.keywords.length > 0, message: `${data?.keywords?.length || 0} keywords` })
  checks.push({ rule: 'Valid complexity', passed: ['low', 'medium', 'high'].includes(data?.visual_complexity), message: `'${data?.visual_complexity}'` })
  checks.push({ rule: 'Valid motion', passed: ['low', 'medium', 'high'].includes(data?.motion_level), message: `'${data?.motion_level}'` })
  checks.push({ rule: 'Has frames', passed: Array.isArray(data?.frames), message: `${data?.frames?.length || 0} frames` })
  return checks
}
