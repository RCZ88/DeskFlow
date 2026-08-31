# Reference Matrix — Motion Feel Research

> Purpose: calibrate FEEL, never copy layout.
> 7 sites analyzed for scroll models, signature interactions, easing/duration, type/contrast on dark, and perceived performance.

---

## Site Analysis

### 1. pacomepertant.com
**Type:** Design agency portfolio | **Theme:** Dark (`rgb(10,10,10)`)

| Aspect | Finding |
|--------|---------|
| Stack | Nuxt.js + Three.js + Lenis + GSAP 3.12 |
| Scroll model | Lenis smooth (virtual/smoothed) — body never scrolls; content is 3D scene |
| Signature interaction 1 | **Entry gate** — sound toggle before content loads. Deliberate pacing creates anticipation. |
| Signature interaction 2 | **Spiral vs List toggle** — 3D spiral navigation vs flat list view. Portfolio as spatial exploration. |
| Signature interaction 3 | **Letter-by-letter menu** — `m e n u` reveals character by character with staggered timing. |
| Easing/duration | Lenis default (smooth, ~0.1s lag), GSAP for element-level (snappy 0.3–0.6s) |
| Type & contrast | "Indivisible Variable" (variable font), light on near-black. Max contrast. |
| Performance | 431 animated elements, WebGL rendering. GPU-heavy but no visible jank. |
| Screenshot | `shots/pacomepertant-hero.png`, `shots/pacomepertant-spiral.png` |

---

### 2. aikawakenichi.com
**Type:** Photographer portfolio | **Theme:** Light (`rgb(255,255,255)`)

| Aspect | Finding |
|--------|---------|
| Stack | GSAP 3.15 + ScrollToPlugin + Lenis smooth scroll |
| Scroll model | Lenis smooth (virtual) — `html { overflow: hidden }`, body intercepted |
| Signature interaction 1 | **Canvas slider** — portfolio items move in 3D space with `--is-focus` class for active slide. |
| Signature interaction 2 | **Word-by-word hero** — "Kenichi Aikawa is a photographer from Japan" reveals per word. |
| Signature interaction 3 | **Lenis momentum** — long-flick scroll carries momentum, feels physical. |
| Easing/duration | GSAP + Lenis defaults. Long-drift feel, smooth deceleration. |
| Type & contrast | "Neue Montreal" (geometric sans) + "Editorial Old" (serif). Black on white — editorial contrast. |
| Performance | Canvas-based slider, `will-change: transform` on slides. Optimized. |
| Screenshot | `shots/aikawakenichi-hero.png`, `shots/aikawakenichi-scroll.png` |

---

### 3. podium-studios.com/services
**Type:** Video production agency | **Theme:** Light gray (`rgb(241,241,241)`)

| Aspect | Finding |
|--------|---------|
| Stack | GSAP 3.12.5 + ScrollTrigger + Lenis smooth scroll |
| Scroll model | Lenis smooth (virtual) — standard smooth-scroll with ScrollTrigger pins |
| Signature interaction 1 | **Custom cursor** — "hover-cursor-js" with interactive states on links/buttons. |
| Signature interaction 2 | **Hero video** — autoplay/muted/loop automotive reel via CDN. Cinematic motion without scroll. |
| Signature interaction 3 | **ScrollTrigger service cards** — each service section reveals with scroll-pinned animation. |
| Easing/duration | GSAP defaults (power2.inOut), Lenis for scroll smoothing. Mid-tempo feel. |
| Type & contrast | "Manrope" (geometric sans) + "IBM Plex Mono" (mono). Dark on light-gray. Clean hierarchy. |
| Performance | CDN-hosted video (b-cdn.net), custom cursor, will-change hints. Smooth. |
| Screenshot | `shots/podium-hero.png` |

---

### 4. hirotosato0127.github.io
**Type:** Academic portfolio | **Theme:** Light (`rgb(255,255,255)`)

