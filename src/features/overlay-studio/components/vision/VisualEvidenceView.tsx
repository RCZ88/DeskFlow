import React, { useMemo } from 'react'
import { useStudio } from '../../state/StudioProvider'
import { Camera, Eye, Layers, Scan, Search, Sparkles, Tag } from 'lucide-react'
import { motion } from 'framer-motion'

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

export function VisualEvidenceView() {
  const { state, dispatch, activeSession } = useStudio()

  return (
    <div className="p-5 space-y-5">
      <div>
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-400 mb-1"><Eye size={14} /> Visual Evidence</div>
        <h2 className="text-[13px] font-semibold text-zinc-200">Analyze what is on screen</h2>
        <p className="text-[11px] text-zinc-500 mt-0.5">Capture frames, detect objects, and generate visual digests.</p>
      </div>

      {/* Degradation banner */}
      <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.06] p-3 text-[11px] text-amber-300">
        Visual analysis is running in degraded mode. Frame capture uses the built-in browser video decoder. Automatic VLM analysis requires Ollama or Manual Visual Bridge.
      </div>

      {/* Vision tools */}
      <div>
        <h3 className="text-[13px] font-semibold text-zinc-300 mb-3">Visual Analysis Tools</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <VisionToolCard icon={Camera} title="Frame Capture" description="Capture evidence frames from the video using the built-in player." status="ready" onClick={() => {}} />
          <VisionToolCard icon={Scan} title="Shot Detection" description="Detect scene boundaries from frame visual changes." status="manual" onClick={() => {}} />
          <VisionToolCard icon={Eye} title="Asset Enrichment" description="Generate visual digest: gist, keywords, topics, objects." status="manual" onClick={() => {}} />
          <VisionToolCard icon={Search} title="Object Locator" description="Detect faces, products, and on-screen text in frames." status="manual" onClick={() => {}} />
          <VisionToolCard icon={Tag} title="Text Regions" description="Mark existing text on screen to avoid overlay collisions." status="manual" onClick={() => {}} />
          <VisionToolCard icon={Sparkles} title="Style Reference" description="Extract pacing, colors, and visual style from reference videos." status="available" onClick={() => {}} />
        </div>
      </div>

      {/* Visual Digest card */}
      <div className="rounded-xl border border-zinc-700/30 bg-zinc-900/70 p-4">
        <h3 className="text-[13px] font-semibold text-zinc-200 mb-2">Visual Digest</h3>
        <p className="text-[11px] text-zinc-500">No visual digest yet. Capture frames and use Manual Visual Bridge to generate one.</p>
      </div>

      {/* Frame filmstrip placeholder */}
      <div className="rounded-xl border border-zinc-700/30 bg-zinc-900/70 p-4">
        <h3 className="text-[13px] font-semibold text-zinc-200 mb-2">Frame Filmstrip</h3>
        <div className="flex gap-2 overflow-x-auto py-2">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="w-20 h-12 rounded-lg bg-zinc-800/50 border border-zinc-700/30 flex items-center justify-center shrink-0">
              <span className="text-[9px] text-zinc-600">{`00:0${i}.0`}</span>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-zinc-500 mt-2">Frame capture will populate this filmstrip.</p>
      </div>
    </div>
  )
}
