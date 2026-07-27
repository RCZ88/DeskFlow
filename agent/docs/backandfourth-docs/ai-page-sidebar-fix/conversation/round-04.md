# Round 04 — Owner → Specialist (Critical Correction)

## Date: 2026-07-27
## Status: In Progress

---

## Owner's Correction

**Your RESULT.md root cause is INCORRECT.** You identified `will-change: transform` on `.dk-canvas-grid-layer` as the trigger, but the user has confirmed:

> "I DON'T EVEN NEED TO CLICK ANYTHING ON THE AI ASSISTANT PAGE FOR THE SIDEBAR TO NOT WORK"

**The sidebar breaks immediately on MOUNT — no canvas interaction required.** This kills the `will-change: transform` compositor layer theory entirely, because:
1. `will-change: transform` only affects rendering performance, not hit-testing on mount
2. The canvas viewport's `transform: translate(...)` is applied on mount via React state, but this is a normal CSS transform that doesn't block pointer events on sibling elements
3. The sidebar is a SIBLING of the main content area in the DOM — it's not a child of `.dk-root` or any AI page element

## Revised Facts

1. **Sidebar breaks the INSTANT `/ai` route mounts** — no user interaction needed
2. **Sidebar works fine on ALL other pages** — Dashboard, Activity, IDE, Settings, etc.
3. **No JavaScript event hijacking** — all hooks (useVoiceInput, useSlashCommands, useCanvasState) are clean
4. **No invisible overlays** — all modals properly unmount when closed
5. **Tutorial overlay NOT auto-triggered** — only from `/learn` page
6. **CSS is scoped** — all `dk-*` rules are class-scoped, no global leaks
7. **The z-[100] fix did NOT work** — sidebar still broken after z-index increase

## What This Means

The root cause MUST be something that:
- Activates on component MOUNT (not interaction)
- Only exists in the `/ai` route component tree
- Interferes with the sidebar's click handlers at the DOM level
- Is NOT a CSS stacking context issue (z-index fix didn't work)

## New Hypotheses to Investigate

### Hypothesis A: AnimatePresence Race Condition
`App.tsx` wraps Routes in `<AnimatePresence mode="sync">`. When switching FROM a page TO `/ai`, both the old route and `/ai` are mounted simultaneously during the transition. If the old route component has cleanup effects that interfere with the new route's rendering, or if `AnimatePresence` itself has a bug with `mode="sync"` and non-motion children, it could break the sidebar.

**CONTEXT: src/App.tsx (AnimatePresence + Routes structure, lines 2617-2694)**

```tsx
{/* Main Scroll Area */}
<div className={`flex-1 min-h-0 ${location.pathname === '/terminal' ? 'flex flex-col overflow-hidden' : 'overflow-auto p-5'}`}>
  <ErrorBoundary>
  <AnimatePresence mode="sync">
    <Routes location={location} key={location.pathname}>
      <Route path="/" element={<DashboardPage ... />} />
      <Route path="/activity" element={<ActivityPage ... />} />
      <Route path="/ai" element={<AiPage />} />
      <Route path="/ide" element={<IDEProjectsPage ... />} />
      <Route path="/terminal" element={<TerminalPage />} />
      <Route path="/settings" element={<SettingsPage ... />} />
      ...other routes...
    </Routes>
  </AnimatePresence>
  </ErrorBoundary>
</div>
```

**Key observation:** Routes are NOT wrapped in `motion.div`. `AnimatePresence` expects children with `key` props and `motion` wrappers for exit animations. Since `Routes` is a regular React component (not a motion component), `AnimatePresence mode="sync"` may not function correctly — but more importantly, it may keep BOTH the old route AND the new route mounted during the transition, causing effects from the old route to conflict with the new route.

### Hypothesis B: React Error Boundary Catching Silent Error
If AiPage throws a SILENT error (not a render error, but an error in a useEffect or callback), the ErrorBoundary might catch it and render a fallback that covers the sidebar. Or the error might cause React to skip rendering the sidebar's event handlers.

**REQUEST: Does the app show any console errors when navigating to `/ai`?** Can you check the Electron main process console and renderer console for errors?

### Hypothesis C: Framer Motion AnimatePresence with mode="sync"
`AnimatePresence mode="sync"` keeps BOTH old and new route components mounted during transition. If the old route component (e.g., DashboardPage) has effects that add global event listeners, those effects might still be active while AiPage is also mounted, causing a conflict.

**REQUEST: What page were you on BEFORE navigating to `/ai`?** Does the sidebar break differently depending on which page you navigate FROM?

### Hypothesis D: The `glass` CSS Class
The sidebar uses `className="... glass ..."`. If the `glass` utility class (from Tailwind v4) applies `backdrop-filter`, it creates a new stacking context. Combined with the AI page's CSS, this might cause an unexpected stacking order.

**REQUEST: What does the `glass` Tailwind utility class expand to?** Check the Tailwind config or compiled CSS.

## What I Need From You

1. **Discard the `will-change: transform` root cause** — it's wrong
2. **Focus on MOUNT-time interference** — what happens the instant AiPage renders
3. **Investigate AnimatePresence mode="sync"** — this is the most suspicious component since it wraps all routes
4. **Check if the issue depends on WHICH page you navigate FROM** — this would confirm an AnimatePresence race condition
