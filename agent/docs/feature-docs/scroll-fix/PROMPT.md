# PROMPT: Fix Workspace Sidebar Scroll — Nested Overflow Conflict

## Raw Request

> "still unable to scroll on any of the pages"
> "there's a problem with every single workspace sidebar page. the problem is that im UNABLE to scroll on any of the pages. meaning that i cant view the entirety of the sidebar page. fix it"

## Context Bundle — Full Layout Chain (Actual Source Code)

The workspace sidebar renders at route `/terminal`. The layout chain from outermost to innermost is:

### Layer 1: App.tsx wrapper (line 2642)
```tsx
<div className={`flex-1 min-h-0 ${location.pathname === '/terminal' ? 'flex flex-col overflow-hidden' : 'overflow-auto p-5'}`}>
  <AnimatePresence mode="sync">
    <Routes location={location} key={location.pathname}>
      <Route path="/terminal" element={<TerminalPage />} />
    </Routes>
  </AnimatePresence>
</div>
```
For `/terminal`: classes = `flex-1 min-h-0 flex flex-col overflow-hidden`

### Layer 2: TerminalPage root (line 2706)
```tsx
<PageShell page="terminal" className="flex-1 flex bg-black text-white !p-0 !space-y-0 relative overflow-hidden">
  {/* Main Terminal Area */}
  <div style={accentStyle('cyan')} className="flex-1 flex flex-col bg-zinc-950 relative">
    ...
  </div>
  {/* Sidebar */}
  {sidebarOpen && (
    <div className="relative shrink-0 bg-zinc-950 ws-sidebar-edge flex flex-col" style={{ width: sidebarWidth }}>
      ...
    </div>
  )}
</PageShell>
```
TerminalPage root: `flex-1 flex bg-black text-white !p-0 !space-y-0 relative overflow-hidden`
This is a **flex ROW**. Main terminal area and sidebar are flex children.

### Layer 3: Sidebar (line 3255)
```tsx
<div className="relative shrink-0 bg-zinc-950 ws-sidebar-edge flex flex-col" style={{ width: sidebarWidth }}>
  {/* Sidebar Header */}
  <header className="flex items-center justify-between px-3 h-9 border-b border-zinc-800/60">
    ...
  </header>
  {/* Group Tab Bar */}
  <nav className="flex gap-px px-2 pt-1.5">
    ...group tabs...
  </nav>
  {/* Accent Strip */}
  <div className={`h-[3px] ...`}>
    ...
  </div>
  {/* Content */}
  <div className="flex-1 flex flex-col min-h-0">
    {activeGroup === 'setup' && <WorkspaceShell ... />}
    {activeGroup === 'work' && <WorkspaceShell ... />}
    {activeGroup === 'insights' && <WorkspaceShell ... />}
    {activeGroup === 'studio' && <WorkspaceShell ... />}
    {activeGroup === 'context' && <WorkspaceShell ... />}
  </div>
</div>
```
Sidebar: `flex flex-col`
Content container: `flex-1 flex flex-col min-h-0`

### Layer 4: WorkspaceShell (full component)
```tsx
export function WorkspaceShell({ tabs, storageKey, render, onTabChange, accent }) {
  const [active, setActive] = usePersistentSubTab(storageKey, tabs[0].key);
  return (
    <div className="flex flex-1 min-h-0 overflow-hidden">
      <div className="relative w-[18px] flex items-center justify-center shrink-0 self-stretch">
        <div className={`w-0.5 self-stretch ${trunkColor}`} />
      </div>
      <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">
        <SubTabBar tabs={tabs} active={active} onChange={handleChange} accent={accent} />
        <div
          className="flex-1 min-h-0 relative"
          style={{ overflowY: 'auto' } as React.CSSProperties}
        >
          {render(active)}
        </div>
      </div>
    </div>
  );
}
```
Root: `flex flex-1 min-h-0 overflow-hidden`
Inner: `flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden`
**Scroll container:** `flex-1 min-h-0 relative` + inline `style={{ overflowY: 'auto' }}`

### Layer 5: SubTabBar
```tsx
<div role="tablist" className="flex items-center gap-1 py-2 pr-4 shrink-0">
  {tabs.map((t) => { ... })}
</div>
```
`shrink-0` — fixed height

### Layer 6: GroupPanel (rendered inside scroll container)
```tsx
function GroupPanel({ accent, children }) {
  return (
    <div className="flex min-h-full">
      <span className={`w-0.5 shrink-0 ${ACCENT_STRIP[accent]} opacity-60`} />
      <div className="flex-1 px-3 py-3 space-y-3 min-w-0">
        {children}
      </div>
    </div>
  );
}
```
Root: `flex min-h-full`

---

## What Was Already Tried (ALL FAILED)

1. **Removed `overflow-y-auto` from GroupPanel inner div** — GroupPanel originally had `overflow-y-auto` on its inner div. Removed it. Still no scroll.
2. **Removed `overflow-hidden` from content container (line 3326)** — Was `flex-1 flex flex-col min-h-0 overflow-hidden`, changed to `flex-1 flex flex-col min-h-0`. Still no scroll.
3. **Added `shrink-0` to SubTabBar** — Prevents tab bar from being squeezed. Still no scroll.
4. **Added `overflow-hidden` to WorkspaceShell root and inner** — Creates bounded height containers. Still no scroll.
5. **Changed GroupPanel to `flex min-h-full`** — Per Entry 7 in COMMON_ERRORS_FIXED.md. Still no scroll.
6. **Used inline `style={{ overflowY: 'auto' }}` on scroll container** — Bypasses Tailwind class conflicts. Still no scroll.
7. **Used `!overflow-y-auto` Tailwind prefix** — Forces !important. Still no scroll.

## The Problem

The scroll container in WorkspaceShell has `overflowY: 'auto'` and `flex-1 min-h-0`. It SHOULD get a bounded height from the flex chain and scroll when content overflows. But it doesn't.

Possible root causes:
1. **The flex chain doesn't provide a bounded height** — somewhere up the chain, a container has `height: auto` instead of a bounded height, so `flex-1` on the scroll container is meaningless
2. **A parent `overflow-hidden` is clipping scroll** — `overflow-hidden` on a parent can prevent child scroll from working in some browsers
3. **The content inside the scroll container is not actually overflowing** — the GroupPanel with `min-h-full` might be exactly the same height as the scroll container
4. **CSS specificity issue** — some other CSS rule is overriding `overflow-y: auto`

## What the Architect Must Do

1. **Read the FULL layout chain** from App.tsx → TerminalPage → Sidebar → Content → WorkspaceShell → Scroll container
2. **Identify which container in the chain is NOT providing a bounded height** — use browser DevTools to check computed heights
3. **Fix the ONE root cause** — don't add more overflow properties, fix why the scroll container doesn't get a bounded height
4. **Verify scroll works** on ALL workspace sidebar pages (Setup, Work, Insights, Studio, Context)

## Constraints

- Must NOT break the accent strip height (Entry 7 fix must stay)
- Must NOT break the terminal panes area
- Must work on all 5 workspace groups
- Must preserve the existing visual design
- Files to modify: `src/pages/TerminalPage.tsx`, `src/components/workspace/WorkspaceShell.tsx`, possibly `src/App.tsx`
