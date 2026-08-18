"use client"

import * as React from 'react'
import { useCallback, useEffect, useMemo, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

import { WarmCard } from '../../features/warmth/WarmCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { Plus, Search, X, BookOpen, Trash2, Pencil, FileClock, ChevronRight, Link2, ExternalLink, Layers, Target, ChevronDown, GripVertical } from 'lucide-react'
import { MarkdownPreview } from '../MarkdownPreview'

interface Note {
  id: string
  title: string
  content: string
  tags: string[]
  group_name: string
  created_at: string
  updated_at: string
  is_draft?: number | null
  links?: string[]
}

function formatDistanceToNow(dateStr: string): string {
  const d = new Date(dateStr + 'Z')
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffHr = Math.floor(diffMs / 3600000)
  const diffDay = Math.floor(diffMs / 86400000)
  if (diffMin < 1) return 'Just now'
  if (diffMin < 60) return `${diffMin}m ago`
  if (diffHr < 24) return `${diffHr}h ago`
  if (diffDay < 7) return `${diffDay}d ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatDate(dateStr: string): string {
  return new Date(dateStr + 'Z').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

const GROUP_COLORS: Record<string, string> = {
  'Personal': '#fbbf24', 'Work': '#3b82f6', 'Ideas': '#a855f7', 'Health': '#22c55e',
  'Finance': '#10b981', 'Learning': '#06b6d4', 'Projects': '#f97316',
}
function getGroupColor(name: string): string { return GROUP_COLORS[name] || '#71717a' }

// ── Note Detail View ──
function NoteDetailView({ note, onClose, onEdit, onDelete }: { note: Note; onClose: () => void; onEdit: (n: Note) => void; onDelete: (id: string) => void }) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  // Parse links — DB stores as JSON string, not array
  const safeLinks = Array.isArray(note.links) ? note.links
    : typeof note.links === 'string' && note.links ? (() => { try { return JSON.parse(note.links) } catch { return [] } })()
    : []
  // Parse tags — DB may store as JSON string
  const safeTags = Array.isArray(note.tags) ? note.tags
    : typeof note.tags === 'string' && note.tags ? (() => { try { return JSON.parse(note.tags) } catch { return [] } })()
    : []

  const copyToClipboard = () => {
    navigator.clipboard.writeText(note.content)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="w-full max-w-3xl max-h-[85vh] flex flex-col bg-zinc-950/95 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="p-6 border-b border-zinc-800/60">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-[11px] text-zinc-500">
              <span>{note.group_name || 'Ungrouped'}</span>
              <span>·</span>
              <span>Created {formatDate(note.created_at)}</span>
            </div>
            <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300"><X size={18} /></button>
          </div>
          <h2 className="text-2xl font-display text-zinc-100 mb-4">{note.title || 'Untitled Note'}</h2>
          <div className="flex flex-wrap gap-2 items-center">
            {safeTags.map(tag => (
              <span key={tag} className="px-2 py-0.5 rounded-full bg-zinc-800 text-[11px] text-zinc-400 border border-zinc-700/50">#{tag}</span>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <MarkdownPreview content={note.content} accent="amber" className="mb-6" />
          {/* Links */}
          {safeLinks.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-[11px] uppercase tracking-wider text-zinc-500">Related</h4>
              {safeLinks.map((link, i) => {
                const isPhase = link.startsWith('phase://')
                const isGoal = link.startsWith('goal://')
                const icon = isPhase ? <Layers size={12} className="shrink-0" /> : isGoal ? <Target size={12} className="shrink-0" /> : <Link2 size={12} className="shrink-0" />
                const label = isPhase ? `Phase: ${link.slice(8)}` : isGoal ? `Goal: ${link.slice(7)}` : link
                const colorClass = isPhase ? 'text-amber-400 hover:text-amber-300' : isGoal ? 'text-emerald-400 hover:text-emerald-300' : 'text-sky-400 hover:text-sky-300'
                if (isPhase || isGoal) {
                  return <div key={i} className={cn("flex items-center gap-2 text-[13px] transition-colors", colorClass)}>{icon}<span>{label}</span></div>
                }
                return <a key={i} href={link} target="_blank" rel="noopener noreferrer" className={cn("flex items-center gap-2 text-[13px] transition-colors break-all", colorClass)}>{icon}{link}<ExternalLink size={11} className="shrink-0 ml-auto" /></a>
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-800/60 flex items-center justify-between bg-zinc-900/50">
          {!confirmDelete ? (
            <button onClick={() => setConfirmDelete(true)} className="text-[12px] text-zinc-500 hover:text-rose-400 transition-colors">Delete</button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-[12px] text-rose-400">Delete?</span>
              <button onClick={() => { onDelete(note.id); onClose() }} className="text-[12px] text-rose-400 font-medium hover:text-rose-300">Yes</button>
              <button onClick={() => setConfirmDelete(false)} className="text-[12px] text-zinc-500 hover:text-zinc-300">No</button>
            </div>
          )}
          <div className="flex gap-2">
            <button onClick={copyToClipboard} className="flex items-center gap-1.5 text-[12px] text-zinc-500 hover:text-zinc-300 transition-colors">Copy</button>
            <button onClick={() => { onEdit(note); onClose() }} className="flex items-center gap-1.5 rounded-lg border border-zinc-700/60 bg-zinc-800/40 px-3 py-1.5 text-[12px] text-zinc-300 hover:bg-zinc-800/70 transition-colors"><Pencil size={12} /> Edit</button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Note Editor ──
function NoteEditor({ open, onOpenChange, initial, onSave, existingGroups = [] }: {
  open: boolean; onOpenChange: (open: boolean) => void; initial: Note | null
  onSave: (data: { title: string; content: string; tags: string[]; group_name: string; is_draft?: number; links?: string[] }) => void
  existingGroups?: string[]
}) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [groupName, setGroupName] = useState('')
  const [links, setLinks] = useState<string[]>([])
  const [linkInput, setLinkInput] = useState('')
  const [showGroups, setShowGroups] = useState(false)
  const [previewMode, setPreviewMode] = useState(false)
  const [showLinkPicker, setShowLinkPicker] = useState(false)
  const [phases, setPhases] = useState<{ id: string; title: string }[]>([])
  const [goals, setGoals] = useState<{ id: string; title: string }[]>([])
  const isDirty = useRef(false)

  useEffect(() => {
    if (!open) return
    setTitle(initial?.title || '')
    setContent(initial?.content || '')
    // Parse tags — DB may store as JSON string
    let parsedTags: string[] = []
    if (Array.isArray(initial?.tags)) {
      parsedTags = initial.tags
    } else if (typeof initial?.tags === 'string' && initial.tags) {
      try { parsedTags = JSON.parse(initial.tags) } catch { parsedTags = [] }
    }
    setTags(parsedTags)
    setGroupName(initial?.group_name || '')
    // Parse links — DB stores as JSON string, not array
    let parsedLinks: string[] = []
    if (Array.isArray(initial?.links)) {
      parsedLinks = initial.links
    } else if (typeof initial?.links === 'string' && initial.links) {
      try { parsedLinks = JSON.parse(initial.links) } catch { parsedLinks = [] }
    }
    setLinks(parsedLinks)
    setLinkInput('')
    isDirty.current = false
  }, [open, initial])

  useEffect(() => { if (open) isDirty.current = true }, [title, content, tags, groupName, links])

  // Fetch phases and goals for internal linking
  useEffect(() => {
    if (!open) return
    const api = (window as any).deskflowAPI
    if (!api) return
    ;(async () => {
      try {
        const [phasesRes, goalsRes] = await Promise.all([
          api.getLifePhases?.(),
          api.getLongtermGoals?.(),
        ])
        if (phasesRes?.phases) setPhases(phasesRes.phases.map((p: any) => ({ id: p.id, title: p.title || 'Untitled Phase' })))
        if (goalsRes?.goals) setGoals(goalsRes.goals.map((g: any) => ({ id: g.id, title: g.title || 'Untitled Goal' })))
      } catch { /* non-critical */ }
    })()
  }, [open])

  const addTag = () => { const t = tagInput.trim().toLowerCase(); if (t && !tags.includes(t)) { setTags(prev => [...prev, t]); setTagInput('') } }
  const removeTag = (t: string) => setTags(prev => prev.filter(x => x !== t))

  const addLink = () => {
    let url = linkInput.trim()
    if (url && !links.includes(url)) {
      if (!url.startsWith('http://') && !url.startsWith('https://')) url = 'https://' + url
      setLinks(prev => [...prev, url])
      setLinkInput('')
    }
  }
  const removeLink = (l: string) => setLinks(prev => prev.filter(x => x !== l))

  const handleSave = async (isDraft: boolean) => {
    if (!content.trim() && !isDraft) return
    await onSave({ title: title.trim(), content: content.trim(), tags, group_name: groupName, is_draft: isDraft ? 1 : 0, links })
    onOpenChange(false)
  }

  const handleClose = async (isOpen: boolean) => {
    if (isOpen) return
    const hasContent = title.trim().length > 0 || content.trim().length > 0
    if (hasContent && isDirty.current && !initial?.is_draft) {
      await onSave({ title: title.trim() || 'Untitled', content: content.trim(), tags, group_name: groupName, is_draft: 1, links })
    } else if (!hasContent && initial?.is_draft && initial?.id) {
      await (window as any).deskflowAPI.notesDelete(initial.id)
    }
    onOpenChange(false)
  }

  return (
    <div className={cn("fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 transition-opacity", open ? "opacity-100" : "opacity-0 pointer-events-none")} onClick={() => handleClose(false)}>
      <div className="w-full max-w-lg bg-zinc-900/95 border border-zinc-700 rounded-2xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <h3 className="text-base font-semibold text-zinc-100 mb-4">{initial?.is_draft ? 'Resume draft' : initial ? 'Edit note' : 'New note'}</h3>
        <div className="space-y-3.5">
          <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Title (optional)" className="text-[14px]" />
          {/* Content with preview toggle */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] uppercase tracking-wider text-zinc-500">Content</label>
              <button type="button" onClick={() => setPreviewMode(!previewMode)} className="text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors">
                {previewMode ? 'Edit' : 'Preview'}
              </button>
            </div>
            {previewMode ? (
              <div className="min-h-[120px] rounded-lg border border-zinc-700 bg-zinc-950/50 p-3">
                {content.trim() ? <MarkdownPreview content={content} accent="amber" /> : <p className="text-[13px] text-zinc-500 italic">Nothing to preview</p>}
              </div>
            ) : (
              <Textarea value={content} onChange={e => setContent(e.target.value)} placeholder="What's on your mind? (Markdown supported)" rows={6} className="text-[13px] leading-relaxed resize-none" autoFocus />
            )}
          </div>
          {/* Tags */}
          <div className="space-y-1.5">
            <label className="text-[11px] uppercase tracking-wider text-zinc-500">Tags</label>
            <div className="flex gap-1.5">
              <Input value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag() } }} placeholder="Add tag..." className="text-[12px] h-8" />
              <button onClick={addTag} className="h-8 px-2 rounded-lg border border-zinc-700 text-zinc-400 hover:text-zinc-200"><Plus size={13} /></button>
            </div>
            {tags.length > 0 && <div className="flex flex-wrap gap-1">{tags.map(t => <span key={t} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-zinc-800 text-[11px] text-zinc-300 border border-zinc-700/50">{t}<button onClick={() => removeTag(t)} className="text-zinc-500 hover:text-zinc-300"><X size={10} /></button></span>)}</div>}
          </div>
          {/* Group */}
          <div className="space-y-1.5">
            <label className="text-[11px] uppercase tracking-wider text-zinc-500">Group</label>
            <div className="flex gap-1.5">
              <Input value={groupName} onChange={e => setGroupName(e.target.value)} placeholder="Type or pick a group..." className="text-[12px] h-8" />
            </div>
            {/* Existing group suggestions */}
            {existingGroups.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {existingGroups.map(g => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setGroupName(groupName === g ? '' : g)}
                    className={cn(
                      "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] border transition-colors",
                      groupName === g
                        ? "border-amber-500/40 bg-amber-500/15 text-amber-300"
                        : "border-zinc-700/50 bg-zinc-800/40 text-zinc-400 hover:text-zinc-300"
                    )}
                  >
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: getGroupColor(g) }} />
                    {g}
                  </button>
                ))}
              </div>
            )}
          </div>
          {/* Links */}
          <div className="space-y-1.5">
            <label className="text-[11px] uppercase tracking-wider text-zinc-500">Links</label>
            <div className="flex gap-1.5">
              <Input value={linkInput} onChange={e => setLinkInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addLink() } }} placeholder="https://..." className="text-[12px] h-8" />
              <button onClick={addLink} className="h-8 px-2 rounded-lg border border-zinc-700 text-zinc-400 hover:text-zinc-200"><Plus size={13} /></button>
            </div>
            {links.length > 0 && <div className="flex flex-wrap gap-1">{links.map(l => {
              const isInternal = l.startsWith('phase://') || l.startsWith('goal://')
              const icon = l.startsWith('phase://') ? <Layers size={10} className="shrink-0" /> : l.startsWith('goal://') ? <Target size={10} className="shrink-0" /> : <Link2 size={10} className="shrink-0" />
              const label = isInternal
                ? (l.startsWith('phase://') ? phases.find(p => p.id === l.slice(8))?.title || 'Phase' : goals.find(g => g.id === l.slice(7))?.title || 'Goal')
                : l
              const colorClass = l.startsWith('phase://') ? 'bg-amber-500/10 text-amber-300 border-amber-500/20' : l.startsWith('goal://') ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20' : 'bg-sky-500/10 text-sky-300 border-sky-500/20'
              return <span key={l} className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] border max-w-[200px] truncate", colorClass)}>{icon}{label}<button onClick={() => removeLink(l)} className="opacity-50 hover:opacity-100 shrink-0"><X size={10} /></button></span>
            })}</div>}
          </div>
          {/* Internal Links */}
          <div className="space-y-1.5">
            <button type="button" onClick={() => setShowLinkPicker(!showLinkPicker)} className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-zinc-500 hover:text-zinc-300 transition-colors">
              Related <ChevronDown size={11} className={cn("transition-transform", showLinkPicker && "rotate-180")} />
            </button>
            {showLinkPicker && (
              <div className="rounded-lg border border-zinc-700/50 bg-zinc-950/50 p-3 space-y-2">
                {phases.length > 0 && (
                  <div>
                    <div className="text-[10px] text-zinc-500 mb-1">Phases</div>
                    <div className="flex flex-wrap gap-1">{phases.slice(0, 6).map(p => {
                      const linked = links.includes(`phase://${p.id}`)
                      return <button key={p.id} type="button" onClick={() => {
                        if (linked) removeLink(`phase://${p.id}`)
                        else setLinks(prev => [...prev, `phase://${p.id}`])
                      }} className={cn("px-2 py-0.5 rounded-full text-[10px] border transition-colors", linked ? "border-amber-500/40 bg-amber-500/15 text-amber-300" : "border-zinc-700/50 bg-zinc-800/40 text-zinc-400 hover:text-zinc-300")}>{p.title}</button>
                    })}</div>
                  </div>
                )}
                {goals.length > 0 && (
                  <div>
                    <div className="text-[10px] text-zinc-500 mb-1">Goals</div>
                    <div className="flex flex-wrap gap-1">{goals.slice(0, 6).map(g => {
                      const linked = links.includes(`goal://${g.id}`)
                      return <button key={g.id} type="button" onClick={() => {
                        if (linked) removeLink(`goal://${g.id}`)
                        else setLinks(prev => [...prev, `goal://${g.id}`])
                      }} className={cn("px-2 py-0.5 rounded-full text-[10px] border transition-colors", linked ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-300" : "border-zinc-700/50 bg-zinc-800/40 text-zinc-400 hover:text-zinc-300")}>{g.title}</button>
                    })}</div>
                  </div>
                )}
                {phases.length === 0 && goals.length === 0 && <p className="text-[11px] text-zinc-500">No phases or goals yet</p>}
              </div>
            )}
          </div>

        </div>
        <div className="flex justify-between mt-5">
          <button onClick={() => handleSave(true)} className="text-[12px] text-zinc-500 hover:text-zinc-300 transition-colors">Save as draft</button>
          <div className="flex gap-2">
            <button onClick={() => handleClose(false)} className="h-9 rounded-lg border border-zinc-700 px-4 text-sm text-zinc-400 hover:text-zinc-200">Cancel</button>
            <button onClick={() => handleSave(false)} disabled={!content.trim()} className="h-9 rounded-lg bg-amber-400/15 border border-amber-400/30 px-4 text-sm text-amber-100 disabled:opacity-50">Save note</button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Draft Card ──
