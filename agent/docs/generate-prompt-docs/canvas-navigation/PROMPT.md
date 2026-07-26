# Canvas Navigation — Auto-center, Find Cards Arrow, Minimap

## Raw Request

> "it doesnt direct me immediately or instantly to where all the cards is when i first had this update of stuff. can we make a feature where if we were to start the app, it should automatically direct me to the cards. and if i were to be lost of any other sections, there should be a smart detection algorithm that can detect where the populated areas are and there should be an arrow pointing towards that area and like basically a recenter button. also a minimap of the entire canvas would be nice. the ability to see different sections of the canvas by like dragging on the minimap for example would be nice."

## Context

You are implementing three navigation features for an infinite canvas in a dark-mode Electron + React app (DeskFlow). The canvas is a 4000×4000px grid layer with CSS `translate()` panning. Cards are `position: absolute` inside the grid layer. The viewport clips the grid via `overflow: hidden`.

**Read CONTEXT_BUNDLE.md first** — it contains all current source code, types, CSS, and architecture.

## Engineering Requirements

### Feature 1: Auto-center on populated card area (on mount)

1. **Compute bounding box** of all non-dismissed cards: `{ minX, minY, maxX, maxY }` from `card.position` + `card.size` (where `card.size.w` = width in grid units × 40px, `card.size.h` = height in grid units × 40px)
2. **Compute center** of bounding box: `centerX = (minX + maxX) / 2`, `centerY = (minY + maxY) / 2`
3. **Set initial pan** so that `centerX, centerY` maps to viewport center:
   ```
   panX = viewportWidth / 2 - centerX
   panY = viewportHeight / 2 - centerY
   ```
4. **Trigger**: Only on first mount when cards already exist (loaded from localStorage). Do NOT re-center on every re-render.
5. **Edge case**: If no cards exist, fall back to current behavior (center on grid origin 2000, 2000).
6. **Timing**: The pan must be set BEFORE the first paint to avoid a flash of wrong position. Use `useLayoutEffect` or set initial state before render.

### Feature 2: "Find Cards" directional arrow + recenter button

**Visibility detection:**
- A card is "visible" if any part of its bounding box intersects the viewport rect.
- Viewport rect in grid coordinates: `gridLeft = -panX`, `gridTop = -panY`, `gridRight = viewportWidth - panX`, `gridBottom = viewportHeight - panY`.
- If ZERO cards are visible, show the arrow pill. If any card is visible, hide it.

**Arrow pill:**
- Floating element positioned at the edge of the viewport (not inside the grid layer).
- Shows a small pill with: `[→]` or `[↑]` or `[↘]` etc. — arrow character pointing toward the card cluster center.
- The direction = `Math.atan2(clusterCenterY - viewportCenterY, clusterCenterX - viewportCenterX)` converted to 8-directional arrow (N, NE, E, SE, S, SW, W, NW).
- Pill should have a subtle bounce/pulse animation to draw attention.
- Click the pill OR the "Recenter" text → smoothly animate pan to center on the card cluster.
- **Animation**: Use CSS transition on the grid layer's `transform` when recentering. Duration: 400ms, ease: `cubic-bezier(0.16, 1, 0.3, 1)` (matches `--dk-ease`).

**Recenter button:**
- Always visible in the toolbar (bottom-left or as a new toolbar button).
- Same behavior as clicking the arrow pill — smooth pan to card cluster center.
- Disabled state when already centered (within 10px tolerance).

### Feature 3: Minimap

**Layout:**
- Fixed position bottom-right corner of the canvas container.
- Size: 160×120px (4:3 aspect ratio).
- Background: `var(--dk-bg-raised)` with `backdrop-filter: blur(8px)`.
- Border: `1px solid var(--dk-border-default)`, `border-radius: var(--dk-radius-md)`.
- Z-index: 100 (above cards, below toolbar).

**Content:**
- Scale factor: `160 / 4000 = 0.04` (each grid pixel = 0.04 minimap pixel).
- Each card rendered as a small filled rectangle:
  - Width: `card.size.w * 40 * 0.04` (minimap pixels)
  - Height: `card.size.h * 40 * 0.04`
  - Position: `card.position.x * 0.04`, `card.position.y * 0.04`
  - Color: Card type → color mapping (use `var(--dk-accent)` for default, could differentiate by type with subtle tints)
