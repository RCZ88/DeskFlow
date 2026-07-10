# ProductivityPage Redesign — RESULT

> Definitive, single-solution visual overhaul. Additive to the visual layer only.
> Matches the design system established in StatsPage + BrowserActivityPage RESULT.md.
> Page accent = emerald `#10b981`. Same glass depth, motion, and typography contracts.

---

## Overview

The ProductivityPage currently sits on the same flat glass plane as the pre-redesign Stats/Browser pages. This redesign applies the **3-tier glass depth system**, **emerald accent identity**, **gradient chart fills**, **count-up animations**, **radial-glow hovers**, and **shadcn components** to match the sibling Activity tabs.

---

## Phase 1: ProductivityPage Improvements

### 1. Header Row
- **Sticky glass header bar** (`--glass-1`, `sticky top-0 z-30`) with emerald icon chip + "Productivity" title + period label.
- **Colors:** icon chip `bg-[rgba(16,185,129,0.14)]` icon `#10b981`; title `#fafafa`; period label `#71717a` mono.
- **Motion:** header `enter` (y:12→0, 0.4s).

### 2. Productivity Score Hero Card
- **Before:** flat card with circular score. After: **elevated hero** on `--glass-2` with the circular score rendered as a **gradient ring** (emerald→teal), the score value in large mono `font-bold font-mono tabular-nums`, and the comparison badge with emerald/red accent.
- **Colors:** score ring gradient `#10b981`→`#14b8a6`; score value `#fafafa`; comparison badge uses existing emerald/red logic.
- **Motion:** score value uses **NumberTicker** count-up on mount + period change. Card `enter` with stagger.
- **Glass depth:** `--glass-2`; hover border-glow with emerald wash.

### 3. Time Breakdown Cards (4: Productive / Neutral / Distracting / Total)
- **Before:** flat colored cards. After: **stat tiles** matching Stats §6 pattern — icon chip, **mono value** with NumberTicker, uppercase label, hover border-glow.
- **Colors:** Productive `#10b981`, Neutral `#3b82f6`, Distracting `#ef4444`, Total `#a1a1aa`. Each 14% bg / full icon.
- **Typography:** value `text-2xl font-bold font-mono tabular-nums`; label `text-[11px] uppercase tracking-[0.08em] text-zinc-500`.
- **Motion:** cards `enter` staggered 0.05. Values count-up. Hover wash.

### 4. App vs Website Comparison
- **Before:** flat comparison. After: **dual stat tiles** with icon chips (Monitor for apps, Globe for websites), mono values, score badges with emerald/red accents.
- **Colors:** Apps `#6366f1`, Websites `#3b82f6`. Score badges use emerald (≥70), amber (40-70), red (<40).
- **Motion:** tiles `enter` with stagger. Values count-up.

### 5. Daily Trend Chart
- **Before:** flat line chart. After: **gradient-filled area chart** with emerald gradient, glassBackdrop plugin, restyled tooltip.
- **Colors:** line stroke `#10b981` `borderWidth:2`; area fill gradient emerald 90%→10%; grid `rgba(255,255,255,0.04)`; ticks `#71717a` mono.
- **Chart polish:** `tension:0.4, pointRadius:0, pointHoverRadius:4, fill:true`; gradient via `makeGradient(ctx, '#10b981')`; `sharedScales`; `sharedTooltipStyle`.
- **Motion:** chart.js `duration:600, easing:'easeOutQuart'`.

### 6. Tier Distribution Pie
- **Before:** flat pie. After: **donut** (cutout 64%) with glassBackdrop + centerText plugin showing productivity score.
- **Colors:** Productive `#10b981`, Neutral `#3b82f6`, Distracting `#ef4444`; separators `#0a0a0a`.
- **Chart polish:** `cutout:'64%'`, centerText plugin, restyled tooltip, JetBrains Mono legend.

### 7. Time Breakdown Stacked Bar
- **Before:** flat stacked bars. After: **gradient-filled stacked bars** with borderRadius 6, per-tier gradient fills.
- **Colors:** Productive gradient `#10b981`, Neutral gradient `#3b82f6`, Distracting gradient `#ef4444`.
- **Chart polish:** `borderRadius:6, borderSkipped:false, categoryPercentage:0.7, barPercentage:0.8`; gradient via `makeGradient`; `sharedScales`.

### 8. Peak Hours Section
- **Before:** flat display. After: **stat tiles** for most/least productive hours with mono values, emerald/red accents.
- **Colors:** Most productive `#10b981`, Least productive `#ef4444`.
- **Motion:** tiles `enter` with stagger.

### 9. Sessions List
- **Before:** flat list. After: **rank-led rows** matching Stats §5 pattern — mono timestamp, tier badge (emerald/blue/red), name, mono duration.
- **Colors:** tier badges emerald/blue/red at 14% bg / full text; timestamps `#52525b` mono; duration `#fafafa` mono.
- **Motion:** rows `enter` staggered. Hover wash.

### 10. Tier Breakdown Sections (Productive / Neutral / Distracting items)
- **Before:** flat expandable sections. After: **accordion** with category badges, mono totals, hover glow.
- **Colors:** section headers match tier colors; items show category badge + mono duration.
- **Motion:** accordion children fade + translateY stagger.

---

## Shared Patterns (from RESULT.md Phase 3)

- **DotPattern** background at `opacity-[0.04]` behind page
- **Radial-gradient hover glow** on all interactive cards
- **NumberTicker** on all numeric summary values
- **makeGradient** canvas fills on all charts
- **sharedScales** + **sharedTooltipStyle** on all charts
- **glassBackdrop** plugin on all charts
- **centerText** plugin on donut charts
- **Uppercase labels** `text-[11px] uppercase tracking-[0.08em]`
- **Font-mono tabular-nums** on all data values
- **BorderBeam** on detail modals (if any)
- **Embedded prop** for ActivityPage integration

---

## Anti-Slop Checklist

| # | Item | Status |
|---|------|--------|
| 1 | No generic/unre-skinned components | ✅ |
| 2 | No raw default shadows | ✅ |
| 3 | No over-rounded corners | ✅ |
| 4 | No rainbow/arbitrary colors | ✅ |
| 5 | No layout-thrash animation | ✅ |
| 6 | No motion without reduced-motion guard | ✅ |
| 7 | No font soup | ✅ |
| 8 | No icon guessing | ✅ |
| 9 | No missing states | ✅ |
| 10 | No effect repetition / slop | ✅ |
