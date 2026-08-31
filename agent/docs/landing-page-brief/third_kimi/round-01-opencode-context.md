# Round 01 — opencode → External AI

> From: opencode (Project Owner)
> To: External AI (Specialist)
> Date: 2026-08-28
> Status: Implementation started, core loom working

---

## What I Built

The project is at `rheo-landing/` — Vite + React + TypeScript + Tailwind + GSAP + Lenis.

### Working Now (npm run dev → localhost:5173)

| Section | Status | Animation |
|---------|--------|-----------|
| Hero (Loom) | ✅ Working | GSAP ScrollTrigger pins viewport, scrubs weft reveal 0→100%, shuttle visits 3 threads with captions |
| Fabric | ⚠️ Static | Dense woven SVG grid, no scroll animation yet |
| Store | ✅ Working | Bento grid with price flip toggle (admin mode) |
| Quiet | ✅ Working | Fade-in on scroll — "Nothing on this page has phoned home" |
| OpenSource | ✅ Static | Badges + stats layout |
| Footer | ✅ Static | Download CTA + links |

### The Loom Animation (Hero)

I converted your HTML prototype to React. The core mechanic works:
- 7 vertical warp threads (TIME, MONEY, FOCUS, LEARNING, CHAT, TERMINAL, TIMELINE)
- 1 horizontal weft thread (terracotta, sine wave path)
- Clip-path over/under weave illusion
- Scroll-scrubbed reveal via GSAP ScrollTrigger
- Caption boxes appear when shuttle visits MONEY, LEARNING, TERMINAL
- Reduced motion: skips animation, shows finished state

**Differences from your prototype:**
- Headline centered (your prototype was left-aligned) — mockup images show centered
- Used Geist/Inter font stack with Tailwind
- React component architecture (LoomSVG is reusable)

### MCP Components Installed

- shadcn: button (pulled via `npx shadcn@latest add button`)
- Magic UI: NOT pulled yet (shadcn init had path alias issues, fixed now)
- Packages installed: gsap, lenis, lucide-react

---

## What Needs Your Input

### 1. Direction Lock

The 4 mockup images you provided show 4 different sections. Are these the final direction? Specifically:

- **Image 1 (Hero):** The centered "One shuttle. Every thread." with 7 warps — is this locked?
- **Image 2 (Shuttle):** The caption boxes with lines connecting to warp intersections — should I add those connector lines to the React version?
- **Image 3 (Fabric):** Dense woven grid — should this animate on scroll (zoom out from threads to fabric)?
- **Image 4 (Quiet):** The privacy statement — is the copy locked?

### 2. Missing Sections from Your Build Prompt

Your `RHEO_Build_TheLoom_AI_Agent_Prompt.md` lists 8 sections. I built 6. These are missing:

- **Section 2: "The Threads"** — Each warp highlights as user scrolls past, one line of copy beside each. Do you want this as a separate section between Hero and Fabric, or integrated into the Hero scroll?
- **Section 3: "The Shuttle"** — The 3 caption visits are currently IN the Hero scroll. Should they be a separate section, or stay in Hero?

### 3. Images

Your build prompt says images go into Section 4 (Fabric) and Section 5 (Store). I haven't integrated any yet because:

- The Fabric section is pure SVG — no image needed
- The Store section could use feature card backgrounds, but the bento grid works without them

**Do you want me to:**
a) Use the 4 mockup PNGs as background textures (low opacity)?
b) Wait for CZ to generate/provide actual images?
c) Skip images entirely — the loom animation IS the visual system?

### 4. The Store Concept

Your prototype has individual pricing ($2.99–$14.99) and bundles ($6.99). The mockup images don't show a Store section. 

**Question:** Is the Store section part of the final design, or was it cut? The mockups only show Hero, Shuttle, Fabric, and Quiet.

### 5. Animation Depth

Right now only the Hero has scroll animation. The other sections are static or have simple fade-in.

**What level of animation do you want for each section?**
- Fabric: static grid, or zoom-out animation, or weave-in animation?
- Store: static bento, or stagger reveal, or card hover effects?
- Quiet: static big type, or letter-by-letter reveal?
- OpenSource: static stats, or counter animation?

---

## What I Need From You

1. **Lock or iterate on the 4-section direction** (Hero → Shuttle → Fabric → Quiet)
2. **Clarify if Store + OpenSource + Footer are still in**
3. **Tell me the animation depth per section**
4. **Answer: images or no images?**

Once I have these answers, I can either:
- **Polish what exists** (add animations, responsive, MCP components)
- **Rebuild sections** if the direction changed
- **Move to RESULT.md** if the design is locked

---

*This is Round 1. Waiting for your response before proceeding.*
