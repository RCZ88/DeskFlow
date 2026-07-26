# Raycast Design System

## Overview

Sleek dark command palette. The entire app is a search interface — everything is keyboard-driven, instant, and frictionless. Vibrant accents on deep dark create a premium native feel.

## Design Tokens

### Colors
```
Background:    #1A1A1A (deep dark)
Surface:       #252525 (elevated items)
Elevated:      #2D2D2D (selected, hovered)
Accent:        #FF6363 (coral red)
Accent Hover:  #FF4D4D (deeper coral)
Text Primary:  #FFFFFF
Text Secondary:#A0A0A0
Text Muted:    #6B6B6B
Border:        #333333
Success:       #4ADE80 (green)
Warning:       #FBBF24 (amber)
```

### Typography
```
Font Family:   "Inter", -apple-system, sans-serif
Heading:       600 weight
Body:          400 weight, 1.5 line-height
Code:          "JetBrains Mono", monospace
Small:         13px, 1.4 line-height
Search:        18px, 400 weight (prominent)
```

### Spacing
```
Base Unit:     4px
List Item:     44px height (generous for keyboard nav)
Icon Size:     20px (in list), 16px (in detail)
Padding:       12px horizontal
```

## Components

### Command Palette (Root Component)
- Background: #1A1A1A
- Border-radius: 12px
- Width: 640px (centered)
- Shadow: `0 25px 50px -12px rgba(0,0,0,0.5)`
- Search: 56px height, 18px font, no border, placeholder "Search for apps and commands..."
- Results: max 8 visible, 44px each

### List Item
- Height: 44px
- Left: icon (20px, colored) + title (15px, white) + subtitle (13px, gray)
- Right: keyboard shortcut (13px, gray, monospace) + accessory (optional)
- Hover: #252525 background
- Selected: #2D2D2D background + coral left border (3px)
- Active: #2D2D2D + subtle glow

### Detail Panel
- Width: 320px (right side)
- Background: #1A1A1A
- Border-left: 1px solid #333333
- Header: icon + title + action buttons
- Content: metadata list, 12px, gray
- Actions: bottom row of buttons

### Action Button
- Height: 28px
- Padding: 0 12px
- Border-radius: 6px
- Background: #2D2D2D
- Text: 13px, white
- Hover: #3D3D3D
- Primary: coral background, white text

## Patterns

### Search Flow
1. User presses hotkey → palette appears with fade + scale (150ms)
2. Type query → results filter instantly (no debounce)
3. Arrow keys navigate → selected item highlights
4. Enter executes → palette closes with fade (100ms)
5. Escape cancels → palette closes

### Extension Grid
- Grid: 4 columns, 16px gap
- Card: 120px × 100px, icon (40px) + name (13px) + author (11px)
- Hover: #252525 + icon scale 1.1
- Install button: appears on hover

### Settings
- Left: category list (44px rows, icon + name)
- Right: form fields
- Toggle: 24px width, coral when on
- Input: 36px height, #252525 bg, 1px #333333 border

### Empty Search
- Centered: "No results for 'query'"
- Suggestions: "Try searching for..." + example commands
- Icon: magnifying glass, 32px, gray
