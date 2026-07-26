# DeskFlow Frontend Revamp — Fix Specification

## Context

Read `agent/docs/frontend-revamp/RESULT.md` (1201 lines, comprehensive revamp spec covering 11 phases across 90+ files).

## Issues to Fix

### Issue 1: GlassCard dynamic border color (RESULT.md §2.1, line 226)

**Current (broken — Tailwind can't evaluate runtime template literals):**
```tsx
const accentStyle = accent
  ? `border-l-2 border-l-[${accentColor || 'var(--page-accent)'}]/40`
  : '';
```

**Fix:** Use inline `style` prop instead:
```tsx
const accentStyle = accent
  ? { borderLeft: `2px solid ${accentColor || 'var(--page-accent)'}40` }
  : {};
```

Apply to the `<div>` as `style={accentStyle}` (don't mix into className string).

### Issue 2: TerminalTab dynamic border color (RESULT.md §2.13, line 614-626)

**Current (broken — same Tailwind limitation):**
```tsx
className={`... ${
  active
    ? `... border-b-2 border-[${accentColor}]`
    : '...'
} ${className}`}
```

**Fix:** Use inline `style` prop:
```tsx
style={active ? { borderBottomColor: accentColor } : undefined}
```

Keep the static classes (`border-b-2 border-transparent`) in className for the inactive state. When active, override via style.

### Issue 3 (Optional): PageShell keyframe injection (RESULT.md §2.2)

**Current:** Injects `<style>` tag per PageShell instance — duplicates keyframes on every render.

**Consideration:** Move the `@keyframes pageEnter` to `index.css` as a global animation, so PageShell can just use `animate-[pageEnter_250ms_ease-out]` instead of injecting `<style>` children. Reduces DOM overhead across 10 pages.

Apply these fixes to the existing `RESULT.md` — update the affected component definitions in place. Do not change any other part of the spec.

## Output

Return the complete updated `agent/docs/frontend-revamp/RESULT.md` with Issues 1-2 fixed. Keep every other line identical.
