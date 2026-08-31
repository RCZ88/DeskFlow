import React, { useEffect, useState } from 'react'
import { Radar, TrendingUp, Zap, Brain, Target, Clock, MessageSquare, Sparkles } from 'lucide-react'
import { Card, Chip, SectionHeader, EmptyState, LoadingBlock, GhostButton } from './ui'

const api = () => (window as any).deskflowAPI

interface ContextProfile {
  id: string
  traits: Record<string, any>
  habits: Record<string, any>
  preferences: Record<string, any>
  goals_pattern: Record<string, any>
  activity_pattern: Record<string, any>
  growth_markers: any[]
  communication_style: Record<string, any>
  context_version: number
  last_updated_at?: string
}

function PersonalityRadar({ traits }: { traits: Record<string, any> }) {
  const entries = Object.entries(traits)
  if (entries.length === 0) return <EmptyState icon={<Radar size={20} />} title="No traits yet" hint="Interact with the app to build your profile." />
  const radarSize = 160
  const center = radarSize / 2
  const maxRadius = center - 20
  const n = Math.max(entries.length, 3)
  const angleStep = (2 * Math.PI) / n

  return (
    <div className="flex flex-col items-center">
      <svg width={radarSize} height={radarSize} className="overflow-visible">
        {[0.25, 0.5, 0.75, 1].map(scale => (
          <polygon key={scale} points={entries.map((_, i) => {
            const angle = angleStep * i - Math.PI / 2
            return `${center + Math.cos(angle) * maxRadius * scale},${center + Math.sin(angle) * maxRadius * scale}`
          }).join(' ')} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={1} />
        ))}
        {entries.map((_, i) => {
          const angle = angleStep * i - Math.PI / 2
          return <line key={i} x1={center} y1={center} x2={center + Math.cos(angle) * maxRadius} y2={center + Math.sin(angle) * maxRadius} stroke="rgba(255,255,255,0.08)" strokeWidth={1} />
        })}
        <polygon
          points={entries.map(([_, v], i) => {
            const angle = angleStep * i - Math.PI / 2
            const confidence = typeof v === 'object' ? (v.confidence || 0.5) : 0.5
            const r = maxRadius * Math.min(confidence, 1)
            return `${center + Math.cos(angle) * r},${center + Math.sin(angle) * r}`
          }).join(' ')}
          fill="rgba(236,72,153,0.15)" stroke="#ec4899" strokeWidth={2}
        />
      </svg>
      <div className="flex flex-wrap gap-1.5 mt-3 justify-center">
        {entries.slice(0, 8).map(([key, v]) => (
          <Chip key={key} className="border-[#ec4899]/20 bg-[#ec4899]/5 text-[#ec4899] text-[9px]">
            {key.replace(/_/g, ' ')}
          </Chip>
        ))}
      </div>
    </div>
  )
}

function InterestMap({ activityPattern }: { activityPattern: Record<string, any> }) {
  const entries = Object.entries(activityPattern)
  if (entries.length === 0) return <EmptyState icon={<Target size={20} />} title="No interests detected yet" />
  return (
    <div className="space-y-2">
      {entries.map(([key, v]) => {
        const confidence = typeof v === 'object' ? (v.confidence || 0.5) : 0.5
        return (
          <div key={key} className="flex items-center gap-2">
            <span className="text-[11px] text-zinc-300 flex-1 truncate">{key}</span>
            <div className="w-20 h-1.5 rounded-full bg-zinc-800">
              <div className="h-full rounded-full bg-[#22d3ee]" style={{ width: `${Math.min(confidence * 100, 100)}%` }} />
            </div>
            <span className="text-[9px] font-mono text-zinc-500">{Math.round(confidence * 100)}%</span>
          </div>
        )
      })}
    </div>
  )
}

function GrowthTimeline({ markers }: { markers: any[] }) {
  if (!markers || markers.length === 0) return <EmptyState icon={<TrendingUp size={20} />} title="No growth markers yet" />
  return (
    <div className="space-y-2">
      {markers.slice(0, 10).map((m: any, i: number) => (
        <div key={i} className="flex items-start gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-[11px] text-zinc-300 truncate">{m.content || m}</p>
            {m.source && <p className="text-[9px] text-zinc-500">{m.source}</p>}
          </div>
        </div>
      ))}
    </div>
  )
}

function CommunicationStyle({ style }: { style: Record<string, any> }) {
  const entries = Object.entries(style)
  if (entries.length === 0) return <EmptyState icon={<MessageSquare size={20} />} title="No communication style detected" />
  return (
    <div className="space-y-2">
      {entries.map(([key, v]) => (
        <div key={key} className="flex items-center gap-2">
          <MessageSquare size={11} className="text-cyan-400 shrink-0" />
          <span className="text-[11px] text-zinc-300">{key}</span>
          <span className="text-[9px] text-zinc-500 ml-auto">{typeof v === 'object' ? `${Math.round((v.confidence || 0.5) * 100)}%` : ''}</span>
        </div>
      ))}
    </div>
  )
}

export function ContextProfilePage() {
  const [profile, setProfile] = useState<ContextProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [rebuilding, setRebuilding] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const p = await api()?.contextGetProfile?.()
      setProfile(p)
    } catch (e) { /* ignore */ }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const rebuild = async () => {
    setRebuilding(true)
    try {
      await api()?.contextRebuild?.()
      load()
    } catch (e) { /* ignore */ }
    finally { setRebuilding(false) }
  }

  if (loading) return <LoadingBlock label="Loading context profile..." />

  return (
    <div className="space-y-6 p-5 max-w-4xl mx-auto">
      <SectionHeader
        label="Context Profile"
        title="Your Profile"
        icon={<Brain size={16} className="text-[#ec4899]" />}
        action={
          <GhostButton onClick={rebuild} disabled={rebuilding} className="h-7 px-2 text-[10px]">
            <Sparkles size={11} /> {rebuilding ? 'Rebuilding…' : 'Rebuild'}
          </GhostButton>
        }
      />
      <p className="text-[11px] text-zinc-500 -mt-4">Read-derived profile. Updated automatically from your activity.</p>

      <div className="grid grid-cols-2 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Radar size={13} className="text-[#ec4899]" />
            <span className="text-[10px] font-semibold tracking-wider text-zinc-400 uppercase">Personality Radar</span>
          </div>
          <PersonalityRadar traits={profile?.traits || {}} />
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Target size={13} className="text-[#22d3ee]" />
            <span className="text-[10px] font-semibold tracking-wider text-zinc-400 uppercase">Interests</span>
          </div>
          <InterestMap activityPattern={profile?.activity_pattern || {}} />
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp size={13} className="text-emerald-400" />
            <span className="text-[10px] font-semibold tracking-wider text-zinc-400 uppercase">Growth Timeline</span>
          </div>
          <GrowthTimeline markers={profile?.growth_markers || []} />
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <MessageSquare size={13} className="text-cyan-400" />
            <span className="text-[10px] font-semibold tracking-wider text-zinc-400 uppercase">Communication Style</span>
          </div>
          <CommunicationStyle style={profile?.communication_style || {}} />
        </Card>
      </div>

      {profile?.last_updated_at && (
        <div className="text-[9px] text-zinc-600 text-right">
          Last updated: {new Date(profile.last_updated_at).toLocaleString()} · v{profile.context_version}
        </div>
      )}
    </div>
  )
}
