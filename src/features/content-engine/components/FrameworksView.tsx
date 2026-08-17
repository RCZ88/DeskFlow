import { useEffect, useState } from 'react'
import { Layers, Lock, RotateCcw, Save, FileCode2 } from 'lucide-react'
import { AmberButton, Card, Chip, EmptyState, ErrorState, GhostButton, LoadingBlock, SectionHeader, SelectInput, TextArea, toast } from './ui'

const api = () => (window as any).deskflowAPI?.contentEngine

function ruleText(r: any) {
  if (typeof r === 'string') return r
  if (r && typeof r === 'object' && 'rule' in r) return String(r.rule)
  return String(r ?? '')
}

function FrameworkCard({ fw, onChanged }: { fw: any; onChanged: () => void }) {
  const [draft, setDraft] = useState<string>(Array.isArray(fw.rules) ? fw.rules.map(ruleText).join('\n') : '')
  const [rollbackV, setRollbackV] = useState<string>('')
  const [saving, setSaving] = useState(false)
  const [rolling, setRolling] = useState(false)

  const saveVersion = async () => {
    if (saving) return
    const lines = draft.split('\n').map((l) => l.trim()).filter(Boolean)
    if (lines.length === 0) {
      toast('Enter at least one rule before saving', 'error')
      return
    }
    setSaving(true)
    try {
      const res = await api()?.frameworkSave({ ...fw, rules: lines.map((rule, i) => ({ id: String(i + 1), rule })) })
      if (res?.ok) {
        toast(`New version ${res.version ?? ''} saved`.trim())
        onChanged()
      } else {
        toast(res?.error || 'Failed to save version', 'error')
      }
    } catch (e: any) {
      toast(e?.message || 'Failed to save version', 'error')
    } finally {
      setSaving(false)
    }
  }

  const rollback = async () => {
    if (!rollbackV || rolling) return
    setRolling(true)
    try {
      const res = await api()?.frameworkRollback({ id: fw.id, version: Number(rollbackV) })
      if (res?.ok) {
        toast(`Rolled back to v${rollbackV}`)
        onChanged()
      } else {
        toast(res?.error || 'Rollback failed', 'error')
      }
    } catch (e: any) {
      toast(e?.message || 'Rollback failed', 'error')
    } finally {
      setRolling(false)
    }
  }

  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate text-sm font-semibold text-zinc-100">{fw.name}</span>
          <Chip className="border-[#f5c518]/25 bg-[#f5c518]/10 text-[#f5c518]">v{fw.version ?? 1}</Chip>
          {fw.is_builtin && (
            <Chip className="border-zinc-500/20 text-zinc-400">
              <Lock size={9} /> Built-in
            </Chip>
          )}
        </div>
        <FileCode2 size={13} className="shrink-0 text-zinc-600" />
      </div>

      {fw.description && <p className="text-xs leading-relaxed text-zinc-400">{fw.description}</p>}

      <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
        <div className="mb-1.5 text-[9px] tracking-wider text-zinc-500 uppercase">Rules</div>
        {Array.isArray(fw.rules) && fw.rules.length > 0 ? (
          <ol className="space-y-1">
            {fw.rules.map((r: any, i: number) => (
              <li key={i} className="flex items-start gap-2 text-[11px] text-zinc-300">
                <span className="mt-px font-mono text-[10px] text-zinc-600">{i + 1}.</span>
                <span className="break-words">{ruleText(r)}</span>
              </li>
            ))}
          </ol>
        ) : (
          <div className="text-[11px] text-zinc-600">No rules on this version.</div>
        )}
      </div>

      {fw.is_builtin ? (
        <div className="flex items-center gap-1.5 text-[11px] text-zinc-500">
          <Lock size={11} /> Built-in framework — rules are read-only, but you can still view them above.
        </div>
      ) : (
        <>
          <div>
            <div className="mb-1 text-[9px] tracking-wider text-zinc-500 uppercase">Edit rules — one per line</div>
            <TextArea
              rows={4}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={'Start every hook with a curiosity gap…\nNever exceed 8 words per frame…'}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <AmberButton onClick={saveVersion} disabled={saving}>
              <Save size={13} />
              {saving ? 'Saving…' : 'Save New Version'}
            </AmberButton>
            {Array.isArray(fw.history) && fw.history.length > 0 && (
              <>
                <SelectInput className="w-32" value={rollbackV} onChange={(e) => setRollbackV(e.target.value)}>
                  <option value="">Rollback to…</option>
                  {[...fw.history].sort((a: any, b: any) => b.version - a.version).map((h: any) => (
                    <option key={h.version} value={h.version}>
                      v{h.version} · {String(h.saved_at ?? '').slice(0, 10) || 'saved'}
                    </option>
                  ))}
                </SelectInput>
                <GhostButton onClick={rollback} disabled={!rollbackV || rolling}>
                  <RotateCcw size={13} />
                  {rolling ? 'Rolling…' : 'Rollback'}
                </GhostButton>
              </>
            )}
          </div>
        </>
      )}
    </Card>
  )
}

export function FrameworksView() {
  const [frameworks, setFrameworks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const list = await api()?.frameworksList()
      setFrameworks(Array.isArray(list) ? list : [])
    } catch (e: any) {
      setError(e?.message || 'Failed to load frameworks.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  return (
    <section className="space-y-6">
      <SectionHeader
        label="Content Engine / 07"
        title="Frameworks"
        action={<Chip>Versioned prompt frameworks</Chip>}
      />

      {loading && <LoadingBlock label="Loading frameworks…" />}
      {error && <ErrorState message={error} onRetry={load} />}

      {!loading && !error && frameworks.length === 0 && (
        <EmptyState
          icon={<Layers size={28} />}
          title="No frameworks yet"
          hint="Frameworks package your winning rules into reusable, versioned prompts for script generation."
        />
      )}

      {!loading && !error && frameworks.length > 0 && (
        <div className="grid grid-cols-2 gap-4">
          {frameworks.map((fw) => (
            <FrameworkCard key={fw.id ?? fw.name} fw={fw} onChanged={load} />
          ))}
        </div>
      )}
    </section>
  )
}
