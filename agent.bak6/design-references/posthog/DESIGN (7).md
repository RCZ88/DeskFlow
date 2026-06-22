# PostHog Design System

## Overview

Playful dark analytics. The hedgehog mascot personality permeates the UI — friendly colors, rounded shapes, and surprising micro-interactions. Data visualization is colorful and approachable.

## Design Tokens

### Colors
```
Background:    #1A1A1A (dark)
Surface:       #2D2D2D (elevated)
Elevated:      #373737 (cards)
Accent:        #F54E00 (posthog orange)
Accent Hover:  #E04600 (deeper orange)
Text Primary:  #FFFFFF
Text Secondary:#A0A0A0
Text Muted:    #6B6B6B
Border:        #3D3D3D
Success:       #2DB67D (green)
Warning:       #F5A623 (amber)
Error:         #E03E3E (red)
Chart Colors:  #F54E00, #2DB67D, #F5A623, #E03E3E, #6C5FC7, #00C4FF
```

### Typography
```
Font Family:   "Inter", -apple-system, sans-serif
Heading:       700 weight (bold, friendly)
Body:          400 weight, 1.6 line-height
Code:          "JetBrains Mono", monospace
Small:         13px, 1.4 line-height
```

### Spacing
```
Base Unit:     8px
Card Padding:  16px
Section Gap:   24px
Border Radius: 8px (default), 12px (large cards), 16px (modals)
```

## Components

### Insight Card
- Background: #2D2D2D
- Border-radius: 12px
- Padding: 16px
- Header: title (16px, 600) + time range + edit button
- Chart area: full width, 200px min height
- Footer: comparison toggle, save button

### Funnel Chart
- Vertical bars, decreasing width
- Colors: gradient from accent to secondary
- Conversion rate: large percentage between steps
- Drop-off: red arrow + count
- Step labels: below bars, 12px

### Event Badge
- Background: event color at 20% opacity
- Text: event color
- Border-radius: 4px
- Padding: 2px 8px
- Font: 12px, 500 weight

### Button (Primary)
- Background: #F54E00
- Text: white, 600 weight
- Padding: 8px 16px
- Border-radius: 8px
- Hover: #E04600, slight scale up

## Patterns

### Dashboard
- Grid: 2-3 columns, 16px gap
- Cards: insights, funnels, retention, paths
- Add insight: large "+" card, dashed border, hover solid
- Time range: top-right, quick selectors (Today, 7d, 30d, 90d)

### Query Builder
- Left: event selector (searchable, colored badges)
- Middle: filter builder (AND/OR logic, property filters)
- Right: preview chart (live updates)
- Run button: orange, prominent

### Empty State
- Hedgehog illustration (small, 64px)
- Heading: "No insights yet"
- Subtext: "Create your first insight to see data here"
- CTA: orange button
- Secondary: link to docs