function DraftCard({ note, onResume, onDiscard }: { note: Note; onResume: (n: Note) => void; onDiscard: (id: string) => void }) {
  return (
    <div className="rounded-xl border border-dashed border-zinc-700/60 bg-zinc-900/20 p-4">
      <div className="flex items-start justify-between gap-2 mb-2">
        <h4 className="text-[13px] text-zinc-300 line-clamp-1">{note.title || 'Untitled draft'}</h4>
        <button onClick={() => onDiscard(note.id)} className="text-zinc-600 hover:text-rose-400 transition-colors"><Trash2 size={12} /></button>
      </div>
      <p className="text-[12px] text-zinc-500 line-clamp-2 mb-3">{note.content || 'Empty draft...'}</p>
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-zinc-600 font-mono">{formatDistanceToNow(note.updated_at)}</span>
        <button onClick={() => onResume(note)} className="text-[11px] text-amber-400 hover:text-amber-300 transition-colors">Resume</button>
      </div>
    </div>
  )
}

// ── Note Card ──
function NoteCard({ note, onClick }: { note: Note; onClick: (n: Note) => void }) {
  const groupColor = getGroupColor(note.group_name || 'Ungrouped')
  // Parse tags — DB may store as JSON string
  const safeTags = Array.isArray(note.tags) ? note.tags
    : typeof note.tags === 'string' && note.tags ? (() => { try { return JSON.parse(note.tags) } catch { return [] } })()
    : []
  return (
    <button
      onClick={() => onClick(note)}
      draggable
      onDragStart={(e) => { e.dataTransfer.setData('text/plain', note.id); onDragStart?.(note.id) }}
      onDragEnd={onDragEnd}
      className="group relative flex flex-col gap-3 rounded-xl border border-zinc-800/60 bg-zinc-900/30 p-5 text-left backdrop-blur-xl transition-all hover:border-zinc-700 hover:bg-zinc-900/50 w-full cursor-grab active:cursor-grabbing"
    >
      <div className="flex items-start justify-between gap-3">
        <h4 className="font-medium text-zinc-100 line-clamp-1 flex-1">{note.title || 'Untitled'}</h4>
        {note.is_draft && <FileClock className="w-4 h-4 text-zinc-500" />}
      </div>
      <p className="text-[13px] text-zinc-400 leading-relaxed line-clamp-3 flex-1">{note.content}</p>
      <div className="flex items-center justify-between pt-2 border-t border-zinc-800/40">
        <div className="flex items-center gap-2">
          {note.group_name && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium" style={{ backgroundColor: `${groupColor}15`, color: groupColor }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: groupColor }} />
              {note.group_name}
            </span>
          )}
          <span className="text-[11px] text-zinc-500 font-mono">{formatDistanceToNow(note.updated_at)}</span>
        </div>
        <div className="flex gap-1">
          {safeTags.slice(0, 2).map(tag => <span key={tag} className="px-1.5 py-0.5 rounded bg-zinc-800 text-[10px] text-zinc-400">#{tag}</span>)}
          {safeTags.length > 2 && <span className="text-[10px] text-zinc-600">+{safeTags.length - 2}</span>}
        </div>
      </div>
      <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-700 group-hover:text-zinc-500 transition-colors" />
    </button>
  )
}

// ── Main NotesTab ──
export function NotesTab() {
  const [notes, setNotes] = useState<Note[]>([])
  const [groups, setGroups] = useState<string[]>([])
  const [search, setSearch] = useState('')
  const [filterTag, setFilterTag] = useState<string | null>(null)
  const [filterGroup, setFilterGroup] = useState<string | null>(null)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingNote, setEditingNote] = useState<Note | null>(null)
  const [selectedNote, setSelectedNote] = useState<Note | null>(null)
  const [loading, setLoading] = useState(true)
  const [newGroupName, setNewGroupName] = useState('')
  const [draggedNote, setDraggedNote] = useState<string | null>(null)

  const loadNotes = useCallback(async () => {
    setLoading(true)
    try {
      const params: any = { includeDrafts: true }
      if (search) params.search = search
      if (filterTag) params.tag = filterTag
      if (filterGroup) params.group = filterGroup
      const res = await (window as any).deskflowAPI.notesList(params)
      if (res?.success) setNotes(res.notes || [])
    } catch { /* non-critical */ }
    setLoading(false)
  }, [search, filterTag, filterGroup])

  const loadGroups = useCallback(async () => {
    try { const res = await (window as any).deskflowAPI.notesGroups(); if (res?.success) setGroups(res.groups || []) } catch {}
  }, [])

  useEffect(() => { loadNotes() }, [loadNotes])
  useEffect(() => { loadGroups() }, [loadGroups])

  const handleCreate = async (data: any) => { await (window as any).deskflowAPI.notesCreate(data); loadNotes(); loadGroups() }
  const handleUpdate = async (data: any) => { await (window as any).deskflowAPI.notesUpdate(data); loadNotes(); loadGroups() }
  const handleDelete = async (id: string) => { await (window as any).deskflowAPI.notesDelete(id); setSelectedNote(null); loadNotes() }

  // Group management
  const createGroup = async () => {
    const name = newGroupName.trim()
    if (!name || groups.includes(name)) return
    setGroups(prev => [...prev, name])
    setNewGroupName('')
  }

  const moveNoteToGroup = async (noteId: string, groupName: string) => {
    const note = notes.find(n => n.id === noteId)
    if (!note) return
    await handleUpdate({ id: noteId, group_name: groupName })
  }

  const drafts = notes.filter(n => n.is_draft)
  const activeNotes = notes.filter(n => !n.is_draft)
  // Parse tags from all notes (DB may store as JSON strings)
  const allTags = [...new Set(activeNotes.flatMap(n => {
    if (Array.isArray(n.tags)) return n.tags
    if (typeof n.tags === 'string' && n.tags) { try { return JSON.parse(n.tags) } catch { return [] } }
    return []
  }))].sort()

  // Group notes by group_name
  const groupedNotes = useMemo(() => {
    const map = new Map<string, Note[]>()
    for (const note of activeNotes) {
      const group = note.group_name || 'Ungrouped'
      if (!map.has(group)) map.set(group, [])
      map.get(group)!.push(note)
    }
    // Sort: named groups first (alphabetical), then Ungrouped
    const sorted = Array.from(map.entries()).sort(([a], [b]) => {
      if (a === 'Ungrouped') return 1
      if (b === 'Ungrouped') return -1
      return a.localeCompare(b)
    })
    return sorted
  }, [activeNotes])

  const handleSave = async (data: any) => {
    if (editingNote) { await handleUpdate({ id: editingNote.id, ...data, links: data.links || [] }) }
    else { await handleCreate({ ...data, links: data.links || [] }) }
    setEditingNote(null)
  }

  return (
    <div className="space-y-4" data-lifephase="notes-tab">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="grid size-7 place-items-center rounded-lg bg-amber-400/10"><BookOpen size={14} className="text-amber-400" /></div>
          <h2 className="warmth-serif text-lg text-zinc-200">Notes</h2>
          <span className="text-[11px] text-zinc-600">{activeNotes.length} notes</span>
        </div>
        <button onClick={() => { setEditingNote(null); setEditorOpen(true) }} className="flex items-center gap-1.5 h-9 rounded-lg bg-amber-400/15 border border-amber-400/30 px-3 text-sm text-amber-100 hover:bg-amber-400/25 transition-colors"><Plus size={13} /> New note</button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search notes..." className="pl-9 text-[13px]" />
        {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"><X size={13} /></button>}
      </div>

      {/* Filter chips + Create Group */}
      <div className="flex flex-wrap items-center gap-1.5">
        {groups.map(g => <button key={g} onClick={() => setFilterGroup(filterGroup === g ? null : g)} className={cn('px-2 py-1 rounded-full text-[11px] font-medium border transition-colors', filterGroup === g ? 'border-amber-500/40 bg-amber-500/10 text-amber-300' : 'border-zinc-700/50 bg-zinc-800/40 text-zinc-400 hover:text-zinc-300')}><span className="inline-block w-1.5 h-1.5 rounded-full mr-1" style={{ backgroundColor: getGroupColor(g) }} />{g}</button>)}
        {allTags.slice(0, 8).map(t => <button key={t} onClick={() => setFilterTag(filterTag === t ? null : t)} className={cn('px-2 py-1 rounded-full text-[11px] border transition-colors', filterTag === t ? 'border-zinc-500 bg-zinc-700/50 text-zinc-200' : 'border-zinc-700/50 bg-zinc-800/40 text-zinc-500 hover:text-zinc-300')}>#{t}</button>)}
        {/* Create new group */}
        <div className="flex items-center gap-1 ml-1">
          <Input value={newGroupName} onChange={e => setNewGroupName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') createGroup() }} placeholder="New group..." className="w-24 h-7 text-[11px] px-2" />
          {newGroupName.trim() && <button onClick={createGroup} className="h-7 px-2 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[11px] hover:bg-amber-500/25 transition-colors">Create</button>}
        </div>
      </div>

      {/* Drafts */}
      {drafts.length > 0 && (
        <section>
          <h3 className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-zinc-500 mb-3"><FileClock className="w-3.5 h-3.5" /> Drafts ({drafts.length})</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{drafts.map(n => <DraftCard key={n.id} note={n} onResume={(note) => { setEditingNote(note); setEditorOpen(true) }} onDiscard={handleDelete} />)}</div>
        </section>
      )}

      {/* Notes grouped by category */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">{[1, 2, 3].map(i => <div key={i} className="h-32 animate-pulse rounded-xl border border-zinc-800/50 bg-zinc-900/40" />)}</div>
      ) : activeNotes.length === 0 ? (
        <div className="text-center py-12"><BookOpen size={32} className="mx-auto text-zinc-700 mb-3" /><p className="text-[13px] text-zinc-500">{search || filterTag || filterGroup ? 'No notes match your filters' : 'No notes yet — tap "New note" to start'}</p></div>
      ) : (
        <div className="space-y-6">
          {groupedNotes.map(([groupName, groupNotes]) => (
            <section key={groupName}>
              <div
                className={`flex items-center gap-2 mb-3 p-2 rounded-lg transition-colors ${draggedNote ? 'border-2 border-dashed border-amber-500/40 bg-amber-500/5' : ''}`}
                onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('bg-amber-500/10') }}
                onDragLeave={(e) => e.currentTarget.classList.remove('bg-amber-500/10')}
                onDrop={(e) => { e.preventDefault(); e.currentTarget.classList.remove('bg-amber-500/10'); const noteId = e.dataTransfer.getData('text/plain'); if (noteId) moveNoteToGroup(noteId, groupName) }}
              >
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: getGroupColor(groupName) }} />
                <h3 className="text-[13px] font-medium text-zinc-300">{groupName}</h3>
                <span className="text-[11px] text-zinc-600">{groupNotes.length}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <AnimatePresence mode="popLayout">
                  {groupNotes.map(note => <NoteCard key={note.id} note={note} onClick={setSelectedNote} onDragStart={setDraggedNote} onDragEnd={() => setDraggedNote(null)} />)}
                </AnimatePresence>
              </div>
            </section>
          ))}
        </div>
      )}

      {/* Detail View */}
      {selectedNote && <NoteDetailView note={selectedNote} onClose={() => setSelectedNote(null)} onEdit={(n) => { setEditingNote(n); setEditorOpen(true); setSelectedNote(null) }} onDelete={handleDelete} />}

      {/* Editor */}
      {editorOpen && <NoteEditor open={editorOpen} onOpenChange={(open) => { if (!open) setEditingNote(null); setEditorOpen(open) }} initial={editingNote} onSave={handleSave} existingGroups={groups} />}
    </div>
  )
}
