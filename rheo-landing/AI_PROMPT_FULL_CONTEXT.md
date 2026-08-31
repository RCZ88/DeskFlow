# RHEO Landing Page — Mascot Integration & Full Context for Higher AI Models

**Project:** RHEO (local-first, privacy-first desktop app)
**Page:** Landing page — creative direction "The Loom"
**Location:** `C:\Users\cleme\Documents\COMPUTAH_SAYENCE\App Tracker\rheo-landing\`

---

## 1. What This Page Is

RHEO's landing page creative direction is **"The Loom"**: RHEO's subsystems are threads on one loom, and its AI is the shuttle running through all of them. The whole design rests on **one rule**: reuse a single motif (thread / stitching / patches) everywhere. If you add anything that doesn't read as "made of thread," you're breaking the thing that makes this design work.

---

## 2. Current Page Structure (6 Beats in App.tsx)

### Beat 1 — Hero (`Hero.tsx`, pinned, ~420vh)
- Sticky full-screen stage with the SVG loom (`LoomSVG.tsx`)
- Headline: "One shuttle. Every thread."
- Subtext: "AI doesn't sit in a chat window. It runs through everything you track."
- 7 vertical warp lines (TIME, MONEY, FOCUS, LEARNING, CHAT, TERMINAL, TIMELINE)
- Animated weft thread weaving through (sine wave at y≈380)
- Glow dots at weft/warp crossings
- 3 caption boxes appear at scroll positions: MONEY (Finance), LEARNING (Learning), TERMINAL (Terminal)
- **7 mascot images positioned above each warp label** (HERO_MASCOTS array)
  - TIME → mascot-time.png, MONEY → mascot-money.png, FOCUS → mascot-time.png (reused), LEARNING → mascot-learning.png, CHAT → mascot-chat.png, TERMINAL → mascot-terminal.png, TIMELINE → mascot-timeline.png
  - Position: top:82%, width:48, height:48 (64×64px in style), object-fit:contain
  - Fade in staggered with transitionDelay: i*0.1s
  - Scale up when active warp: `scale(1.25)`

### Beat 2 — Threads (`Threads.tsx`, ~200vh)
- 7 vertical lines matching hero warps, with labels at y=752
- Each thread highlights in sequence as you scroll (activeIndex state)
- Description panels appear beside the active thread
- Labels render with fill: `#71717a` (inactive) / `#fbbf24` (active) — explicitly set inline
- **No mascot images**

### Beat 3 — Fabric (`Fabric.tsx`, ~150vh)
- Zoom-out payoff from woven fabric
- Dense vertical+horizontal grid
- Text overlay: "The fabric emerges. Fifteen subsystems. One thread running through all of them."
- No mascots

### Beat 4 — ModuleStore (`ModuleStore.tsx`)
- "Spare threads you can add"
- 14 patch cards in responsive grid (2/3/4 cols)
- Each card: mascot image (56×56px, w-14 h-14, object-contain) + label + description
- Subsystems: time, money, focus, learning, chat, terminal, timeline, goals, life-phases, agent-orchestration, content-creation, external, context-brain (13 labels, 14 entries with 'focus')
- Images at 56×56 with object-contain, amber ring border, hover scale
- Note: 'focus' entry references mascot-focus.png which does NOT exist

### Beat 5 — Quiet (`Quiet.tsx`)
- Post-store section

### Beat 6 — Closing (`OpenSource.tsx` + `Footer.tsx`)
- Open source section + footer

**MISSING: The Shuttle beat** — the handoff mentions "Shuttle (AI captions on 3 of them)" as a distinct beat between Threads and Fabric, but it does not appear in App.tsx or as a component file.

---

## 3. The 12 Mascot PNG Assets

All in `public/assets/mascots/`. All removebg (transparent background), 677×369px, aspect ratio 1.835.

| # | Filename | Subsystem | Size |
|---|----------|-----------|------|
| 1 | mascot-time.png | Time/Focus | 184.8KB |
| 2 | mascot-money.png | Money | 228.7KB |
| 3 | mascot-learning.png | Learning | 343.0KB |
| 4 | mascot-chat.png | Chat | 195.9KB |
| 5 | mascot-terminal.png | Terminal | 259.4KB |
| 6 | mascot-timeline.png | Timeline | 244.2KB |
| 7 | mascot-goals.png | Goals | 276.4KB |
| 8 | mascot-life-phases.png | Life Phases | 253.6KB |
| 9 | mascot-agent-orchestration.png | Agent Orchestration | 391.7KB |
| 10 | mascot-content-creation.png | Content Creation | 101.6KB |
| 11 | mascot-external.png | External | 219.3KB |
| 12 | mascot-context-brain.png | Context Brain | 280.1KB |

