"use client"

import * as React from 'react'
import { useCallback, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

import { WarmCard } from '../../features/warmth/WarmCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { Plus, Search, X, Tag, BookOpen, Calendar, Trash2, Pencil } from 'lucide-react'

interface Note {
  id: string
  title: string
  content: string
  tags: string[]
  group_name: string
  created_at: string
  updated_at: string
}

const GROUP_COLORS: Record<string, string> = {
  'Personal': '#fbbf24',
  'Work': '#3b82f6',
  'Ideas': '#a855f7',
  'Health': '#22c55e',
  'Finance': '#10b981',
  'Learning': '#06b6d4',
  'Projects': '#f97316',
}

function getGroupColor(name: string): string {
  return GROUP_COLORS[name] || '#71717a'
}

function formatDate(dateStr: string): string {
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

interface NoteEditorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initial?: Note | null
  onSave: (data: { title: string; content: string; tags: string[]; group_name: string }) => void
}

function NoteEditor({ open, onOpenChange, initial, onSave }: NoteEditorProps) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [groupName, setGroupName] = useState('')
  const [showGroups, setShowGroups] = useState(false)

  useEffect(() => {
    if (!open) return
    setTitle(initial?.title || '')
    setContent(initial?.content || '')
    setTags(initial?.tags || [])
    setGroupName(initial?.group_name || '')
    setTagInput('')
  }, [open, initial])

  const addTag = () => {
    const t = tagInput.trim().toLowerCase()
    if (t && !tags.includes(t)) {
      setTags(prev => [...prev, t])
      setTagInput('')
    }
  }

  const removeTag = (t: string) => setTags(prev => prev.filter(x => x !== t))

  const handleSave = () => {
    if (!content.trim()) return
    onSave({ title: title.trim(), content: content.trim(), tags, group_name: groupName })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg" data-lifephase="note-editor">
        <DialogHeader>
          <DialogTitle className="font-display text-[15px] text-zinc-100">
            {initial ? 'Edit note' : 'New note'}
          </DialogTitle>
          <DialogDescription>
            Jot down a thought, an idea, something you don't want to forget.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3.5">
          <Input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Title (optional)"
            className="text-[14px]"
          />

          <Textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="What's on your mind?"
            rows={6}
            className="text-[13px] leading-relaxed resize-none"
            autoFocus
          />

          {/* Tags */}
          <div className="space-y-1.5">
            <label className="text-[11px] uppercase tracking-wider text-zinc-500">Tags</label>
            <div className="flex gap-1.5">
              <Input
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag() } }}
                placeholder="Add tag..."
                className="text-[12px] h-8"
              />
              <Button variant="ghost" size="sm" onClick={addTag} className="h-8 px-2">
                <Plus size={13} />
              </Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {tags.map(t => (
                  <span key={t} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-zinc-800 text-[11px] text-zinc-300 border border-zinc-700/50">
                    {t}
                    <button onClick={() => removeTag(t)} className="text-zinc-500 hover:text-zinc-300">
                      <X size={10} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Group */}
          <div className="space-y-1.5">
            <label className="text-[11px] uppercase tracking-wider text-zinc-500">Group</label>
            <div className="flex gap-1.5">
              <Input
                value={groupName}
                onChange={e => setGroupName(e.target.value)}
                placeholder="Group name..."
                className="text-[12px] h-8"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="mt-2">
          <DialogClose render={<Button variant="ghost" size="sm">Cancel</Button>} />
          <Button
            variant="default"
            size="sm"
            disabled={!content.trim()}
            onClick={handleSave}
          >
            {initial ? 'Save' : 'Add note'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

interface NoteCardProps {
  note: Note
  onEdit: (note: Note) => void
  onDelete: (id: string) => void
}

function NoteCard({ note, onEdit, onDelete }: NoteCardProps) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="group"
    >
      <WarmCard className="p-4 h-full flex flex-col gap-2 hover:border-zinc-700/70 transition-colors">
        {/* Title + actions */}
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-display text-[13px] font-medium text-zinc-200 line-clamp-1 flex-1">
            {note.title || <span className="italic text-zinc-500">Untitled</span>}
          </h3>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => onEdit(note)}
              className="p-1 rounded-md text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/60"
            >
              <Pencil size={12} />
            </button>
            <button
              onClick={() => onDelete(note.id)}
              className="p-1 rounded-md text-zinc-500 hover:text-rose-400 hover:bg-zinc-800/60"
            >
              <Trash2 size={12} />
            </button>
          </div>
        </div>

        {/* Content preview */}
        <p className="text-[12px] text-zinc-400 leading-relaxed line-clamp-3 flex-1">
          {note.content}
        </p>

        {/* Footer: date + tags + group */}
        <div className="flex items-center gap-2 pt-1 border-t border-zinc-800/50">
          <span className="font-mono text-[10px] text-zinc-600">
            {formatDate(note.updated_at)}
          </span>
          {note.group_name && (
            <span
              className="px-1.5 py-0.5 rounded text-[9px] font-medium"
              style={{ backgroundColor: `${getGroupColor(note.group_name)}15`, color: getGroupColor(note.group_name) }}
            >
              {note.group_name}
            </span>
          )}
          {note.tags.slice(0, 2).map(t => (
            <span key={t} className="px-1.5 py-0.5 rounded-full bg-zinc-800/60 text-[9px] text-zinc-500">
              {t}
            </span>
          ))}
          {note.tags.length > 2 && (
            <span className="text-[9px] text-zinc-600">+{note.tags.length - 2}</span>
          )}
        </div>
      </WarmCard>
    </motion.div>
  )
}

