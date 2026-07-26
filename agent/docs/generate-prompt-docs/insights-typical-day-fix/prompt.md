# Prompt: Typical Day Section — Full Rework (Logic + UI/UX)

## Raw Request (verbatim)

> why si the typical day on the insights page not working properly for the original? whys si it only showing today and not the entire week the list of adays, also why is the data not loading , ican only see one square lit up. also, why is the stuff on the smooth ITS SWITCHED. THE SMOOT HIS THE ONES THAT SUPPOSED TO BE LIKE DOESNT HAVE THE DIFFERENT COMPOSITIONS. the soriginal is supposed to be the ones that have the splitting of the box to multiple differnet stuff. and its teh one that needs to show the data hover thing. the designand ui of thisese blocks are like bad. i need you to use the generate prompt tadn to use frontend skills and mcps for the ui ux of these.

---

## Context

Read the context bundle at `agent/docs/insights-typical-day-fix/CONTEXT_BUNDLE.md` (full code snippets, data structures, IPC endpoints, design tokens).

**What exists:**
- A single file `src/pages/InsightsPage.tsx` (~1624 lines) with the entire Insights page
- The "Typical Day" section has two toggle modes: **Original** and **Smooth**
- A backend IPC handler `get-typical-day` that returns a 7-day × 24-hour grid of multi-activity cells (averaged across weeks in the period)
- A client-side `originalDayData` computed from raw `logs`/`browserLogs` props (single day only)

**The core problem: The two view modes have their content swapped.**

| Mode | Currently Shows (WRONG) | Should Show |
|------|------------------------|-------------|
| **Original** | Single-day simple heatmap (1 row Today, emerald-only solid colors, minimal detail panel) | Multi-day complex grid (7×24, multi-activity gradient fills per cell, rich hover tooltip, consistency scores, activity overlays) |
| **Smooth** | Multi-day complex grid (7×24, gradient splits, rich tooltip, consistency, activity overlays) | Single-day smooth aggregated view (clean single-color heatmap, no composition splits, simpler design) |

**Additional bugs:**
- Original mode only renders "Today" row (1 of 7 days) — the full week is missing
- Data appears as "only one square lit up" because the single-day raw log data is sparse
- Rich hover tooltip is on Smooth instead of Original
- Activity name text overlays are on Smooth instead of Original
- Consistency scoring display is on Smooth instead of Original

---

## The Mandate

Design and specify a **complete rewrite** of the "Typical Day" section (lines 515-977 of InsightsPage.tsx) that:

1. **SWAPS the content** of Original and Smooth modes to their correct homes
2. **Fixes the data pipeline** — Original uses the backend 7×24 grid with multi-activity cells; Smooth uses the client-side single-day aggregated data
3. **Improves UI/UX significantly** using frontend component libraries (shadcn, Magic UI, Lucide) and design skills (human-centred UI/UX, motion design)
4. **Preserves all existing data** — every metric currently shown must still be shown in its correct mode

---

## Requirement Checklist

### A. Data Processing & Logic

1. **Swap data sources:**
   - **Original mode** → consumes `patchedTypicalDay` (from `window.deskflowAPI.getTypicalDay()` — the backend 7×24 grid)
   - **Smooth mode** → consumes `originalDayData` (computed from raw `logs`/`browserLogs` — single-day aggregate)
   - State variable `typicalMode` default should remain `'smooth'`

2. **Fix Original mode to render all 7 days:**
   - Remove the hardcoded single "Today" row (line 632)
   - Render `patchedTypicalDay.grid` — 7 rows (Sun-Sat) × 24 columns
   - Each cell shows multi-activity composition (gradient fills via linear-gradient)
   - Dominant activity name overlaid on each cell

3. **Move the rich hover tooltip to Original mode:**
   - The position-calculated tooltip (lines 902-941) with activity breakdown, consistency %, external/device badges
   - Uses `tooltip` state (day, hour, x, y, side)
   - Must show: `DAY_LABELS[day]`, `hourLabels[hour]`, activity list with percentage + formatted time, total, external/device badges, consistency score

4. **Move consistency scoring to Original mode:**
   - Per-cell consistency bar (bottom of each cell, width = score%)
   - Average schedule consistency stat
   - High/med/low color legend

5. **Smooth mode should be simpler:**
   - Single row of 24 cells (or clean timeline view)
   - Single-color intensity per cell (emerald gradient: 0/dim → max/bright)
   - No multi-activity splits, no activity text overlay, no consistency bars
   - Optional: clean detail panel on hover (like current lines 652-676 but more polished)

### B. Visual Design & UI (apply ALL available frontend skills)

**Design principles (apply ALL of these):**

