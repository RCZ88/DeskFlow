# RHEO Landing Page — Process Roadmap

> **Current Status:** External AI has produced "The Loom" prototype (sections 1-3)  
> **Next Decision Point:** Commit to The Loom, or iterate?  
> **Your Action Needed:** Confirm direction → I produce RESULT.md → Implementation begins

---

## WHAT JUST HAPPENED (The External AI's Output)

The external AI (Claude) did something unusual — it skipped the typical "design direction candidates" phase and went straight to building a **working HTML prototype**. This is actually good: we have a functional proof-of-concept instead of just static mockups.

### What You Received

1. **4 static images** — Claude admitted these were a mistake. The Loom is a line-diagram concept, and AI image generators are bad at precise geometric lines + exact typography. These images are NOT useful as final assets.

2. **`rheo-the-loom-brief.md`** — The design brief. This is the creative vision document.

3. **HTML prototype** — A working GSAP scroll-pinned animation showing:
   - 7 vertical warp threads (TIME, MONEY, FOCUS, LEARNING, CHAT, TERMINAL, TIMELINE)
   - 1 horizontal weft thread weaving over/under via clip-path
   - Hero text fade-in
   - 3 caption boxes (Finance, Learning, Terminal)
   - Reduced motion support

### What the Prototype Proves

✓ The weave animation works (clip-path over/under illusion)  
✓ Scroll-scrubbed GSAP timeline is smooth  
✓ The metaphor reads visually (threads + shuttle = modular + AI)  
✓ Reduced motion fallback works  

### What the Prototype Does NOT Prove

✗ Sections 4-8 are unbuilt (Fabric, Store, Quiet, Open Source, Footer)  
✗ No responsive design  
✗ Not integrated into React/Vite  
✗ Uses Inter font instead of Geist  
✗ No real component system (just raw HTML/CSS/JS)

---

## THE DECISION YOU NEED TO MAKE NOW

### Option A: Commit to "The Loom"

**If you say YES:**
1. I immediately produce **RESULT.md** — the complete implementation spec for all 8 sections
2. I begin converting the prototype to **React + Vite + TypeScript**
3. I build out the missing sections (4-8)
4. I integrate Magic UI components, responsive design, proper fonts
5. Timeline: ~2-3 weeks for full implementation

**What RESULT.md will contain:**
- Exact copy for every section (headlines, body, CTAs)
- Animation parameters (GSAP timelines, scroll triggers, easing)
- Component sourcing (which MCP components for each section)
- Color tokens, typography, spacing
- Mobile responsive behavior
- Reduced motion fallbacks
- File structure

### Option B: Iterate on The Loom

**If you say "ALMOST but change X":**
1. I relay your feedback to the external AI
2. External AI produces revised prototype
3. We loop until satisfied
4. Then proceed to RESULT.md

### Option C: Reject The Loom, Try Another Direction

**If you say NO:**
1. I send the external AI your rejection + reasons
2. External AI produces new candidate(s)
3. We repeat the prototype → review cycle

---

## MY RECOMMENDATION

**Commit to The Loom.** Here's why:

1. **The metaphor is precise** — "threads + shuttle = modular + AI-native" communicates both key messages in one visual system
2. **The prototype proves the hardest part** — the weave animation works. Everything else is standard web development
3. **The remaining sections are straightforward** — Fabric (CSS mask), Store (bento grid), Quiet (big type), Open Source (badges + stats), Footer (wave + links)
4. **The external AI already invested in this** — iterating now means losing that momentum
5. **It's distinctive** — no other landing page looks like a loom. That's the point.

**The only changes I'd make before committing:**
- Swap Inter → Geist font
- Add responsive breakpoints
- Clarify the Fabric section's technical approach (CSS mask-image vs Rive vs canvas)

---

## WHAT HAPPENS AFTER YOU SAY YES

### Phase 1: RESULT.md (1-2 days)
I produce the complete specification document. You review and approve.

### Phase 2: Foundation Setup (2-3 days)
- Initialize Vite + React + TypeScript project
- Install dependencies (GSAP, Lenis, Motion.dev, Lucide)
- Configure Tailwind with custom tokens
- Set up file structure
- Pull Magic UI components

### Phase 3: Core Sections (1 week)
- Convert prototype sections 1-3 to React
- Build section 4 (Fabric)
- Build section 5 (Module Store)
- Build section 8 (Footer)

### Phase 4: Advanced Sections (1 week)
- Build section 6 (The Quiet Section)
- Build section 7 (Open Source)
- Integrate all sections with smooth scroll
- Add responsive breakpoints

### Phase 5: Polish (2-3 days)
- Performance optimization
- Reduced motion testing
- Cross-browser testing
- Lighthouse audit (target 90+)
- Mobile testing

### Phase 6: Deploy (1 day)
- Build for production
- Deploy to rheo.work.gd
- Test live site

**Total timeline: ~3 weeks**

---

## WHAT I NEED FROM YOU RIGHT NOW

**Just one word:**

| You say | What happens |
|---------|-------------|
| **"YES"** | I start RESULT.md immediately |
| **"ALMOST"** | Tell me what to change, I relay to external AI |
| **"NO"** | Tell me why, I request new direction from external AI |
| **"SHOW ME"** | Open the fixed prototype and scroll through it first |

---

## THE FIXED PROTOTYPE

I've created a version that should work reliably:

**[RHEO_TheLoom_Prototype_Fixed.html](sandbox:///mnt/agents/output/RHEO_TheLoom_Prototype_Fixed.html)**

### How to test it:

**Option A — Direct open (needs internet):**
Just double-click the file. It loads GSAP from CDN with fallback.

**Option B — Local server (recommended):**
```bash
cd /mnt/agents/output
npx serve .
# Then open http://localhost:3000/RHEO_TheLoom_Prototype_Fixed.html
```

**Option C — If it still doesn't work:**
The HTML itself is fine. The issue is GSAP loading. Check browser console (F12 → Console) for errors.

---

## IF YOU WANT TO SEE MORE BEFORE DECIDING

I can also:

1. **Build section 4 (The Fabric)** as a quick prototype — show the payoff moment where threads resolve into a pattern
2. **Build section 5 (Module Store)** wireframe — show how the $2.99/$6.99 pricing fits into the loom metaphor
3. **Create a Figma-style mockup** of all 8 sections as static diagrams

Just ask.

---

## THE BOTTOM LINE

We're at the **design → implementation** boundary. The external AI has done its job — it produced a creative direction + working prototype. Now it's my job (opencode) to turn that into production code.

**The only thing blocking us is your decision:** Is The Loom the one?

---

*This document is your process map. Keep it as reference. The next document will be RESULT.md — the technical contract for implementation.*