export function NotesTab() {
  const [notes, setNotes] = useState<Note[]>([])
  const [groups, setGroups] = useState<string[]>([])
  const [search, setSearch] = useState('')
  const [filterTag, setFilterTag] = useState<string | null>(null)
  const [filterGroup, setFilterGroup] = useState<string | null>(null)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingNote, setEditingNote] = useState<Note | null>(null)
  const [loading, setLoading] = useState(true)

  const loadNotes = useCallback(async () => {
    setLoading(true)
    try {
      const params: any = {}
      if (search) params.search = search
      if (filterTag) params.tag = filterTag
      if (filterGroup) params.group = filterGroup
      const res = await (window as any).deskflowAPI.notesList(
        Object.keys(params).length > 0 ? params : undefined
      )
      if (res?.success) setNotes(res.notes || [])
    } catch { /* non-critical */ }
    setLoading(false)
  }, [search, filterTag, filterGroup])

  const loadGroups = useCallback(async () => {
    try {
      const res = await (window as any).deskflowAPI.notesGroups()
      if (res?.success) setGroups(res.groups || [])
    } catch { /* non-critical */ }
  }, [])

  useEffect(() => { loadNotes() }, [loadNotes])
  useEffect(() => { loadGroups() }, [loadGroups])

  const handleCreate = async (data: { title: string; content: string; tags: string[]; group_name: string }) => {
    await (window as any).deskflowAPI.notesCreate(data)
    loadNotes()
    loadGroups()
  }

  const handleUpdate = async (data: { title: string; content: string; tags: string[]; group_name: string }) => {
    if (!editingNote) return
    await (window as any).deskflowAPI.notesUpdate({ id: editingNote.id, ...data })
    setEditingNote(null)
    loadNotes()
    loadGroups()
  }

  const handleDelete = async (id: string) => {
    await (window as any).deskflowAPI.notesDelete(id)
    loadNotes()
    loadGroups()
  }

  // Collect all unique tags from notes
  const allTags = [...new Set(notes.flatMap(n => n.tags))].sort()

  return (
    <div className="space-y-4" data-lifephase="notes-tab">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="grid size-7 place-items-center rounded-lg bg-amber-400/10">
            <BookOpen size={14} className="text-amber-400" />
          </div>
          <h2 className="warmth-serif text-lg text-zinc-200">Notes</h2>
          <span className="text-[11px] text-zinc-600">{notes.length} notes</span>
        </div>
        <Button
          variant="default"
          size="sm"
          onClick={() => { setEditingNote(null); setEditorOpen(true) }}
          className="gap-1.5"
        >
          <Plus size={13} /> New note
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search notes..."
          className="pl-9 text-[13px]"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
          >
            <X size={13} />
          </button>
        )}
      </div>

      {/* Filter chips */}
      {(allTags.length > 0 || groups.length > 0) && (
        <div className="flex flex-wrap gap-1.5">
          {/* Group filters */}
          {groups.map(g => (
            <button
              key={g}
              onClick={() => setFilterGroup(filterGroup === g ? null : g)}
              className={cn(
                'px-2 py-1 rounded-full text-[11px] font-medium border transition-colors',
                filterGroup === g
                  ? 'border-amber-500/40 bg-amber-500/10 text-amber-300'
                  : 'border-zinc-700/50 bg-zinc-800/40 text-zinc-400 hover:text-zinc-300'
              )}
            >
              <span className="inline-block w-1.5 h-1.5 rounded-full mr-1" style={{ backgroundColor: getGroupColor(g) }} />
              {g}
            </button>
          ))}
          {/* Tag filters */}
          {allTags.slice(0, 8).map(t => (
            <button
              key={t}
              onClick={() => setFilterTag(filterTag === t ? null : t)}
              className={cn(
                'px-2 py-1 rounded-full text-[11px] border transition-colors',
                filterTag === t
                  ? 'border-zinc-500 bg-zinc-700/50 text-zinc-200'
                  : 'border-zinc-700/50 bg-zinc-800/40 text-zinc-500 hover:text-zinc-300'
              )}
            >
              #{t}
            </button>
          ))}
        </div>
      )}

      {/* Notes grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-32 animate-pulse rounded-xl border border-zinc-800/50 bg-zinc-900/40" />
          ))}
        </div>
      ) : notes.length === 0 ? (
        <div className="text-center py-12">
          <BookOpen size={32} className="mx-auto text-zinc-700 mb-3" />
          <p className="text-[13px] text-zinc-500">
            {search || filterTag || filterGroup
              ? 'No notes match your filters'
              : 'No notes yet — tap "New note" to start'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <AnimatePresence mode="popLayout">
            {notes.map(note => (
              <NoteCard
                key={note.id}
                note={note}
                onEdit={n => { setEditingNote(n); setEditorOpen(true) }}
                onDelete={handleDelete}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Editor */}
      <NoteEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        initial={editingNote}
        onSave={editingNote ? handleUpdate : handleCreate}
      />
    </div>
  )
}
