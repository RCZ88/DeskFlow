# PROMPT: Notes Deadline System

## Raw Request (Verbatim)

"i would like to implement on the thing is the note system. i think we can improve the note system on this way. i would like so that we can have more variety on the notes and how we can connect those with the deadlines and stuff, and especially the fact that we don't have the deadline features on the notes and stuff. i think the overall life page, i think the goal is good and to give the goals and stuff, but we don't actually have the place to show those, to put the actual deadlines and stuff that we need to catch up with, and the stuff we're abouting to the notes again. you can attach it, for example, you can attach deadlines, you can attach dates and those. and to actually have the reminder of that, i think something connecting to the dashboard as well, which currently are 40 cut from the AI agent that is working on those, other 15 dashes of the date, and everything is working properly. so i need you to plan everything for that and plan how features and stuff that you want to make sure that there's an effort, and also the fact that you're supposed to be able to, like, for some reason, i can't see the notes, i can't click on the notes, then existing notes, i can't click to expand it because it's currently cut off. i need to be able to see those notes, click on it, and see the details of the notes. right? and i feel like, if we accidently click the close button on the new note that should be able to automatically save those as a draft, if there's only, worry something, something."

## Problem Statement

The NotesTab has critical UX issues:
1. Notes are cut off with `line-clamp-3` — users can't see full content
2. No click-to-expand — must use pencil icon to edit, no read-only view
3. No deadline/date features — notes have no concept of due dates
4. No auto-save — closing editor loses unsaved work
5. No dashboard connection — deadlines don't appear in timeline

## Context Bundle Reference

Read `CONTEXT_BUNDLE.md` for the current NotesTab implementation, IPC endpoints, DB schema, and design tokens.

## Engineering Task

Design a complete notes system upgrade:

### 1. Click-to-Expand
- Clicking a note card opens a full read-only view (not edit mode)
- Show complete content without line-clamp
- Edit button still available in expanded view
- Smooth animation between card and expanded state

### 2. Deadline System
Add to the Note interface:
```typescript
interface Note {
  // existing fields...
  deadline?: string | null        // ISO date YYYY-MM-DD
  deadline_time?: string | null   // optional time HH:MM
  reminder?: string | null        // 'none' | 'at-time' | '15min' | '1hour' | '1day'
  status?: 'active' | 'completed' | 'overdue'
}
```

DB migration:
```sql
ALTER TABLE notes ADD COLUMN deadline TEXT;
ALTER TABLE notes ADD COLUMN deadline_time TEXT;
ALTER TABLE notes ADD COLUMN reminder TEXT;
ALTER TABLE notes ADD COLUMN status TEXT DEFAULT 'active';
```

### 3. Auto-Save Drafts
- When user types in the editor and clicks close/X, auto-save as draft
- Drafts appear in a "Drafts" section at the top
- Draft has a visual indicator (dashed border, muted colors)
- User can resume or delete drafts

### 4. Dashboard Connection
- Notes with deadlines appear in the dashboard timeline
- Overdue notes show with urgency styling
- Upcoming deadlines (within 7 days) show in a "Upcoming" section

### 5. Note Detail View
- Full-screen or large modal view
- Title, content, deadline, tags, group, created/updated dates
- Edit button to switch to edit mode
- Delete button with confirmation
- Share/copy buttons

## Design Task

Design the HIGH-FIDELITY VISUAL SPECS for:

1. **NoteCard expanded state** — click to see full content
2. **Deadline picker** — date + time + reminder selection
3. **Draft indicator** — visual treatment for unsaved drafts
4. **Overdue styling** — red/amber accents for past deadlines
5. **Dashboard timeline integration** — how notes appear in timeline
6. **Note detail view** — full read-only view with all metadata

## UX Task

Design the INTERACTION FLOW for:

1. **Click to expand** — what triggers expansion, animation, scroll
2. **Auto-save on close** — when to trigger, confirmation if content exists
3. **Deadline creation** — how to set deadline while editing
4. **Draft management** — create, resume, delete drafts
5. **Dashboard connection** — how deadlines appear in timeline

## Constraints

- Must work with existing notes IPC endpoints (add deadline fields)
- Auto-save must not create duplicate notes
- Dashboard timeline must handle notes without deadlines gracefully
- All UI must follow existing design system (glass cards, dark mode)
