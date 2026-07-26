# PROMPT.md — NewSessionDialog UI Revamp

## Raw Request

> "no i nwat you to generate it. use all fronted skills to revamp everythng"

The user wants a complete UI/UX revamp of the NewSessionDialog component — the modal used to create new AI agent sessions in the DeskFlow terminal workspace. The current dialog is functional but visually flat, overwhelming, and lacks progressive disclosure. The user explicitly requested using ALL frontend design skills.

---

## Context

Read `CONTEXT_BUNDLE.md` in this directory for the full source code, interfaces, state variables, IPC endpoints, and design tokens. The target AI must understand the current implementation before designing the replacement.

---

## Mandate

You are the **Lead Designer and Engineer** for DeskFlow. Design a complete UI/UX overhaul of the NewSessionDialog. This is NOT a minor polish — this is a ground-up redesign of the session creation experience.

The dialog serves 3 modes (`create`, `new-agent`, `setup`) and must feel premium, fast, and cognitively clear in all three.

---

## Frontend Design Skills (Apply ALL)

The following skills MUST be loaded and applied to this redesign. Do not skip any.

### 1. Frontend Design
- Glassmorphic dark UI (`bg-zinc-900/50 backdrop-blur-xl border border-zinc-800/50`)
- Progressive disclosure — show what matters, hide complexity
- Density without clutter — 8px grid, tight spacing with clear hierarchy
- Motion as feedback — 150-300ms micro-interactions on all state changes
- Type as UI — weight and color temperature carry hierarchy, not just size

### 2. Human-Centric UX
- 6 Pillars: Clarity, Progressive Disclosure, Visual Hierarchy, Feedback, Accessibility, Error Prevention
- Every screen answers one primary question — if it answers five, split it
- Empty states, loading states, error states for EVERY section
- Labels in plain language — no system tokens or enum values visible

### 3. Impeccable
- 7 design dimensions: Typography, Color, Spatial, Motion, Interaction, Responsive, UX Writing
- 8px grid system — all spacing multiples of 8px
- Modular type scale (1.25 ratio): 12, 15, 18.75, 23.44px
- Duration scale: Micro (0-100ms), Fast (100-200ms), Normal (200-400ms)
- 27 anti-patterns — check every design decision against them

### 4. Motion — Bring the UI Alive
- Liveliness Levels: L1 Composed (subtle, professional) for this dialog
- Entrance animations: staggered fade-up for form sections
- Transition: height/opacity for expandable sections (NOT width/height on layout)
- Hover: subtle scale + glow on interactive elements
- Loading: skeleton pulses for context system cards

### 5. UI UX Pro Max
- Dev tools / AI/ML specific design rules
- Data-dense interface patterns
- Professional desktop application feel

### 6. Design Taste System
- Design variance: keep it sophisticated, not experimental
- Anti-repetition: each section should have distinct visual treatment
- Color temperature: warm accents on cool backgrounds

### 7. frontend-external-infra
- Source routing: which MCP server provides what components
- Re-skin rules: replace source styling with DeskFlow tokens
- Anti-slop checklist: verify no generic AI-generated UI patterns

---

## MCP Component Inventory

Query these MCP servers for real component names to use:

### shadcn MCP
| Component | Source | Use for |
|-----------|--------|---------|
| dialog | @shadcn | Modal wrapper (replace custom backdrop) |
| command | @shadcn | Agent/search selector with keyboard nav |
| select | @shadcn | Dropdown selects (model tier, agent type) |
| switch | @shadcn | Toggle switches for context systems |
| badge | @shadcn | Status badges (health, model tier) |
| card | @shadcn | Section containers |
| tabs | @shadcn | Mode selector (Create / New Agent / Setup) |
| tooltip | @shadcn | Hover explanations for context systems |
| separator | @shadcn | Visual dividers |
| skeleton | @shadcn | Loading states for context system cards |

### Magic UI MCP
| Component | Source | Use for |
|-----------|--------|---------|
| Animated Beam | Magic UI | Connection lines in context map |
| Number Ticker | Magic UI | Token budget counter animation |
| Particles | Magic UI | Subtle background effect on dialog open |
| Border Beam | Magic UI | Animated border on primary action button |

