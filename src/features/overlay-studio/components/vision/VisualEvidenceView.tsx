import React, { useMemo, useState, useCallback, useRef } from 'react'
import { useStudio } from '../../state/StudioProvider'
import { Eye, Camera, Scan, Search, Tag, Sparkles, X, Plus } from 'lucide-react'
import { motion } from 'framer-motion'
import type { FrameManifest, FrameManifestItem, DetectedObject, FaceRegion, TextRegion, BoundingBox } from '../../vision/types/vision'
import { captureFrames, buildSamplePlan } from '../../vision/services/frameCaptureService'
import { validateVisualDigestJson } from '../../vision/services/visualAnalysisService'

function VisionToolCard({ icon: Icon, title, description, status, onClick }: {
  icon: React.FC<{ size?: number }>; title: string; description: string; status: string; onClick: () => void
}) {
  return (
    <motion.button whileHover={{ y: -2, scale: 1.01 }} whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className="w-full text-left rounded-xl border border-zinc-700/30 bg-zinc-800/30 p-4 hover:border-cyan-500/30 hover:bg-zinc-800/50 transition-all duration-150 min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg bg-cyan-500/10 flex items-center justify-center shrink-0"><Icon size={16} className="text-cyan-400" /></div>
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-semibold text-zinc-200">{title}</div>
          <div className="text-[11px] text-zinc-500 mt-0.5 leading-relaxed">{description}</div>
        </div>
        <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full shrink-0 ${status === 'ready' ? 'bg-emerald-500/15 text-emerald-400' : status === 'manual' ? 'bg-amber-500/15 text-amber-400' : 'bg-zinc-700/30 text-zinc-500'}`}>{status === 'ready' ? 'Ready' : status === 'manual' ? 'Manual' : 'Available'}</span>
      </div>
    </motion.button>
  )
}

function FrameFilmstrip({ manifest, selectedId, onSelect }: { manifest: FrameManifest | null; selectedId: string | null; onSelect: (f: FrameManifestItem) => void }) {
  if (!manifest || manifest.frames.length === 0) return (
    <div className="rounded-xl border border-zinc-700/30 bg-zinc-900/70 p-4">
      <h3 className="text-[13px] font-semibold text-zinc-200 mb-2">Frame Filmstrip</h3>
      <p className="text-[10px] text-zinc-500">No frames captured yet. Click "Visual Scan" to capture evidence frames.</p>
    </div>
  )
  return (
    <div className="rounded-xl border border-zinc-700/30 bg-zinc-900/70 p-4">
      <h3 className="text-[13px] font-semibold text-zinc-200 mb-2">Frame Filmstrip <span className="text-zinc-500 font-normal">({manifest.frame_count} frames)</span></h3>
      <div className="flex gap-2 overflow-x-auto py-2">
        {manifest.frames.map(f => (
          <button key={f.frame_id} onClick={() => onSelect(f)}
            className={`shrink-0 w-24 rounded-lg overflow-hidden border transition-all ${selectedId === f.frame_id ? 'border-cyan-500 ring-2 ring-cyan-500/30' : 'border-zinc-700/30 hover:border-zinc-600'}`}>
            {f.thumbnail_url ? (
              <img src={f.thumbnail_url} alt={f.frame_id} className="w-full h-14 object-cover" />
            ) : (
              <div className="w-full h-14 bg-zinc-800/50 flex items-center justify-center"><Camera size={12} className="text-zinc-600" /></div>
            )}
            <div className="px-1.5 py-1 bg-zinc-900/80 text-[8px] text-zinc-400 font-mono">{Math.floor(f.timestamp_sec / 60)}:{(f.timestamp_sec % 60).toFixed(1).padStart(4, '0')}</div>
          </button>
        ))}
      </div>
    </div>
  )
}

function MarkerCanvas({ frame, objects, faces, textRegions, onAddObject, onAddFace, onAddText, markerMode }: {
  frame: FrameManifestItem | null; objects: DetectedObject[]; faces: FaceRegion[]; textRegions: TextRegion[]
  onAddObject: (box: BoundingBox, label: string) => void; onAddFace: (box: BoundingBox) => void; onAddText: (box: BoundingBox, text: string) => void
  markerMode: 'object' | 'face' | 'text' | null
}) {
  const canvasRef = useRef<HTMLDivElement>(null)
  const [drawing, setDrawing] = useState(false)
  const [start, setStart] = useState<{ x: number; y: number } | null>(null)
  const [end, setEnd] = useState<{ x: number; y: number } | null>(null)
  const [label, setLabel] = useState('face')
  const [textInput, setTextInput] = useState('')

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!markerMode || !canvasRef.current) return
    const rect = canvasRef.current.getBoundingClientRect()
    setStart({ x: (e.clientX - rect.left) / rect.width, y: (e.clientY - rect.top) / rect.height })
    setDrawing(true)
  }, [markerMode])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!drawing || !canvasRef.current) return
    const rect = canvasRef.current.getBoundingClientRect()
    setEnd({ x: (e.clientX - rect.left) / rect.width, y: (e.clientY - rect.top) / rect.height })
  }, [drawing])

  const handleMouseUp = useCallback(() => {
    if (!drawing || !start || !end) { setDrawing(false); return }
    const box: BoundingBox = {
      x: Math.min(start.x, end.x), y: Math.min(start.y, end.y),
      w: Math.abs(end.x - start.x), h: Math.abs(end.y - start.y),
    }
    if (box.w > 0.02 && box.h > 0.02) {
      if (markerMode === 'object') onAddObject(box, label)
      else if (markerMode === 'face') onAddFace(box)
      else if (markerMode === 'text') onAddText(box, textInput || 'text')
    }
    setDrawing(false); setStart(null); setEnd(null)
  }, [drawing, start, end, markerMode, label, textInput, onAddObject, onAddFace, onAddText])

  const previewBox = drawing && start && end ? {
    left: `${Math.min(start.x, end.x) * 100}%`, top: `${Math.min(start.y, end.y) * 100}%`,
    width: `${Math.abs(end.x - start.x) * 100}%`, height: `${Math.abs(end.y - start.y) * 100}%`,
  } : null

  const renderBox = (box: BoundingBox, color: string, label: string) => (
    <div key={`${box.x}-${box.y}`} className="absolute border pointer-events-none" style={{
      left: `${box.x * 100}%`, top: `${box.y * 100}%`, width: `${box.w * 100}%`, height: `${box.h * 100}%`,
      borderColor: color, background: `${color}10`,
    }}>
      <span className="absolute -top-4 left-0 text-[8px] font-mono px-1 rounded" style={{ background: color, color: '#000' }}>{label}</span>
    </div>
  )

  return (
    <div className="rounded-xl border border-zinc-700/30 bg-zinc-900/70 p-4 space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-[13px] font-semibold text-zinc-200">Frame Marker</h3>
        {markerMode && (
          <div className="flex items-center gap-2">
            {markerMode === 'object' && (
              <select value={label} onChange={e => setLabel(e.target.value)} className="text-[10px] bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-zinc-300">
                <option value="face">face</option><option value="person">person</option><option value="product">product</option>
                <option value="laptop">laptop</option><option value="screen">screen</option><option value="whiteboard">whiteboard</option>
                <option value="logo">logo</option><option value="ui">ui</option><option value="other">other</option>
              </select>
            )}
            {markerMode === 'text' && (
              <input value={textInput} onChange={e => setTextInput(e.target.value)} placeholder="text content" className="text-[10px] bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-zinc-300 w-32" />
            )}
            <span className="text-[10px] text-cyan-400">Draw a box on the frame</span>
          </div>
        )}
      </div>
      <div ref={canvasRef} className="relative w-full aspect-video bg-zinc-950 rounded-lg overflow-hidden cursor-crosshair"
        onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
        {frame?.thumbnail_url && <img src={frame.thumbnail_url} className="w-full h-full object-contain" alt="" />}
        {objects.map((o, i) => renderBox(o.box, '#22d3ee', o.label))}
        {faces.map((f, i) => renderBox(f.box, '#f43f5e', 'face'))}
        {textRegions.map((t, i) => renderBox(t.box, '#f59e0b', t.kind || 'text'))}
        {previewBox && <div className="absolute border-2 border-cyan-400 bg-cyan-400/10 pointer-events-none" style={previewBox} />}
      </div>
    </div>
  )
}

function DigestCard({ digest }: { digest: any }) {
  if (!digest) return (
    <div className="rounded-xl border border-zinc-700/30 bg-zinc-900/70 p-4">
      <h3 className="text-[13px] font-semibold text-zinc-200 mb-2">Visual Digest</h3>
      <p className="text-[10px] text-zinc-500">No visual digest yet. Use Manual Visual Bridge to generate one.</p>
    </div>
  )
  return (
    <div className="rounded-xl border border-zinc-700/30 bg-zinc-900/70 p-4 space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-[13px] font-semibold text-zinc-200">Visual Digest</h3>
        <span className="text-[10px] text-zinc-500">{Math.round((digest.confidence || 0) * 100)}% · {digest.source}</span>
      </div>
      <p className="text-[11px] text-zinc-300">{digest.gist}</p>
      {digest.keywords?.length > 0 && (
        <div className="flex flex-wrap gap-1">{digest.keywords.slice(0, 8).map((k: string, i: number) => <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400">{k}</span>)}</div>
      )}
      {digest.objects_visible?.length > 0 && (
        <div className="text-[10px] text-zinc-500">Objects: {digest.objects_visible.join(', ')}</div>
      )}
    </div>
  )
}

export function VisualEvidenceView() {
  const { state, dispatch, activeSession } = useStudio()
  const [manifest, setManifest] = useState<FrameManifest | null>(null)
  const [selectedFrame, setSelectedFrame] = useState<FrameManifestItem | null>(null)
  const [isCapturing, setIsCapturing] = useState(false)
  const [captureProgress, setCaptureProgress] = useState({ current: 0, total: 0 })
  const [markerMode, setMarkerMode] = useState<'object' | 'face' | 'text' | null>(null)
  const [showBridge, setShowBridge] = useState(false)
  const [digestInput, setDigestInput] = useState('')

  const session = activeSession
  const objects = session?.objects || []
  const faces = session?.faces || []
  const textRegions = session?.textRegions || []

  const handleVisualScan = useCallback(async () => {
    if (!session?.transcript || isCapturing) return
    setIsCapturing(true)
    try {
      const plan = buildSamplePlan(session.sourceVideoName, 'evidence', session.durationSec || 60, session.transcript.segments)
      const result = await captureFrames(plan, session.sourceVideoPath, (p) => setCaptureProgress({ current: p.current, total: p.total }))
      setManifest(result)
    } catch (err) { console.error('Frame capture failed:', err) }
    finally { setIsCapturing(false) }
  }, [session, isCapturing])

  const handleAddObject = useCallback((box: BoundingBox, label: string) => {
    if (!session) return
    const obj: DetectedObject = {
      id: `obj_${Date.now().toString(36)}`, frame_id: selectedFrame?.frame_id || null,
      timestamp_sec: selectedFrame?.timestamp_sec || 0, end_timestamp_sec: null,
      label, confidence: 1.0, box, source: 'user', properties: {},
    }
    dispatch({ type: 'ADD_OBJECT', sessionId: session.id, obj })
  }, [session, selectedFrame, dispatch])

  const handleAddFace = useCallback((box: BoundingBox) => {
    if (!session) return
    const face: FaceRegion = {
      id: `face_${Date.now().toString(36)}`, frame_id: selectedFrame?.frame_id || null,
      timestamp_sec: selectedFrame?.timestamp_sec || 0, end_timestamp_sec: null,
      box, confidence: 1.0, source: 'user',
    }
    dispatch({ type: 'ADD_FACE', sessionId: session.id, face })
  }, [session, selectedFrame, dispatch])

  const handleAddText = useCallback((box: BoundingBox, text: string) => {
    if (!session) return
    const region: TextRegion = {
      id: `txt_${Date.now().toString(36)}`, frame_id: selectedFrame?.frame_id || null,
      timestamp_sec: selectedFrame?.timestamp_sec || 0, end_timestamp_sec: null,
      box, text, kind: 'unknown', confidence: 1.0, source: 'user',
    }
    dispatch({ type: 'ADD_TEXT_REGION', sessionId: session.id, region })
  }, [session, selectedFrame, dispatch])

  const handleAcceptDigest = useCallback(() => {
    if (!session || !digestInput.trim()) return
    try {
      let parsed: any
      const trimmed = digestInput.trim()
      const fenceMatch = trimmed.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/)
      if (fenceMatch) { parsed = JSON.parse(fenceMatch[1]) }
      else {
        const start = trimmed.indexOf('{'); const end = trimmed.lastIndexOf('}')
        if (start >= 0 && end > start) parsed = JSON.parse(trimmed.slice(start, end + 1))
        else parsed = JSON.parse(trimmed)
      }
      const checks = validateVisualDigestJson(parsed)
      const passed = checks.every(c => c.passed)
      if (passed) {
        dispatch({ type: 'SET_DIGEST', sessionId: session.id, digest: parsed })
        setDigestInput(''); setShowBridge(false)
      } else {
        dispatch({ type: 'VALIDATE_BRIDGE_ERROR', error: checks.filter(c => !c.passed).map(c => c.rule).join(', ') + ' failed' })
      }
    } catch (err) { dispatch({ type: 'VALIDATE_BRIDGE_ERROR', error: 'Invalid JSON' }) }
  }, [session, digestInput, dispatch])

  if (!session) return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center">
      <Eye size={28} className="mb-3 text-zinc-600" />
      <p className="text-[13px] font-medium text-zinc-400">No session selected</p>
      <p className="text-[11px] text-zinc-500 mt-1 mb-4">Select a video session to analyze visual evidence.</p>
      <button onClick={() => dispatch({ type: 'SET_STAGE', stage: 'dashboard' })} className="studio-btn-primary inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-xs">Go to Dashboard</button>
    </div>
  )

  return (
    <div className="p-5 space-y-5 relative">
      {isCapturing && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-zinc-950/80 backdrop-blur-sm rounded-xl">
          <div className="text-center">
            <Camera size={24} className="mx-auto mb-2 text-cyan-400 animate-pulse" />
            <p className="text-[13px] font-medium text-zinc-200">Capturing frames...</p>
            <p className="text-[11px] text-zinc-500 mt-1">{captureProgress.current} / {captureProgress.total}</p>
          </div>
        </div>
      )}

      <div>
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-400 mb-1"><Eye size={14} /> Visual Evidence</div>
        <h2 className="text-[13px] font-semibold text-zinc-200">Analyze what is on screen</h2>
        <p className="text-[11px] text-zinc-500 mt-0.5">Capture frames, detect objects, and generate visual digests.</p>
      </div>

      <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.06] p-3 text-[11px] text-amber-300">
        Visual analysis is running in degraded mode. Frame capture uses the built-in browser video decoder. Automatic VLM analysis requires Ollama or Manual Visual Bridge.
      </div>

      {/* Vision tools */}
      <div>
        <h3 className="text-[13px] font-semibold text-zinc-300 mb-3">Visual Analysis Tools</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <VisionToolCard icon={Camera} title="Visual Scan" description="Capture evidence frames from the video." status={manifest ? 'ready' : 'available'} onClick={handleVisualScan} />
          <VisionToolCard icon={Scan} title="Shot Detection" description="Detect scene boundaries from frame changes." status="manual" onClick={() => {}} />
          <VisionToolCard icon={Eye} title="Asset Enrichment" description="Generate visual digest via Manual Visual Bridge." status={session.digest ? 'ready' : 'manual'} onClick={() => dispatch({ type: 'OPEN_BRIDGE', mode: 'visual-digest' })} />
          <VisionToolCard icon={Search} title="Object Locator" description="Mark faces, products, and on-screen text." status={objects.length + faces.length + textRegions.length > 0 ? 'ready' : 'manual'} onClick={() => setMarkerMode(markerMode === 'object' ? null : 'object')} />
          <VisionToolCard icon={Tag} title="Face Marking" description="Mark face regions to protect from overlays." status={faces.length > 0 ? 'ready' : 'manual'} onClick={() => setMarkerMode(markerMode === 'face' ? null : 'face')} />
          <VisionToolCard icon={Sparkles} title="Text Regions" description="Mark existing on-screen text to avoid collisions." status={textRegions.length > 0 ? 'ready' : 'manual'} onClick={() => setMarkerMode(markerMode === 'text' ? null : 'text')} />
        </div>
      </div>

      {/* Frame Filmstrip */}
      <FrameFilmstrip manifest={manifest} selectedId={selectedFrame?.frame_id || null} onSelect={setSelectedFrame} />

      {/* Marker Canvas */}
      <MarkerCanvas frame={selectedFrame} objects={objects} faces={faces} textRegions={textRegions}
        onAddObject={handleAddObject} onAddFace={handleAddFace} onAddText={handleAddText} markerMode={markerMode} />

      {/* Visual Digest */}
      <DigestCard digest={session.digest || null} />

      {/* Marked Items Summary */}
      {(objects.length > 0 || faces.length > 0 || textRegions.length > 0) && (
        <div className="rounded-xl border border-zinc-700/30 bg-zinc-900/70 p-4 space-y-2">
          <h3 className="text-[13px] font-semibold text-zinc-200">Marked Regions ({objects.length + faces.length + textRegions.length})</h3>
          {faces.length > 0 && (
            <div className="space-y-1">
              <div className="text-[10px] font-semibold text-rose-400 uppercase tracking-wider">Faces ({faces.length})</div>
              {faces.map((f, i) => (
                <div key={i} className="flex items-center gap-2 text-[11px] py-0.5">
                  <span className="text-rose-400">●</span>
                  <span className="text-zinc-400">{f.frame_id || 'no frame'}</span>
                  <span className="text-zinc-600">@ {f.timestamp_sec.toFixed(1)}s</span>
                  <button onClick={() => dispatch({ type: 'REMOVE_FACE', sessionId: session.id, faceId: f.id })} className="ml-auto text-zinc-600 hover:text-red-400"><X size={10} /></button>
                </div>
              ))}
            </div>
          )}
          {objects.length > 0 && (
            <div className="space-y-1">
              <div className="text-[10px] font-semibold text-cyan-400 uppercase tracking-wider">Objects ({objects.length})</div>
              {objects.map((o, i) => (
                <div key={i} className="flex items-center gap-2 text-[11px] py-0.5">
                  <span className="text-cyan-400">●</span>
                  <span className="text-zinc-300">{o.label}</span>
                  <span className="text-zinc-600">@ {o.timestamp_sec.toFixed(1)}s</span>
                  <button onClick={() => dispatch({ type: 'REMOVE_OBJECT', sessionId: session.id, objectId: o.id })} className="ml-auto text-zinc-600 hover:text-red-400"><X size={10} /></button>
                </div>
              ))}
            </div>
          )}
          {textRegions.length > 0 && (
            <div className="space-y-1">
              <div className="text-[10px] font-semibold text-amber-400 uppercase tracking-wider">Text ({textRegions.length})</div>
              {textRegions.map((t, i) => (
                <div key={i} className="flex items-center gap-2 text-[11px] py-0.5">
                  <span className="text-amber-400">●</span>
                  <span className="text-zinc-300">{t.text || t.kind}</span>
                  <span className="text-zinc-600">@ {t.timestamp_sec.toFixed(1)}s</span>
                  <button onClick={() => dispatch({ type: 'REMOVE_TEXT_REGION', sessionId: session.id, regionId: t.id })} className="ml-auto text-zinc-600 hover:text-red-400"><X size={10} /></button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Provider Status */}
      <div className="rounded-xl border border-zinc-700/30 bg-zinc-900/70 p-4">
        <h3 className="text-[13px] font-semibold text-zinc-200 mb-2">Provider Status</h3>
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-[11px]"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Frontend frame capture</div>
          <div className="flex items-center gap-2 text-[11px]"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Manual Visual Bridge</div>
          <div className="flex items-center gap-2 text-[11px]"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Manual object/face/text marking</div>
          <div className="flex items-center gap-2 text-[11px]"><span className="w-2 h-2 rounded-full bg-zinc-600" /> Ollama VLM <span className="text-zinc-600">(unavailable)</span></div>
          <div className="flex items-center gap-2 text-[11px]"><span className="w-2 h-2 rounded-full bg-zinc-600" /> SAM-3 <span className="text-zinc-600">(unavailable)</span></div>
        </div>
      </div>
    </div>
  )
}
