# Context Bundle — Sidebar Navigation Fix on AI Assistant Page

## Project
- **Name:** DeskFlow
- **Stack:** Electron + React + TypeScript + Tailwind CSS + Vite
- **Architecture:** Single-window Electron app with React Router sidebar navigation

## Bug Summary
Sidebar navigation buttons become non-functional specifically when the AI Assistant page (`/ai`) is active. All other pages work fine. The sidebar becomes completely unclickable — no navigation occurs when sidebar items are clicked.

## Relevant Files

### 1. App Shell & Sidebar — `src/App.tsx`

**Sidebar definition (lines 2310-2324):**
```tsx
const sidebarItems = [
  { icon: Home, label: 'Dashboard', path: '/' },
  { icon: Activity, label: 'Activity', path: '/activity' },
  { icon: Brain, label: 'AI Assistant', path: '/ai' },
  { icon: GraduationCap, label: 'Learn', path: '/learn' },
  { icon: FileText, label: 'Resume', path: '/resume' },
  { icon: Code2, label: 'IDE Projects', path: '/ide' },
  { icon: Clock4, label: 'External', path: '/external' },
  { icon: Wallet, label: 'Finance', path: '/finance' },
  { icon: BarChart3, label: 'Insights', path: '/reports' },
  { icon: Database, label: 'Database', path: '/database' },
  { icon: HeartHandshake, label: 'Life', path: '/life' },
  { icon: Settings, label: 'Settings', path: '/settings' },
  { icon: BookOpen, label: 'Guide', path: '/guide' },
];
```

**Sidebar render (lines 2326-2397):**
```tsx
return (
  <TutorialProvider>
  <div className="flex h-screen overflow-hidden bg-[#121212] text-white">
    {/* Sidebar */}
    <motion.div
      className="border-r border-zinc-800 flex flex-col h-full glass overflow-hidden z-[100]"
      animate={{ width: sidebarCollapsed ? 60 : 256 }}
      transition={{ duration: 0.25, ease: [0.2, 0, 0, 1] }}
    >
      ...sidebar header + nav buttons with motion.button onClick={handleSidebarNavigation}...
    </motion.div>

    {/* Main Content */}
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
      ...top bar (conditional on /terminal)...
      <div className={`flex-1 min-h-0 ${location.pathname === '/terminal' ? 'flex flex-col overflow-hidden' : 'overflow-auto p-5'}`}>
        <ErrorBoundary>
          <AnimatePresence mode="sync">
            <Routes location={location} key={location.pathname}>
              <Route path="/ai" element={<AiPage />} />
              ...other routes...
            </Routes>
          </AnimatePresence>
        </ErrorBoundary>
      </div>
    </div>
  </div>
  </TutorialProvider>
);
```

**Navigation guard (lines 2259-2274):**
```tsx
const handleSidebarNavigation = useCallback((path: string) => {
  if (location.pathname === '/settings' && settingsHasChanges) {
    setPendingNavigation(path);
    setShowUnsavedWarning(true);
    return;
  }
  if (location.pathname === '/terminal' && (window as any).__workspaceHasUnsavedChanges) {
    setPendingNavigation(path);
    setShowWorkspaceWarning(true);
    return;
  }
  navigate(path);
}, [location.pathname, settingsHasChanges, navigate]);
```

### 2. AI Assistant Page — `src/pages/AiPage.tsx`

**Render structure (lines 1083-1148):**
```tsx
return (
  <>
    {bootState === 'loading' ? (
      <div className="dk-root">
        <div className="dk-wrap flex items-center justify-center min-h-[70vh]">
          <div className="flex flex-col items-center gap-4">
            <div className="w-8 h-8 border-2 border-emerald-500/40 border-t-emerald-400 rounded-full animate-spin" />
            <p className="text-sm text-zinc-500">Loading DeskFlow AI…</p>
          </div>
        </div>
      </div>
    ) : bootState === 'error' ? (
      <div className="dk-root">
        <div className="dk-wrap flex items-center justify-center min-h-[70vh]">
          ...error state...
        </div>
      </div>
    ) : (
    <div className="dk-root">
      <div className="dk-wrap">
        <div className="dk-topbar">...</div>
        {!canvasMode ? (
          <AiPageDeck ... />
        ) : (
          <div data-tutorial="ai.canvas" style={{ flex: 1, minHeight: 0 }}>
            <CanvasContainer ... />
          </div>
        )}
      </div>
    </div>
    )}
    <CommandPalette ... />
    <AIFeaturesModal ... />
    <ConnectorSetupModal ... />
    <AiProviderSelectModal ... />
    <AiProviderSelectModal ... />
    <AiProviderSelectModal ... />
    <ChatHistory ... />
    <SlashCommandManager ... />
    <GoalsRemindersDrawer ... />
    {/* Toast container — UNCONDITIONAL but positioned bottom-right */}
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2" role="status" aria-live="polite">
      {toasts.map(t => (...))}
    </div>
  </>
);
```

