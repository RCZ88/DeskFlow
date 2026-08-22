# CONTEXT_BUNDLE — Light Mode for DeskFlow (App Tracker)

> Self-contained context for the external AI. No repo access needed. Read with PROMPT.md.
> Evidence gathered 2026-08-19 from the live codebase.

## 1. App identity
- **Product:** DeskFlow "App Tracker" — Electron + React 18 + TypeScript desktop
  productivity/life tracker (RHEO). Renderer = vite build (Tailwind CSS v4), main =
  electron + better-sqlite3.
- **Charts:** Chart.js, lightweight-charts v5.2, vega-lite. **Terminal:** xterm.js + PTY.
  **Diagrams:** mermaid 11.16, Tabulator v6, katex.
- **Theme today:** DARK ONLY. No toggle, no `prefers-color-scheme`, no persistence.

## 2. src/index.css — THE token architecture (verbatim facts, gathered 08/19)
Single-line top: `@import "tailwindcss"; @import "./styles/finance-glass.css";
@custom-variant dark (&:is(.dark *));`

**@theme block 1 (workspace + misc):**
```
--ws-surface: #09090b;  --ws-surface-raised: #18181b;  --ws-border: rgb(39 39 42 / 0.6);
--ws-border-strong: rgb(63 63 70 / 0.6);  --ws-accent: #06b6d4;  --ws-radius-card: 0.5rem;
--color-clay-300..600 / sage-400 / amber-400 #fbbf24 / sky-400 / glow #f7f3ee;
--font-serif "Source Serif 4" / --font-sans Inter / --font-mono "JetBrains Mono" /
--font-display "Space Grotesk" / --font-caslon "Libre Caslon Text";
--resume-success #22c55e / warning #f59e0b / danger #ef4444 / info #3b82f6 /
--resume-score-high #16a34a / mid #ca8a04 / low #dc2626;
--resume-preview-bg: #ffffff; --resume-preview-text: #1a1a2e; --resume-highlight: #fef3c7;
--resume-accent: #6366f1;
```

**@theme block 2 (shadcn set — Tailwind v4 theme vars):**
```
--color-background: #09090b; --color-foreground: #fafafa;
--color-card: #18181b; --color-card-foreground: #fafafa;
--color-popover: #18181b; --color-popover-foreground: #fafafa;
--color-primary: #fbbf24; --color-primary-foreground: #09090b;
--color-secondary: #27272a; --color-secondary-foreground: #fafafa;
--color-muted: #27272a; --color-muted-foreground: #a1a1aa;
--color-accent: #27272a; --color-accent-foreground: #fafafa;
--color-destructive: #ef4444; --color-destructive-foreground: #fafafa;
--color-border: #27272a; --color-input: #27272a; --color-ring: #fbbf24;
```

**`@layer utilities` (hardcoded hex inside):** `.ws-range` bg #27272a, thumb border #09090b;
`.ws-scroll` thumb #3f3f46/hover #52525b; `.ws-tip` bg #18181b, border var(--ws-border),
color #e4e4e7.

**`:root` legacy token set (the one most components actually use):**
```
--bg-primary: #09090b; --bg-secondary: #18181b; --bg-tertiary: #27272a;
--bg-elevated: #2d2d31; --bg-glass: rgba(24,24,27,0.80); --bg-glass-heavy: rgba(24,24,27,0.92);
--text-primary: #f4f4f5; --text-secondary: #a1a1aa; --text-muted: #52525b; --text-disabled: #3f3f46;
--accent-primary: #ec4899; --accent-hover: #db2777; --accent-muted: rgba(236,72,153,0.15);
--accent-secondary: #22d3ee;
--success #34d399 / --warning #fbbf24 / --error #f87171 / --info #38bdf8 (+ -muted rgba 0.15);
--border-subtle #27272a / --border-default #3f3f46 / --border-active #52525b / --border-glass rgba(63,63,70,0.50);
--z-base 0 … --z-max 100; --ease-*; --fast/--normal/--slow;
--page-accent: var(--accent-primary);
```

**`[data-page]` accent map:** dashboard #ec4899, productivity #ec4899, stats #22d3ee,
browser #38bdf8, ide #8b5cf6, external #fbbf24, insights #ec4899, database #a78bfa,
settings #22d3ee, tutorial #34d399, finance #10b981.

**Body:** `background: var(--bg-primary); color: var(--text-primary);` font Inter 13px.
**Glass:** `.glass` = var(--bg-glass) + blur(16px) + var(--border-glass); `.glass-heavy`
= blur(24px). Scrollbars/selection read vars. Two more `@theme` blocks exist at
L86 (`@theme inline` animate-aurora) and L146 — keep untouched.

**TAILWIND v4 KEY FACT:** `bg-zinc-950` compiles to `background-color: var(--color-zinc-950)`.
The default zinc scale vars (`--color-zinc-50..950`) are emitted by Tailwind's theme; a
`.light` scope that redefines `--color-zinc-*` flips every hardcoded zinc utility app-wide.
Same for `--color-neutral-*`, `--color-gray-*` if used. This is the core strategy — verify
in `dist/assets/index.css` after building that the utilities reference `var(...)`.

