# CONTEXT_BUNDLE — Skill DSL: Dynamic UI from Skill Frontmatter

## Project Overview

A desktop app (Electron + React + Vite + Tailwind v4) that manages AI agent sessions via opencode CLI. Skills are markdown files in `agent/skills/*/SKILL.md` with YAML frontmatter. The app currently parses skill metadata and displays it as read-only badges. The missing piece: a DSL (domain-specific language) in the frontmatter that lets skills declare interactive UI controls, and a renderer that turns those declarations into actual React form components.

---

## 1. Current Skill System

### 1.1 Skill Directory Structure
```
agent/skills/
  deep-research/   SKILL.md
  generate-prompt/ SKILL.md
  maintain-context/ SKILL.md
  fix-problems/    SKILL.md
  ...
```
Each subdirectory contains a `SKILL.md` file with YAML frontmatter.

### 1.2 Current Frontmatter Examples

**generate-prompt/SKILL.md:**
```yaml
---
id: generate-prompt
name: Generate Prompt
category: design
applicable_to: [prompts, design-specs]
version: 1.2.0
created: 2026-04-19
tags: [prompts, design, engineering]
inputs:
  - name: User Request
    type: text
    description: The user's original verbatim request
    required: true
    source: user
  - name: Context Bundle
    type: file
    description: CONTEXT_BUNDLE.md reference document
    required: true
    source: system
  - name: Design Constraints
    type: text
    description: Optional constraints or preferences
    required: false
    source: user
outputs:
  - name: Design Prompt
    type: markdown
    description: High-fidelity design specification prompt
  - name: Component Breakdown
    type: list
    description: Identified UI components and their relationships
components:
  - name: Raw Request Block
    description: User's verbatim request section
    source: user
  - name: Context Reference
    description: CONTEXT_BUNDLE.md as source of truth
    source: system
  - name: Prompt Template
    description: Base prompt structure with variable slots
    source: system
---
```

**deep-research/SKILL.md (has type: enum — choices buried in description text):**
```yaml
inputs:
  - name: Depth Level
    type: enum
    description: How deep to investigate (surface, standard, deep)
    required: false
    source: user
```

### 1.3 Current SkillIO Interface (src/services/SkillsService.ts:4-18)
```typescript
export interface SkillIO {
  name: string;
  type: string;          // "text" | "file" | "enum" | "code" | "markdown" | "list"
  description?: string;
  required?: boolean;
  source?: string;       // "user" | "system" | "agent"
}
```
**MISSING fields:** `choices`, `widget`, `default`, `placeholder`, `min`, `max`, `step`, `validation`, `group`

### 1.4 Current SkillComponent Interface (SkillsService.ts:20-26)
```typescript
export interface SkillComponent {
  name: string;
  description?: string;
  type?: string;
  required?: boolean;
  source?: string;
}
```

### 1.5 Current Skill Interface (SkillsService.ts)
```typescript
export interface Skill {
  id: string;
  name: string;
  description: string;
  category: string;
  content: string;          // full markdown body after frontmatter
  filePath: string;
  inputs?: SkillIO[];       // from frontmatter
  outputs?: SkillIO[];      // from frontmatter
  components?: SkillComponent[];  // from frontmatter
}
```

---

## 2. Current Frontmatter Parser

### parseFrontmatterList() (SkillsService.ts:166-219)

A hand-written YAML-list parser (no external dependency). Parses:

```yaml
inputs:
  - name: User Request
    type: text
    required: true
```

Using regex matching:
- `line.match(/^  - (\w+):\s*(.+)$/)` — detects new list item with first property
- `line.match(/^    (\w+):\s*(.+)$/)` — detects additional properties on current item
- Boolean coercion: `'true'` → `true`, `'false'` → `false`
- Array coercion: `[a, b]` → `['a', 'b']`
- Section boundary detection: when a new top-level key appears (no leading space), pushes current item and stops

