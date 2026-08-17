# Context Bundle — Notes Deadline System

## Problem Summary

The current NotesTab has several issues:
1. Notes are displayed with `line-clamp-3` — content is cut off, can't see full text
2. No click-to-expand — must click pencil icon to edit, no read-only view
3. No deadline/date features — notes have no concept of due dates or reminders
4. No auto-save on close — if user accidentally closes editor, work is lost
5. No connection to dashboard — deadlines don't show in timeline

## Current NotesTab Implementation

```typescript
// src/components/life-river/NotesTab.tsx
interface Note {
  id: string
  title: string
  content: string
  tags: string[]
  group_name: string
  created_at: string
  updated_at: string
}

// NoteCard displays with line-clamp-3
<p className="text-[12px] text-zinc-400 leading-relaxed line-clamp-3 flex-1">
  {note.content}
</p>

// NoteEditor is a Dialog (modal)
// No deadline field
// No auto-save on close
```

## Notes IPC Endpoints

```typescript
// src/preload.ts
notesList: (params?: any) => ipcRenderer.invoke('notes:list', params)
notesCreate: (data: any) => ipcRenderer.invoke('notes:create', data)
notesUpdate: (data: any) => ipcRenderer.invoke('notes:update', data)
notesDelete: (id: string) => ipcRenderer.invoke('notes:delete', id)
notesGroups: () => ipcRenderer.invoke('notes:groups')
```

## Notes DB Schema (from main.ts)

```sql
CREATE TABLE IF NOT EXISTS notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT,
  content TEXT NOT NULL,
  tags TEXT DEFAULT '[]',
  group_name TEXT DEFAULT '',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
```

## Dashboard Connection Points

- Dashboard shows timeline with deadlines
- Goals have deadlines (goals table has deadline column)
- Subscriptions have next_billing_date
- Focus sessions have scheduled times

## Design Tokens

- Glass: `bg-zinc-900/80 backdrop-blur-xl`
- Dark mode only
- Accent: amber-400, rose-400, emerald-400
- Fonts: Geist + JetBrains Mono
- Rounded: max `rounded-xl`
