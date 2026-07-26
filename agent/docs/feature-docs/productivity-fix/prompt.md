# ProductivityPage.tsx — JSX Syntax Fix Prompt

## Raw Request

> "use generate prompt skill to fix this productivity file error thing"

## Problem Statement

`src/pages/ProductivityPage.tsx` has 4 JSX syntax errors that block the vite build. The entire application cannot compile because of this single file. The errors were introduced by a previous agent who added hover effect wrapper divs inside a `<GlassCard>` but never added the matching closing tags.

## Context Bundle

Read `CONTEXT_BUNDLE.md` in this directory for the exact line-by-line breakdown of what's broken and why.

## Mandate

Fix the JSX syntax errors in `src/pages/ProductivityPage.tsx` so the vite build succeeds. The fix must:

1. **Close the unclosed tags** — add the missing `</div>` and `</GlassCard>` closing tags
2. **Preserve all existing functionality** — the IIFE (Time Breakdown), Apps vs Websites Comparison, Productivity Trend chart, and "How is productivity calculated?" section must all remain intact
3. **Not change any logic** — only fix the JSX tag nesting, no behavioral changes
4. **Result in a clean vite build** — `node scripts/build.mjs` must pass

## Task Breakdown

### Task A — Fix the GlassCard nesting

The `<GlassCard data-tutorial="prod.score">` at line 913 opens but never closes. Two wrapper divs were added inside it:
- `<div className="absolute inset-0 opacity-0 ...">` (hover gradient effect) — self-closing, OK
- `<div className="relative">` at line 915 — opens but never closes

After line 944 (`</div>` closing the flex container), add:
```jsx
          </div>
        </GlassCard>
```

This closes the relative div and the GlassCard. The IIFE and everything after it remain as children of the GlassCard.

### Task B — Verify no other broken nesting

Scan the entire file for any other mismatched JSX tags. The file should have:
- One `<>` fragment opening at line 897
- One `</>` fragment closing at line 1618
- All `<GlassCard>` tags properly closed
- All `<div>` tags properly closed
- The IIFE `{(() => { ... })()}` properly formed

## Constraints

1. **Only fix JSX syntax** — do not add features, change styles, or modify logic
2. **Preserve all imports** — keep NumberTicker, DotPattern, Badge, glassBackdrop, etc.
3. **Preserve the `embedded` prop** — keep the `wrapPage` helper
4. **Preserve all data-tutorial attributes** — keep `data-tutorial="prod.score"`, `data-tutorial="prod.breakdown"`, `data-tutorial="prod.trends"`, etc.
5. **One file only** — `src/pages/ProductivityPage.tsx`

## Verification

After the fix:
1. Run `node scripts/build.mjs` — must succeed
2. The Productivity page should render at `/#/productivity` with score card, time breakdown, apps vs websites, trends, and FAQ sections
