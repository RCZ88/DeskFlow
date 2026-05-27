# Linear Design System

## Overview

Ultra-minimal project management. Every element exists only if it serves velocity. Purple accent on near-white creates a calm, focused atmosphere. The UI disappears so work can happen.

## Design Tokens

### Colors
```
Background:    #FFFFFF
Surface:       #F8F9FC (subtle blue-tinted gray)
Elevated:      #FFFFFF with shadow
Accent:        #5E6AD2 (indigo/purple)
Accent Hover:  #4F5BC7 (deeper indigo)
Text Primary:  #1F2937 (slate-800)
Text Secondary:#6B7280 (gray-500)
Text Muted:    #9CA3AF (gray-400)
Border:        #E5E7EB (gray-200)
Success:       #0EA5E9 (sky-500)
Warning:       #F59E0B (amber-500)
Error:         #EF4444 (red-500)
```

### Typography
```
Font Family:   "Inter", -apple-system, sans-serif
Heading:       600 weight, tight tracking (-0.02em)
Body:          400 weight, 1.5 line-height
Code:          "JetBrains Mono", monospace
Small:         12px, 500 weight (labels, badges)
```

### Spacing
```
Base Unit:     4px (tightest grid)
Card Padding:  16px
Section Gap:   24px
List Item:     32px height (exact)
```

## Components

### Issue Row
- Height: 32px exactly
- Left: priority indicator (4px colored bar)
- Middle: issue ID + title
- Right: assignee avatar (20px), status badge, estimate
- Hover: surface background appears
- Border-bottom: 1px solid #E5E7EB

### Status Badge
- Height: 20px
- Padding: 0 8px
- Border-radius: 4px
- Font: 12px, 500 weight
- Colors: Backlog (gray), Todo (blue), In Progress (purple), Done (green), Canceled (red)

### Command Palette
- Background: white
- Border-radius: 8px
- Shadow: `0 25px 50px -12px rgba(0,0,0,0.25)`
- Input: 48px height, no border, 16px font
- Results: 40px rows, icon + title + shortcut
- Selected: indigo background with white text

### Sidebar
- Width: 240px
- Background: transparent (inherits page bg)
- Section headers: 11px uppercase, gray-400, 500 weight, letter-spacing 0.05em
- Nav items: 14px, 28px height, 8px padding
- Active: indigo text + subtle indigo background

## Patterns

### Board View
- Columns: 280px min-width, 16px gap
- Column header: sticky, 40px height, count badge
- Cards: 16px padding, 8px gap between elements, 4px border-radius
- Drag: card lifts with shadow, column highlights

### List View
- Rows: 32px exactly, no variation
- Sortable: drag handle on left, ghost row during drag
- Selectable: checkbox appears on hover, shift-click for range

### Empty State
- No illustrations — just text
- "No issues yet" + "Create issue" button (indigo)
- Centered in available space
