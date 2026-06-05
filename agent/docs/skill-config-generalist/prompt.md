# Raw Request

> "I need a skill config that defines customizable components for each skill — what inputs it accepts (user input, AI agent input), what outputs it produces, and what configurable components it has. Then a generalist page that parses all skills and shows their configuration."

---

## Context

Read `agent/docs/skill-config-generalist/CONTEXT_BUNDLE.md` first — it contains the full codebase reference (SkillsService interface, SKILL.md frontmatter, terminal sidebar structure, dialog patterns, design tokens, and all 17 skills).

### Problem

Skills currently only expose name/description/category. There's no way to see what inputs a skill expects, what outputs it produces, or what configurable pieces it has. The skill system is opaque — users don't know what a skill does until they open its SKILL.md and read the full file.

The Skills tab already supports CRUD (list, create, edit, delete), but there's no browse/explore mode that shows all skills with their component configuration.

### What Needs to Change

**Part A — Skill Config Format (Backend)**

Extend `SkillsService.ts` to parse new frontmatter fields from SKILL.md:

- `inputs`: list of `{name, type, description?, required?, source?}` — what data the skill expects
- `outputs`: list of `{name, type, description?}` — what the skill produces
- `components`: list of `{name, description?, type?, required?, source?}` — configurable pieces of the skill

Each SKILL.md can optionally declare these. If not present, the skill shows "No extended configuration defined."

Backend implementation:
1. Add TypeScript interfaces `SkillIO`, `SkillComponent` to SkillsService.ts
2. Extend `Skill` interface with optional `inputs?`, `outputs?`, `components?`
3. Update `loadSkillFromFile()` to parse these from YAML frontmatter
4. Existing `getSkills` IPC already returns full Skill objects — no new IPC needed
5. Current frontmatter parser uses regex — extend with regex for list blocks

**Part B — Generalist Page (Frontend)**

Create `GeneralistDialog.tsx` (new component) that:

1. Loads ALL skills via `window.deskflowAPI?.getSkills()`
2. Displays in a responsive grid (1 col mobile, 2 col desktop) matching the FeaturesDialog pattern:
   - Each skill card has a category-colored left border (`border-l-2`)
   - Shows name, description, category badge
   - Click to expand/collapse revealing inputs/outputs/components
3. Search input + category dropdown filter at the top
4. Expandable sections showing:
   - **Inputs** (→ arrow, cyan accent): name, type badge, required indicator, description
   - **Outputs** (← arrow, green accent): name, type badge, description
   - **Components** (◆ diamond, violet accent): name, type, source badge, description
5. Show "No extended configuration defined" for skills without config
6. Uses same glass-card aesthetic as FeaturesDialog: `bg-zinc-900/50 rounded-lg border-l-2`

**Part C — Wire into TerminalPage**

1. Import and render `GeneralistDialog` in TerminalPage.tsx
2. Add button in sidebar header (next to ℹ️ Features button) with `BookOpen` icon + violet accent
3. On click: open dialog + load skills via `getSkills()`
4. Add state: `showGeneralistDialog`, `generalistSkills`, `generalistLoading`

## Design Task

- Dialog: Full-screen overlay with backdrop blur, matching FeaturesDialog pattern
  - `bg-black/60 backdrop-blur-sm` backdrop
  - `bg-zinc-800 rounded-xl border border-zinc-700` container
  - `max-w-5xl` for width, `max-h-[85vh]` with overflow-y-auto
- Skill cards: `border-l-2` with category color, `hover:bg-zinc-800/50` transition
- Color mapping for categories:
  - design → pink
  - development → blue
  - research → cyan
  - writing → amber
  - testing → emerald
  - general → zinc
- Filter bar: search input with `Search` icon, category `<select>`, skill count badge
- Expand/collapse: `ChevronRight`/`ChevronDown` icons, smooth transition
- Loading state: spinner + "Loading skills..." text
- Empty state: "No skills match your filters."

## Constraints

1. **No new IPC** — `getSkills()` already returns full Skill objects
2. **No removal** — Keep existing Skills tab fully intact
3. **No new dependencies** — lucide-react already in use
4. **Build must pass** — `npm run build` compiles both renderer (vite) and electron (tsc)
5. **Add to existing import** — Extend `src/pages/TerminalPage.tsx` lucide-react import with `BookOpen`
6. **Follow dialog pattern** — Same overlay/stopPropagation as FeaturesDialog
7. **No BookOpen in icon import unless confirmed** — Add it to the existing import line

## Data Flow

```
User clicks BookOpen button in sidebar header
  → setShowGeneralistDialog(true)
  → getSkills() IPC call
  → SkillsService parses SKILL.md files (including new inputs/outputs/components)
  → GeneralistDialog renders in filterable grid
  → User searches/filters, expands cards
  → User clicks ✕ or backdrop to close
```

## Files to Modify

- `src/services/SkillsService.ts` — Add SkillIO/SkillComponent interfaces, update loadSkillFromFile
- `src/components/GeneralistDialog.tsx` — New component (2-3col grid, filterable, expandable)
- `src/pages/TerminalPage.tsx` — Import, state, button, render dialog
- Optional: Update any/all SKILL.md files under `agent/skills/*/SKILL.md` to add `inputs`/`outputs`/`components` frontmatter

## Verification

1. Open terminal sidebar → click BookOpen button in header
2. Dialog opens with all skills loaded
3. Search filters skills by name/description
4. Category dropdown filters by category
5. Click skill card → expands to show inputs/outputs/components
6. Skills without config show "No extended configuration defined"
7. Close via ✕ or backdrop click
8. Run `npm run build` — ✅ pass