**Keyboard handler (lines 606-621):**
```tsx
useEffect(() => {
  const handler = (e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault()
      setPaletteOpen(v => !v)
    }
    if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'L') {
      e.preventDefault()
      setRailOpen(v => !v)
    }
  }
  window.addEventListener('keydown', handler)
  return () => window.removeEventListener('keydown', handler)
}, [])
```

### 3. AI Page CSS — `src/components/ai/deck/deck.css`

**dk-root (lines 35-51):**
```css
.dk-root {
  position: relative;
  color: var(--tp);
  font-family: var(--sans);
  -webkit-font-smoothing: antialiased;
  background:
    radial-gradient(1400px 600px at 85% -10%, rgba(236,72,153,.10), transparent 65%),
    radial-gradient(1000px 500px at 5% -5%, rgba(167,139,250,.08), transparent 60%),
    radial-gradient(800px 400px at 50% 120%, rgba(34,211,238,.05), transparent 50%),
    var(--canvas);
  height: 100%;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  padding: 0;
}
.dk-root * { box-sizing: border-box; }
```

**dk-wrap (lines 53-65):**
```css
.dk-wrap {
  max-width: 1400px;
  margin: 0 auto;
  width: 100%;
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 20px 32px 32px;
  gap: 0;
  position: relative;
}
```

### 4. Canvas CSS — `src/components/ai/canvas/canvas.css`

**Canvas container (lines 4-20):**
```css
.dk-canvas-container {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: var(--dk-bg-base);
  border-radius: var(--dk-radius-lg);
  border: 1px solid var(--dk-border-default);
}

.dk-canvas-container.fullscreen {
  position: fixed;
  inset: 0;
  z-index: 9999;
  border-radius: 0;
  border: none;
}
```

**Canvas viewport (lines 23-37):**
```css
.dk-canvas-viewport {
  position: absolute;
  inset: 0;
  overflow: hidden;
  cursor: grab;
  background-color: var(--dk-bg-base);
  background-image:
    linear-gradient(var(--dk-border-subtle) 1px, transparent 1px),
    linear-gradient(90deg, var(--dk-border-subtle) 1px, transparent 1px);
  background-size: 40px 40px;
}
```

### 5. Modal overlays in AI components

All modals use `position: fixed; inset: 0; z-index: 50-200` but are ALL properly gated behind state conditions (`if (!open) return null` or `{condition && (...)}`). None are unconditionally rendered.

Components with fixed overlays:
- `GoalsRemindersDrawer.tsx` — `dk-modal-overlay` (z-200), gated by `if (!props.open) return null`
- `ChatHistory.tsx` — `dk-modal-overlay` (z-200), gated by `if (!props.open) return null`
- `SlashCommandManager.tsx` — `fixed inset-0 z-50`, gated by `if (!props.open) return null`
- `Dialog.tsx` — `fixed inset-0 z-50`, gated by `{open ? ... : null}`
- `PlanBoard.tsx` — 4 modals, all gated by state checks
- `AIFeaturesModal.tsx` — `fixed inset-0 z-[80]`, gated by `{open && ...}`
- `AiProviderSelectModal.tsx` — `fixed inset-0 z-[90]`, gated by `{open && ...}`
- `ConnectorSetupModal.tsx` — `fixed inset-0 z-50`, gated by `{open && ...}`

### 6. TerminalPage workspace guard — `src/pages/TerminalPage.tsx`

**Unsaved changes tracking (lines 1930-1946):**
```tsx
const hasUnsavedChanges = useMemo(() => Object.keys(terminalTabs).length > 0, [terminalTabs]);

useEffect(() => {
  (window as any).__workspaceHasUnsavedChanges = hasUnsavedChanges;
}, [hasUnsavedChanges]);

useEffect(() => {
  if (!hasUnsavedChanges) return;
  const handler = (e: BeforeUnloadEvent) => {
    e.preventDefault();
    e.returnValue = '';
  };
  window.addEventListener('beforeunload', handler);
  return () => window.removeEventListener('beforeunload', handler);
}, [hasUnsavedChanges]);
```

## Existing Patterns
- Sidebar uses `motion.button` with `onClick={() => handleSidebarNavigation(item.path)}`
- Navigation uses `react-router-dom` `useNavigate()`
- Sidebar z-index was `z-20`, now patched to `z-[100]`
- CSS uses Tailwind utility classes + custom `dk-*` prefixed classes for AI page
- `AnimatePresence mode="sync"` wraps Routes for page transitions
- ErrorBoundary wraps Routes inside main content area

## Stacking Context Analysis

The sidebar (`z-[100]` after fix) is a direct child of the root flex container. The main content area has no explicit z-index. Inside the main content:

1. `dk-root` has `position: relative` but NO z-index → does NOT create stacking context
2. `dk-wrap` has `position: relative; overflow-y: auto` → MAY create stacking context in some browsers
3. `dk-canvas-viewport` has `position: absolute; inset: 0` → fills the canvas container
4. Toast container has `fixed bottom-6 right-6 z-50` → in root stacking context, z-50
5. Canvas fullscreen has `fixed inset-0 z-index: 9999` → conditional on isFullscreen state

With sidebar at `z-[100]`, it now stacks above all of these.
