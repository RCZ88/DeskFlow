# Vercel Design System

## Overview

Black and white precision. Geist font family creates a technical, authoritative feel. The design communicates speed and reliability through extreme minimalism and perfect alignment.

## Design Tokens

### Colors
```
Background:    #000000 (pure black)
Surface:       #111111 (elevated black)
Elevated:      #1A1A1A (card background)
Accent:        #FFFFFF (white — inverted accent)
Accent Hover:  #E5E5E5 (off-white)
Text Primary:  #FFFFFF (pure white)
Text Secondary:#A1A1AA (zinc-400)
Text Muted:    #52525B (zinc-600)
Border:        #27272A (zinc-800)
Success:       #22C55E (green-500)
Warning:       #F59E0B (amber-500)
Error:         #EF4444 (red-500)
```

### Typography
```
Font Family:   "Geist", "Geist Sans", sans-serif
Heading:       600 weight, tight tracking
Body:          400 weight, 1.6 line-height
Code:          "Geist Mono", monospace
Small:         13px, 1.5 line-height
Display:       700 weight, tight tracking, large sizes (48-72px)
```

### Spacing
```
Base Unit:     4px
Card Padding:  24px
Section Gap:   32px
Grid:          12-column, 24px gutter
```

## Components

### Button (Primary)
- Background: white
- Text: black, 500 weight
- Padding: 10px 16px
- Border-radius: 6px
- Hover: #E5E5E5
- Size variants: sm (8px 12px), md (10px 16px), lg (12px 24px)

### Button (Secondary)
- Background: transparent
- Border: 1px solid #27272A
- Text: white
- Hover: background #1A1A1A

### Card
- Background: #1A1A1A
- Border: 1px solid #27272A
- Border-radius: 8px
- Padding: 24px
- Hover: border-color transitions to #3F3F46

### Data Table
- Header: 12px uppercase, zinc-500, letter-spacing 0.05em
- Row: 48px height, hover #111111
- Cell padding: 12px 16px
- Border: 1px solid #27272A between rows
- Selected row: #1A1A1A background + left border accent

### Deployment Status
- Inline badge: 20px height, dot + text
- States: Building (amber pulse), Ready (green), Error (red), Queued (gray)
- Progress: thin line (2px) above the row, animated gradient

## Patterns

### Dashboard Grid
- 12-column grid
- Cards span 3-6 columns depending on importance
- Top row: KPI cards (4×3-column)
- Middle: Charts (2×6-column)
- Bottom: Tables/lists (full width)

### Navigation
- Top bar: 64px height, border-bottom 1px solid #27272A
- Logo left, nav center (projects, deployments, analytics), user right
- Nav links: 14px, zinc-400, hover white, active white + underline

### Empty State
- Large icon (48px, zinc-600)
- Heading: 18px, white
- Subtext: 14px, zinc-500
- CTA: white button
- Centered vertically and horizontally
