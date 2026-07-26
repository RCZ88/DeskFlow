# PROMPT — Browser Tracking System Revamp

> Generated: 2026-07-11 | Cycle 164
> Target: Architect AI (external)
> Context Bundle: `agent/docs/browser-tracking-revamp/CONTEXT_BUNDLE.md`

---

## Raw Request

> "Browser tracking doesn't show on the stopwatch, poor tracking accuracy, no browser extension UI, no multi-profile/multi-browser support, no profile nickname configuration."

---

## Problem Statement

DeskFlow's browser tracking system is a single-browser, single-profile pipeline with no user-facing extension UI. The Chrome MV3 extension sends tab data to the Electron backend via HTTP POST to port 54321, but:

1. **Only one browser can be tracked at a time** — `browserWithExtension` is a single string that gets overwritten by each `browser-identify` call
2. **No distinction between browser profiles** — Chrome work vs personal are indistinguishable
3. **No extension popup** — user has zero visibility into what's being tracked from the extension side
4. **No profile management UI** — the `browser_profiles` DB table exists but has no IPC handlers or frontend
5. **Stopwatch doesn't show browser context** — shows category but not which browser/profile

The user wants a multi-profile, multi-browser tracking system with an extension popup and profile nickname configuration.

---

## Context Bundle Reference

Read `agent/docs/browser-tracking-revamp/CONTEXT_BUNDLE.md` first. It contains:
- Complete data flow (extension → HTTP server → main process → renderer)
- All state variables across extension, backend, and frontend
- Database schema (browser_profiles table exists but unused)
- All files involved with line numbers
- Current limitations and missing infrastructure

---

## Frontend Design Skills (MANDATORY — Load All 7)

The target AI MUST load and follow ALL of these design skills when designing any UI component:

1. **Frontend Design** — DeskFlow-specific component patterns, tokens, spacing, typography, glass cards. Dark zinc-950 base, pink-500 accent, Geist + JetBrains Mono fonts, 8px grid, glassmorphic cards with `bg-zinc-900/50 backdrop-blur-xl border border-zinc-800/50`.

2. **Human-Centric UX** — empty/loading/error states, progressive disclosure, visual hierarchy, feedback. Every data-driven component MUST have empty, loading, and error states.

3. **Impeccable** — 7 design dimensions (typography, color, spatial, motion, interaction, responsive, UX writing), 27 anti-patterns. Must pass all 7 dimensions for every component.

4. **Motion — Bring the UI Alive** — Liveliness Levels (L1 Composed / L2 Responsive / L3 Expressive), motion taxonomy, recipes. Use cubic-bezier easing, never spring physics in dev tools. Duration tokens: `--fast: 150ms`, `--normal: 250ms`, `--slow: 400ms`.

5. **UI UX Pro Max** — industry-specific design rules (dev tools, AI/ML, financial), style library. Extension popup follows dev-tools UI rules.

6. **Design Taste System** — master aggregator, design variance knobs, anti-repetition rules. Prevent same-y looking UI across components.

7. **frontend-external-infra** — source routing, re-skin rules, anti-slop checklist. Never design from zero — pull from MCP sources first.

---

## MCP Component Inventory (Query Before Designing)

The target AI MUST use real components from these MCP servers, not invent from scratch. Here is the actual inventory available:

### shadcn/ui (61 components available)

| Component | Use for in this project |
|-----------|------------------------|
| `card` | Profile cards, status cards in popup |
| `dialog` | Profile editor modal, settings dialog |
| `dropdown-menu` | Profile switcher, context menus |
| `switch` | Tracking on/off toggle |
| `badge` | Category badges (productive/neutral/distracting) |
| `tabs` | Popup tabs (Tracking / Profiles / Settings) |
| `select` | Browser/profile dropdown selectors |
| `input` | Profile nickname text field |
| `button` | All action buttons |
| `skeleton` | Loading states in popup and settings |
| `tooltip` | Hover info on icons and badges |
| `scroll-area` | Profile list scroll |
| `separator` | Section dividers |
| `popover` | Quick settings popover |
| `alert-dialog` | Delete profile confirmation |
| `progress` | Tracking progress indicators |
| `toggle` | Start/stop tracking toggle |
| `label` | Form labels |
| `spacer` | Layout spacing |

### Magic UI (77 components available)

