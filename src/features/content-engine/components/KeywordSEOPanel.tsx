import { useState } from 'react'
import { AlertTriangle, Search, Zap } from 'lucide-react'
import type { ContentEpisode } from '@/types/deskflow-api'
import { AmberButton, Card, EmptyState, ErrorState, LoadingBlock, SectionHeader } from './ui'

const BANNED_WORDS = ['hey guys', 'in this video', 'so basically', 'kind of', 'sort of']

interface KeywordSEOPanelProps {
  episode: ContentEpisode
}

export function KeywordSEOPanel({ episode }: KeywordSEOPanelProps) {
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const seo = episode.seo as any
  const phrases = Array.isArray(seo?.phrases) ? seo.phrases : []

  const generateSeo = async () => {
    setGenerating(true)
    setError(null)
    try {
      const res = await (window as any).deskflowAPI?.contentEngine?.injectSeo({
        episodeId: episode.id,
        niche: episode.niche || undefined,
      })
      if (!res?.ok) setError(res?.error || 'SEO generation failed')
    } catch (e: any) {
      setError(e?.message || 'SEO generation failed')
    } finally {
      setGenerating(false)
    }
  }

  if (generating) return <LoadingBlock label="Generating SEO phrases…" />
  if (error) return <ErrorState message={error} onRetry={generateSeo} />

  return (
    <Card className="p-5">
      <SectionHeader
        label="HIDDEN SEO PHRASES"
        title="Algorithm Injection"
        icon={<Search size={14} className="text-[#f5c518]" />}
      />

      {phrases.length === 0 ? (
        <div className="mt-4">
          <EmptyState
            icon={<Search size={28} />}
            title="No SEO phrases yet"
            hint="Generate SEO metadata to get hidden phrases the algorithm picks up via ASR/OCR."
            action={
              <AmberButton onClick={generateSeo}>
                <Zap size={13} /> Generate SEO
              </AmberButton>
            }
          />
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          {/* Phrases table */}
          <div className="rounded-lg border border-white/[0.06] overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/[0.06] bg-white/[0.02]">
                  <th className="px-3 py-2 text-[9px] font-semibold tracking-wider text-zinc-500 uppercase">#</th>
                  <th className="px-3 py-2 text-[9px] font-semibold tracking-wider text-zinc-500 uppercase">Phrase</th>
                  <th className="px-3 py-2 text-[9px] font-semibold tracking-wider text-zinc-500 uppercase">Where</th>
                  <th className="px-3 py-2 text-[9px] font-semibold tracking-wider text-zinc-500 uppercase">Signal</th>
                </tr>
              </thead>
              <tbody>
                {phrases.map((p: any, i: number) => (
                  <tr key={i} className="border-b border-white/[0.04] last:border-0">
                    <td className="px-3 py-2 text-[10px] text-zinc-500">{i + 1}</td>
                    <td className="px-3 py-2 text-[11px] font-medium text-zinc-200">&ldquo;{p.phrase || p.text}&rdquo;</td>
                    <td className="px-3 py-2">
                      <span className="rounded-md bg-white/[0.05] px-1.5 py-0.5 text-[9px] text-zinc-400">
                        {p.position || p.where || '—'}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-[10px] text-zinc-500">{p.signal || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Poison warning */}
          <div className="rounded-lg border border-rose-500/30 bg-rose-950/20 p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle size={14} className="mt-0.5 shrink-0 text-rose-400" />
              <div>
                <div className="text-[10px] font-semibold tracking-wider text-rose-400 uppercase">
                  Algorithm Poison — DO NOT SAY
                </div>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {BANNED_WORDS.map((w) => (
                    <span key={w} className="rounded border border-rose-500/25 bg-rose-500/10 px-1.5 py-0.5 text-[9px] text-rose-400">
                      {w}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </Card>
  )
}
