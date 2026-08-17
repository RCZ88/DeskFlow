/** Visual Analysis Engine — TypeScript contracts matching Python contracts. */

export interface BoundingBox {
  x: number; y: number; w: number; h: number
}

export interface FrameSampleRequest {
  frame_id: string; timestamp_sec: number; reason: string; priority: number
}

export interface FrameSamplePlan {
  video_id: string; plan_id: string; created_at: string
  mode: 'fingerprint' | 'evidence' | 'localization'
  target_width: number; target_height: number; jpeg_quality: number
  frames: FrameSampleRequest[]
}

export interface FrameManifestItem {
  frame_id: string; timestamp_sec: number; path: string
  width: number; height: number; reason: string
  thumbnail_url?: string
}

export interface FrameManifest {
  video_id: string; plan_id: string; frame_count: number; frames: FrameManifestItem[]
}

export interface FrameEvidence {
  frame_id: string; timestamp_sec: number
  caption: string; objects: string[]; text_visible: string[]
  composition: string; motion: string
}

export interface VisualDigest {
  gist: string; summary: string
  keywords: string[]; topics: string[]; entities: string[]
  setting: string | null; actions: string[]
  objects_visible: string[]; text_on_screen: string[]
  visual_complexity: 'low' | 'medium' | 'high'
  motion_level: 'low' | 'medium' | 'high'
  color_palette: string[]
  confidence: number; source: string
}

export interface ShotBoundary {
  id: string; start_sec: number; end_sec: number
  confidence: number; reason: string; source: string
}

export interface ShotMap {
  video_id: string; duration_sec: number; shots: ShotBoundary[]
  avg_shot_duration_sec: number; cut_rate_per_min: number
  source: string; warnings: string[]
}

export interface DetectedObject {
  id: string; frame_id: string | null; timestamp_sec: number
  end_timestamp_sec: number | null; label: string; confidence: number
  box: BoundingBox; source: string; properties: Record<string, unknown>
}

export interface TextRegion {
  id: string; frame_id: string | null; timestamp_sec: number
  end_timestamp_sec: number | null; box: BoundingBox
  text: string | null; kind: string; confidence: number; source: string
}

export interface FaceRegion {
  id: string; frame_id: string | null; timestamp_sec: number
  end_timestamp_sec: number | null; box: BoundingBox
  confidence: number; source: string
}

export interface StyleProfile {
  id: string; name: string; pacing: string
  avg_shot_duration_sec: number | null; cut_rate_per_min: number | null
  motion_level: string; visual_complexity: string
  color_palette: string[]; text_density: string
  caption_style: string | null; hook_style: string | null
  source: string; confidence: number
}

export interface ProtectedRegion {
  id: string; start_sec: number; end_sec: number
  label: string; box: BoundingBox; strength: number; source: string
}

export interface VisualAnalysis {
  video_id: string; status: string; created_at: string
  providers: string[]; frame_manifest_path: string | null
  digest: VisualDigest | null; shots: ShotBoundary[]
  objects: DetectedObject[]; text_regions: TextRegion[]
  faces: FaceRegion[]; style: StyleProfile | null
  warnings: string[]
}

export type VisualAnalysisStatus = 'idle' | 'capturing' | 'analyzing' | 'partial' | 'ready' | 'failed'

export interface FrameCaptureProgress {
  current: number; total: number; currentFrame: string; phase: 'capturing' | 'saving' | 'done'
}
