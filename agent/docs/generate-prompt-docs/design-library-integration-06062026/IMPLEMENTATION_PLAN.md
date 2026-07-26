# Implementation Plan — Design Library Integration

Based on RESULT.md. Backend (15 IPC handlers + preload bridges) already complete. Frontend gaps below.

---

## Phase A — Wire Configure Button & Fix Stats Bug

### A1 `src/components/workspace/DesignLibrarySources.tsx`
**Spec ref:** §5B (Card structure with separate Browse/Configure actions)

**Current bug:** `getStatusText` at line 25 reads `libraries[0].itemCount` for every card instead of the current card's.

**Changes:**
1. Add `onConfigure: (id: LibraryId) => void` to `DesignLibrarySourcesProps`
2. Replace `onToggle` prop usage in Configure button → call `onConfigure(id)`
3. Fix `getStatusText` to use the library's own `itemCount` instead of `libraries[0]`

### A2 `src/pages/DesignWorkspacePage.tsx`
**Spec ref:** §5A (Enhanced layout), §5D (LibraryConfigModal integration)

**Changes:**
1. Pass `onConfigure={openConfig}` to `<DesignLibrarySources>`
2. Wire `handleSaveConfig` to actually save via IPC `setDesignLibraryConfig`
3. Load config on mount via IPC `getDesignLibraryConfig()` and populate initial library state

---

## Phase B — Rewrite LibraryConfigModal

### B1 `src/components/workspace/LibraryConfigModal.tsx`
**Spec ref:** §5D (All-3-sources modal), §7A (localStorage schema)

**Current state:** Single-source modal that's never opened. Receives `config={{}}`.

**Rewrite to match §5D Layout:**
- Single modal showing ALL 3 sources in sections (not per-source)
- Each section: header with toggle, separator, fields, action buttons
- Load config on open via IPC `getDesignLibraryConfig()`
- Save config via IPC `setDesignLibraryConfig()`
- **Config fields per source (per §7A schema):**
  - 21st.dev: API key (masked + show toggle), MCP command, auto-start toggle, status, [Start/Stop] buttons
  - Aceternity: Registry URL, cache info (freshness + item count), [Refresh Cache] [Clear Cache], MCP command, MCP status, [Start MCP]
  - Refero: API key (masked + show toggle), MCP command, auto-start toggle, status, [Start/Stop]
- [Test Connection] button per source calls `testDesignLibraryConnection`
- [Save Configuration] button at bottom
- **Visual:** Use `GlassCard` variant per section, accent colors matching §5B table

---

## Phase C — ComponentBrowserModal Detail Fetch

### C1 `src/components/workspace/ComponentBrowserModal.tsx`
**Spec ref:** §5C (Expanded view with tags, dependencies), §3B (Aceternity detail fetch)

**Changes:**
1. On component expand (click card), fetch full detail:
   - Aceternity: `aceternityFetchComponent(slug)` → get full code, dependencies, tags
   - 21st.dev: `mcpCallTool('21st-dev', 'get_component', { componentId: slug })`
   - Refero: `fetchReferoSystem(slug)` → get DESIGN.md tokens
2. Show tags, dependencies, source accent in expanded view
3. Add source-specific accent color to component cards
4. Loading state while fetching detail

---

## Phase D — Documentation (Phase 6 from spec)

### D1 `agent/TERMINAL_SIDEBAR_REFERENCE.md`
Add "Design Library Sources" section (§9A)

### D2 `agent/INITIALIZE.md`
Add "Design Libraries" step (§9C)

### D3 `src/pages/TutorialPage.tsx`
Add design-library-integration feature entry (§9D)

---

## Design Theme Alignment

All new/modal components match existing sidebar patterns:
- **GlassCard**: `bg-zinc-900/80 backdrop-blur-xl border border-zinc-800/60 rounded-xl p-5`
- **Modal wrapper**: `fixed inset-0 z-50 bg-zinc-950/80 backdrop-blur-sm`
- **Modal content**: `rounded-xl bg-zinc-900/95 backdrop-blur-xl border border-zinc-800/60`
- **Inputs**: `bg-zinc-800/60 border border-zinc-800/60 rounded-lg px-4 py-2.5 text-sm text-zinc-200`
- **Pills/buttons**: `rounded-lg px-3 py-1.5 text-xs font-medium` with zinc-800 background
- **Accent colors**: cyan-400 (21st.dev), violet-400 (Aceternity), emerald-400 (Refero)
