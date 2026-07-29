# AppBackground Refactor — Context Prompt

## What Changed

Particles (60 green, 45 blue, 35 red) and LightRays were extracted from `DashboardPage.tsx` into a **shared** `AppBackground` component at `src/components/AppBackground.tsx`.

```tsx
// AppBackground.tsx — fixed inset-0, pointer-events-none, z-[0]
export function AppBackground() {
  return (
    <div className="fixed inset-0 pointer-events-none z-[0]">
      <Particles quantity={60} color="#10b981" opacity={0.6} />
      <Particles quantity={45} color="#3b82f6" opacity={0.5} />
      <Particles quantity={35} color="#ef4444" opacity={0.4} />
      <LightRays color="rgba(160, 210, 255, 0.35)" blur={48} count={5} speed={18} />
    </div>
  );
}
```

It is rendered in `App.tsx` at the top of the app shell (line 2418), **before** the sidebar and `<Routes>`:

```tsx
<div className="flex h-screen overflow-hidden bg-[#121212] text-white">
  <AppBackground />
  {/* Sidebar */}
  <motion.div ...>
  {/* Route content */}
  <main ...>
    <Routes>...</Routes>
  </main>
</div>
```

The `AppBackground` sits behind **every route** as a global animated backdrop.

## The Problem

Before this change, most pages had **no animated background** — they rendered cards on a solid `#121212` or page-specific background. The Dashboard was the only page with Particles/LightRays, and its cards were visually tuned for that specific treatment.

Now every page inherits the animated particles + light rays. This creates two issues:

### 1. Card-heavy pages look visually cluttered
Pages where the UI is built from many cards, panels, or tabbed sections (e.g., Settings, Finance, IDE Projects, Stats) now have moving particles and light rays visible **between** and **behind** cards. Cards that were designed with their own `bg-zinc-900` or `bg-[#141417]` backgrounds look messy because the animated background peeks through the gaps and creates visual noise. The contrast between card edges and the moving background draws attention away from content.

### 2. Some pages have their OWN background
FinancePage renders its own `<AuroraBackground />` component. Having AppBackground particles AND AuroraBackground active simultaneously creates a double-background conflict.

## What Each Page Looks Like Now

| Page | Route | Card density | Has own bg? | Current visual issue |
|---|---|---|---|---|
| Dashboard | `/` | Low (hero + strips) | Was Particles/LightRays (now AppBackground) | Designed for particles — looks intentional |
| Stats | `/stats` | High (charts, table, cards) | No | Particles visible through card gaps |
| Browser | `/browser` | High (domain cards, grids) | No | Particles behind card grid |
| Productivity | `/productivity` | High (score cards, charts) | No | Particles behind glass cards |
| IDE Projects | `/ide` | High (project grid, AI tools) | No | Particles behind project cards |
| Finance | `/finance` | Medium-High (wallets, txns, charts) | AuroraBackground | Double background conflict |
| Settings | `/settings` | High (section panels, inputs) | No | Particles visible between sections |
| External | `/external` | Medium (activity grid) | No | Particles behind grid cells |
| Reports/Insights | `/reports` | Medium (tabs, charts) | No | Particles behind tab panels |
| Terminal | `/terminal` | Low (mostly terminal UI overlay) | No | Background mostly covered by dark terminal |
| Life | `/life` | Medium (photos, streaks) | No | Particles behind media/layout |
| Learn | `/learn` | High (cards, blocks) | No | Particles behind course cards |
| Focus | `/focus` | Low (minimal UI) | No | Probably fine as-is |
| Guide | `/guide` | Medium (doc-style) | No | Particles behind text |
| Database | `/database` | High (table, query panels) | No | Particles behind table |
| AI Assistant | `/ai` | Medium (chat, panels) | No | Particles behind chat area |

## Goal

Make the background system **per-page configurable** so that:

1. **Pages designed for particles** (Dashboard, Focus, Terminal, Guide) keep the full `AppBackground` as-is.
2. **Pages with conflicting backgrounds** (Finance with AuroraBackground) either suppress `AppBackground` or merge the two.
3. **Card-heavy pages** (Stats, Browser, Productivity, IDE Projects, Settings, Learn, Database, AI) get a **static overlay** — either a solid dark layer (`bg-[#121212]`) or a subtle gradient overlay on top of `AppBackground` — so the animated particles don't bleed through card gaps and create visual noise. Cards should feel grounded again.
4. **Any page** can opt into an alternative treatment (e.g., a dark vignette, a gradient mesh, a subtler particle set, or nothing at all).

## Approach

The cleanest solution is a **per-page overlay wrapper** that each page can optionally use:

```tsx
// Option A: Full animated background (default) — for Dashboard, Focus, Terminal
<PageContent>...</PageContent>

// Option B: Dark overlay on top of AppBackground — for card-heavy pages
<div className="relative">
  <div className="fixed inset-0 bg-[#121212]/90 z-[1]" /> {/* overlay */}
  <PageContent className="relative z-[2]">...</PageContent>
</div>

// Option C: Gradient overlay
<div className="fixed inset-0 bg-gradient-to-b from-[#121212]/60 via-[#121212]/80 to-[#121212] z-[1]" />
```

Or, `AppBackground` itself could accept per-page configuration:

```tsx
<AppBackground variant="full" />        {/* particles + rays */}
<AppBackground variant="subtle" />      {/* fewer particles, lower opacity */}
<AppBackground variant="overlay" />     {/* just a dark/gradient overlay */}
<AppBackground variant="none" />        {/* nothing */}
```

The page would declare its preference, and `App.tsx` would pass the right variant.

## Key Constraints

- `AppBackground` renders at `z-[0]` — it's already at the very bottom of the stacking context. An overlay would go at `z-[1]`, page content at `z-[2]`.
- The sidebar is at `z-[100]` (app sidebar) — overlay and content should stay below that.
- FinancePage's AuroraBackground needs to be reconciled — either it replaces AppBackground entirely for that route, or AppBackground is suppressed when AuroraBackground is active.
- Keep `pointer-events-none` so overlays don't block interactions.
- Don't break the Dashboard — it was the original owner of the particles and they should remain visible there.