### Lucide Icons
| Icon | Use for |
|------|---------|
| Bot | AI agent indicator |
| Send | Create/start action |
| Sparkles | New session |
| Terminal | Terminal selection |
| Settings | Advanced configuration |
| Brain | Context systems |
| Shield | Security/health indicator |
| Zap | Quick setup |
| ChevronRight | Expand/collapse |
| X | Close button |
| Loader2 | Loading spinner |
| CheckCircle | Success state |
| AlertTriangle | Warning state |
| FolderOpen | File picker |

---

## Design Requirements

### A. Layout & Structure
1. **Replace scrollable modal with a multi-step wizard** for `new-agent` and `setup` modes
2. **Keep single-page for `create` mode** — it's simple enough
3. **Step flow for wizard:**
   - Step 1: Name + Agent + Model Tier (the essentials)
   - Step 2: Terminal selection (create new / use existing)
   - Step 3: Context Systems (toggle cards with health indicators)
   - Step 4: Review & Create (system prompt preview, final settings)
4. **Use shadcn Dialog** as the modal wrapper instead of custom backdrop
5. **Add keyboard navigation** — Tab through fields, Enter to submit, Escape to close

### B. Visual Hierarchy
1. **Primary action** (Create/Start) must be visually dominant — use gradient + glow
2. **Section headers** use `text-sm font-semibold text-white` with accent color bar
3. **Labels** use `text-xs text-zinc-400 font-medium`
4. **Micro labels** use `text-[10px] text-zinc-500 uppercase tracking-wider`
5. **Context system cards** must show: name, health dot, item count, toggle, verify button
6. **System prompt preview** should be collapsible, not always visible

### C. Context System Cards (Major Redesign)
1. Each card shows: icon + name + health dot + item count + toggle
2. On hover: show tooltip with detailed health info
3. Click expand: show max tokens slider, last synced time, verify button
4. Loading state: skeleton card with pulsing placeholder
5. Empty state: "Not configured" with link to setup docs
6. Error state: red border + error message + retry button

### D. Context Map Visualization
1. Replace static SVG with interactive node graph
2. Nodes are clickable — toggle the connected system
3. Active connections glow, inactive are dim
4. Animated beams between connected systems (use Magic UI Animated Beam)
5. Token budget shown as a animated counter (use Magic UI Number Ticker)

### E. System Prompt Section
1. **Collapsible** — default collapsed in create mode, expanded in setup mode
2. **Layer indicators** — show which layers are active with colored dots
3. **Preview** — truncated with "Show more" toggle
4. **Edit** — textarea appears on click, not always visible

### F. Animations & Transitions
1. **Dialog entrance**: fade + scale from 95% to 100% (200ms ease-out)
2. **Step transitions**: slide left/right with fade (300ms ease-in-out)
3. **Section expand/collapse**: height animation with opacity (200ms)
4. **Toggle switches**: spring-like bounce on toggle (150ms)
5. **Card hover**: subtle lift + border glow (150ms)
6. **Loading skeletons**: pulse animation (1.5s infinite)

### G. Empty & Loading States
1. **No context systems**: show illustration + "Configure your workspace" CTA
2. **Loading systems**: skeleton cards with pulse
3. **System error**: red banner with retry button
4. **No terminal tabs**: show "No terminals open" with "Create one" link

### H. Responsive Behavior
1. **Desktop** (>768px): max-w-xl, 2-column grid for context systems
2. **Tablet** (<768px): max-w-md, single column
3. **Small** (<480px): full-width, stacked layout

---

## Constraints

1. **Must work with existing IPC endpoints** — no new backend needed
2. **Must preserve SessionConfig interface** — the output type cannot change
3. **Must support all 3 modes** — create, new-agent, setup
4. **Must use existing design tokens** — zinc-950/900/800 palette, cyan/pink accents
5. **Must be a single file** — NewSessionDialog.tsx (can extract sub-components within the file)
6. **Must not break existing functionality** — resume session, context systems, preview
7. **Dark mode only** — no light mode support needed
8. **Must use Geist + JetBrains Mono fonts**

---

## Output Format

Provide a complete, production-ready `NewSessionDialog.tsx` file with:
1. All sub-components extracted (StepWizard, ContextSystemCard, ContextMapPreview, SystemPromptPreview, etc.)
2. Proper TypeScript types for all props and state
3. All animations implemented with CSS transitions (not framer-motion)
4. All empty/loading/error states
5. Keyboard navigation support
6. Responsive design
7. Comments explaining key design decisions

The file must be self-contained and drop-in replace the current `src/components/NewSessionDialog.tsx`.
