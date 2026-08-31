import { useRef, useState } from 'react'
import { Download, Maximize2, Minimize2, Smartphone, Monitor } from 'lucide-react'
import { GhostButton, toast } from './ui'
import { cn } from '@/lib/utils'

const api = () => (window as any).deskflowAPI

const ASPECT_RATIOS = {
  '9:16': { width: 1080, height: 1920, label: '9:16 Vertical', icon: Smartphone, css: 'aspect-[9/16]' },
  '16:9': { width: 1920, height: 1080, label: '16:9 Horizontal', icon: Monitor, css: 'aspect-[16/9]' },
  '1:1': { width: 1080, height: 1080, label: '1:1 Square', icon: Maximize2, css: 'aspect-square' },
} as const

type AspectRatio = keyof typeof ASPECT_RATIOS

interface FramePreviewCardProps {
  frame: {
    text: string
    visual?: string
    frame_type?: string
    duration_seconds?: number
    retention?: { score?: number; criteria?: string[] }
  }
  index: number
  aspectRatio?: AspectRatio
  className?: string
}

export function FramePreviewCard({ frame, index, aspectRatio = '9:16', className }: FramePreviewCardProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [exporting, setExporting] = useState(false)
  const ratio = ASPECT_RATIOS[aspectRatio]

  const captureAsImage = async () => {
    if (!cardRef.current || exporting) return
    setExporting(true)
    try {
      const el = cardRef.current
      // Use SVG foreignObject to capture the element
      const data = new XMLSerializer().serializeToString(el)
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${el.offsetWidth * 2}" height="${el.offsetHeight * 2}">
        <foreignObject width="100%" height="100%">${data}</foreignObject>
      </svg>`
      const svgBlob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' })
      const url = URL.createObjectURL(svgBlob)
      const img = new Image()
      img.onload = async () => {
        const canvas = document.createElement('canvas')
        canvas.width = el.offsetWidth * 2
        canvas.height = el.offsetHeight * 2
        const ctx = canvas.getContext('2d')!
        ctx.scale(2, 2)
        ctx.drawImage(img, 0, 0)
        URL.revokeObjectURL(url)
        const dataUrl = canvas.toDataURL('image/png')
        // Save via Electron dialog
        const filename = `frame-${index + 1}-${Date.now()}.png`
        const result = await api()?.saveFile({ content: dataUrl, filename, fileType: 'image/png' })
        if (result?.success) toast(`Saved: ${result.path}`)
        else if (result?.message !== 'Save cancelled') toast(result?.message || 'Save failed', 'error')
        setExporting(false)
      }
      img.onerror = () => { URL.revokeObjectURL(url); setExporting(false); toast('Capture failed', 'error') }
      img.src = url
    } catch (e: any) {
      toast(e.message || 'Export failed', 'error')
      setExporting(false)
    }
  }

  const typeColors: Record<string, string> = {
    hook: 'from-amber-500/20 to-amber-600/5 border-amber-500/30',
    value: 'from-cyan-500/20 to-cyan-600/5 border-cyan-500/30',
    transition: 'from-violet-500/20 to-violet-600/5 border-violet-500/30',
    call_to_action: 'from-emerald-500/20 to-emerald-600/5 border-emerald-500/30',
    visual_only: 'from-zinc-500/20 to-zinc-600/5 border-zinc-500/30',
  }

  const typeLabels: Record<string, string> = {
    hook: 'HOOK',
    value: 'VALUE',
    transition: 'TRANSITION',
    call_to_action: 'CTA',
    visual_only: 'VISUAL',
  }

  return (
    <div className={cn('group relative', className)}>
      {/* Aspect ratio badge */}
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-[9px] font-mono text-zinc-600">Frame {index + 1}</span>
        <GhostButton onClick={captureAsImage} disabled={exporting} className="h-5 px-1.5 text-[9px] opacity-0 group-hover:opacity-100 transition-opacity">
          <Download size={10} /> {exporting ? 'Saving…' : 'PNG'}
        </GhostButton>
      </div>

      {/* The renderable frame card */}
      <div ref={cardRef}
        className={cn(
          'relative w-full overflow-hidden rounded-xl border bg-gradient-to-b',
          typeColors[frame.frame_type || 'value'] || typeColors.value,
        )}
        style={{ aspectRatio: ratio.width / ratio.height }}
      >
        {/* Frame type badge */}
        <div className="absolute top-2 left-2 z-10">
          <span className="rounded-md bg-black/50 px-1.5 py-0.5 text-[8px] font-bold tracking-wider text-white/80">
            {typeLabels[frame.frame_type || 'value'] || 'FRAME'}
          </span>
        </div>

        {/* Duration badge */}
        {frame.duration_seconds != null && (
          <div className="absolute top-2 right-2 z-10">
            <span className="rounded-md bg-black/50 px-1.5 py-0.5 text-[8px] font-mono text-white/80">
              {frame.duration_seconds}s
            </span>
          </div>
        )}

        {/* Main content area */}
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
          <p className="text-sm font-medium leading-relaxed text-white drop-shadow-lg md:text-base">
            {frame.text}
          </p>
        </div>

        {/* Visual note at bottom */}
        {frame.visual && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3 pt-6">
            <p className="text-[10px] text-white/60 line-clamp-2">{frame.visual}</p>
          </div>
        )}

        {/* Retention score indicator */}
        {frame.retention?.score != null && (
          <div className="absolute bottom-2 right-2 z-10">
            <span className={cn(
              'rounded-md px-1.5 py-0.5 text-[8px] font-bold',
              frame.retention.score >= 0.6 ? 'bg-emerald-500/30 text-emerald-300' : 'bg-rose-500/30 text-rose-300'
            )}>
              {Math.round(frame.retention.score * 100)}%
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

// Aspect ratio selector component
export function AspectRatioSelector({ value, onChange }: { value: AspectRatio; onChange: (v: AspectRatio) => void }) {
  return (
    <div className="flex items-center gap-1 rounded-lg border border-white/[0.06] bg-white/[0.03] p-0.5">
      {(Object.keys(ASPECT_RATIOS) as AspectRatio[]).map(r => {
        const config = ASPECT_RATIOS[r]
        const Icon = config.icon
        return (
          <button key={r} onClick={() => onChange(r)}
            className={cn('flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium transition-colors',
              value === r ? 'bg-[#f5c518]/15 text-[#f5c518]' : 'text-zinc-500 hover:text-zinc-300')}>
            <Icon size={10} /> {r}
          </button>
        )
      })}
    </div>
  )
}

export type { AspectRatio }