Mapping from handoff (`rheo-mascot-image-prompts.md`): 1=Time/Focus, 2=Money, 3=Learning, 4=Chat, 5=Terminal, 6=Timeline, 7=Goals, 8=Life Phases, 9=Agent Orchestration, 10=Content Creation, 11=External, 12=Context Brain.

**Important:** `mascot-focus.png` does NOT exist. FOCUS warp reuses TIME's mascot.

---

## 4. Key Source File Contents

### `src/components/LoomSVG.tsx`
- 7 WARPS: TIME(x:100), MONEY(x:300), FOCUS(x:500), LEARNING(x:700), CHAT(x:900), TERMINAL(x:1100), TIMELINE(x:1300)
- Weft path: sine wave at y0=380, amp=26, freq=2.6
- Warp lines: stroke `1.5px`, opacity 0.9; active warp gets `#fbbf24`, 3px, opacity 1
- Warp labels: `<text>` at y=752, class `.warp-label`, textContent = label
  - **PROBLEM: No `fill` attribute set on labels** — renders black on #09090b background = invisible
  - In the original HTML prototype (`rheo-loom-prototype-v2.html`), labels were styled with CSS `fill: var(--text-secondary)` or similar
- Clip paths: `#clipOver` (over rectangles), `#clipUnder` (under rectangles) for woven over/under look
- Reduced-motion: `reduced` prop sets initial dashoffset to 0 and dot opacity to 0.9

### `src/sections/Hero.tsx`
- HERO_MASCOTS: 7 entries (FOCUS reuses TIME)
- Mascot images: style width:48, height:48 (=64×64px computed), objectFit:'contain', top:'82%', left:pctX%
- Active warp: scale(1.25), amber drop-shadow
- Fade in: opacity 0→1 with staggered transitionDelay
- 3 CAPTIONS: MONEY, LEARNING, TERMINAL — appear at scroll progress thresholds
- **BUG: Only 4 of 7 hero threads actually show visible icons** — likely because images 1-6 cover only 6 unique warps (FOCUS reuses TIME), and image loading/overlap causes some to be invisible. User explicitly complains "only 4 of 7 show icons"

### `src/sections/Threads.tsx`
- THREADS: 7 entries matching WARPS
- activeIndex: calculated from scroll position
- Labels: fill explicitly set to `#71717a` (inactive) / `#fbbf24` (active) — these ARE visible
- Description panel: appears at marginLeft based on active thread x position
- **No mascots**