## 3. Route / page inventory (App.tsx, HashRouter)
`/` Dashboard | `/activity` (tabs apps/productivity/websites; `/stats`, `/productivity`,
`/browser` redirect here) | `/ide` (+ AI Tools subpage) | `/external` | `/ai` (canvas +
chat + AiContextPanel/BrainChatPanel full-page subpages) | `/studio` (Overlay Studio +
Content Engine, mode toggle) | `/finance` (wallet/budget/subscriptions) | `/resume`,
`/resume-builder`, `/resume-preview`, `/resume-import`, `/resume-export` | `/guide` |
`/life` (tabs covenant/memories/gold/notes/self + river mode) | `/learn` (Lyceum) |
`/terminal` (Terminal Workspace) | `/reports` | `/database` | `/settings` | `/pricing` stub |
`/conductor` | not-found. Global: App.tsx sidebar rail + top bar + AppBackground.

## 4. Evidence — hardcoded dark surfaces (verified 08/19)
- **~470+ files** use hardcoded zinc utilities (grep `bg-zinc-9|text-zinc-9|border-zinc-9`
  matched hundreds of files; app is ~100% hardcoded — hence the token-flip strategy).
- **App.tsx**: sidebar rail + top bar use hardcoded darks (`bg-[#0b0b0f]`-style literals +
  zinc classes); global top bar ≈ L2662-2840 (h-16 glass, PageTitle + LIVE badge left,
  Focus/Total + period + timeline + time right).
- **OrbitSystem.tsx** (Dashboard): canvas bg `#0a0a0f`, gridlines `#3f3f46`, radial white
  glows, per-app color map — all hardcoded; needs a light register.
- **StopwatchTimer glow**: box-shadow with hardcoded rgba per tier (productive #10b981,
  distracting #ef4444, neutral #3b82f6, external #8b5cf6) — verify readability on light.
- **TerminalWindow.tsx** ~L120: xterm theme object hardcoded dark (fg `#e0e0e0`…).
- **src/components/learn/blocks/**: `mermaidLoader.ts` `theme: 'dark'`; `ChartBlock.tsx`
  vega `theme: 'dark'`; `TableBlock.tsx` Tabulator v6 (CSS-only theming — imports
  tabulator.min.css + tabulator_site_dark.min.css; v6 ignores `theme` option).
- **src/styles/finance-glass.css**: SEPARATE dark token file for the Finance page
  (glass wallet cards etc.) — needs its own `.light` overrides.
- **LivingSubstrate.tsx** (Life river): R3F Gray-Scott reaction-diffusion; props
  `variant: 'ambient' | 'morphogen'`, `ink` (display mode 2 in rd-display.glsl v6 —
  mono-ink `step(0.45,B)`, warm near-black `#131211`, NormalBlending — BUILT for light
  canvases), `maxAlpha`, `accent`, `organism`, `seedKey`, `cure`, `feedOffset`, `absolute`.
- **AppBackground.tsx**: Particles quantity 60/45/35 + LightRays count 5 speed 18 — the
  user's beloved design. NEVER replace/extend/redesign; optional subtle opacity in light.
- **Resume preview**: driven by `--resume-preview-bg: #ffffff` / `--resume-preview-text:
  #1a1a2e` — ALREADY light; keep white in both modes.

## 5. Persistence patterns (project invariants)
- ALL localStorage access wrapped in try/catch (hard invariant). Existing keys use
  simple string values (e.g. `df-sidebar-order`, `df-sidebar-collapsed`,
  `external-sleep-date`). New key: `df-theme` = 'light'|'dark'|'system'.
- Stable origin: production HTTP server on FIXED port 38123 (EADDRINUSE fallback) —
  localStorage persists across restarts.

## 6. Renderer/back-end boundary
- Light mode MUST be renderer-only: no IPC, no DB, no main-process changes, no new deps.
- CSP (injected by Electron main at runtime) already allows `'unsafe-inline'` styles —
  CSS-var approach is compatible. `'unsafe-eval'` present for vega.

## 7. Build / verification
- Build = `npx vite build` (renderer). Black-screen prevention: `#df-fallback` +
  inline safety-net script in index.html must never be affected by `.light`.
- Dist output: hashed `dist/assets/index.<hash>.js` + `.css`; verify `.light` block
  present in built CSS and that utilities emit `var(--color-zinc-*)`.

## 8. Design tokens to preserve
Geometry rounded-xl max, padding p-5, glass `backdrop-blur`, fonts Inter (sans) /
JetBrains Mono (mono) / Space Grotesk (display), page accents per `[data-page]` map,
amber `#fbbf24` primary. MCP inventory: shadcn, lucide, magicui, reactbits, motion-dev —
re-skin everything to project tokens.

## 9. REJECTED PRECEDENT — do NOT repeat
The **cream-canvas island** approach (LifePage v3.0: whole-page `#F4F3F0` canvas island +
`[data-page="life"]` token remap + ink register + serif hero) was **REJECTED by the user**.
Life stays on its normal dark theme WITH the amber morphogen substrate full-bleed.
Light mode = ONE app-wide theme, NEVER per-page cream overlays. The `[data-page="life"]`
cream remap must NOT be reintroduced.

## 10. Known risks
- Specificity fights between `.light` overrides and `@theme`-generated vars — test in
  built CSS.
- Charts/vega/mermaid render inside shadow-DOM-ish containers — theme must be set
  programmatically (mode prop or a `data-theme` attribute read by the chart blocks).
- `--ws-*` tokens used by both workspace chrome AND xterm panes — separate them so the
  panes can stay dark while chrome flips.
- Finance glass file has its own tokens — easy to miss.
- Reduced-motion / contrast: light theme must pass AA on all accent-on-paper combos.