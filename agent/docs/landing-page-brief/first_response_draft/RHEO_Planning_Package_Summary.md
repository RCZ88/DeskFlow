# RHEO Landing Page — Planning Package Summary

> **Project:** RHEO Landing Page
> **Status:** Planning Phase Complete
> **Date:** 2026-08-28
> **Documents:** 4 comprehensive specs ready for implementation

---

## What We've Built

This planning package contains everything needed to implement an exceptionally high-quality landing page for RHEO. No AI slop. Every animation has intention. Every section has a purpose.

### The Core Concept: "The River of Time"

The entire landing page is built around a **river metaphor** that aligns perfectly with RHEO's identity:
- **RHEO** means "flow" in Greek
- Time flows like a river (scrolling = flowing downstream)
- Data accumulates like sediment
- AI is the current that organizes everything
- Life phases are tributaries joining the main stream

### The 8-Section Journey

```
THE SOURCE (Hero)        → WebGL flow-field shader + massive typography
    ↓
THE CURRENT (Philosophy) → ASCII decode effect + 3 pillars
    ↓
THE TRIBUTARIES (Features) → Asymmetric bento grid with 8 cards
    ↓
THE DEPTHS (AI)          → Pinned scroll + morphing force-directed graph
    ↓
THE LANDSCAPE (Data)     → Contour isolines + animated counters
    ↓
THE WORKSHOP (Store)     → Modular store with 3D price flip gimmick
    ↓
THE DELTA (Download)     → Converging particles + ripple CTA
    ↓
THE BANK (Footer)        → SVG wave + minimal links
```

---

## Documents in This Package

### 1. Master Design Specification
**File:** `RHEO_Landing_Page_Design_Spec.md`
**Contents:**
- Design philosophy & identity
- Visual direction (colors, typography, motion density)
- Section-by-section design spec (all 8 sections)
- Animation & motion strategy
- Component sources (MCPs, libraries)
- Technical stack & file structure
- Store concept detailed design
- Responsive strategy
- Accessibility requirements
- Asset requirements
- Implementation roadmap (4 weeks)
- Open questions for CZ

### 2. Section Map
**File:** `RHEO_Section_Map.png`
**Contents:**
- Visual diagram of all 8 sections
- Color-coded by section type
- Animation notes per section
- Scroll flow arrows

### 3. Component Sourcing Guide
**File:** `RHEO_Component_Sourcing_Guide.md`
**Contents:**
- Animation library setup (Motion.dev, GSAP, Lenis)
- MCP component sources (shadcn, magicui, reactbits)
- Custom components to build (6 components)
- 3D/WebGL strategy
- Scroll animation architecture
- Performance budget
- Implementation order

### 4. Copy Draft
**File:** `RHEO_Copy_Draft.md`
**Contents:**
- All headlines, subtitles, body copy
- CTAs and microcopy
- Feature card descriptions
- Store item names and prices
- Navigation labels
- Accessibility labels
- Tone check

---

## Key Design Decisions

### Identity
- **Feel:** Living command center — controlled power, organic precision
- **Tone:** Confident but warm, technical but human
- **One thing to remember:** "Your time leaves traces. RHEO makes them visible."

### Visual System
- **Background:** Deep void black (`#050505`) to zinc (`#09090b`)
- **Accent:** Amber gold (`#fbbf24`) — consistent with app
- **Secondary:** Teal (`#14b8a6`) for growth, Coral (`#fb7185`) for data
- **Typography:** Geist (display/body), JetBrains Mono (labels/code)
- **Glass morphism:** `rgba(24,24,27,0.60)` + backdrop-blur

### Animation Strategy
- **Global:** Lenis smooth scroll + GSAP ScrollTrigger
- **Hero:** Custom WebGL shader (reaction-diffusion + flow field)
- **Philosophy:** ASCII code rain decode effect
- **Features:** Bento grid stagger reveal + per-card micro-animations
- **AI Depths:** Pinned scroll with morphing force-directed graph
- **Landscape:** Contour isolines + animated counters
- **Store:** 3D price flip cascade on admin toggle
- **Download:** Converging particles + ripple button

### The Store Concept
- **Visual metaphor:** RHEO is modular, build your own
- **Fake prices:** Clearly playful ($4.99, $9.99, $14.99)
- **Admin toggle:** Flips all prices to "Included" with 3D animation
- **Purpose:** Communicates modularity, not real commerce

---

## Technical Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 19 + Vite |
| Language | TypeScript |
| Styling | Tailwind CSS 4 |
| Animation | Motion.dev + GSAP + Lenis |
| 3D/WebGL | React Three Fiber (existing) |
| Icons | Lucide React |
| Fonts | Geist + JetBrains Mono |

---

## Available MCPs (Connected)

| MCP | Use For |
|-----|---------|
| shadcn-ui-mcp | Buttons, cards, badges, switches |
| magicui | Animated beams, particles, border effects |
| reactbits | Backgrounds, text animations |
| google-design-mcp | Material icons, fonts |
| stitch | Mockup generation |

---

## Open Questions for CZ

1. **Hero shader:** Use existing Morphogen code as base, or new flow-field shader?
2. **Screenshots:** Do you have app screenshots for feature cards?
3. **Store prices:** Humorous ($4.20, $1337) or realistic?
4. **Download URL:** GitHub releases page?
5. **Domain:** `rheo.app`, `rheo.dev`, or subdirectory?
6. **Analytics:** Privacy-respecting (Plausible) or zero tracking?

---

## Next Steps

1. **Review** these documents and answer the open questions
2. **Approve** the design direction or request changes
3. **Implementation** can begin with Phase 1 (foundation)
4. **Iterate** — we can refine any section before coding

---

*This is a fully planned, over-engineered, intention-driven design system. Every animation serves the narrative. Every section advances the story. No AI slop.*
