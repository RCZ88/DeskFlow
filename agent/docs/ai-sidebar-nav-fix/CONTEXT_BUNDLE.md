# CONTEXT BUNDLE — AI Page Sidebar Navigation Fix

## Problem
When on the AI page (`/ai`), clicking sidebar items to navigate to other pages does nothing. The sidebar is completely unresponsive.

## Root Cause Analysis
The AI page renders `ExpandableCard` components inside `AiPageDeck`. Each `ExpandableCard` returns a Fragment containing both the card div AND a fullPageOpen overlay:

```tsx
// AiPageDeck.tsx line 110-257
return (
  <>
    <div ref={cardRef} className="relative overflow-hidden rounded-xl border ...">
      {/* card content */}
    </div>
    {/* Full-page overlay */}
    {fullPageOpen && (
      <div className="absolute inset-0 z-[200] flex flex-col bg-zinc-950/92 backdrop-blur-xl">
        {/* overlay content */}
      </div>
    )}
  </>
)
```

The overlay uses `absolute inset-0 z-[200]`. Since it's a Fragment child (not inside the card div), it escapes the card's positioning context. Its nearest positioned ancestor is `dk-wrap` (position: relative), so it fills the ENTIRE dk-wrap area at z-200.

Meanwhile, dk-root has `overflow: hidden` but this only clips visually — the overlay still captures pointer events in its hit area. The sidebar (z-10 implicit) sits at the same viewport level, and the overlay's z-200 blocks all clicks.

## Key Files

### App.tsx (sidebar + routes)
```tsx
// Line 2328-2332: Sidebar
<div className="flex h-screen overflow-hidden bg-[#121212] text-white">
  <motion.div
    className="border-r border-zinc-800 flex flex-col h-full glass overflow-hidden"
    animate={{ width: sidebarCollapsed ? 60 : 256 }}
  >
    {/* sidebar items at line 2366-2394 */}
    <motion.button
      onClick={() => handleSidebarNavigation(item.path)}
      className="flex items-center rounded-xl text-sm ..."
    >
```

```tsx
// Line 2677-2754: Main content + routes
<div className={`flex-1 min-h-0 ${location.pathname === '/terminal' ? 'flex flex-col overflow-hidden' : 'overflow-auto p-5'}`}>
  <ErrorBoundary>
    <AnimatePresence mode="sync">
      <Routes location={location} key={location.pathname}>
        <Route path="/ai" element={<AiPage />} />
        {/* ...other routes */}
      </Routes>
    </AnimatePresence>
  </ErrorBoundary>
```

```tsx
// Line 2260-2274: Navigation handler
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

### AiPage.tsx (page component)
```tsx
// Line 1083-1112: Return structure
return (
  <>
    {bootState === 'loading' ? (
      <div className="dk-root">
        <div className="dk-wrap flex items-center justify-center min-h-[70vh]">...</div>
      </div>
    ) : bootState === 'error' ? (
      <div className="dk-root">...</div>
    ) : (
      <div className="dk-root">
        <div className="dk-wrap">
          {/* topbar */}
          {!canvasMode ? (
            <AiPageDeck ... />
          ) : (
            <CanvasContainer ... />
          )}
        </div>
      </div>
    )}
    {/* modals rendered outside dk-root */}
    <CommandPalette ... />
    <AIFeaturesModal ... />
    <ChatHistory ... />
    <SlashCommandManager ... />
    <GoalsRemindersDrawer ... />
  </>
);
```

### AiPageDeck.tsx (card grid)
```tsx
// Line 433: Main chat panel wrapper
<div className="relative bg-zinc-900/70 backdrop-blur-xl border border-zinc-800/60 rounded-xl flex flex-col overflow-hidden ..." style={{ flex: 1, minHeight: 400 }}>

// Line 468-506: Card grid with ExpandableCards
<motion.div layout className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
  {visibleCards.map((card) => (
    <motion.div key={card.id} className={open ? "col-span-full" : ""}>
      <ExpandableCard id={card.id} ...>
        {card.slot}
      </ExpandableCard>
    </motion.div>
  ))}
</motion.div>
```

### deck.css
```css
/* Line 35-50: dk-root */
.dk-root {
  position: relative;
  height: 100%;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* Line 53-65: dk-wrap */
.dk-wrap {
  position: relative;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
}

/* Line 844-862: dk-history-drawer (FIXED position, z-100) */
.dk-history-drawer {
  position: fixed;
  top: 0; bottom: 0; left: 0;
  width: 280px;
  z-index: 100;
  transform: translateX(-100%);
}
```

### canvas.css
```css
/* Line 14-20: fullscreen mode */
.dk-canvas-container.fullscreen {
  position: fixed;
  inset: 0;
  z-index: 9999;
}

/* Line 419-432: transcript rail (FIXED position, z-200) */
.dk-transcript-rail {
  position: fixed;
  top: 0; right: 0;
  width: 380px;
  height: 100vh;
  z-index: 200;
}
```

## Fix Required
Move the fullPageOpen overlay OUTSIDE the ExpandableCard Fragment so it's rendered via a portal or at the dk-root level with `pointer-events-none` when not active, AND ensure the sidebar has sufficient z-index to stay above any overlapping content.
