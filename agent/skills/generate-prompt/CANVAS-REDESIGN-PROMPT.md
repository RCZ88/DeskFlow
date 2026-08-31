# Canvas Mode Design Overhaul — LINIENT Prompt

> **Prompt Type:** design
> **Target AI:** claude
> **Detail Level:** high
> **Tone:** lenient, permissive, creative-freedom-first

---

## Your Task

Redesign the visual quality of an existing infinite canvas mode inside a desktop Electron + React + TypeScript app (RHEO / DeskFlow). The canvas is an AI assistant workspace where cards live on a pannable, zoomable grid.

**You have full creative freedom.** Improve whatever you think needs improving. The only constraint: keep the existing component structure and TypeScript types intact — you're reskinning, not rebuilding.

---

## What Exists Today

The canvas is a dark-mode-only infinite grid with glassmorphism cards. It already works — the architecture is solid. But the visual polish is inconsistent, some cards look generic, and the overall feel could be elevated.

### Architecture (don't change these)
- **Grid**: 40px cell, pan/zoom with mouse wheel + drag, snap-to-grid
- **Cards**: 14+ types (Focus, Plan, Finance, Digest, Reflect, Approval, Annotation, Group, Connectors, WeeklySchedule, DeadlineTracker, DailyPlanner, Dynamic, Automation), all rendered through a shared `CardFrame` wrapper
- **State**: Reducer-based (`canvasReducer` in `types/canvas.ts`), persisted to backend
- **Groups**: Cards can be grouped into colored containers with label, color picker, expand/collapse
- **Minimap**: SVG-based navigation minimap (bottom-right corner)
- **Manager Panel**: Sidebar for saving/loading/renaming canvas snapshots
- **Card Drawer**: Right-side slide-out panel for adding new cards (has mini previews per card type)
- **Command Palette**: Ctrl+K or `/` trigger, parses intents
- **Input Bar**: Bottom-center chat input with send/stop, voice input, `/` commands
- **Save Indicator**: Small floating pill showing save status

### Design Tokens (existing)
```css
--dk-bg-deep: #000000;
--dk-bg-base: #09090b;
--dk-bg-surface: rgba(9, 9, 11, 0.80);
--dk-bg-raised: rgba(24, 24, 27, 0.65);
--dk-bg-input: rgba(24, 24, 27, 0.85);
--dk-text-primary: #fafafa;
--dk-text-secondary: #a1a1aa;
--dk-text-muted: #71717a;
--dk-border-subtle: rgba(255, 255, 255, 0.06);
--dk-border-default: rgba(255, 255, 255, 0.09);
--dk-border-strong: rgba(255, 255, 255, 0.14);
--dk-accent: #fafafa;
--dk-success: #22c55e;
--dk-warning: #eab308;
--dk-danger: #ef4444;
--dk-shadow-sm/md/lg/glow (layered black + white-edge)
--dk-radius-sm: 6px / md: 10px / lg: 12px
--dk-cell: 40px
--dk-ease: cubic-bezier(0.16, 1, 0.3, 1)
--dk-sans: Inter / --dk-display: Space Grotesk / --dk-mono: JetBrains Mono
```

### Glass System (existing)
```css
.dk-glass { background: rgba(24,24,27,0.55); backdrop-filter: blur(20px) saturate(1.8); border: 1px solid rgba(255,255,255,0.08); }
.dk-glass-heavy { background: rgba(24,24,27,0.72); backdrop-filter: blur(40px) saturate(1.8); border: 1px solid rgba(255,255,255,0.10); box-shadow: 0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06); }
.dk-glass-card { background: linear-gradient(165deg, rgba(24,24,27,0.70) 0%, rgba(9,9,11,0.50) 100%); backdrop-filter: blur(24px) saturate(1.8); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; box-shadow: 0 4px 24px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.04), inset 0 1px 0 rgba(255,255,255,0.06); }
```

### Card Type Colors (minimap + drawer)
```
focus=#f472b6, plan=#a78bfa, reflect=#c084fc, finance=#34d399, digest=#22d3ee,
approval=#fbbf24, transient=#71717a, annotation=#fb923c, response=#60a5fa,
group=#818cf8, connectors=#2dd4bf, schedule=#f87171, deadlines=#f97316, planner=#38bdf8
```

---

## What to Improve (be creative — these are suggestions, not mandates)

### Cards
- The glass effect on cards is decent but could feel more premium. Consider: inner glow, subtle gradient shifts on hover, better light-refraction feel, stronger depth hierarchy between card types
- Card headers are plain — the type label + pin/dismiss buttons work but could be more visually interesting
- Empty states are functional but bland — make them feel like invitations, not dead ends
- Loading skeletons are generic — consider card-type-specific shimmer patterns
- Each card type should feel visually distinct while sharing the same design language

### Input Bar
- The bottom-center input is functional but could feel more like a command center — think Raycast-style command bar with depth, glow, and presence
- The send button and voice input could be more tactile
- Consider a subtle ambient glow or pulse when idle vs. active