| Aspect | Finding |
|--------|---------|
| Stack | Pure HTML/CSS — no animation libraries |
| Scroll model | Native browser scroll — no smoothing, no interception |
| Signature interaction 1 | **Accordion abstracts** — "▼ Abstract" toggles expand/collapse via CSS. |
| Signature interaction 2 | **Minimal nav** — Home + 日本語 toggle. Pure function. |
| Signature interaction 3 | **None** — intentionally zero motion. Content-first. |
| Easing/duration | Default CSS transitions only. No custom easing. |
| Type & contrast | "Helvetica Neue" + serif fallback. Dark gray (`rgb(51,51,51)`) on white. Academic. |
| Performance | Zero JS overhead. Instant load. |
| Screenshot | `shots/hiroto-hero.png` |

**Note:** This is a contrast reference — useful to see what "no motion" feels like. Zero animation = zero cognitive load but also zero emotional pull.

---

### 5. vshslv.com
**Type:** Creative developer portfolio | **Theme:** Full black (`rgb(0,0,0)`)

| Aspect | Finding |
|--------|---------|
| Stack | GSAP + Three.js + WebGL + Canvas |
| Scroll model | **Non-scrollable** — `html/body { overflow: hidden }`, navigation-driven (not scroll-driven) |
| Signature interaction 1 | **Thumbnail grid** — 60+ project images in a dense grid, likely mouse-driven navigation. |
| Signature interaction 2 | **Custom cursor** — with Close/Move states. Interactive, not decorative. |
| Signature interaction 3 | **Canvas + 2 videos** — WebGL effects layered with video backgrounds. |
| Easing/duration | GSAP for transitions. Interaction-triggered, not scroll-triggered. |
| Type & contrast | "ABC Diatype" (commercial). White on full-black. Maximum contrast. |
| Performance | Heavy (Three.js + Canvas + 2 videos), but non-scrollable = no scroll jank. |
| Screenshot | `shots/vshslv-hero.png` |

**Note:** This is the "no-scroll" model — proves that navigation-driven can feel premium when interactions are tight.

---

### 6. motion.dev
**Type:** Animation library landing page | **Theme:** Dark (`rgb(14,19,18)`)

| Aspect | Finding |
|--------|---------|
| Stack | Motion (Framer Motion) — their own library |
| Scroll model | Native scroll — long page (12,899px), section-based |
| Signature interaction 1 | **17 video demos** — each section has autoplay video showing animation examples. |
| Signature interaction 2 | **Section reveals** — "Animations that move" / "React & JavaScript examples" as content blocks. |
| Signature interaction 3 | **Code playground** — interactive examples embedded in the page. |
| Easing/duration | Motion library defaults. Standard spring/ease curves. |
| Type & contrast | "TASA Orbiter" (geometric sans) + "Geist Mono". Light on dark-green-black. |
| Performance | Many videos (17), 2 canvases. Heavy but section-lazy-loaded. |
| Screenshot | `shots/motion-hero.png` |

**Note:** This is a "show, don't tell" approach — every section demonstrates the library's own capabilities.

---

### 7. variant.com
**Type:** Design tool landing | **Theme:** Dark gray (`rgb(34,34,34)`)

| Aspect | Finding |
|--------|---------|
| Stack | CSS scroll-driven animations (`animation-timeline: scroll()`) |
| Scroll model | **Non-scrollable** viewport with CSS ScrollTimeline — "just scroll" tagline |
| Signature interaction 1 | **CSS scroll-timeline** — native browser scroll-driven animations, no JS required. |
| Signature interaction 2 | **Typography showcase** — "Variant Neue Display" / "Variant Neue Text" as hero content. |
| Signature interaction 3 | **Minimal chrome** — no video, no canvas, no custom cursor. Pure CSS. |
| Easing/duration | CSS `animation-timeline: scroll()` — scroll-position-driven, hardware-accelerated. |
| Type & contrast | "Inter" + custom "Variant Neue" faces. White on dark-gray. |
| Performance | Zero JS animation overhead. CSS animations are compositable. |
| Screenshot | `shots/variant-hero.png` |