1. **human-centred-UIUX skill** — cover all 4 states: empty, loading, error, populated. Include hover/focus/disabled states. Animate transitions with purpose. Humanize copy.

2. **frontend-external-infra skill** — pull real components from:
   - **shadcn** for standard UI blocks (cards, toggles, tooltips, badges)
   - **Magic UI** for animated effects (beams, particles, bento grids, text animations, backgrounds)
   - **Lucide** for all icons (no inline SVGs)
   - **motion-dev** or **React Bits** for animation patterns
   - **21st.dev** for unique polished component variations

3. **Re-skin all pulled components** to DeskFlow tokens:
   - Colors → `--bg-primary`, `--accent-primary`, `--page-accent` (#ec4899 for insights)
   - Radius → `rounded-xl` max
   - Font → `Geist` / `JetBrains Mono`
   - Glass → `var(--bg-glass)` with `backdrop-blur-xl`

**Visual requirements for each mode:**

**Original Mode (complex heatmap):**
- Header: Typography-rich title + date range description
- 3 stat cards at top (Total Hours avg, Most Active day, Peak Hour) — use GlassCard with page-accent pink accent rail
- Schedule Consistency: score ring/gauge + color legend
- 7×24 grid with:
  - Gradient-filled cells showing activity composition
  - Activity name overlay (truncated with tooltip on text overflow)
  - Consistency bar at cell bottom
  - Smooth hover transition (scale + ring)
  - Scrollable container for responsiveness
- Rich tooltip popup (fixed positioning, glass bg, backdrop blur)
- Legend pills + intensity scale
- Animated entrance (staggered cell appearance)

**Smooth Mode (simple single-day):**
- Clean, minimal design
- 3 stat cards (Total Hours, Peak Hour, Activities) — single-day stats
- Single row of 24 smooth cells with gradient intensity
- No splits, no text overlays, no consistency bars
- Polished detail panel on hover (right side, animated)
- Activity chips timeline below
- Legend + intensity scale (same as current but better styled)

### C. Interaction Design

1. **Original mode hover:**
   - Hover cell → show rich tooltip popup at calculated position
   - Tooltip follows cursor, repositions if near viewport edges
   - Smooth fade in/out (150ms)
   - Cell highlights with ring + scale

2. **Smooth mode hover:**
   - Hover cell → show detail panel (side panel or inline popover)
   - Animated slide-in from right
   - Show hour, total time, top activities

3. **Toggle between modes:**
   - Tab-style toggle (Original / Smooth) — current implementation is fine but needs restyling
   - Active tab gets pink accent (matching insights page-accent)

4. **Empty/Loading states:**
   - Smooth (no data today): gentle empty state with illustration
   - Original (backend not ready): skeleton animation matching grid shape
   - Error: subtle error badge with retry

### D. Required UI Improvements (anti-slop checklist)

- **Type:** No generic fonts — Geist for UI, JetBrains Mono for data
- **Color:** No purple gradients (overused) — use insights page accent `#ec4899` pink + zinc scale
- **Geometry:** `rounded-xl` max, consistent padding, clear hierarchy
- **Motion:** Purposeful transitions only (stagger on enter, smooth on hover, ease-out on exit)
- **Imagery:** No decorative illustrations unless they serve a purpose
- **Empty states:** No "No data" text — use contextual messages ("Track tomorrow to see your patterns")
- **Icons:** All from Lucide — no inline SVG or emoji as icons
- **Accessibility:** Focus-visible rings, proper contrast, aria labels on interactive cells

---

## Constraints

1. **Single file change** — all modifications go in `src/pages/InsightsPage.tsx`. No new files.
2. **No backend changes** — the `get-typical-day` IPC handler is already correct. Only frontend.
3. **CRLF line endings** — preserve. Do not mass-reformat.
4. **No removal of existing metrics** — every stat card, legend, and data point currently visible must remain in the corrected mode.
5. **Must work with existing imports** — no new npm packages. Use what's already installed (framer-motion, chart.js, react-chartjs-2, lucide-react, date-fns, tailwindcss).
6. **All new components must be inline** — no extracting to separate files unless it's a clearly reusable pattern.
7. **`--page-accent` for insights = `#ec4899` (pink)** — use consistently across both modes.

---

## Output Format

Provide a **single, complete implementation specification** for `src/pages/InsightsPage.tsx`. Include:

1. **Full replacement code** for lines 515-977 (the entire `{activeTab === 'typical' && (...)}` section)
2. **Any state changes** needed in the component's state declarations
3. **Style constants** (new gradient definitions, animation variants)
4. **Empty/loading/error state templates**

Do NOT offer options. Design the best version. The data pipeline logic must be correct (Original = backend grid, Smooth = raw logs). The UI must be production-quality using the skill ecosystem and MCPs listed above.