### Canvas Background
- The dot-grid pattern is fine but could be more atmospheric — subtle radial gradient, noise texture, or animated particles at very low opacity
- The empty canvas state (no cards) should feel like a space ready to be filled, not a void

### Minimap
- Works but looks like a debug tool. Make it feel like a premium navigation element — glass background, rounded corners, smoother card representations

### Manager Panel
- The sidebar is functional but plain. Apply the glass system more aggressively — it should feel like a premium palette, not a settings menu

### Card Drawer
- The slide-out panel with mini previews is good. The previews themselves could be more polished — they're small but they're the first thing users see when choosing a card
- Consider subtle entrance animations per card type

### Group Cards
- Groups work well functionally. The color system (8 preset colors) is solid. The expand/collapse animation is smooth.
- Could benefit from: subtle gradient backgrounds per color, better visual distinction between the group container and its children

### Connectors Between Cards
- If cards can have visual connectors (lines/arrows between them), these should feel like neural pathways — animated, glowing, alive

### Typography
- The font stack (Inter / Space Grotesk / JetBrains Mono) is good. Make sure card content uses proper hierarchy — display numbers in Space Grotesk, body in Inter, code/data in JetBrains Mono

### Animations & Transitions
- Card entrance (when added) could be more satisfying — spring physics, scale-up from center
- Drag feedback could be richer — shadow intensifies, slight scale, border glow
- Hover states should feel responsive but not distracting
- Consider micro-interactions: button press depth, toggle animations, progress ring animations

---

## File Map (what to edit)

| File | Purpose | Edit? |
|------|---------|-------|
| `src/components/ai/design-tokens.css` | Token definitions, glass utilities, typography | YES — refine tokens, add new ones |
| `src/components/ai/canvas/canvas.css` | Canvas layout, grid, manager panel, minimap, input bar | YES — upgrade all of it |
| `src/components/ai/canvas/cards/cards.css` | All card styling (glassmorphism, headers, bodies, states) | YES — the main redesign target |
| `src/components/ai/canvas/shared/CardFrame.tsx` | Shared card wrapper (header + body) | Maybe — if frame structure needs changes |
| `src/components/ai/canvas/shared/StateView.tsx` | Empty/loading/error/populated states | Maybe — if state views need polish |
| `src/components/ai/canvas/CanvasInput.tsx` | Chat input bar | Maybe — if input design changes |
| `src/components/ai/canvas/CanvasMinimap.tsx` | SVG minimap | Maybe — if minimap needs structural changes |
| `src/components/ai/canvas/CanvasManagerPanel.tsx` | Save/load sidebar | Maybe — if panel layout changes |
| `src/components/ai/canvas/CardDrawer.tsx` | Add-card slide-out panel | Maybe — if drawer design changes |
| `src/components/ai/canvas/CommandPalette.tsx` | Ctrl+K command palette | Maybe — if palette design changes |
| `src/components/ai/canvas/GroupCard.tsx` | Group container | Maybe — if group visuals change |
| `src/components/ai/canvas/FindCardsArrow.tsx` | "Find cards" navigation arrow | Maybe — if arrow needs polish |
| `src/components/ai/canvas/SaveIndicator.tsx` | Save status pill | Maybe — if indicator needs polish |

**Priority**: Focus on the three CSS files first. Most visual improvement comes from CSS alone. Only touch component files if the DOM structure needs to change.

---

## Constraints

1. **Keep all existing TypeScript types and interfaces unchanged** — `CanvasCard`, `CanvasGroup`, `CardType`, `CardStatus`, `CanvasState`, `CanvasAction`, the reducer
2. **Keep all existing IPC handlers and data flow unchanged** — this is a visual-only redesign
3. **Keep the `--dk-*` token naming convention** — you can add new tokens or change values, but don't rename existing ones (other code depends on them)
4. **Keep the 40px cell grid system** — card positions and sizes are in grid units
5. **Keep the `StateView` 4-state pattern** (empty/loading/error/populated) — it's the right architecture
6. **Don't add new npm dependencies** — use only what's already installed (React, framer-motion, lucide-react, tailwind)
7. **Preserve all existing CSS class names** that are referenced in component TSX files — you can add new classes, but don't remove or rename existing ones without updating the corresponding TSX
8. **Keep the canvas dark-mode only** — no light mode support needed
9. **Maintain the component file structure** — don't merge or split files

---

## Output Format

Return your changes as:

1. **A summary** (3-5 sentences) describing the design direction you chose and why
2. **The complete updated CSS files** (`design-tokens.css`, `canvas.css`, `cards.css`) — full replacements, not diffs
3. **Any TSX changes** (only if needed) — full file replacements with a note on what changed
4. **A list of new CSS classes** you introduced and what they do

Be bold. Make it beautiful. The goal is "I can't stop looking at it."

---

## Inspiration (optional reference points)

- **Linear.app** — clean glass panels, subtle depth, premium feel
- **Raycast** — command palette UX, glow effects, command center vibe
- **Figma** — infinite canvas interaction model, minimap quality
- **Vercel Dashboard** — data cards with clarity and restraint
- **Arc Browser** — playful but precise, spatial navigation

Don't copy any of these wholesale. Use them as mood references.
