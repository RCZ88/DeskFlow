# Supabase Design System

## Overview

Dark emerald developer platform. Code is first-class — syntax highlighting, monospace dominance, and terminal aesthetics. The design feels like a powerful IDE that happens to have a database.

## Design Tokens

### Colors
```
Background:    #1C1C1C (dark charcoal)
Surface:       #232323 (elevated)
Elevated:      #2A2A2A (cards, panels)
Accent:        #3ECF8E (emerald/mint)
Accent Hover:  #35B57D (deeper emerald)
Text Primary:  #EDEDED (off-white)
Text Secondary:#909090 (gray)
Text Muted:    #5C5C5C (dark gray)
Border:        #2E2E2E (subtle border)
Success:       #3ECF8E (emerald)
Warning:       #F5A623 (amber)
Error:         #FF6B6B (coral)
```

### Typography
```
Font Family:   "Inter", -apple-system, sans-serif
Code Font:     "JetBrains Mono", "Fira Code", monospace
Heading:       600 weight, tight tracking
Body:          400 weight, 1.6 line-height
Code:          400 weight, 1.5 line-height, ligatures enabled
Small:         12px, 1.4 line-height
```

### Spacing
```
Base Unit:     4px
Card Padding:  16px
Section Gap:   24px
Code Padding:  12px 16px
```

## Components

### SQL Editor
- Background: #1C1C1C
- Font: JetBrains Mono, 14px
- Line numbers: #5C5C5C, right-aligned
- Syntax highlighting: emerald (keywords), #F5A623 (strings), #FF6B6B (errors)
- Cursor: emerald block cursor (terminal style)
- Padding: 16px

### Side Panel (Tables)
- Width: 280px
- Background: #232323
- Table list: 14px, #EDEDED, hover #2A2A2A
- Active table: emerald left border (2px) + #2A2A2A bg
- Column list: 12px, #909090, indented

### Button (Primary)
- Background: #3ECF8E
- Text: #1C1C1C (dark on light), 500 weight
- Padding: 8px 16px
- Border-radius: 4px
- Hover: #35B57D

### Button (Secondary)
- Background: transparent
- Border: 1px solid #2E2E2E
- Text: #EDEDED
- Hover: #2A2A2A background

### Status Dot
- Size: 8px
- Colors: Active (emerald, pulse), Paused (amber), Error (coral), Offline (gray)
- Used in: table rows, connection indicators, job status

## Patterns

### Database Table View
- Toolbar: 40px height, actions left, search right
- Table: full width, 40px row height
- Header: 12px uppercase, #5C5C5C
- Cells: 14px, #EDEDED, tabular-nums
- Pagination: bottom, 32px height
- Row hover: #2A2A2A

### API Docs
- Left: endpoint list (method + path)
- Right: code examples (dark bg, syntax highlighted)
- Method badges: GET (emerald), POST (blue), DELETE (coral)
- Copy button: top-right of code block, hover reveals

### Empty State
- Terminal-style: `>` prompt + "No tables found. Create your first table."
- CTA: emerald button
- No illustrations — code aesthetic
