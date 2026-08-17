/**
 * Frame Capture Service — captures frames from local video using <video> + <canvas>.
 * No ffmpeg required. Works with any codec Chromium can decode.
 */
import type { FrameSamplePlan, FrameManifest, FrameManifestItem, FrameCaptureProgress } from '../types/vision'

function waitForEvent(el: HTMLVideoElement | HTMLCanvasElement, event: string, timeoutMs = 10000): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { cleanup(); reject(new Error(`Timeout waiting for ${event}`)) }, timeoutMs)
    const cleanup = () => { clearTimeout(timer); el.removeEventListener(event, onEvent) }
    const onEvent = () => { cleanup(); resolve() }
    el.addEventListener(event, onEvent, { once: true })
  })
}

function canvasToBlob(canvas: HTMLCanvasElement, type = 'image/jpeg', quality = 0.85): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => { blob ? resolve(blob) : reject(new Error('Canvas toBlob failed')) }, type, quality)
  })
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [header, data] = dataUrl.split(',')
  const mime = header.match(/:(.*?);/)?.[1] || 'image/jpeg'
  const binary = atob(data)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new Blob([bytes], { type: mime })
}

/**
 * Capture frames from a local video file using hidden <video> + <canvas>.
 * Returns a FrameManifest with all captured frame paths.
 */
export async function captureFrames(
  plan: FrameSamplePlan,
  videoSrc: string,
  onProgress?: (p: FrameCaptureProgress) => void,
  signal?: AbortSignal,
): Promise<FrameManifest> {
  const video = document.createElement('video')
  video.src = videoSrc
  video.muted = true
  video.playsInline = true
  video.preload = 'auto'
  video.style.display = 'none'
  document.body.appendChild(video)

  await waitForEvent(video, 'loadeddata')
  await waitForEvent(video, 'canplaythrough')

  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')!
  canvas.width = plan.target_width
  canvas.height = plan.target_height

  const manifestItems: FrameManifestItem[] = []

  try {
    for (let i = 0; i < plan.frames.length; i++) {
      if (signal?.aborted) throw new Error('Capture cancelled')

      const req = plan.frames[i]
      onProgress?.({ current: i + 1, total: plan.frames.length, currentFrame: req.frame_id, phase: 'capturing' })

      video.currentTime = req.timestamp_sec
      await waitForEvent(video, 'seeked')

      ctx.drawImage(video, 0, 0, plan.target_width, plan.target_height)
      const blob = await canvasToBlob(canvas, 'image/jpeg', plan.jpeg_quality / 100)

      // Convert blob to base64 data URL for IPC transport
      const dataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result as string)
        reader.readAsDataURL(blob)
      })

      manifestItems.push({
        frame_id: req.frame_id,
        timestamp_sec: req.timestamp_sec,
        path: `frames/${req.frame_id}.jpg`,
        width: plan.target_width,
        height: plan.target_height,
        reason: req.reason,
        thumbnail_url: dataUrl,
      })

      onProgress?.({ current: i + 1, total: plan.frames.length, currentFrame: req.frame_id, phase: 'capturing' })
    }
  } finally {
    video.pause()
    video.src = ''
    document.body.removeChild(video)
  }

  return {
    video_id: plan.video_id,
    plan_id: plan.plan_id,
    frame_count: manifestItems.length,
    frames: manifestItems,
  }
}

/**
 * Build a sample plan from transcript data (client-side).
 */
export function buildSamplePlan(
  videoId: string,
  mode: 'fingerprint' | 'evidence' | 'localization',
  durationSec: number,
  segments?: Array<{ id: number; start: number; end: number }>,
): FrameSamplePlan {
  const params = mode === 'fingerprint'
    ? { maxFrames: 120, w: 160, h: 90, q: 60, interval: durationSec < 60 ? 1 : durationSec < 600 ? 2 : 5 }
    : mode === 'evidence'
    ? { maxFrames: 24, w: 640, h: 360, q: 75, interval: 5 }
    : { maxFrames: 16, w: 1080, h: 1920, q: 85, interval: 10 }

  const frames: Array<{ frame_id: string; timestamp_sec: number; reason: string; priority: number }> = []

  // First frame
  frames.push({ frame_id: 'f_00000', timestamp_sec: 0, reason: 'first_frame', priority: 1 })

  // Transcript segment starts
  if (segments) {
    for (const seg of segments) {
      frames.push({ frame_id: `f_${String(seg.id).padStart(5, '0')}`, timestamp_sec: seg.start, reason: 'transcript_segment_start', priority: 2 })
    }
  }

  // Uniform fill
  let t = 0
  while (t < durationSec && frames.length < params.maxFrames) {
    if (!frames.some(f => Math.abs(f.timestamp_sec - t) < 0.5)) {
      frames.push({ frame_id: `f_${String(frames.length).padStart(5, '0')}`, timestamp_sec: Math.round(t * 100) / 100, reason: 'uniform_sample', priority: 3 })
    }
    t += params.interval
  }

  // Last frame
  if (durationSec > 0 && !frames.some(f => Math.abs(f.timestamp_sec - durationSec) < 1)) {
    frames.push({ frame_id: `f_${String(frames.length).padStart(5, '0')}`, timestamp_sec: durationSec, reason: 'last_frame', priority: 1 })
  }

  return {
    video_id: videoId,
    plan_id: `plan_${Date.now().toString(36)}`,
    created_at: new Date().toISOString(),
    mode,
    target_width: params.w,
    target_height: params.h,
    jpeg_quality: params.q,
    frames: frames.slice(0, params.maxFrames),
  }
}