| Component | Use for in this project |
|-----------|------------------------|
| `animated-beam` | Connection lines between browser → profile → DeskFlow |
| `border-beam` | Active profile card border glow |
| `number-ticker` | Animated duration counter in popup |
| `particles` | Background subtle particle effect in popup |
| `shimmer-button` | Primary action button shimmer |
| `blur-fade` | Smooth transitions between popup views |
| `magic-card` | Profile cards with spotlight hover effect |
| `animated-list` | Activity feed animations |
| `spotlight-card` | Active profile highlight |
| `glare-hover` | Hover effect on profile cards |
| `ripple` | Click feedback on buttons |
| `smooth-cursor` | Custom cursor in popup (optional) |
| `text-animate` | Animated text reveals |
| `confetti` | Celebration on profile creation |
| `animated-gradient-text` | Active tracking status text |

### Lucide Icons (1500+ available)

| Icon | Use for |
|------|---------|
| `Globe` | Browser/web indicator |
| `User` | Profile icon |
| `Settings` | Settings gear |
| `Play` / `Pause` | Tracking start/stop |
| `Monitor` | Browser type indicator |
| `Clock` | Duration display |
| `Tag` | Category tag |
| `ChevronDown` | Dropdown arrows |
| `Plus` | Add profile button |
| `Trash2` | Delete profile |
| `Pencil` | Edit nickname |
| `Check` | Active/selected indicator |
| `X` | Close/dismiss |
| `Shield` | Privacy/tracking status |
| `Wifi` / `WifiOff` | Connection status |
| `Brain` | Productive category |
| `Zap` | Distracting category |
| `Minus` | Neutral category |
| `ExternalLink` | Open in browser |
| `RefreshCw` | Sync/refresh |

### React Bits (135+ components available)

| Component | Use for |
|-----------|---------|
| `Fade Content` | Smooth content transitions |
| `Glare Hover` | Card hover effects |
| `Animated Content` | Entry animations |
| `Counter` | Duration counter |
| `Pixel Card` | Stylized profile cards (optional) |
| `Dock` | Bottom action bar in popup (optional) |

---

## Anti-Slop Checklist (MANDATORY — Block design if any fail)

After designing ANY UI component, the target AI MUST verify:

- [ ] **Type**: Geist body (13px), JetBrains Mono code. No third font introduced.
- [ ] **Color**: Uses DeskFlow tokens (`--accent-primary`, `--page-accent`, `--bg-primary`). NOT purple/indigo gradient-on-everything. Gradients are intentional and rare.
- [ ] **Geometry**: `rounded-xl` max (12px), `p-5` padding (20px). Never `rounded-2xl` or `rounded-3xl`.
- [ ] **Hero**: No tiny uppercase eyebrow pill + oversized headline + lone CTA cliché.
- [ ] **Sections**: No repeated tracked-uppercase kicker label above every heading.
- [ ] **Motion**: Real micro-interactions on key actions; respects `prefers-reduced-motion`.
- [ ] **Imagery**: Matches actual product; no filler glow/blobs.
- [ ] **Empty/loading/error states**: Exist and are styled using DeskFlow patterns (Skeleton, EmptyState).
- [ ] **Icons**: All from lucide-react. No emoji as UI icons. No inline SVG that duplicates existing lucide icon.
- [ ] **Accessibility**: Focus-visible rings use DeskFlow's `--page-accent` pattern.

---

## DeskFlow Re-Skin Rules (MANDATORY for all MCP-sourced components)

When pulling from any MCP source, MUST re-skin:

1. **Colors**: Replace source colors with DeskFlow CSS vars (`--bg-primary`, `--accent-primary`, `--text-primary`, etc.)
2. **Border radius**: Max `rounded-xl` (12px). Never `rounded-2xl` or `rounded-3xl`.
3. **Card padding**: Use `p-5` (20px). Never `p-6` or `p-8`.
4. **Fonts**: Body = Geist/Inter (13px). Mono = JetBrains Mono. Headings use weight (600), not different font.
5. **Dark mode only**: Strip any light-mode variants.
6. **Glass layer**: Use `glass` or `glass-heavy` classes instead of opaque backgrounds where depth is needed.
7. **Animation respects reduced motion**: Wrap any animation in `@media (prefers-reduced-motion: reduce)`.

---

## Engineering Mandate

Design a complete solution for multi-profile, multi-browser tracking. The solution must include:

### A. Database Schema Changes

