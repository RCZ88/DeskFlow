# PROMPT — Finance System Complete Fix

## Raw Request

"can we make sure that the autosaving feature actually shows up proeprly like it shows that its saving when it tries to save on its own"

"has the proper animation and ui ux frontend kslls evreything use the skills properly"

"also the dcards on the finance charts are a mess on the subscription inteligence and the wallet health scorecards"

"the problem with the Network persistent where there's like this plus Mount and then there's the percentage of the increase and the graph. I don't think it's working properly It's going to show in like 7,000 percent"

"the charts page There's so much error here. Nothing is working properly"

"the spending by categories also like kind of I don't know I think it's correct But the fact is that this follow true feature including the follow true feature. It doesn't work properly"

"then the cash flow Chart from the last six months. It's not showing it in a proper manner order"

"the liquidity waterfall It's not really explained what it is"

"the categories sub page Right, it's not each category is not showing the amount of Rupiahs"

"the people type and to make sure that if you were to Add a balance to a person or a people it should be included as a transaction"

"all the calculations of the Crypto all is working properly because currently the initial value is still wrong"

"the recalculate thing should also be calculating it properly"

## Context Bundle

Read `CONTEXT_BUNDLE.md` in this directory for full code context, schemas, and what was already fixed.

## Design Skills (MANDATORY — load and follow these)

Before generating ANY UI, load these skills and follow their rules:

### 1. Human-Centric UX (`agent/skills/humancentred-UIUX/SKILL.md`)
**6 Pillars (MUST apply all):**
1. **Clarity Over Cleverness** — plain language, no raw system tokens, primary action obvious in <1s
2. **Progressive Disclosure** — hide complexity, tabs/sections/accordions, one primary question per screen
3. **Visual Hierarchy** — weight/color/spacing for scanning, one focal point, muted metadata
4. **Complete State Coverage** — EVERY component needs Empty/Loading/Error/Populated states
5. **Feedback & Micro-interactions** — hover/focus/active/disabled, 150-300ms transitions, submit feedback
6. **Forgiveness & Affordance** — obvious clickable, 44px targets, inline validation, keyboard nav

### 2. Impeccable Design (`agent/skills/impeccable/SKILL.md`)
**7 Domain References:**
1. **Typography** — Geist + JetBrains Mono, modular scale 1.25, 45-75 chars/line
2. **Color** — HSL for dark themes, opacity layers, 3 accent max, 4.5:1 contrast
3. **Spatial** — 8px grid, density zones (high: 4-8px, medium: 12-16px, low: 24-48px)
4. **Motion** — duration scale (micro: 0-100ms, fast: 100-200ms, normal: 200-300ms), ease-out for feedback
5. **Interaction** — every element needs hover/focus/active/disabled, loading = spinner + opacity
6. **Responsive** — mobile-first, 4 breakpoints, 44px touch targets
7. **UX Writing** — direct, concise, action-oriented, "Save workspace" not "Save"

## Mandate

Design a COMPREHENSIVE fix for the ENTIRE finance system with PROPER UX.

### A. Auto-Save Visual Indicator
- Global save status in FinanceStickyHeader
- 4 states: saved/saving/unsaved/auto-saving with correct colors
- Smooth 200-300ms transitions
- Crypto asset auto-save has subtle indicator

### B. Chart Display Issues
- Subscription Intelligence: no double background, clean empty state
- Wallet Health: no double background, hide when 0 wallets
- Follow Through: per-category in doughnut
- Cash Flow: weekly/monthly toggle
- Liquidity Waterfall: labels and descriptions

### C. Calculation Issues
- Crypto initial value: show initial_balance (not max)
- Recalculate: same function for preview and apply
- People sync: create missing initial transactions

## Constraints
- Must work with existing chart.js setup
- Must handle encrypted fields
- Must preserve number masking
- Must stay within existing file structure
- No new IPC channels needed
- All animations must respect prefers-reduced-motion
