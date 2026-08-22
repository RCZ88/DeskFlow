# Feature Documentation Protocol v1.0

> **PURPOSE:** Every feature/problem/collaboration lives in a per-feature folder with a
> STATUS.md that tracks implementation state, checklists, dates, and cross-references.
> This is the SINGLE SOURCE OF TRUTH for "is this feature done?"

## 1. Directory Structure

```
agent/docs/features/{feature-slug}/
├── STATUS.md                    # Status, checklist, dates, references (ALWAYS PRESENT)
├── prompt/                      # Generate-prompt output
│   ├── PROMPT.md
│   ├── CONTEXT_BUNDLE.md
│   └── RESULT.md
├── back-and-forth/              # Back-and-forth collaboration rounds
│   ├── round-01/
│   │   ├── CONTEXT_BUNDLE.md
│   │   ├── RESULT.md
│   │   └── STATUS.md            # Round-level status
│   └── round-02/
├── specs/                       # Design specs, diagnosis docs
│   └── design-spec.md
└── notes/                       # Agent notes, lessons learned
    └── lessons.md
```

## 2. STATUS.md Template

Every feature folder MUST have a STATUS.md. Format:

```markdown
# {Feature Name}

## Meta
- **Slug:** {feature-slug}
- **Page/Area:** {which page this belongs to — Dashboard, Terminal, Settings, etc.}
- **Created:** YYYY-MM-DD
- **Last Updated:** YYYY-MM-DD
- **Author:** {who created it — Architect, Agent, CZ}

## Status
- **Overall:** complete | in-progress | approved | deferred | abandoned
- **Spec:** complete | in-progress | missing
- **Backend:** complete | in-progress | missing
- **UI:** complete | in-progress | missing
- **Tested:** yes | no | partial
- **Approved by User:** yes | no | pending

## Checklist
- [ ] Spec written (RESULT.md / CONTEXT_BUNDLE.md)
- [ ] Backend implemented (IPC handlers, DB tables)
- [ ] UI implemented (components, pages)
- [ ] Preload bridges added
- [ ] Types declared (deskflow-api.d.ts)
- [ ] Build passes (vite + esbuild)
- [ ] Runtime verified (Probe or manual)
- [ ] User approved

## References
- **Prompt package:** `agent/docs/features/{slug}/prompt/`
- **Back-and-forth:** `agent/docs/features/{slug}/back-and-forth/`
- **Source files:** `src/...`
- **IPC channels:** `{channel-name}`
- **DB tables:** `{table-name}`

## History
| Date | Event | Author |
|------|-------|--------|
| YYYY-MM-DD | Created | Agent |
| YYYY-MM-DD | Spec complete | Architect |
| YYYY-MM-DD | Implementation complete | Agent |
| YYYY-MM-DD | Approved by user | CZ |
```

## 3. Rules

### 3.1 Naming
- Feature slug: lowercase, hyphenated, descriptive (e.g. `context-brain-memory-restore`)
- Include date in folder name when created: `{slug}-{DDMMYYYY}` (e.g. `light-mode-19082026`)
- Round folders: `round-01`, `round-02`, etc.

### 3.2 Status Values
- **complete:** All checklist items done, user approved
- **in-progress:** Work ongoing, some checklist items incomplete
- **approved:** User has verified and approved
- **deferred:** Paused, not actively worked on
- **abandoned:** No longer planned

### 3.3 When to Create a Feature Folder
- When the Architect delivers a RESULT.md → create `features/{slug}/prompt/`
- When a back-and-forth collaboration starts → create `features/{slug}/back-and-forth/round-01/`
- When a bug is found → create `features/{slug}/specs/` with diagnosis
- When a feature is requested → create `features/{slug}/STATUS.md` with checklist

### 3.4 When to Update STATUS.md
- After every implementation cycle (check off completed items)
- After user approval (mark "Approved by User: yes")
- When status changes (in-progress → complete)
- When new references are found (add to References section)

### 3.5 AI Lookup Protocol
When the AI needs to find context about a feature:
1. Check `features/{slug}/STATUS.md` for current status
2. Check `features/{slug}/prompt/RESULT.md` for spec
3. Check `features/{slug}/back-and-forth/` for collaboration history
4. Check `features/{slug}/specs/` for design decisions

### 3.6 Migration from Old Structure
- `generate-prompt-docs/{slug}/` → `features/{slug}/prompt/`
- `backandfourth-docs/{slug}/` → `features/{slug}/back-and-forth/`
- Loose files in `agent/docs/` → categorize into appropriate feature folder or `shared/`

## 4. Shared Documentation

Cross-feature docs live in `agent/docs/shared/`:
- `design-system.md` — design tokens, component inventory
- `workspace-architecture.md` — terminal workspace system map
- `context-infrastructure.md` — brain, memory, retrieval systems
- `build-system.md` — build scripts, compilation pipeline

## 5. Quick Reference

| You want to... | Look here |
|----------------|-----------|
| Check if a feature is done | `features/{slug}/STATUS.md` → Overall status |
| Find the spec for a feature | `features/{slug}/prompt/RESULT.md` |
| See collaboration history | `features/{slug}/back-and-forth/round-*/` |
| Find what a feature references | `features/{slug}/STATUS.md` → References section |
| Check implementation checklist | `features/{slug}/STATUS.md` → Checklist section |
| Find cross-feature docs | `shared/` |