**Note:** This is the "CSS-native" model — proves scroll-driven animations can be done without JS libraries. Chromium supports `animation-timeline: scroll()`.

---

## Summary Matrix

| Site | Scroll Model | Theme | Custom Cursor | Video | Canvas/WebGL | Libraries |
|------|-------------|-------|---------------|-------|--------------|-----------|
| pacomepertant.com | Lenis smooth | Dark | No | No | Three.js | GSAP + Lenis |
| aikawakenichi.com | Lenis smooth | Light | No | No | Canvas | GSAP + Lenis |
| podium-studios.com | Lenis smooth | Light | Yes | 1 | No | GSAP + Lenis |
| hirotosato0127.github.io | Native | Light | No | No | No | None |
| vshslv.com | Non-scrollable | Dark | Yes | 2 | Canvas | GSAP + Three.js |
| motion.dev | Native | Dark | No | 17 | 2 canvas | Motion |
| variant.com | CSS scroll-timeline | Dark | No | No | No | CSS only |

---

## 4-Act Motion Temperament Mapping

### OBSERVE hero — "The first impression"
**References:** pacomepertant.com, vshslv.com

- **pacomepertant:** Entry gate with sound toggle = deliberate pause before content. Creates anticipation. The hero IS the experience.
- **vshslv:** Non-scrollable single viewport. Hero is everything — dense thumbnail grid as visual overload.
- **Motion temperament:** Slow, deliberate, high-contrast. Hero should feel like a statement, not a loading screen.

### RECORD scrub — "The timeline interaction"
**References:** aikawakenichi.com, variant.com

- **aikawakenichi:** Lenis momentum scroll — physical, carried-away feeling. Good for scrubbing through time.
- **variant.com:** CSS `animation-timeline: scroll()` — scroll directly drives animation progress. Pure scrub.
- **Motion temperament:** Smooth, momentum-based, scroll-coupled. The scrub should feel like dragging a playhead.

### UNDERSTAND console — "The information layer"
**References:** podium-studios.com, motion.dev

- **podium-studios:** ScrollTrigger pins + service cards = information revealed in digestible chunks. Custom cursor guides attention.
- **motion.dev:** 17 video demos in sectioned layout = show-don't-tell documentation. Each section teaches.
- **Motion temperament:** Structured, section-based, progressive reveal. Console should feel organized and scannable.

### FLOW philosophy — "The ambient layer"
**References:** hirotosato0127.github.io, variant.com

- **hirotosato0127:** Zero motion = zero distraction. Philosophy needs space, not animation.
- **variant.com:** CSS-only, no JS overhead. Flow should be felt, not seen.
- **Motion temperament:** Invisible. Minimal. The philosophy section should breathe, not perform.

---

## Key Takeaways

1. **Lenis is the dominant smooth-scroll choice** (3 of 7 sites). GSAP + Lenis = the "premium" stack.
2. **Dark theme sites use max contrast** — near-black bg + near-white text. No mid-tone muddiness.
3. **Custom cursors signal interactivity** — use only where interaction exists (podium, vshslv).
4. **Non-scrollable is a valid model** — vshslv proves navigation-driven can feel premium.
5. **CSS scroll-timeline is production-ready** — variant.com uses it without JS. Consider for simple scroll-coupled effects.
6. **Video is common but heavy** — podium (1 video), motion.dev (17 videos). Use sparingly.
7. **Typography drives perception** — every site uses 2+ font families. Mono fonts signal "technical."
8. **Performance = perception** — hirotosato0127 (zero JS) feels instant. vshslv (heavy stack) feels deliberate. Both work.

---

## Screenshots

All hero screenshots saved to `reference/shots/`:
- `pacomepertant-hero.png`
- `pacomepertant-spiral.png`
- `aikawakenichi-hero.png`
- `aikawakenichi-scroll.png`
- `podium-hero.png`
- `hiroto-hero.png`
- `vshslv-hero.png`
- `motion-hero.png`
- `variant-hero.png`
