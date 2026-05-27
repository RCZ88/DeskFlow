# Sentry Design System

## Overview

Dark, data-dense monitoring dashboard. Information density is paramount — every pixel carries meaning. Purple and red accents draw attention to what matters without creating panic.

## Design Tokens

### Colors
```
Background:    #1D1E24 (dark blue-gray)
Surface:       #25262C (elevated panels)
Elevated:      #2D2E36 (cards, modals)
Accent:        #6C5FC7 (purple)
Accent Hover:  #5845B5 (deeper purple)
Text Primary:  #EBEAEA (off-white)
Text Secondary:#A3A1A1 (warm gray)
Text Muted:    #6C6C6C (dark gray)
Border:        #3D3E44 (subtle border)
Success:       #2DB67D (green)
Warning:       #F59E0B (amber)
Error:         #E03E3E (red)
```

### Typography
```
Font Family:   "Inter", -apple-system, sans-serif
Heading:       600 weight, tight tracking
Body:          400 weight, 1.5 line-height
Code:          "Roboto Mono", monospace
Small:         12px, 1.4 line-height
Data:          600 weight, tabular-nums
```

### Spacing
```
Base Unit:     4px
Card Padding:  16px
Section Gap:   16px (tight)
List Item:     32px height
```

## Components

### Event List
- Row: 32px height, no padding waste
- Left: level icon (colored dot)
- Middle: message (truncated), project badge, timestamp
- Right: count badge, user count, sparkline
- Hover: #2D2E36 background
- Selected: purple left border

### Count Badge
- Height: 16px
- Padding: 0 6px
- Border-radius: 8px
- Font: 11px, 600 weight
- Background: matches level color at 20% opacity
- Text: level color

### Chart (Error Volume)
- Type: stacked area or bar
- Colors: purple (errors), green (resolved), amber (warnings)
- Height: 120px (compact)
- Axis: minimal, 10px text
- Tooltip: dark card, detailed breakdown

### Sidebar
- Width: 200px (compact)
- Background: #1D1E24
- Sections: Projects, Issues, Performance, Alerts
- Nav: 13px, #6C6C6C, hover #A3A1A1
- Active: #EBEAEA + purple left border (3px)

## Patterns

### Issue Detail
- Top: error message (large, 18px), stack trace toggle
- Middle: tabs (Details, Tags, Breadcrumbs, Context)
- Tags: compact badges, 20px height
- Breadcrumbs: timeline, 24px rows, icon + text + timestamp
- Context: code snippet with syntax highlighting

### Dashboard Grid
- 3-column grid on desktop
- Cards: issue count, error rate, performance score
- Each card: 120px height, sparkline + big number + label
- No wasted space — tight packing

### Alert Banner
- Full width, 36px height
- Background: level color at 15% opacity
- Border-bottom: level color at 30% opacity
- Text: level color, 13px
- Dismiss: right side, hover opacity
