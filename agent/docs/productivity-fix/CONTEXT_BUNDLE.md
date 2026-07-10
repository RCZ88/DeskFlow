# CONTEXT_BUNDLE.md — ProductivityPage.tsx JSX Fix

## Problem

`src/pages/ProductivityPage.tsx` has JSX syntax errors that block the vite build. The file was modified by a previous agent who added hover effects and new UI primitives but introduced mismatched closing tags.

## Build Errors

```
ProductivityPage.tsx:1107:8: Unexpected closing "GlassCard" tag does not match opening "div" tag
ProductivityPage.tsx:1618:6: Unexpected closing fragment tag does not match opening "GlassCard" tag
ProductivityPage.tsx:1622:0: The character "}" is not valid inside a JSX element
ProductivityPage.tsx:1623:0: Unexpected end of file before a closing fragment tag
```

## Root Cause

A previous agent added hover effect wrapper divs inside the `<GlassCard data-tutorial="prod.score">` but never added the matching closing tags. The GlassCard opens at line 913 but has no `</GlassCard>` closing tag before the IIFE at line 947.

### Original structure (working, from git HEAD):
```jsx
<GlassCard data-tutorial="prod.score">
  <div className="flex items-center justify-between mb-6">
    ... score content ...
  </div>

  {/* Time Breakdown */}
  {(() => { ... })()}

  {/* Apps vs Websites Comparison */}
  <div> ... </div>
</GlassCard>
```

### Current broken structure:
```jsx
<GlassCard data-tutorial="prod.score" className="group relative overflow-hidden ...">
  <div className="absolute inset-0 opacity-0 ..." />  {/* hover effect - NEW */}
  <div className="relative">                          {/* wrapper div - NEW, NEVER CLOSED */}
    <div className="flex items-center justify-between mb-6">
      ... score content ...
    </div>
    {/* MISSING: </div> for relative div */}
    {/* MISSING: </GlassCard> */}

  {/* Time Breakdown */}
  {(() => { ... })()}

  {/* Apps vs Websites Comparison */}
  ... more content ...

  {/* How is productivity calculated? */}
  <details> ... </details>
</>  {/* fragment close - but GlassCard was never closed */}
);
```

## Fix Required

After line 944 (`</div>` closing the flex container), add:
```jsx
          </div>
        </GlassCard>
```

This closes:
1. The `<div className="relative">` opened at line 915
2. The `<GlassCard>` opened at line 913

The IIFE (lines 947-1029) and Apps vs Websites (lines 1031+) remain at their current indentation as children of the GlassCard. The `</GlassCard>` should go after the Apps vs Websites section and before the Two Column Layout.

## Files

| File | Lines | What |
|------|-------|------|
| `src/pages/ProductivityPage.tsx` | 913 | `<GlassCard>` opens |
| `src/pages/ProductivityPage.tsx` | 915 | `<div className="relative">` opens |
| `src/pages/ProductivityPage.tsx` | 944 | Last `</div>` before IIFE — missing closing tags after this |
| `src/pages/ProductivityPage.tsx` | 1029 | IIFE closes with `})()}` |
| `src/pages/ProductivityPage.tsx` | 1107 | Orphaned `</GlassCard>` from previous fix attempt (WRONG — was removed) |
| `src/pages/ProductivityPage.tsx` | 1618 | `</>` fragment close |
| `src/pages/ProductivityPage.tsx` | 1622 | `}` closing the function |