- Viewport indicator: A translucent rectangle outline showing the current viewport bounds in minimap space.
  - `viewX = -panX * 0.04`
  - `viewY = -panY * 0.04`
  - `viewW = viewportWidth * 0.04`
  - `viewH = viewportHeight * 0.04`
  - Border: `1px solid var(--dk-accent)` with `opacity: 0.6`

**Interaction:**
- **Click** on minimap → compute grid coordinates from click position, set pan to center viewport on that point.
  - `gridX = clickX / 0.04`
  - `gridY = clickY / 0.04`
  - `newPanX = viewportWidth / 2 - gridX`
  - `newPanY = viewportHeight / 2 - gridY`
- **Drag** on minimap → continuous viewport pan (update pan on every pointermove).
  - On pointerdown: record start position + current pan.
  - On pointermove: compute delta in minimap pixels, convert to grid pixels (`delta / 0.04`), apply to initial pan.
  - On pointerup: stop dragging.
- **Hover** effect: Minimap slightly enlarges (scale 1.05) and shows a subtle glow.
- The minimap itself should NOT capture pointer events on the main canvas — it's an overlay.

## Design Specifications

### Minimap
```
Size: 160×120px
Position: bottom: 16px, right: 16px (from canvas container)
Background: var(--dk-bg-raised) + backdrop-filter: blur(8px)
Border: 1px solid var(--dk-border-default), border-radius: var(--dk-radius-md)
Shadow: var(--dk-shadow-md)
Card dots: 2-6px squares, color = var(--dk-accent) at 0.7 opacity
Viewport rect: 1px solid var(--dk-accent) at 0.5 opacity, no fill
Hover: transform: scale(1.05), box-shadow: var(--dk-shadow-glow)
Transition: all 200ms var(--dk-ease)
```

### Arrow Pill
```
Size: auto (padding 8px 14px)
Position: centered on whichever viewport edge is closest to card cluster
Background: var(--dk-bg-raised) + backdrop-filter: blur(12px)
Border: 1px solid var(--dk-accent), border-radius: 999px (pill)
Shadow: var(--dk-shadow-md)
Arrow icon: Lucide `ArrowRight` / `ArrowUp` etc. (16px), color var(--dk-accent)
Label: "Find cards" text, 12px, var(--dk-text-secondary)
Animation: subtle bounce (translateY oscillation ±3px, 1.5s infinite)
Entry: fade in + slide from edge (200ms)
Exit: fade out (150ms)
```

### Recenter Button
```
In toolbar: icon = Lucide `Crosshair` (16px)
Tooltip: "Recenter on cards"
Disabled: when pan is within 10px of card cluster center
Active color: var(--dk-accent)
```

### Pan Animation (for recenter)
```
Transition: transform 400ms cubic-bezier(0.16, 1, 0.3, 1)
Apply via: className toggle that adds `transition: transform 400ms var(--dk-ease)` to grid layer, then remove after animation completes
```

## Constraints

1. **No new npm dependencies** — pure React + CSS
2. **Use existing design tokens** (`--dk-*` variables from design-tokens.css)
3. **Dark mode only**
4. **Preserve all existing functionality** — panning, card dragging, fullscreen, auto-arrange
5. **CanvasGrid currently owns pan state internally** — you'll need to either:
   - Expose a `setPan` method via `useImperativeHandle` + `forwardRef`, OR
   - Lift pan state to CanvasContainer and pass it down as controlled prop, OR
   - Add a `panTarget` prop that CanvasGrid animates toward
6. **Card positions are in grid coordinates** (0-4000 range). Pan converts to screen position.
7. **The 4000×4000 grid is centered at (2000, 2000)**. Initial pan places viewport center at grid center.

## Anti-Slop Checklist
- [ ] Re-skin all colors to `--dk-*` tokens
- [ ] Use `rounded-xl` max for cards, `rounded-full` for pill
- [ ] All spacing uses `--dk-space-*` tokens
- [ ] Dark mode only — no light mode variables
- [ ] Geist + JetBrains Mono fonts via `--dk-sans`, `--dk-mono`
- [ ] Glass layer: `bg-raised` + `backdrop-filter: blur()`
- [ ] No purple gradients, no default shadcn styling
