// Vision analysis types for Overlay Studio
export interface BoundingBox { x: number; y: number; w: number; h: number }

export interface FrameManifestItem {
  frame_id: string; timestamp_sec: number; path: string; width: number; height: number; reason: string
}

export interface VisualDigest {
  gist: string; summary: string; keywords: string[]; topics: string[]; entities: string[]
  setting: string | null; actions: string[]; objects_visible: string[]; text_on_screen: string[]
  visual_complexity: 'low' | 'medium' | 'high'; motion_level: 'low' | 'medium' | 'high'
  color_palette: string[]; confidence: number; source: string
}

export interface DetectedObject {
  id: string; frame_id: string | null; timestamp_sec: number; label: string
  confidence: number; box: BoundingBox; source: string
}

export interface ShotBoundary {
  id: string; start_sec: number; end_sec: number; confidence: number
  reason: string; source: string
}

export interface VisualAnalysis {
  video_id: string; status: 'pending' | 'capturing' | 'analyzing' | 'partial' | 'ready' | 'failed' | 'unavailable'
  providers: string[]; digest: VisualDigest | null; shots: ShotBoundary[]
  objects: DetectedObject[]; warnings: string[]
}

export interface FrameSamplePlan {
  video_id: string; plan_id: string; mode: string
  target_width: number; target_height: number; jpeg_quality: number
  frames: Array<{ frame_id: string; timestamp_sec: number; reason: string; priority: number }>
}
