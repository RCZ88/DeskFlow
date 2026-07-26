# PROMPT.md — Resume Preview Fix

## Raw Request (Verbatim)

"also, the preview is not really that convincing at all. it doesnt have that like resume style formality and like the fonts and like the paper, and everything about it is like not working showing properly with the proper style and stuff. how about the lines and everything? and like how does it handles lines and like other formattings and proper formatting and like the tabs and indents. i need you to generate prompt"

---

## Context Bundle Reference

Read `agent/docs/generate-prompt-docs/resume-preview-fix/CONTEXT_BUNDLE.md` first. It contains:
- Full current source code of ResumePreview.tsx (137 lines)
- List of specific problems with the current implementation
- Reference of what a real professional resume looks like
- Design system constraints (ATS-safe, single column, inline styles)

---

## Problem Statement

The resume preview component (`ResumePreview.tsx`) currently looks like a raw text dump, not a professionally formatted resume. Specific issues:

1. **Font:** Generic Arial — needs proper resume typography hierarchy
2. **Section dividers:** Thick black `1px solid #000` lines — should be thin gray lines
3. **Contact format:** Pipe-separated (`|`) — should use bullet separators (•)
4. **Experience headers:** `Role | Company | Location | Dates` — should be properly formatted with role on left, dates on right
5. **Bullets:** No proper spacing, no visual hierarchy between bullets
6. **Skills:** Just `Category: items` — needs structured two-column or labeled layout
7. **Margins/spacing:** Inconsistent, doesn't look like a real 8.5x11 page
8. **Overall:** Lacks the formality and structure of a real tech resume

---

## Engineering Task

**Rewrite `ResumePreview.tsx`** to produce a convincing, professionally formatted resume that looks like it was made in Word/Google Docs — NOT like a text dump.

### Typography Hierarchy
```
Name:        18-20pt, bold, #1a1a2e (dark navy), centered
Contact:     9-10pt, #444, centered, separated by • (bullet char)
Section H2:  11pt, ALL CAPS, bold, #1a1a2e, thin line below
Role/Title:  11pt, bold, #1a1a2e
Company:     11pt, regular or italic, #333
Dates:       10pt, #555, right-aligned (use float:right or flex)
Bullets:     10.5pt, #333, proper • character, 4pt spacing
Skills cat:  10.5pt, bold or semi-bold, #1a1a2e
Skills items: 10.5pt, regular, #333
```

### Section Dividers
```
BEFORE (bad):  borderBottom: '1px solid #000'
AFTER (good):  borderBottom: '0.5px solid #999' or '1px solid #ccc'
               marginTop: '12pt', marginBottom: '6pt'
```

### Contact Line
```
BEFORE (bad):  {location} | {phone} | {email} | {linkedin}
AFTER (good):  {location} • {phone} • {email} • {linkedin}
               centered, 9pt, #444
```

### Experience Entry Format
```
BEFORE (bad):
  roleTitle | company | location | dates
  • bullet text

AFTER (good):
  Role Title                                    Jan 2022 – Present
  Company Name | Location
  
  • First bullet with proper spacing
  • Second bullet with proper spacing
  • Third bullet with proper spacing
```

Use flex layout: role left, dates right. Company on next line, italic or lighter color.

### Bullet Formatting
```
• character: Unicode bullet (U+2022), NOT hyphen or dash
Spacing: marginTop: '3pt' between bullets
Indent: paddingLeft: '18pt' from left margin
Line height: 1.3 for bullets
```

### Skills Layout
```
Option A (inline):
  Languages:     TypeScript, Python, Go
  Frameworks:    React, Next.js, Node.js

Option B (two-column):
  Languages          Frameworks           Infrastructure
  TypeScript         React                AWS
  Python             Next.js              Docker
  Go                 Node.js              Kubernetes
```

Use a table-like layout with proper column alignment. Category labels bold, items regular.

### Page Dimensions
```
Width: 8.5in (816px at 96dpi)
Min-height: 11in (1056px at 96dpi)
Padding: 0.6in-0.75in (58-72px) — NOT p-10 (40px)
Background: white
Shadow: subtle, not heavy
```

---

## Design Tasks

### Visual Specs — Exact Values

**Page Container:**
```
background: #ffffff
padding: 0.75in (72px)
width: 8.5in
min-height: 11in
font-family: 'Arial', 'Helvetica Neue', sans-serif
font-size: 10.5pt
line-height: 1.3
color: #333333
box-shadow: 0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.08)
```

**Name:**
```
font-size: 18pt
font-weight: 700
color: #1a1a2e
text-align: center
margin-bottom: 4pt
letter-spacing: 0.5pt
```

**Contact:**
```
font-size: 9.5pt
color: #555555
text-align: center
margin-bottom: 10pt
separator: ' • ' (space, bullet, space)
```

**Section Header:**
```
font-size: 11pt
font-weight: 700
color: #1a1a2e
text-transform: uppercase
letter-spacing: 1pt
border-bottom: 0.5pt solid #999999
padding-bottom: 3pt
margin-top: 14pt
margin-bottom: 6pt
```

**Experience Entry:**
```
Row 1 (flex): 
  Left: roleTitle, 10.5pt, bold, #1a1a2e
  Right: dates, 10pt, #666
Row 2:
  company, 10.5pt, italic, #444
  separator: ' | '
  location, 10.5pt, #444
Row 3 (bullets):
  marginTop: 4pt
```

**Bullet:**
```
font-size: 10.5pt
color: #333333
margin-top: 3pt
line-height: 1.3
padding-left: 18pt
list-style-type: none (remove default)
::before: content: '•'; position: absolute; left: 0; color: #333
```

**Skills Category:**
```
display: inline-block
font-weight: 600
color: #1a1a2e
margin-right: 6pt
```

**Skills Items:**
```
display: inline
color: #444
```

---

## UX Tasks

### Empty States
- If a section has no data, don't render the section header
- If ALL sections are empty, show: "Start filling in your resume to see a preview"
- If only name is set, show name centered with "Complete the builder to see your full resume"

### Loading State
- While content is loading, show a skeleton matching the resume layout
- Use pulsing gray blocks matching the shape of each section

---

## Constraints

1. **ATS-safe fonts only:** Arial, Calibri, Times New Roman, Helvetica — NO custom web fonts
2. **Single column layout** — ATS requirement, no sidebars or multi-column
3. **Inline styles only** for the resume content — NOT Tailwind classes (because it simulates a real document)
4. **No tables or graphics** — text-only formatting
5. **Must scale properly** with the `scale` prop — transform-origin: top left
6. **White background always** — even in dark mode, the resume paper is white

---

## Files to Modify

1. `src/features/resume/components/ResumePreview.tsx` — Complete rewrite of the styled mode

## Files to Reference

1. `agent/docs/generate-prompt-docs/resume-preview-fix/CONTEXT_BUNDLE.md` — Current code + problems
2. `src/features/resume/components/ResumePreview.tsx` — The file to modify
