import { useState } from 'react'
import { CheckCircle2, ShieldCheck, ShieldX, AlertTriangle, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card, AmberButton, GhostButton, ConfirmIconButton, toast, Spinner } from './ui'

const GATE_DEFS = [
  { key: 'scroll_stop', label: 'Scroll Stop', desc: 'Hook within first 3 seconds stops the scroll' },
  { key: 'hard_cut', label: 'Hard Cut', desc: 'Clear scene transitions keep pacing tight' },
  { key: 'asset_ready', label: 'Asset Ready', desc: 'Visuals/B-roll defined for every frame' },
] as const

interface GreenLightPanelProps {
  episodeId: number
  gates: any
  onPhaseChange: (phase: string) => void
  validating?: boolean
  onValidate?: () => void
}

export function GreenLightPanel({ episodeId, gates, onPhaseChange, validating, onValidate }: GreenLightPanelProps) {
  const [overriding, setOverriding] = useState(false)

  const api = () => (window as any).deskflowAPI?.contentEngine

  const gateItems = GATE_DEFS.map((def) => ({
    ...def,
    result: gates?.[def.key],
    pass: !!gates?.[def.key]?.pass,
  }))

  const passCount = gateItems.filter((g) => g.pass).length
  const total = gateItems.length
  const overall = gates?.overall ?? 'unknown'
  const isGo = overall === 'pass'
  const isPivot = overall === 'pivot'
  const verdict = isGo ? 'GO' : isPivot ? 'PIVOT' : 'NO-GO'
  const verdictColor = isGo ? 'text-emerald-400' : isPivot ? 'text-[#f5c518]' : 'text-rose-400'
  const verdictBorder = isGo ? 'border-emerald-500/40' : isPivot ? 'border-[#f5c518]/40' : 'border-rose-500/40'
  const verdictBg = isGo ? 'bg-emerald-500/10' : isPivot ? 'bg-[#f5c518]/10' : 'bg-rose-500/10'

  const handleGo = async () => {
    try {
      const res = await api()?.episodeSave({ id: episodeId, phase: 'greenlit', status: 'greenlit' })
      if (res?.ok) {
        toast('Episode greenlit — moving to Blueprint')
        onPhaseChange('script')
      } else {
        toast(res?.error || 'Failed to advance phase', 'error')
      }
    } catch (e: any) {
      toast(e?.message || 'Failed to advance phase', 'error')
    }
  }

  const handleOverride = async (override: boolean) => {
    setOverriding(true)
    try {
      const res = await api()?.gateOverride({ episodeId, override })
      if (res?.ok) {
        toast(override ? 'Gates overridden — episode can proceed' : 'Gate override removed')
        if (override) {
          const saveRes = await api()?.episodeSave({ id: episodeId, phase: 'greenlit', status: 'greenlit' })
          if (saveRes?.ok) {
            toast('Phase advanced to Blueprint')
            onPhaseChange('script')
          }
        }
      } else {
        toast(res?.error || 'Failed to update override', 'error')
      }
    } catch (e: any) {
      toast(e?.message || 'Failed to update override', 'error')
    } finally {
      setOverriding(false)
    }
  }

  return (
    <div className="space-y-4">
      <Card className="p-5">
        {/* Verdict header */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isGo ? (
              <CheckCircle2 size={18} className="text-emerald-400" />
            ) : isPivot ? (
              <AlertTriangle size={18} className="text-[#f5c518]" />
            ) : (
              <XCircle size={18} className="text-rose-400" />
            )}
            <span className="text-sm font-bold text-zinc-100">Gate Verdict</span>
          </div>
          <span className={cn('inline-flex items-center rounded-lg border px-3 py-1 text-xs font-black tracking-widest uppercase', verdictBorder, verdictBg, verdictColor)}>
            {verdict}
          </span>
        </div>

        {/* Gate cards */}
        <div className="space-y-2.5">
          {gateItems.map((gate) => (
            <div
              key={gate.key}
              className={cn(
                'flex items-start gap-3 rounded-xl border p-3.5 transition-colors',
                gate.pass
                  ? 'border-emerald-500/20 bg-emerald-500/[0.04]'
                  : 'border-rose-500/20 bg-rose-500/[0.04]',
              )}
            >
              {gate.pass ? (
                <ShieldCheck size={16} className="mt-0.5 shrink-0 text-emerald-400" />
              ) : (
                <ShieldX size={16} className="mt-0.5 shrink-0 text-rose-400" />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-zinc-200">{gate.label}</span>
                  <span className={cn(
                    'inline-flex items-center rounded border px-1.5 py-px text-[9px] font-bold uppercase',
                    gate.pass ? 'border-emerald-500/40 text-emerald-400' : 'border-rose-500/40 text-rose-400',
                  )}>
                    {gate.pass ? 'PASS' : 'FAIL'}
                  </span>
                </div>
                <p className="mt-0.5 text-[11px] text-zinc-500">{gate.desc}</p>
                {gate.result?.reason && (
                  <p className="mt-1 text-[10px] text-zinc-400 italic">{gate.result.reason}</p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Suggestions */}
        {Array.isArray(gates?.suggestions) && gates.suggestions.length > 0 && (
          <div className="mt-4 rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
            <div className="mb-1.5 text-[9px] font-semibold tracking-wider text-zinc-500 uppercase">Suggestions</div>
            <ul className="space-y-1">
              {gates.suggestions.map((s: string, i: number) => (
                <li key={i} className="text-[11px] text-zinc-400">· {s}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Actions */}
        <div className="mt-5 flex items-center gap-2">
          {isGo && (
            <AmberButton onClick={handleGo}>
              <CheckCircle2 size={13} /> Advance to Blueprint
            </AmberButton>
          )}
          {!isGo && (
            <ConfirmIconButton
              onConfirm={() => handleOverride(true)}
              icon={<ShieldCheck size={12} />}
              label="Override gates — advance anyway"
              confirmLabel="Confirm override"
            />
          )}
          {onValidate && (
            <GhostButton onClick={onValidate} disabled={validating}>
              {validating ? <Spinner size={12} /> : <ShieldCheck size={13} />}
              {validating ? 'Validating…' : 'Re-validate Gates'}
            </GhostButton>
          )}
        </div>
      </Card>

      {/* Soft gate notice */}
      <div className="flex items-start gap-2 rounded-lg border border-white/[0.04] bg-white/[0.01] px-3 py-2">
        <AlertTriangle size={11} className="mt-0.5 shrink-0 text-zinc-600" />
        <span className="text-[10px] text-zinc-600">
          These gates are advisory. You can always override and proceed to the next phase.
        </span>
      </div>
    </div>
  )
}
