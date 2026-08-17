import { useEffect, useState } from 'react'
import { Palette, Plus, Trash2, Wand2, X } from 'lucide-react'
import { AmberButton, Card, Chip, ConfirmIconButton, EmptyState, ErrorState, FieldLabel, GhostButton, LoadingBlock, SectionHeader, TextInput, toast } from './ui'

const api = () => (window as any).deskflowAPI?.contentEngine

export function ThemesView() {
  const [themes, setThemes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', description: '', accent: '#f5c518' })
  const [creating, setCreating] = useState(false)
  const [generating, setGenerating] = useState(false)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const list = await api()?.themesGetAll()
      setThemes(Array.isArray(list) ? list : [])
    } catch (e: any) {
      setError(e?.message || 'Failed to load themes.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const generate = async () => {
    if (generating) return
    setGenerating(true)
    try {
      const res = await api()?.themesGenerate()
      if (res?.ok) {
        toast('AI theme generated')
        load()
      } else {
        toast(res?.error || 'Theme generation failed', 'error')
      }
    } catch (e: any) {
      toast(e?.message || 'Theme generation failed', 'error')
    } finally {
      setGenerating(false)
    }
  }

  const create = async () => {
    if (!form.name.trim() || creating) return
    setCreating(true)
    try {
      const res = await api()?.themesCreate({ name: form.name.trim(), description: form.description.trim(), accent: form.accent })
      if (res?.ok) {
        toast('Theme created')
        setForm({ name: '', description: '', accent: '#f5c518' })
        setShowForm(false)
        load()
      } else {
        toast(res?.error || 'Failed to create theme', 'error')
      }
    } catch (e: any) {
      toast(e?.message || 'Failed to create theme', 'error')
    } finally {
      setCreating(false)
    }
  }

  const remove = async (id?: number) => {
    if (!id) return
    try {
      await api()?.themesDelete(id)
      toast('Theme deleted')
      load()
    } catch (e: any) {
      toast(e?.message || 'Failed to delete theme', 'error')
    }
  }

  const hookCount = (t: any) => {
    if (Array.isArray(t.content_hooks)) return t.content_hooks.length
    if (Array.isArray(t.hooks)) return t.hooks.length
    return 0
  }

  return (
    <section className="space-y-6">
      <SectionHeader
        label="Content Engine / 04"
        title="Themes"
        action={
          <div className="flex items-center gap-2">
            <GhostButton onClick={generate} disabled={generating}>
              <Wand2 size={13} />
              {generating ? 'Generating…' : 'Generate via AI'}
            </GhostButton>
            <AmberButton onClick={() => setShowForm((v) => !v)}>
              {showForm ? <X size={13} /> : <Plus size={13} />}
              {showForm ? 'Close' : 'New Theme'}
            </AmberButton>
          </div>
        }
      />

      {showForm && (
        <Card className="border-[#f5c518]/20">
          <div className="mb-3 text-[10px] font-semibold tracking-wider text-[#f5c518] uppercase">New Theme</div>
          <div className="grid grid-cols-[1fr_1fr_auto] gap-3">
            <div>
              <FieldLabel>Name</FieldLabel>
              <TextInput value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Solo dev journey" />
            </div>
            <div>
              <FieldLabel>Description</FieldLabel>
              <TextInput value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="What is this series about?" />
            </div>
            <div>
              <FieldLabel>Accent</FieldLabel>
              <div className="flex h-8 items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.03] px-2">
                <input
                  type="color"
                  value={form.accent}
                  onChange={(e) => setForm({ ...form, accent: e.target.value })}
                  className="h-5 w-7 cursor-pointer rounded border-none bg-transparent p-0"
                />
                <span className="font-mono text-[10px] text-zinc-400">{form.accent}</span>
              </div>
            </div>
          </div>
          <div className="mt-3">
            <AmberButton onClick={create} disabled={creating || !form.name.trim()}>
              {creating ? 'Creating…' : 'Create Theme'}
            </AmberButton>
          </div>
        </Card>
      )}

      {loading && <LoadingBlock label="Loading themes…" />}
      {error && <ErrorState message={error} onRetry={load} />}

      {!loading && !error && themes.length === 0 && (
        <EmptyState
          icon={<Palette size={28} />}
          title="No themes yet"
          hint="Themes group related content together. Generate one via AI, or create your own."
          action={<AmberButton onClick={() => setShowForm(true)}><Plus size={13} /> New Theme</AmberButton>}
        />
      )}

      {!loading && !error && themes.length > 0 && (
        <div className="grid grid-cols-2 gap-4">
          {themes.map((t) => (
            <Card key={t.id ?? t.name} className="flex flex-col gap-3 p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className="h-4 w-4 shrink-0 rounded" style={{ background: t.accent || '#f5c518' }} />
                  <span className="truncate text-sm font-semibold text-zinc-100">{t.name}</span>
                </div>
                <ConfirmIconButton
                  onConfirm={() => remove(t.id)}
                  icon={<Trash2 size={12} />}
                  label="Delete theme"
                />
              </div>
              {t.description && <p className="text-xs leading-relaxed text-zinc-400">{t.description}</p>}
              <Chip>{hookCount(t)} content hooks</Chip>
            </Card>
          ))}
        </div>
      )}
    </section>
  )
}
