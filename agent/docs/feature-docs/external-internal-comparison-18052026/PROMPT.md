# 📝 Design Prompt: External vs Internal Comparison — Shareable Social Media Visualization

## Raw Request
> "I would like you to make a clear comparison in terms of like a you can make some sort of visual charts or whatever visual data representation for the external versus the internal research what does mean is that is this charter form of data representation is meant to display the comparison between my user and my time on the external and my time internally which means using the device right because I just realized that my external activity is actually like way more even though the external activity is only implement a few days ago so that means that reproductive hour when reproductive using the application or using the thing not to mention that the low productivity means that very productivity is even lower right so I think that's just A few things I would like you to fix I need you to also make sure that everything is designed properly... the chart needs to be something unique something interesting and in the future I would like to implement something like a something that can be shareable so something that can be screen shotted or something that can be shared in form of image that can show our statistics status in the and then good design something I can post in the social media or something like that"

## Problem Statement
The user wants a visually striking comparison between EXTERNAL activity (sleep, stopwatch sessions tracked via the external timer) and INTERNAL/device activity (app usage tracked on the computer). External data has only been implemented for a few days, so the comparison is eye-opening — external time is much higher than internal time, which makes the already-low productivity even lower. The user wants this presented as a shareable, screenshot-friendly graphic suitable for posting on social media.

## Engineering Task
**Data Processing Pipeline:**
1. Aggregate EXTERNAL time: sum of all completed `external_sessions` (sleep + stopwatch) within the selected period. Show breakdown: sleep hours vs other external activities.
2. Aggregate INTERNAL time: sum of all `logs` (device/app usage) within the same period. This is the total tracked device time.
3. Compute percentages: what % of total tracked time is external vs internal.
4. Compute "productivity context": if productivity % is low (e.g., <50%), show how external time compounds the issue.
5. Period-aware: today's data vs week vs month vs all.

## High-Fidelity Visual Specs

**Design Direction:** Bold, editorial, social-media-optimized. Must be visually memorable — not a generic bar chart.

**Concept:** A "Time Audit" infographic — a single, self-contained card that tells a story at a glance. Like a personal analytics snapshot you'd see in a productivity app or a fintech dashboard.

**Visual Elements:**
1. **Large hero number** — Total external hours vs total internal hours (e.g., "43h External / 12h Internal"). These numbers should be large, bold, and use a typeface that stands out. Perhaps use a display font like "Syne" or "Barlow Condensed" for impact.
2. **Split visualization** — A horizontal split showing external vs internal as contrasting areas. Maybe a two-tone background (one side dark, one side slightly different) with the data overlaid.
3. **Color palette:** 
   - External: Warm amber/gold tones (sleep, warmth, rest)
   - Internal: Cool emerald/cyan tones (device, active, screen time)
   - Background: Dark rich gradient (not flat black — something with depth)
4. **Percentage indicators** — Pie-style or radial progress showing external vs internal split.
5. **Context callout** — "External time is 3.6x your device time" or "78% of your tracked time is outside screens" in a highlighted box.
6. **Productivity overlay** — If showing weekly/monthly, include a small badge showing "Productivity: X%" with a note about how external time impacts it.
7. **Period label** — "This Week" / "This Month" prominently displayed.

**Shareability:**
- Card should be self-contained (no need for surrounding UI to make sense)
- High contrast, readable even as a small thumbnail
- Include a subtle watermark or brand element (e.g., "via DeskFlow" or the app icon)
- Consider adding decorative elements: subtle grain overlay, geometric accent shapes, or a moon/sun motif to reinforce external/internal duality

**Layout:** Vertical card, optimized for 1080x1350 (Instagram portrait) or 1200x630 (Twitter/OpenGraph). The card should look great when cropped to these formats.

## Interaction Flow
- Period selector (Today/Week/Month/All) — data updates, chart redraws with new numbers
- Timeline navigation (chevrons) — shifts the date range
- The component should be self-contained — no surrounding page context needed for it to look good

## Constraints
- Must integrate with existing ExternalPage layout (but can be visually distinct)
- Must use existing `external_sessions` and `logs` data
- Build must pass
- Must be screenshot-friendly (works at different viewport sizes)
- Should NOT require external image assets — all decorative elements via CSS/SVG