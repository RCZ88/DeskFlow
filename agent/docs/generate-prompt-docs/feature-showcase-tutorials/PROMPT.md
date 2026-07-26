# Feature Showcase & Tutorials — Complete Documentation System

## Raw Request

> "can we make sure that everything like the features of the ai assistant and the features and possible lites are like all documented and showcased on the app properly. alongside the tutorials and stuff feature. so like it should display the features properly and like that"

## Context

Read CONTEXT_BUNDLE.md first — it contains all existing tutorial infrastructure, feature specs, and what's missing. The target AI must audit completeness and fill gaps.

## Engineering Requirements

### Feature 1: AI Assistant Tutorial Steps Expansion
**Current state:** `tutorial-steps.ts` has 4 generic steps for `ai-assistant`. Missing coverage for canvas controls, card types, command palette.

**Add these tutorial steps:**

1. **Canvas vs Deck Mode** — Target: `[data-tutorial="ai.mode-toggle"]`
   - "Toggle between Canvas (infinite grid) and Deck (chat + cards) modes"
   - Position: top

2. **Card Types** — Target: `[data-tutorial="ai.card-types"]`
   - "Each card type shows different data: focus goals, schedule, deadlines, responses"
   - Position: right

3. **Command Palette** — Target: `[data-tutorial="ai.command-palette"]`
   - "Press Ctrl+K to open the command palette for quick actions"
   - Position: bottom

4. **Canvas Navigation** — Target: `[data-tutorial="ai.canvas-nav"]`
   - "Scroll to zoom, drag background to pan, use minimap for overview"
   - Position: left

5. **Auto-Arrange** — Target: `[data-tutorial="ai.auto-arrange"]`
   - "Click the grid icon to auto-arrange cards by type"
   - Position: top

6. **Recenter** — Target: `[data-tutorial="ai.recenter"]`
   - "Click crosshair to recenter on your cards"
   - Position: top

7. **Card Pinning** — Target: `[data-tutorial="ai.card-pin"]`
   - "Pin cards to keep them visible. Unpinned cards auto-dismiss after 30 seconds"
   - Position: right

### Feature 2: Add data-tutorial Attributes to AI Page
Add these attributes to the actual components in `AiPage.tsx` and `CanvasContainer.tsx`:

| Component | Attribute | Location |
|-----------|-----------|----------|
| Mode toggle button | `ai.mode-toggle` | AiPage top bar |
| Canvas container | `ai.canvas` | CanvasContainer root |
| Card grid | `ai.card-grid` | CanvasGrid root |
| Toolbar arrange button | `ai.auto-arrange` | CanvasContainer toolbar |
| Toolbar recenter button | `ai.recenter` | CanvasContainer toolbar |
| Toolbar fullscreen button | `ai.fullscreen` | CanvasContainer toolbar |
| Minimap | `ai.minimap` | CanvasMinimap root |
| Input bar | `ai.input` | CanvasInput root |
| Find cards arrow | `ai.find-cards` | FindCardsArrow root |
| Any card | `ai.card` | CanvasCard root |

### Feature 3: Update TutorialPage FEATURES Array
Add new entries to the `FEATURES` array in `TutorialPage.tsx`:

```typescript
{
  id: 'canvas-navigation',
  name: 'Canvas Navigation',
  icon: 'Move',
  category: 'Core',
  status: 'released',
  description: 'Navigate the infinite canvas with pan, zoom, minimap, and smart card finding',
  whatYoullFind: ['Infinite pan with mouse drag', 'Zoom with scroll wheel', 'Minimap overview', 'Auto-center on cards', 'Find cards arrow when lost'],
  whatYouCanDo: ['Pan by dragging the background', 'Zoom in/out with scroll', 'Click minimap to jump', 'Recenter with toolbar button', 'Auto-arrange cards by type'],
  visualIcons: ['Move', 'ZoomIn', 'Map', 'Crosshair', 'LayoutGrid'],
  route: '/ai',
},
{
  id: 'daily-goals',
  name: 'Daily Goals',
  icon: 'Target',
  category: 'Core',
  status: 'released',
  description: 'Set daily goals and track progress automatically against your app usage',
  whatYoullFind: ['Goal progress bars', 'Timeline view', 'AI goal suggestions', 'End-of-day reviews', 'Focus integration'],
  whatYouCanDo: ['Set time-based goals per category', 'Auto-track progress from sessions', 'Get AI suggestions based on schedule', 'Link goals to deadlines', 'Review daily accomplishments'],
  visualIcons: ['Target', 'Clock', 'TrendingUp', 'Calendar', 'CheckCircle'],
  route: '/ai',
},
```

### Feature 4: AI Features Modal Visibility
The `AIFeaturesModal` exists but the button to open it may not be visible. Ensure:
1. Add a "Features" or "?" button to the AI page top bar
2. Button opens the AIFeaturesModal
3. Modal shows all 5 capability groups with expandable cards

### Feature 5: Feature Spec Completeness Audit
For each of the 18 features in `feature-specs.ts`, verify:
- [ ] Has tutorial steps in `tutorial-steps.ts`
- [ ] Has `data-tutorial` attributes in actual components
- [ ] Has entry in TutorialPage FEATURES array
- [ ] Route is correct and accessible
- [ ] Status matches reality (released/beta/planned)

Flag any gaps and fill them.

### Feature 6: In-App Help Panel
Add a collapsible help panel to the AI page that shows:
1. **Keyboard Shortcuts**: Ctrl+K (commands), Enter (send), Esc (close palette)
2. **Canvas Controls**: Scroll=zoom, Drag=pan, Minimap=overview
3. **Card Types**: What each card type displays
4. **Quick Start**: 3-step guide to using the AI assistant

**Implementation:**
- Add a "?" button to the AI page toolbar
- Clicking it toggles a side panel (not a modal)
- Panel uses existing design tokens
- Dismiss state saved in localStorage

## Design Specifications

### Help Panel
```
Width: 320px
Position: fixed right side, slides in from right
Background: var(--dk-bg-raised) + backdrop-filter: blur(12px)
Border-left: 1px solid var(--dk-border-default)
Z-index: 200
Animation: slideIn 250ms var(--dk-ease)

Sections:
- Keyboard Shortcuts (monospace key bindings)
- Canvas Controls (icon + description)
- Card Types (icon + name + 1-line description)
- Quick Start (numbered steps)
```

### Tutorial Step Cards
```
Background: var(--dk-bg-raised)
Border: 1px solid var(--dk-accent)
Border-radius: var(--dk-radius-lg)
Max-width: 280px
Padding: 16px
Shadow: var(--dk-shadow-lg)
Title: 14px, font-weight 600, var(--dk-text-primary)
Instruction: 13px, var(--dk-text-secondary), line-height 1.5
Step indicators: 8px dots, active = var(--dk-accent)
```

## Constraints
- No new npm dependencies
- Preserve all existing tutorial functionality
- Don't break existing data-tutorial selectors
- Dark mode only, use --dk-* tokens
- Tutorial steps must target elements that exist at render time (no modals default-closed)
- Each step instruction: 1-2 lines, starts with verb, no periods/emojis/exclamation marks
