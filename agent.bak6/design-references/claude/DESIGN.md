# Claude Design System

## Overview

Warm, approachable AI interface. Terracotta and cream tones create a human feeling without sacrificing clarity. The design feels like a conversation with a thoughtful expert.

## Design Tokens

### Colors
```
Background:    #FAF6F1 (warm cream)
Surface:       #FFFFFF (pure white cards)
Elevated:      #F5F0EB (subtle warm gray)
Accent:        #D97757 (terracotta)
Accent Hover:  #C46A4A (deeper terracotta)
Text Primary:  #1A1A1A (near black)
Text Secondary:#6B6B6B (warm gray)
Text Muted:    #A3A3A3 (light gray)
Border:        #E8E4DF (warm border)
Success:       #2D6A4F (forest green)
Warning:       #B35900 (burnt orange)
Error:         #C0392B (brick red)
```

### Typography
```
Font Family:   "SF Pro Display", -apple-system, sans-serif
Heading:       600 weight, -0.02em letter-spacing
Body:          400 weight, 0 line-height 1.6
Code:          "SF Mono", monospace, 400 weight
Small:         13px, 1.5 line-height
```

### Spacing
```
Base Unit:     8px
Card Padding:  24px
Section Gap:   32px
Page Margin:   48px (desktop), 24px (mobile)
```

## Components

### Message Bubble
- Background: white with `box-shadow: 0 1px 3px rgba(0,0,0,0.08)`
- Border-radius: 16px (user), 12px (assistant, slightly more organic)
- Padding: 20px 24px
- Max-width: 680px
- Avatar: 32px circle, terracotta background with white initial

### Input Bar
- Background: white
- Border: 1px solid #E8E4DF
- Border-radius: 24px
- Height: 48px
- Focus: border-color transitions to terracotta, subtle glow
- Shadow on focus: `0 0 0 3px rgba(217,119,87,0.15)`

### Button (Primary)
- Background: terracotta
- Text: white, 500 weight
- Padding: 10px 20px
- Border-radius: 8px
- Hover: deeper terracotta, `translateY(-1px)`
- Active: `translateY(0)`, darker still

### Sidebar
- Background: #FAF6F1
- Width: 260px
- Border-right: 1px solid #E8E4DF
- Nav items: 14px, warm gray, hover -> terracotta with light background

## Patterns

### Conversation Flow
- Messages stack with 16px gap
- User messages right-aligned, assistant left-aligned
- Thinking indicator: three dots with staggered fade animation
- New message entrance: fade up + slight scale from 0.98

### Empty State
- Centered illustration (abstract terracotta shapes)
- Heading: "How can I help you today?"
- Subtext: "Ask me anything or try one of these suggestions"
- Suggestion chips: outlined buttons with hover fill

### Loading State
- Skeleton: warm gray (#E8E4DF) pulsing at 1.5s interval
- Never block the entire UI — skeletons inline with content
