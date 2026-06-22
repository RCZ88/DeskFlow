# Stripe Design System

## Overview

Financial precision meets approachable elegance. Purple gradients and weight-300 typography create trust without stiffness. Data displays are the heroes — everything else recedes.

## Design Tokens

### Colors
```
Background:    #FFFFFF
Surface:       #F6F9FC (very light blue-gray)
Elevated:      #FFFFFF with subtle shadow
Accent:        #635BFF (stripe purple)
Accent Hover:  #5245FF (deeper purple)
Text Primary:  #1A1A1A (near black)
Text Secondary:#4F566B (slate-gray)
Text Muted:    #A3A3A3 (light gray)
Border:        #E3E8EE (light blue-gray border)
Success:       #00D4AA (mint green)
Warning:       #F6A4EB (pink warning)
Error:         #FF5A5A (coral red)
```

### Typography
```
Font Family:   "Inter", -apple-system, sans-serif
Heading:       300-600 weight (light headings for elegance)
Body:          400 weight, 1.6 line-height
Code:          "SF Mono", monospace
Small:         13px, 1.5 line-height
Display:       300 weight, large sizes (elegant, not bold)
```

### Spacing
```
Base Unit:     8px
Card Padding:  24px
Section Gap:   40px (generous)
Page Margin:   48px
```

## Components

### KPI Card
- Background: white
- Border: 1px solid #E3E8EE
- Border-radius: 8px
- Padding: 24px
- Label: 13px, #4F566B, uppercase, letter-spacing 0.05em
- Value: 32px, 300 weight, #1A1A1A
- Change: 14px, green/red with arrow icon
- Sparkline: 40px height, subtle line chart below value

### Data Table
- Header: 12px, #4F566B, uppercase, letter-spacing 0.05em
- Row: 56px height (generous)
- Cell padding: 16px
- Hover: #F6F9FC background
- Selected: purple left border (3px) + subtle purple bg
- Sort indicator: purple arrow

### Button (Primary)
- Background: #635BFF
- Text: white, 500 weight
- Padding: 10px 20px
- Border-radius: 6px
- Hover: #5245FF, slight shadow

### Button (Secondary)
- Background: transparent
- Border: 1px solid #E3E8EE
- Text: #1A1A1A
- Hover: #F6F9FC background

### Chart
- Line charts: 2px stroke, purple gradient fill below
- Bar charts: 8px border-radius on top corners only
- Tooltips: white card, shadow, 12px text
- Axis: 12px, #A3A3A3, minimal ticks

## Patterns

### Financial Dashboard
- Top: Date range picker + export button
- Row 1: 4 KPI cards (revenue, customers, MRR, churn)
- Row 2: Main chart (full width, 400px height)
- Row 3: Data table (recent transactions)
- All numbers: tabular-nums, decimal alignment

### Settings Page
- Left sidebar: 240px, section headers (Account, Payments, etc.)
- Right: forms with 40px section gaps
- Inputs: 48px height, 1px border, 6px radius
- Save button: bottom-right, sticky on mobile

### Empty State
- Illustration: abstract geometric (purple gradient shapes)
- Heading: 24px, 300 weight
- Subtext: 16px, #4F566B
- CTA: purple primary button
