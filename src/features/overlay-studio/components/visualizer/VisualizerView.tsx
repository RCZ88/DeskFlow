import React, { useMemo } from 'react'
import { useStudio } from '../../state/StudioProvider'
import { Eye, FileJson, Play, Shield } from 'lucide-react'
import { OVERLAY_TYPE_CONFIG } from '../../../../types/overlayStudio'
import { motion } from 'framer-motion'
import type { BoundingBox } from '../../vision/types/vision'

function RegionBox({ box, label, color }: { box: BoundingBox; label: string; color: string }) {
  return (
    <div className="absolute border pointer-events-none" style={{
      left: `${box.x * 100}%`, top: `${box.y * 100}%`,
      width: `${box.w * 100}%`, height: `${box.h * 100}%`,
      borderColor: color, background: `${color}15`, borderStyle: 'dashed',
    }}>
      <span className="absolute -top-3.5 left-0 text-[7px] font-mono px-1 rounded" style={{ background: color, color: '#000' }}>{label}</span>
    </div>
  )
}

export function VisualizerView() {
  const { state, dispatch, activeSession } = useStudio()
  const { playback, ui } = state

  const objects = activeSession?.objects || []
  const faces = activeSession?.faces || []
  const textRegions = activeSession?.textRegions || []

  const overlayPlan = activeSession?.overlayPlan
  const activeOverlays = useMemo(() => {
    const overlays = overlayPlan?.overlays || activeSession?.scenePlan?.overlays || []
    return overlays.filter((o: any) => playback.currentTime >= o.start_time && playback.currentTime <= o.end_time)
  }, [overlayPlan?.overlays, activeSession?.scenePlan?.overlays, playback.currentTime])

  const collisionWarnings = useMemo(() => {
    if (!overlayPlan?.overlays?.length && !activeSession?.scenePlan?.overlays?.length) return []
    const warnings: string[] = []
    for (const overlay of activeOverlays) {
      const box: BoundingBox = { x: overlay.x || 0.08, y: overlay.y || 0.2, w: overlay.w || 0.84, h: overlay.h || 0.15 }
      for (const face of faces) {
        if (playback.currentTime >= face.timestamp_sec && playback.currentTime <= (face.end_timestamp_sec || face.timestamp_sec + 5)) {
          const xOverlap = Math.max(0, Math.min(box.x + box.w, face.box.x + face.box.w) - Math.max(box.x, face.box.x))
          const yOverlap = Math.max(0, Math.min(box.y + box.h, face.box.y + face.box.h) - Math.max(box.y, face.box.y))
          if (xOverlap * yOverlap > 0.01) warnings.push(`Overlay covers detected face at ${face.timestamp_sec.toFixed(1)}s`)
        }
      }
      for (const text of textRegions) {
        if (playback.currentTime >= text.timestamp_sec && playback.currentTime <= (text.end_timestamp_sec || text.timestamp_sec + 5)) {
          const xOverlap = Math.max(0, Math.min(box.x + box.w, text.box.x + text.box.w) - Math.max(box.x, text.box.x))
          const yOverlap = Math.max(0, Math.min(box.y + box.h, text.box.y + text.box.h) - Math.max(box.y, text.box.y))
          if (xOverlap * yOverlap > 0.01) warnings.push(`Overlay covers text "${text.text || text.kind}" at ${text.timestamp_sec.toFixed(1)}s`)
        }
      }
    }
    return warnings
  }, [activeOverlays, faces, textRegions, playback.currentTime])

  if (!activeSession) return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center">
      <FileJson size={28} className="mb-3 text-zinc-600" />
      <p className="text-[13px] font-medium text-zinc-400">No session selected</p>
    </div>
  )

  if (!activeSession.scenePlan) return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center">
      <FileJson size={28} className="mb-3 text-zinc-600" />
      <p className="text-[13px] font-medium text-zinc-400">No scene plan yet</p>
      <p className="text-[11px] text-zinc-500 mt-1 mb-4">Generate a scene plan to preview overlays.</p>
      <button onClick={() => dispatch({ type: 'SET_STAGE', stage: 'scene-plan' })} className="studio-btn-primary inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-xs">Go to Scene Plan</button>
    </div>
  )

  return (
    <div className="flex flex-col h-full p-5 gap-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => dispatch({ type: playback.isPlaying ? 'PAUSE' : 'PLAY' })} className="studio-btn rounded-lg bg-zinc-800/60 text-zinc-400 hover:bg-zinc-700/60 hover:text-zinc-200">
            {playback.isPlaying ? <span className="text-[11px]">⏸</span> : <Play size={14} />}
          </button>
          <span className="text-[11px] text-zinc-500 font-mono">{Math.floor(playback.currentTime / 60)}:{(playback.currentTime % 60).toFixed(1).padStart(4, '0')} / {Math.floor(playback.duration / 60)}:{(playback.duration % 60).toFixed(1).padStart(4, '0')}</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => dispatch({ type: 'TOGGLE_SAFE_ZONES' })} className={`studio-btn rounded-lg text-[11px] px-3 py-1.5 transition-colors ${ui.showSafeZones ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30' : 'bg-zinc-800/50 text-zinc-500 border border-zinc-700/30'}`}>Safe Zones</button>
          <button onClick={() => dispatch({ type: 'TOGGLE_FACE_REGIONS' })} className={`studio-btn rounded-lg text-[11px] px-3 py-1.5 transition-colors ${ui.showFaceRegions ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30' : 'bg-zinc-800/50 text-zinc-500 border border-zinc-700/30'}`}>Faces</button>
          <button onClick={() => dispatch({ type: 'TOGGLE_TEXT_REGIONS' })} className={`studio-btn rounded-lg text-[11px] px-3 py-1.5 transition-colors ${ui.showTextRegions ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30' : 'bg-zinc-800/50 text-zinc-500 border border-zinc-700/30'}`}>Text</button>
          <button onClick={() => dispatch({ type: 'TOGGLE_OBJECT_REGIONS' })} className={`studio-btn rounded-lg text-[11px] px-3 py-1.5 transition-colors ${ui.showObjectRegions ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30' : 'bg-zinc-800/50 text-zinc-500 border border-zinc-700/30'}`}>Objects</button>
          <button onClick={() => dispatch({ type: 'SET_STAGE', stage: 'scene-plan' })} className="studio-btn-ghost text-[11px]">Back</button>
        </div>
      </div>

      {/* Collision warnings */}
      {collisionWarnings.length > 0 && (
        <div className="shrink-0 rounded-lg border border-amber-500/30 bg-amber-500/[0.08] p-2.5 text-[11px] text-amber-300 flex items-start gap-2">
          <Shield size={12} className="mt-0.5 shrink-0" />
          <div>{collisionWarnings.map((w, i) => <div key={i}>{w}</div>)}</div>
        </div>
      )}

      {/* Canvas Preview */}
      <div className="flex-1 flex items-center justify-center min-h-0">
        <div className="relative rounded-xl overflow-hidden border border-zinc-700/50 bg-[#0D1117]" style={{ width: 270, height: 480 }}>
          {/* Safe zones */}
          {ui.showSafeZones && (
            <>
              <div className="absolute border border-dashed border-emerald-500/30 bg-emerald-500/5 rounded pointer-events-none" style={{ left: 28, top: 28, width: 214, height: 272 }} />
              <div className="absolute border border-dashed border-red-500/30 bg-red-500/5 rounded pointer-events-none" style={{ left: 190, top: 380, width: 80, height: 100 }} />
              <div className="absolute border border-dashed border-cyan-500/30 bg-cyan-500/5 rounded pointer-events-none" style={{ left: 20, top: 460, width: 230, height: 60 }} />
            </>
          )}

          {/* Protected regions */}
          {ui.showFaceRegions && faces.map((f, i) => {
            if (playback.currentTime < f.timestamp_sec || playback.currentTime > (f.end_timestamp_sec || f.timestamp_sec + 5)) return null
            return <RegionBox key={`face-${i}`} box={f.box} label="face" color="#f43f5e" />
          })}
          {ui.showTextRegions && textRegions.map((t, i) => {
            if (playback.currentTime < t.timestamp_sec || playback.currentTime > (t.end_timestamp_sec || t.timestamp_sec + 5)) return null
            return <RegionBox key={`text-${i}`} box={t.box} label={t.kind || 'text'} color="#f59e0b" />
          })}
          {ui.showObjectRegions && objects.map((o, i) => {
            if (playback.currentTime < o.timestamp_sec || playback.currentTime > (o.end_timestamp_sec || o.timestamp_sec + 5)) return null
            return <RegionBox key={`obj-${i}`} box={o.box} label={o.label} color="#22d3ee" />
          })}

          {/* Overlays */}
          {activeOverlays.map((o: any, i: number) => {
            const color = OVERLAY_TYPE_CONFIG[o.type as keyof typeof OVERLAY_TYPE_CONFIG]?.color || '#e2e8f0'
            return (
              <motion.div key={i} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.2 }}
                className="absolute px-3 py-2 rounded-lg max-w-[85%] pointer-events-none" style={{ top: '20%', left: '8%', right: '8%', background: 'rgba(13,17,23,0.85)', border: `1px solid ${color}40` }}>
                <div className="text-[11px] font-medium mb-0.5" style={{ color }}>{o.type || 'card'}</div>
                <div className="text-white text-[13px] leading-snug font-medium">{o.text}</div>
              </motion.div>
            )
          })}
        </div>
      </div>

      {/* Timeline scrubber */}
      <div className="shrink-0 relative h-11 rounded-lg bg-zinc-800/40 border border-zinc-700/30">
        {(overlayPlan?.overlays || activeSession?.scenePlan?.overlays || []).map((o: any, i: number) => {
          const color = OVERLAY_TYPE_CONFIG[o.type as keyof typeof OVERLAY_TYPE_CONFIG]?.color || '#e2e8f0'
          const totalDur = playback.duration || 300
          return (
            <div key={i} className="absolute top-1 bottom-1 rounded" style={{ left: `${(o.start_time / totalDur) * 100}%`, width: `${((o.end_time - o.start_time) / totalDur) * 100}%`, background: `${color}30`, borderLeft: `2px solid ${color}` }} />
          )
        })}
        <div className="absolute top-0 bottom-0 w-0.5 bg-[#22d3ee] pointer-events-none z-10" style={{ left: `${(playback.currentTime / (playback.duration || 300)) * 100}%` }}>
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-[#22d3ee] rounded-full shadow-lg shadow-[#22d3ee]/30" />
        </div>
      </div>
    </div>
  )
}