### `src/sections/ModuleStore.tsx`
- 14 MODULES entries (13 unique labels + duplicate 'focus')
- Images: w-14 h-14 (56×56px Tailwind), object-contain, amber ring border
- Card hover: border-amber/40, bg-amber/0.04, -translate-y-0.5
- **BUG: 'focus' entry (entry #4) references mascot-focus.png which doesn't exist** — will show broken image
- 'context-brain' references mascot-context-brain.png which DOES exist

### `src/App.tsx`
```tsx
<Hero />
<Threads />  (id="threads")
<Fabric />
<ModuleStore />
<Quiet />
<OpenSource />  (id="open-source")
<Footer />  (id="footer")
```
**Missing Shuttle beat between Threads and Fabric.**

---

## 5. Handoff Document Tasks (from `agent/docs/landing-page-brief/rheo-coding-agent-handoff.md`)

### Task 1 — Swap the patch sheet's icons
Target: `rheo-thread-patches.html` (does NOT currently exist in the landing project directory — was referenced in handoff but may be in a different location or not yet created)
- Replace each `.patch`'s inline SVG with `<img src="assets/mascots/mascot-<slug>.png" alt="<LABEL> mascot patch">`
- Keep `.patch` div's dashed border, background, mono label
- Add 6 new `.patch` entries for: goals, life phases, agent orchestration, content creation, external, context brain

### Task 2 — Add mascots to the live hero threads
Target: `rheo-loom-prototype-v2.html` (does NOT currently exist in the landing project directory)
- Add ~28–32px `<img>` mascot above each thread's label
- Position using `(w.x / W) * 100` pattern from `positionCaptions()`
- Fade in as part of the same staggered entrance tween that animates `warpEls.map(w=>w.lineEl)` and `.labelEl`
- Add mascot elements to that stagger, not a separate animation

### Task 3 — Give the other 6 subsystems a section
- Build "module-store section" — bento grid with border-beam hover effect
- Placed after Fabric beat, before Closing CTA
- Use all 12 mascots (repeating 6 hero ones is fine — reinforcement, not redundancy)
- Each card: mascot image, label, one-line description
- Match `rheo-thread-patches.html`'s `.patch` class style — no new card style

---

## 6. Current Status vs Handoff Tasks

| Task | Status | Notes |
|------|--------|-------|
| Task 1 (patch sheet) | **NOT STARTED** | `rheo-thread-patches.html` not found in landing dir. May exist elsewhere or need to be created from scratch. |
| Task 2 (hero mascots) | **PARTIALLY DONE** | Hero.tsx has 7 mascot images, but only 4 visible, FOCUS reuses TIME. In the React port, mascots were added to Hero.tsx rather than the HTML prototype. Positioning uses top:82% (close to handoff's percentage-based approach). But the handoff also says Thread beat is where mascots should appear "for the first time, paired" with labels — current code puts them in Hero (too early). |
| Task 3 (module-store) | **DONE (mostly)** | ModuleStore.tsx exists with 14 cards. But: (a) 'focus' entry has broken image ref, (b) 14 cards vs handoff's 12 (extra 'focus' entry is duplicate), (c) visual style uses amber ring border not dashed-border/glass-card from `.patch` class |

---

## 7. User Complaints (from conversation)

### Complaint 1: Black text labels on warp lines
"The text labels on the warp lines appear to have lost their color specificity — they're now rendering as black text on a black/dark background, making them invisible."
- **Root cause:** `LoomSVG.tsx` creates `<text class="warp-label">` elements without setting `fill`. Default SVG text fill is black. On #09090b background = invisible.
- **In original HTML prototype:** labels were styled with CSS to use the theme's text-secondary color
- **Fix:** Either set `fill` attribute on the SVG text elements, or add CSS that targets `.warp-label` within the loom SVG

### Complaint 2: Only 4 of 7 Hero threads show icons
"Out of 7 threads depicted in the Hero section, only 4 have an icon associated with them, indicating a potential issue in mapping or displaying the mascot images."
- **Root cause:** HERO_MASCOTS has 7 entries but FOCUS reuses TIME's image. Additionally, the 6 unique images (1-6) map to 7 warps with one overlap. The React code puts all 7 img elements in the DOM, but visual overlap, loading timing, or positioning may cause only 4 to be visibly distinguishable.
- **The handoff's revised understanding:** mascots should appear during the Threads beat (paired with labels for the first time), not in Hero. Hero should be metaphor-only.

### Complaint 3: Three sections redundantly showing feature lists
"The page presents the list of RHEO's features — its subsystems/themes — redundantly in at least 3 different sections (Hero, Threads, and ModuleStore), creating a disjointed narrative."
- Hero shows 7 threads as warp lines + icons (metaphor + literal)
- Threads shows 7 threads as labeled lines with descriptions
- ModuleStore shows 12-14 subsystems as patch cards
- **Discussion point:** Should Hero be more metaphorical (the loom, the shuttle, the weave — not naming every subsystem)? Should Threads be the "introduction" where each thread gets its first named appearance with icon? Should ModuleStore be the "full reference catalog"?

### Complaint 4: Labels "covered with icons"
"labels appear to be covered with icons" / "icon labels are misaligned/missing"
- In Hero.tsx, mascot images are at top:82% while warp labels in LoomSVG are at y=752 (which maps to ~94% of the 800-height viewBox). The images at 82% are well above the labels at 94%. But the user perceives the labels as "covered." This may be a perceptual issue or the images may be rendering larger than expected and overlapping label area.
- The 48×48px (64×64 actual) images at 82% top position with translate(-50%, -50%) center them at that point. At 82% of screen height, a 64px-tall image occupies roughly 82%±4%, which is above the 94% label position. May not actually be overlapping, but user perceives it.

### Complaint 5: Shuttle beat missing entirely
- The handoff describes: Hero → Threads → **Shuttle (AI captions on 3 of them)** → Fabric → Closing CTA
- Current App.tsx: Hero → Threads → Fabric → ModuleStore → Quiet → OpenSource → Footer
- The 3 AI captions (MONEY→Finance, LEARNING→Learning, TERMINAL→Terminal) currently appear in Hero.tsx as caption boxes, but the handoff says they belong to the Shuttle beat as a distinct section
- Shuttle beat should communicate "AI-native, not bolted on" — one of the 5 things the page must communicate

---

## 8. Prototype HTML Files

The handoff references two HTML files that explain the original design:

- **`rheo-loom-prototype-v2.html`** — working scroll prototype with GSAP ScrollTrigger. Sequence: Hero (weave draws in) → Threads (7 highlighted in turn) → Shuttle (AI captions on 3) → Fabric (zoom-out) → Closing CTA. Uses Lenis smooth scroll, custom easeInOutCubic, two-layer SVG clip-path (#clipOver/#clipUnder).
  - **Current location:** NOT FOUND in `rheo-landing/` directory. May be in a different location or was not copied into the React project.

- **`rheo-thread-patches.html`** — reference sheet of 7 hand-coded SVG patch icons with dashed border, in `.patch` cards inside `.grid`.
  - **Current location:** NOT FOUND in `rheo-landing/` directory.

- **`rheo-mascot-image-prompts.md`** — prompts used to generate the 12 PNG mascots.
  - **Current location:** NOT FOUND in `rheo-landing/` directory.

These files may exist in `agent/docs/landing-page-brief/` or another location. The AI should search for them.

---

## 9. What the Higher AI Models Should Discuss

### A. Fix the black warp-label text
- In `LoomSVG.tsx`: the `<text class="warp-label">` elements need `fill` set to a visible color (e.g., `var(--color-text-secondary)` / `#a1a1aa` or the theme's text color)
- Should this be done via inline `fill` attribute on each text element, or via CSS targeting `.warp-label` within the SVG context?
- Note: SVG CSS and inline attributes interact — inline `fill` wins over CSS in most cases

### B. Resolve the "4 of 7 icons" issue
- Is this a rendering bug (images not loading, overlap, positioning)? 
- Or is this the handoff's intended design evolution — Hero should NOT have per-thread icons, only Threads beat should introduce them?
- If the latter: remove mascot images from Hero.tsx entirely, add them to Threads.tsx as the handoff specifies

### C. Redesign the information hierarchy across 6 beats
Current: Hero (7 threads w/ icons) → Threads (7 threads w/ descriptions) → Fabric → ModuleStore (12-14 cards) → Quiet → Closing

Proposed discussion:
1. **Hero** — metaphor only: the loom, the shuttle, "One shuttle. Every thread." No per-thread icons, no per-thread labels. Let the weave animation speak. Maybe 1-2 abstract elements, not 7 named subsystems.
2. **Threads** — each of the 7 threads introduced here, paired with its mascot icon for the first time. The handoff's Task 2 describes exactly this: icon + label appearing together, faded in as part of the staggered entrance. This is each thread's "first meeting."
3. **Shuttle** (missing — needs to be added) — the 3 AI captions (Finance, Learning, Terminal) as a distinct beat. Shows that AI runs through specific threads. This communicates "AI-native, not bolted on."
4. **Fabric** — zoom-out payoff, "The fabric emerges." No mascots — it's about the whole, not individual threads.
5. **ModuleStore** — the full reference catalog. All 12 mascots, each as a patch card. This is where you see EVERYTHING. "Spare threads you can add." This is the catalog, not the introduction.
6. **Quiet + Closing** — remain as-is.

### D. Fix ModuleStore issues
- Remove the duplicate 'focus' entry (FOCUS is already covered by TIME in hero, and should appear in Threads beat)
- Should have exactly 12 entries matching the 12 mascots: time, money, learning, chat, terminal, timeline, goals, life-phases, agent-orchestration, content-creation, external, context-brain
- Visual style: should match `rheo-thread-patches.html`'s `.patch` class — dashed border, glass-card look. Currently uses amber ring border (w-[84px] h-[46px] with rounded-lg border border-amber/10). May need to adjust to match the handoff's `.patch` style.

### E. Shuttle beat — add it back
- Create a `Shuttle.tsx` component
- Should sit between Threads and Fabric in App.tsx
- Shows 3 AI captions: Finance (MONEY), Learning (LEARNING), Terminal (TERMINAL)
- Optionally includes mascot images for those 3 threads
- Communicates: "AI doesn't sit in a chat window — it runs through everything you track"
- The 3 captions currently in Hero.tsx should be MOVED to Shuttle beat

### F. Prototype HTML files — locate or recreate
- Search for `rheo-loom-prototype-v2.html`, `rheo-thread-patches.html`, `rheo-mascot-image-prompts.md` in the broader project
- If found: use them as reference for exact visual styles (patch card design, label styling, animation approach)
- If not found: the higher AI models may need to infer from the handoff description and current code

---

## 10. Build Commands

```bash
# Typecheck
npx tsc -b

# Dev server  
npx vite

# Production build
npx vite build --outDir dist-tmp
```

Build output: `dist-tmp/index.html`, `dist-tmp/assets/index-*.css`, `dist-tmp/assets/index-*.js`

---

*Generated from full code analysis + handoff doc + user conversation. Covers all current state, issues, and discussion points for higher AI model review.*
