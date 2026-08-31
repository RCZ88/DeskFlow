# Context Handoff — RHEO "The Current" Design System (2026-08-23)

## 1. TL;DR / Mission

RHEO needs a signature motion system called **"The Current"** — a persistent directional pulse that represents the user's life as a continuous process across all pages. A Specialist AI designed the architecture. An attempt to implement it as a global `<RheoCurrent />` canvas overlay **broke the sidebar and topbar**. The overlay must be removed and the design implemented correctly — as per-page visual elements, NOT a global overlay.

## 2. Current Status

- **RheoCurrent component** was created at `src/components/rheo-current/` but **must NOT be mounted** — it breaks the sidebar and topbar
- **AppBackground.tsx** was restored to git HEAD (works correctly)
- **App.tsx** has RheoCurrent import/render removed (only change from HEAD)
- **CurrentSpine.tsx** exists at `src/components/CurrentSpine.tsx` (unused, was about to be tested)
- **Backup** at `agent/backups/20260823-025653-rheocurrent-pre/`
- **Design source**: backandforth collaboration package at `agent/docs/backandfourth-docs/tugo-signature-motion/`
- **Build**: passes (`npx vite build`)

## 3. Key Decisions & Rationale

### The Current Concept (from Specialist AI)
- **NOT a background effect** — a persistent visual entity
- **NOT replacing LivingSubstrate** — two-layer model:
  - LivingSubstrate = "RHEO is alive" (ambient, WebGL, organic)
  - The Current = "RHEO is moving" (semantic, Canvas 2D, directional)
- **Per-page interpretation** — same pulse, different topology per page
- **Pulse phase persists** across route changes — geometry changes, phase doesn't
- **10 mechanics become semantic renderers** — not10 separate backgrounds

### Page Topology Map
| Page | Topology | Visual |
|------|----------|--------|
| Dashboard | `stream` | horizontal timeline + pulse + event deviations |
| Life | `network` | self + people/goals branches |
| Finance | `flow` | income/expense streams |
| Activity | `signal` | parallel temporal traces |
| IDE | `mechanical` | gear rotation |
| Database | `partition` | Voronoi regions |
| AI | `cellular` | grid evolution |
| Settings | `redaction` | masking zones |

### What Broke
- Mounting `<RheoCurrent />` as a sibling to AppBackground inside the flex container caused the sidebar and topbar to be covered/broken
- The canvas element (`fixed inset-0 z-[0] pointer-events-none`) visually interfered with the layout despite being "behind" everything
- **Lesson**: global canvas overlays inside flex containers can break layout. The Current must be per-page, inline elements.

## 4. Constraints & Gotchas

- **NEVER mount a full-screen canvas overlay** as a sibling to the sidebar — it breaks the sidebar and topbar
- **AppBackground.tsx** is the working ambient layer — do not modify it for The Current
- **LivingSubstrate** stays as ambient background — The Current does NOT replace it
- **This project is called RHEO** — never TURGO
- **Particles** in AppBackground are required — removing them breaks the visual hierarchy
- **LightRays** props: `color="rgba(160, 210, 255, 0.35)" blur={48} count={4} speed={12}` — do not omit color/blur
- Build command: `npx vite build` (takes ~1.5min)
- Backup location: `agent/backups/20260823-025653-rheocurrent-pre/`

## 5. Artifacts & References

| File | Purpose |
|------|---------|
| `agent/docs/backandfourth-docs/tugo-signature-motion/INITIAL_PROMPT.md` | Design brief with embedded source code |
| `agent/docs/backandfourth-docs/tugo-signature-motion/CONTEXT_BUNDLE.md` | Full codebase reference |
| `agent/docs/backandfourth-docs/tugo-signature-motion/CONVERSATION_PROTOCOL.md` | Back-and-forth relay rules |
| `agent/docs/backandfourth-docs/tugo-signature-motion/CONTEXT_GAPS.md` | Open questions |
| `agent/docs/backandfourth-docs/tugo-signature-motion/conversation/round-01.md` | Specialist AI's "The Current" design |
| `agent/docs/backandfourth-docs/tugo-signature-motion/conversation/RESULT.md` | Architecture spec |
| `agent/docs/motion_site_mechanics_10/*.html` | 10 visual mechanic references |
| `src/components/rheo-current/` | Dead code — do NOT mount |
| `src/components/CurrentSpine.tsx` | Unused per-page spine component |
| `agent/backups/20260823-025653-rheocurrent-pre/` | Pre-change backup |

## 6. State of the Code

### Working files (git HEAD):
- `src/components/AppBackground.tsx` — ambient layer (LivingSubstrate + Particles + LightRays + ambient patterns)
- `src/App.tsx` — main app shell, RheoCurrent removed, everything else at HEAD

### Dead code (exists but not imported):
- `src/components/rheo-current/` — 8 files (types, clock, transition, entities, renderer, RheoCurrent, index)
- `src/components/CurrentSpine.tsx` — per-page canvas component

### Design source files:
- `agent/docs/motion_site_mechanics_10/morphogen.html` — reaction-diffusion
- `agent/docs/motion_site_mechanics_10/adjacent.html` — force-directed graph
- `agent/docs/motion_site_mechanics_10/overpass.html` — orbital motion
- `agent/docs/motion_site_mechanics_10/nearside.html` — Voronoi
- `agent/docs/motion_site_mechanics_10/freeboard.html` — contour fields
- `agent/docs/motion_site_mechanics_10/headway.html` — flow field
- `agent/docs/motion_site_mechanics_10/foreshock.html` — signal traces
- `agent/docs/motion_site_mechanics_10/quorum.html` — cellular automaton
- `agent/docs/motion_site_mechanics_10/harmonic.html` — mechanical gears
- `agent/docs/motion_site_mechanics_10/deident.html` — progressive redaction

## 7. Open Tasks / Next Actions

1. **Delete dead code**: Remove `src/components/rheo-current/` and `src/components/CurrentSpine.tsx`
2. **Implement The Current correctly**: Per-page canvas elements INSIDE each page component, NOT as a global overlay
3. **Start with Dashboard**: Add a horizontal timeline canvas behind the main content area
4. **Then Life**: Add a network graph behind the CoreSample/River section
5. **Then Finance**: Add flow streams behind the overview section
6. **Then Activity**: Add signal traces behind the stats section
7. **Each page canvas**: `absolute inset-0 pointer-events-none`, rendered inside the page's own container, NOT as a global sibling

## 8. Glossary

| Term | Meaning |
|------|---------|
| The Current | Persistent directional pulse — the signature motion system |
| LivingSubstrate | Existing WebGL reaction-diffusion background (stays) |
| CurrentSpine | Attempted per-page component (unused) |
| RheoCurrent | Attempted global overlay (broken, must not be mounted) |
| Topology | The shape/structure of The Current on each page |
| Phase | The pulse position (0-1), persists across navigation |
| Specialist AI | External AI that designed The Current architecture |

## How to Resume

1. Read `agent/docs/backandfourth-docs/tugo-signature-motion/conversation/round-01.md` for the full design
2. Read `agent/docs/backandfourth-docs/tugo-signature-motion/conversation/RESULT.md` for the architecture
3. Delete `src/components/rheo-current/` and `src/components/CurrentSpine.tsx`
4. Implement The Current as **per-page inline canvas elements** — never as a global overlay
5. Start with Dashboard, then Life, then Finance, then Activity
6. Test build after each page: `npx vite build`
