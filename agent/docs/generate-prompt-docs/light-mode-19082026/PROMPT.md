# LIGHT MODE — Build Prompt (Design Lead AND Engineer → RESULT.md)

> Package: `agent/docs/generate-prompt-docs/light-mode-19082026/`
> Created: 2026-08-19 | Target: external AI (Architect) | Companion: CONTEXT_BUNDLE.md (self-contained)

## 0. RAW REQUEST (verbatim — do not lose this)
```
MAKE A LIGHT MODE. GENERATE A PROMPT FOR EVERY PAGE CASES THAT MIGHT BE DIFFICULT
OR DIFFERENT ON HOW TO DO SO. MAKE SURE TYOU PUT EAHC PAGE EACH DIFFERNET PAGE
INTO OCNSIDERATION
```

## 1. MISSION
You are the **Design Lead AND Engineer** for a full **app-wide Light Mode** in the DeskFlow
Electron desktop app ("App Tracker"). This is a THEME ADDITION, not a redesign:
- **Dark stays the default.** Nothing in dark mode may change visually.
- Light mode = an opt-in toggle that must keep EVERY page coherent, readable, and faithful
  to the existing dark design language (same geometry, accents, glass, typography).
- Every single page must be considered (see §6 matrix — this is the user's explicit demand).

## 2. CONTEXT SUMMARY (CONTEXT_BUNDLE.md is self-contained — read it first)
- Electron + React 18 + Tailwind CSS v4 (vite build) + Chart.js + lightweight-charts +
  xterm.js + mermaid 11 + vega-lite + Tabulator v6 + better-sqlite3.
- The app has **ZERO theme infrastructure today**: one dark token set in `src/index.css`
  (`:root` custom props + two `@theme` blocks + `@custom-variant dark (&:is(.dark *))` which
  is never toggled), plus ~470 files with hardcoded Tailwind zinc utilities
  (`bg-zinc-950`, `text-zinc-400`, glass `rgba(24,24,27,0.80)` …) and hardcoded dark themes
  inside canvas/WebGL/chart/terminal components.

## 3. THE STRATEGY (mandatory — do not deviate)
**Tailwind v4 emits `var()` references** — `bg-zinc-950` compiles to
`background-color: var(--color-zinc-950)`. Therefore:

> **Redefine the `--color-zinc-*` scale AND the custom `:root` token set under a `.light`
> scope. One CSS block recolors ~95% of the app. Do NOT mass-rewrite components to
> `dark:` variants. Do NOT add a `dark:` to every class.**

- `:root` (and the `@theme` blocks) stay EXACTLY as they are = dark default.
- `.light` scope redefines: `--color-zinc-*` 950..50 inverted, `--color-neutral-*`,
  the shadcn token set (`--color-background/foreground/card/popover/muted/accent/border/
  input/ring/…`), the legacy `--bg-*`/`--text-*`/`--border-*`/`--accent-*` set, `--ws-*`
  (terminal workspace), `--dk-*` if present (deck), and the `[data-page]` accent map
  (keep hues, soften for light backgrounds).
- `body`, `.glass`, `.glass-heavy`, scrollbars, `::selection` already read `var()` — they
  flip for free.
- Verify in the BUILT CSS (`dist/assets/index.css`) that `.light` overrides actually win
  (specificity: `:root.light` / `.light` with equal-or-higher specificity, placed after
  the base tokens).

## 4. DELIVERABLES — ENGINEERING

### 4.1 Theme toggle + persistence (renderer-only, NO new deps, NO IPC, NO DB)
- Settings → **General** (or a new "Appearance" section): **Light / Dark / System**
  segmented control (System = `prefers-color-scheme`, nice-to-have).
- localStorage key `df-theme` = `'light' | 'dark' | 'system'` — **try/catch wrapped**
  (project hard invariant).
- Apply by toggling `.light` on `document.documentElement` (instant, no reload).
- `matchMedia('(prefers-color-scheme: light)')` listener for System; keep the existing
  `.dark` custom-variant working for any component that uses `dark:` variants.
- Optional nice-to-have: quick Sun/Moon toggle in the global top bar (App.tsx), synced
  with Settings.

### 4.2 Special surfaces (the difficult/different cases — each needs a plan)
1. **OrbitSystem.tsx (Dashboard 3D canvas)** — hardcoded dark: bg `#0a0a0f`-ish, gridlines
   `#3f3f46`, white radial glows, per-app color map. Needs a **light register**: pass a
   theme or read CSS vars (light canvas bg, dark-ink grid `rgba(0,0,0,.10)`, accent glows).
2. **LivingSubstrate.tsx (Life river RD texture)** — already ships an **`ink` display
   register** (`rd-display.glsl` v6 mono-ink: warm near-black `#131211` on light, straight
   alpha, NormalBlending) built exactly for light canvases. In light mode mount
   `variant="morphogen" ink` (dark coral ink on light paper) — or a lighter amber register;
   keep alpha ≤ 0.5. Never let the texture overpower the page.
3. **TerminalWindow.tsx (xterm)** — hardcoded dark theme object (~L120, fg `#e0e0e0`).
   RECOMMENDATION: keep terminal PANES dark in BOTH modes (agent TUIs / LLM CLIs render
   poorly on light); workspace chrome (sidebar, sub-tab bar, headers, `--ws-*`) follows
   the theme. Justify any deviation in RESULT.md.
4. **Learn blocks (Lyceum)** — `mermaidLoader.ts` hardcodes `theme: 'dark'`, ChartBlock.tsx
   hardcodes vega `theme: 'dark'`, Tabulator v6 is CSS-only (currently imports the dark
   stylesheet). Make these theme-aware: mermaid `'default'` in light, vega config swap,
   Tabulator light stylesheet under `.light` (or toggle an import). HIGH-RISK: dark default
   must stay pixel-identical.
5. **Chart.js / lightweight-charts** — small `chartTheme(light)` helper: axis/grid/tooltip
   colors per mode. All charts across Dashboard/Activity/IDE/Reports/Database/Finance.
6. **Resume preview** — ALREADY LIGHT (`--resume-preview-bg: #ffffff`) and MUST STAY WHITE
   in both modes (do not invert it); builder UI follows the theme.
7. **AppBackground (particles + light rays)** — USER MANDATE: never replace/extend/redesign.
   In light mode keep the same design; optional subtle opacity reduction only.
8. **SVG/icons with hardcoded dark fills** — switch to `currentColor` or CSS vars where
   found.

## 5. HARD CONSTRAINTS (bind — zero-tolerance)
- **Dark is DEFAULT; dark mode is pixel-unchanged** (regression gate: compare before/after).
- **No new npm dependencies.**
- **Renderer-only**: no IPC changes, no DB schema changes, no main-process changes.
- localStorage access ONLY inside try/catch.
- The `.light` class must never affect `#df-fallback` / the inline safety-net script
  (black-screen prevention) — the app must still render real content in both themes.
- Every UI state — empty / loading / error / populated — must be readable in light mode
  (humancentred-UIUX 6 pillars).
- Keep files CRLF; no mass-reformatting.
- Do NOT reintroduce the rejected cream-canvas island approach (see CONTEXT_BUNDLE §9).

## 6. PER-PAGE MATRIX (EVERY page — one section per page in RESULT.md)
| # | Page | Special difficulty |
|---|------|--------------------|
| 1 | **Global chrome** (all pages) | App.tsx sidebar rail + top bar (PageTitle/LIVE/Focus/Total/timeline) hardcoded darks; AppBackground NEVER replaced (only optional opacity); verify all hardcoded `bg-[#…]` in App.tsx |
| 2 | **Dashboard `/`** | OrbitSystem 3D canvas light register; StopwatchTimer glow box-shadows hardcode rgba → tokenize; heatmap, RecentSessions, gap banner |
| 3 | **Activity `/activity`** (+ /stats /productivity /browser redirects) | Chart.js theme helper; app table; Live Detection debug panel (collapsed) |
| 4 | **IDE `/ide`** (AI Tools subpage) | project grid; AI usage charts/heatmap/model timelines (Chart.js) |
| 5 | **External `/external`** | Activity Mosaic treemap (grid.ts color math — keep hue hash, fix text ink); Sleep Patterns; gaps list + GapFillModal; Manual Time (moved to Activity page per decision) |
| 6 | **AI `/ai`** | canvas board (CanvasCard/CanvasGrid hardcoded bg — verify + tokenize); chat panel; deck `--dk-*` tokens; AiContextPanel + BrainChatPanel full-page subpages (glass) |
| 7 | **Studio `/studio`** | Overlay Studio + Content Engine workspace (8 tabs); deck tokens; ScriptProofCard/score chips contrast |
| 8 | **Finance `/finance`** | **`src/styles/finance-glass.css` is a SEPARATE dark token file** — needs its own `.light` overrides; wallet/budget/charts/subscriptions/recaps; NumberTicker/masks unaffected |
| 9 | **Resume `/resume*`** | builder dark (tokens); **preview stays white in both modes** (special case) |
| 10 | **Life `/life`** | pages-mode tabs (Covenant/Memories/Gold/Notes/Self): tokens + warm accents; RIVER mode: LivingSubstrate `ink` register; RingCanvas; PhaseCards; Gold warmth; self tab (ProfileTab/ContextGraphView/BrainManagementView) |
| 11 | **Learn `/learn` (Lyceum)** | mermaid `theme:'dark'`→'default'; Tabulator v6 light CSS; vega ChartBlock `theme:'dark'`→config swap; katex; blocks; HierarchyGuide; OnboardingPanel |
| 12 | **Terminal `/terminal` (Workspace)** | xterm keep dark both modes (recommended); `--ws-*` chrome follows theme; ws-scroll/ws-range/ws-tip hardcoded hex → vars |
| 13 | **Reports `/reports`** | InsightsPage Day/Weekly/Activities tabs; Chart.js |
| 14 | **Database `/database`** | table browser + analytics; chart defaults |
| 15 | **Settings `/settings`** | the toggle lives here; Category/Colors/Tracking/Prompts tabs |
| 16 | **Stubs** (guide/help/pricing/conductor/not-found) | tokens only |
| 17 | **Modals/overlays/toasts (app-wide)** | SleepDetectionModal, GapFillModal, NewSessionDialog, AFK/MissedTimePanel, GlobalSearch/CommandPalette, context menus, toasts — flip via `--bg-glass`/tokens; verify every modal |

## 7. DESIGN MANDATE (Lead Designer)
- **Same design, light register**: same geometry (rounded-xl max, p-5), same page accents,
  same glass blur, same typography (Inter / JetBrains Mono / Space Grotesk). No new visual
  language, no AI-slop (no purple gradients, no generic blue heroes).
- Palette direction: warm-neutral paper `#f7f7f5→#fafafa`, ink text `#1c1917/#18181b`,
  page accents kept but **contrast-checked for light** (WCAG AA 4.5:1 body, 3:1 large/UI).
- Follow humancentred-UIUX skill: all 4 states, hierarchy, feedback, humanized copy.
- Light mode must look *intentional*, not "inverted by mistake".

## 8. RESULT.md FORMAT (mandatory)
1. Summary + toggle spec (where it lives, persistence, System option).
2. **index.css token diff** — the exact `.light` block(s) (zinc inversion + legacy tokens +
   ws/dk + accent remap), verbatim, ready to paste.
3. **Per-page section** — ONE section per page from §6 matrix: what changed, what was
   verified, deviations + why.
4. Special-surface deltas (OrbitSystem register, LivingSubstrate ink mount, xterm decision,
   mermaid/tabulator/vega theming, chartTheme helper) — exact code.
5. Build/verification evidence: `npx vite build` OK, dark-regression check, per-page light
   notes (screenshots where possible).
6. Deferred items + why.

## 9. ACCEPTANCE CRITERIA
- ONE toggle flips every route above to a readable, coherent light theme.
- Dark mode is pixel-unchanged. No new dependencies. Build clean.
- The running Electron app must show real content in both themes (no black screen).

## 10. DESIGN SKILLS / MCP INVENTORY (use them — never design from zero)
- humancentred-UIUX, frontend-design, impeccable, frontend-external-infra (shadcn MCP,
  lucide-icons-mcp, magicui, reactbits, motion-dev) — but re-skin to THIS project's tokens.
- Anti-slop checklist (type/color/geometry/hero/section labels/motion/imagery/empty states/
  icons/accessibility) applies to all new light-mode UI.