Design the schema changes needed to support multi-profile tracking:
- Extend `browser_profiles` table or create new tables
- Add `profile_id` and `browser_name` columns to `logs` table for browser entries
- Design aggregate tables for per-profile analytics
- Include migration strategy (must not lose existing data)

### B. Extension Architecture Redesign

Redesign the Chrome MV3 extension (`browser-extension/background.js`) to support:
- **Profile identification**: How does the extension know which Chrome profile it's in? (Chrome extension APIs for profile detection)
- **Multi-browser registry**: How does each browser instance register itself with DeskFlow without overwriting others?
- **Profile switching**: How does the user switch profiles from the extension?
- **State persistence**: Extend the current `state` object to include profile info
- **Data payload changes**: What new fields go in POST `/browser-data` and POST `/browser-identify`?

### C. Extension Popup UI (High-Fidelity Visual Spec)

Design a complete extension popup (`popup.html` + `popup.js` + `popup.css`) using the MCP components listed above:

- Current tracking status (what page, category, duration)
- Profile selector / switcher dropdown (use shadcn `select` or `dropdown-menu`)
- Start/stop tracking toggle (use shadcn `switch` or `toggle`)
- Category indicator (productive/neutral/distracting) with color coding (use shadcn `badge`)
- Quick settings (exclude current domain, open DeskFlow settings)
- Loading state (use shadcn `skeleton`)
- Empty state (no profile configured)
- Error state (server disconnected)

Design must be clean, minimal, and match DeskFlow's dark theme aesthetic. Provide exact hex codes, pixel spacing, animation curves, and component composition.

### D. Backend IPC Handlers

Design the new IPC handlers needed in `src/main.ts`:
- `get-browser-profiles` — list all registered profiles
- `save-browser-profile` — create/update a profile nickname
- `delete-browser-profile` — remove a profile
- `set-active-profile` — switch the active tracking profile
- `get-browser-profile-stats` — per-profile analytics

Design the HTTP server changes:
- `/browser-identify` must support multi-browser registration (not overwrite)
- `/browser-data` must accept and store `profile_id` and `browser_name`
- `/foreground-app` must return info about which browser profile is active

### E. Frontend Profile Management UI

Design a settings UI section for managing browser profiles using MCP components:
- List of registered browser+profile combinations (use shadcn `card` with Magic UI `spotlight-card`)
- Nickname editor for each profile (use shadcn `input` + `dialog`)
- Active profile indicator (use Magic UI `border-beam` for active glow)
- Ability to merge, rename, or remove profiles (use shadcn `alert-dialog` for confirmations)
- Visual distinction between profiles in analytics
- Empty state when no profiles configured
- Loading state when fetching profiles

### F. Stopwatch Timer Integration

Design how the StopwatchTimer component changes:
- Show which browser profile is currently tracked (use Lucide `Globe` + `User` icons)
- Visual indicator (icon, color, label) for active profile
- Profile-aware productivity scoring
- Smooth transitions when switching between profiles (use React Bits `Fade Content`)

### G. Analytics Page Changes

Design how BrowserActivityPage changes:
- Filter by profile (use shadcn `select` or `tabs`)
- Per-profile breakdown charts
- Cross-profile comparison views

---

## Design Constraints

- Must be backward compatible — existing single-browser users must not break
- Extension must work on Chrome, Edge, Brave, Arc, Opera, Vivaldi, Firefox, Safari
- Profile detection must work without requiring user to manually enter profile IDs
- Extension popup must be fast (< 100ms load) and lightweight
- All new IPC channels must follow existing patterns in `src/preload.ts`
- Database migrations must be non-destructive
- The `browser_profiles` table already exists — use it, don't recreate it
- Profile nicknames must persist across extension reinstalls (stored in DB, not extension storage)

---

## Requirements Checklist

- [ ] Database schema for multi-profile support (with migration)
- [ ] Extension profile detection (Chrome profile API or fallback)
- [ ] Multi-browser registration (no overwrite)
- [ ] Extension popup UI (complete design with all states, using MCP components)
- [ ] Backend IPC handlers (CRUD for profiles)
- [ ] HTTP server changes (multi-browser data flow)
- [ ] Frontend profile management UI (using MCP components)
- [ ] Stopwatch timer profile integration
- [ ] BrowserActivityPage profile filtering
- [ ] Backward compatibility strategy
- [ ] Error handling and edge cases
- [ ] All components re-skinned to DeskFlow tokens
- [ ] All anti-slop checklist items passing
- [ ] All 7 design skills applied