**Limitations:**
- Only handles 2 levels of nesting (list items + their properties)
- No nested list support (can't do `choices: [a, b, c]` in a sub-property)
- No multi-line value support
- No type coercion for numeric values
- No error handling for malformed frontmatter

---

## 3. Current GeneralistDialog (src/components/GeneralistDialog.tsx — 309 lines)

The only UI that displays SkillIO data. **Read-only badge rendering:**
- Shows each input/output/component as info badges
- `renderIOItem()` renders: name, type badge, required badge, source badge, description text
- `renderComponentItem()` renders: name, type badge, required badge, source badge
- **No interactive controls** — no inputs, dropdowns, toggles, or forms
- **No "Use Skill" action** that collects user input for the skill

```tsx
const renderIOItem = (item: SkillIO) => (
  <div className="py-1.5">
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-xs text-zinc-200 font-medium">{item.name}</span>
      {item.type && <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 ...">{item.type}</span>}
      {item.required && <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 ...">required</span>}
      {item.source && <span className={`text-[10px] px-1.5 py-0.5 rounded ${sourceBadgeColors[item.source]}`}>{item.source}</span>}
    </div>
    {item.description && <p className="text-[10px] text-zinc-500 mt-0.5">{item.description}</p>}
  </div>
);
```

---

## 4. Existing UI Form Patterns (for reference)

The app already uses these form controls — follow their existing patterns:

### Select / Dropdown (IssuesWorkspace.tsx)
```tsx
<select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
  className="bg-zinc-800/80 border border-zinc-700/50 rounded-lg px-2 py-1.5 text-[10px] text-zinc-300 focus:outline-none focus:border-zinc-600"
>
  <option value="all">All Items</option>
  <option value="active">Active</option>
</select>
```

### Text Input (IssuesWorkspace.tsx)
```tsx
<input type="text" value={instructions} onChange={e => setInstructions(e.target.value)}
  placeholder="Type instruction..."
  className="flex-1 bg-zinc-950 border border-zinc-700/50 rounded-lg px-3 py-2 text-[11px] text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-pink-500/50"
/>
```

### Textarea (IssuesWorkspace.tsx)
```tsx
<textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
  placeholder="Add notes..."
  className="w-full bg-zinc-950 border border-zinc-700/50 rounded-lg px-3 py-2 text-[11px] text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-pink-500/50 resize-none"
/>
```

### Slider / Range (NewSessionDialog.tsx — design variance knobs)
```tsx
<input type="range" min={1} max={10} value={variance}
  onChange={e => setVariance(Number(e.target.value))}
  className="w-full accent-pink-500"
/>
<span className="text-[10px] text-zinc-500 w-4 text-right">{variance}</span>
```

### Toggle / Switch (ContextSidebar — system toggles)
```tsx
<button onClick={onToggle}
  className={`w-8 h-4 rounded-full transition-colors relative ${enabled ? 'bg-pink-600' : 'bg-zinc-700'}`}
>
  <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${enabled ? 'translate-x-4' : 'translate-x-0.5'}`} />
</button>
```

### Checkbox (InstructionPanel.tsx — system prompt layer toggles)
```tsx
<input type="checkbox" checked={checked} onChange={onChange}
  className="w-3.5 h-3.5 rounded border-zinc-600 bg-zinc-800 accent-pink-500"
/>
```

---

## 5. IPC Endpoint (preload.ts)
```typescript
getSkills: (projectPath?: string) => ipcRenderer.invoke('get-skills', { projectPath })
// Returns { success: boolean, data: Skill[] }
```
Handler in main.ts creates `SkillsService` and returns all skills with their full frontmatter data. The skill objects already include `inputs`, `outputs`, `components` as parsed arrays.

---

## 6. Design Tokens

| Token | Value | Usage |
|-------|-------|-------|
| Background (card) | `bg-zinc-900/40 backdrop-blur-sm` | Skill cards |
| Background (input) | `bg-zinc-950` | Form inputs |
| Border | `border-zinc-700/50` | Default borders |
| Border (focus) | `focus:border-pink-500/50` | Focus ring |
| Accent | `pink-600` → `rose-600` gradient | Buttons, active states |
| Text primary | `text-zinc-200` | Labels |
| Text secondary | `text-zinc-400` | Descriptions |
| Text placeholder | `placeholder-zinc-600` | Placeholder text |
| Text disabled | `text-zinc-600` | Disabled state |
| Font size form | `text-[11px]` | Input text |
| Font size label | `text-[10px]` | Labels |
| Font size meta | `text-[9px]` | Badges, captions |
| Rounded | `rounded-lg` (8px) | Inputs, buttons |
| Rounded | `rounded-xl` (12px) | Cards |
| Source badges | `bg-{color}/10 text-{color}` | user=cyan, system=zinc, agent=violet |

---

## 7. Gaps Summary

| Gap | Detail |
|-----|--------|
| No `choices` field | Enum options buried in description text like "(surface, standard, deep)" |
| No `widget` field | Can't specify `type: text` should render as textarea vs input vs code editor |
| No `default` field | Can't set initial values for skill inputs |
| No `placeholder` field | Placeholder text for inputs |
| No `min`/`max`/`step` | Can't constrain numeric inputs as sliders |
| No `validation` field | Can't specify regex patterns or validation rules |
| No `group` field | Can't group related inputs together |
| Parser limited | No nested list parsing, no numeric coercion, no error handling |
| No dynamic form renderer | SkillIO.type is never mapped to React controls |
| No form state collection | Can't collect user input values from skill UI |
| No integration point | GeneralistDialog is read-only; InstructionPanel doesn't use skill inputs |

---

## 8. File Reference Map

| File | Lines | What's There |
|------|-------|-------------|
| `src/services/SkillsService.ts` | 220 | Skill, SkillIO, SkillComponent interfaces, parseFrontmatterList(), Skill class |
| `src/components/GeneralistDialog.tsx` | 309 | Read-only skill config viewer with badges |
| `src/pages/TerminalPage.tsx` | ~5400 | InstructionPanel integration, skill usage |
| `src/components/InstructionPanel.tsx` | 603 | Compose panel with skill selection |
| `src/preload.ts` | 583 | getSkills IPC bridge |
| `src/main.ts` | 12921 | get-skills IPC handler |
| `agent/skills/*/SKILL.md` | varies | Skill definitions with frontmatter |
