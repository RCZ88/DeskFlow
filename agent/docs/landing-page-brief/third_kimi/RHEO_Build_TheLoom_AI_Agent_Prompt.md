# RHEO LANDING PAGE — AI CODING AGENT: BUILD "THE LOOM"

> **Direction:** "The Loom" — NOT solar system, NOT city viz. This is the final direction.
> **Foundation:** Use the attached HTML prototype as your starting point.
> **Images:** AI-generated images will be inserted into specific sections (see Image Strategy below).
> **MCP:** Pull exact components listed below. No guessing.

---

## THE DESIGN: "THE LOOM"

RHEO's 15+ subsystems are threads on a loom. AI is the shuttle that runs through all of them.

**Visual system:**
- 7 vertical "warp" threads (SVG lines) labeled: TIME, MONEY, FOCUS, LEARNING, CHAT, TERMINAL, TIMELINE
- 1 horizontal "weft" thread (SVG path) that weaves over/under the warps via clip-path
- Two thread colors: amber (`#fbbf24`) + terracotta (`#c2703d`)
- Background: deep black (`#09090b`)
- Typography: Geist (body) + JetBrains Mono (labels)

**The prototype HTML shows exactly how the weave animation works.** Study it. Reuse the same SVG thread system across all sections.

---

## WHAT YOU NEED TO BUILD (8 Sections)

### Section 1: HERO — "The Loom"
**Status:** ✅ Prototype exists — convert to React
- 7 warp threads (vertical SVG lines)
- 1 weft thread (horizontal SVG wave path)
- Weave over/under illusion via clip-path
- Headline: "One shuttle. Every thread."
- Subheadline: "AI doesn't sit in a chat window. It runs through everything you track."
- Scroll cue: "Scroll ↓"
- **Image needed:** NONE — this is pure SVG animation

### Section 2: "The Threads" — Feature Highlights
**Status:** ❌ Build from scratch
- Each warp thread briefly highlights as user scrolls past
- One line of copy beside each thread
- Example: "TIME — Tracks every app, every website, every minute."
- **Image needed:** NONE — uses the same SVG threads

### Section 3: "The Shuttle" — AI-Native Proof
**Status:** ✅ Partial prototype — expand to full section
- Weft thread "visits" 3 threads with captions:
  - Finance: "Flags a subscription you forgot."
  - Learning: "Drafts your next lesson."
  - Terminal: "Reads your terminal output."
- **Image needed:** NONE — uses the same SVG threads

### Section 4: "The Fabric" — Payoff Moment
**Status:** ❌ Build from scratch
- Zoom out: completed weave resolves into a subtle grid pattern
- This is the "aha" moment — many threads become one fabric
- **Image needed:** AI-generated fabric texture (see Image Strategy)

### Section 5: "Module Store" — Pricing
**Status:** ❌ Build from scratch
- Bento grid of feature cards
- Individual: $2.99 each
- Bundles: $6.99 (3 features)
- Admin toggle unlocks everything
- **Image needed:** Screenshots of actual app features (see Image Strategy)

### Section 6: "The Quiet Section" — Privacy Statement
**Status:** ❌ Build from scratch
- Deliberate pacing break
- Minimal motion, huge type
- "Nothing on this page has phoned home. Neither will the app."
- **Image needed:** NONE — pure typography

### Section 7: "Open Source" — Trust
**Status:** ❌ Build from scratch
- MIT badge
- GitHub star count (live API)
- Repo file-tree teaser
- **Image needed:** NONE — code/data visualization

### Section 8: "Footer / CTA" — Download
**Status:** ⚠️ Partial — expand from prototype's minimal closing
- Weft thread ties one final knot
- Download button appears
- Links: Features, GitHub, Docs, Roadmap
- **Image needed:** NONE — buttons and links

---

## IMAGE STRATEGY

### Where Images Are Needed

| Section | Image Type | Source | Priority |
|---------|-----------|--------|----------|
| Section 4 (Fabric) | Abstract fabric/weave texture | AI-generated | HIGH |
| Section 5 (Store) | Feature card thumbnails | App screenshots OR AI-generated | HIGH |
| Section 5 (Store) | Bundle card backgrounds | AI-generated abstract patterns | MEDIUM |
| Section 7 (Open Source) | GitHub preview | Live API data, not image | N/A |
| All other sections | NONE | Pure SVG/code animation | N/A |

### How Images Are Inserted

**For AI-generated images:**
1. Generate images using your preferred AI image tool (Midjourney, DALL-E, Stable Diffusion)
2. Save to `public/images/` folder
3. Import and use in React components:
   ```tsx
   <img src="/images/fabric-texture.webp" alt="Woven fabric pattern" />
   ```
4. Use WebP format for performance
5. Provide `width` and `height` attributes to prevent layout shift

**For app screenshots:**
1. CZ will provide screenshots of actual RHEO app features
2. Save to `public/images/screenshots/`
3. Use in Store section cards

### Image Specifications

| Image | Dimensions | Format | Style |
|-------|-----------|--------|-------|
| Fabric texture | 1920x1080 | WebP | Abstract woven pattern, dark background, amber + terracotta threads |
| Store card bg (8) | 400x300 each | WebP | Abstract tech patterns matching each feature's accent color |
| Bundle card bg (3) | 600x400 each | WebP | Dark abstract with gold accents |

**Prompt template for AI image generation:**
```
Abstract dark woven fabric texture, intersecting threads in amber 
(#fbbf24) and terracotta (#c2703d) on deep black background, 
minimalist, technical, high contrast, 4k, seamless pattern
```

---

## MCP COMPONENTS TO PULL

### Step 1: Magic UI (run these commands)

```bash
# Text animations (for headlines)
npx shadcn@latest add @magicui/text-reveal
npx shadcn@latest add @magicui/hyper-text

# Effects (for store cards + transitions)
npx shadcn@latest add @magicui/border-beam
npx shadcn@latest add @magicui/bento-grid
npx shadcn@latest add @magicui/animated-shiny-text
npx shadcn@latest add @magicui/blur-fade

# Backgrounds (for ambient effects)
npx shadcn@latest add @magicui/particles
npx shadcn@latest add @magicui/animated-grid-pattern
```

### Step 2: shadcn/ui (run these commands)

```bash
npx shadcn@latest add button
npx shadcn@latest add card
npx shadcn@latest add badge
npx shadcn@latest add switch
npx shadcn@latest add separator
npx shadcn@latest add tooltip
```

### Step 3: React Bits (run these commands)

```bash
# Background effects
npx shadcn@latest add @react-bits/Aurora-TS-TW
npx shadcn@latest add @react-bits/Threads-TS-TW
npx shadcn@latest add @react-bits/Waves-TS-TW
```

### Step 4: npm packages (run these commands)

```bash
npm install motion          # Animation library
npm install gsap            # ScrollTrigger + timelines
npm install lenis           # Smooth scroll
npm install lucide-react    # Icons
```

### Step 5: Fonts

```bash
# Add to your HTML head or import in CSS:
# Geist font (via @fontsource or Google Fonts)
# JetBrains Mono (via Google Fonts)
```

In `index.html`:
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
```

**Note:** The prototype uses Inter as fallback. For production, use Geist. If Geist isn't available via Google Fonts, use Inter as the primary and add Geist via npm (`npm install geist`) or self-host.

---

## PROJECT SETUP

### 1. Initialize Project

```bash
npm create vite@latest rheo-landing -- --template react-ts
cd rheo-landing
npm install
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

### 2. Configure Tailwind

In `tailwind.config.js`:
```js
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        'void': '#050505',
        'deep': '#0a0a0a',
        'surface': '#111111',
        'raised': '#1a1a1a',
        'amber': '#fbbf24',
        'gold': '#f59e0b',
        'terracotta': '#c2703d',
        'blue': '#3b82f6',
        'teal': '#14b8a6',
        'coral': '#fb7185',
      },
      fontFamily: {
        'sans': ['Geist', 'Inter', 'system-ui', 'sans-serif'],
        'mono': ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}
```

In `src/index.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  html {
    color-scheme: dark;
  }
  body {
    background-color: #09090b;
    color: #fafafa;
    font-family: 'Geist', 'Inter', system-ui, sans-serif;
  }
}
```

### 3. File Structure

```
rheo-landing/
├── public/
│   └── images/
│       ├── fabric-texture.webp
│       ├── store/
│       │   ├── ai-chat.webp
│       │   ├── content-studio.webp
│       │   ├── focus-sessions.webp
│       │   ├── lyceum-learn.webp
│       │   ├── gold-finance.webp
│       │   ├── river-years.webp
│       │   ├── terminal-workspace.webp
│       │   └── context-brain.webp
│       └── bundles/
│           ├── productivity-pack.webp
│           ├── knowledge-pack.webp
│           └── life-pack.webp
├── src/
│   ├── sections/
│   │   ├── Hero.tsx              # Section 1: Loom (convert from prototype)
│   │   ├── Threads.tsx           # Section 2: Feature highlights
│   │   ├── Shuttle.tsx           # Section 3: AI-native proof
│   │   ├── Fabric.tsx            # Section 4: Payoff moment
│   │   ├── Store.tsx             # Section 5: Module store
│   │   ├── Quiet.tsx             # Section 6: Privacy statement
│   │   ├── OpenSource.tsx        # Section 7: Trust
│   │   └── Footer.tsx            # Section 8: Download CTA
│   ├── components/
│   │   ├── LoomSVG.tsx           # Reusable loom SVG system
│   │   ├── WarpThread.tsx        # Single warp thread component
│   │   ├── WeftThread.tsx        # Weft thread with clip-path
│   │   ├── CaptionBox.tsx        # Shuttle caption component
│   │   ├── GlassCard.tsx         # Glass morphism card
│   │   ├── PriceFlip.tsx         # 3D price tag flip
│   │   └── AnimatedCounter.tsx   # Number counter
│   ├── hooks/
│   │   ├── useScrollProgress.ts
│   │   ├── useInView.ts
│   │   └── useReducedMotion.ts
│   ├── lib/
│   │   └── utils.ts
│   ├── App.tsx
│   └── main.tsx
├── index.html
├── vite.config.ts
├── tailwind.config.js
└── package.json
```

---

## HOW TO CONVERT THE PROTOTYPE

The attached HTML file (`RHEO_TheLoom_Prototype_Fixed.html`) contains the working weave animation. Here's how to convert it:

### 1. Extract the SVG Loom System

Copy the SVG structure and GSAP timeline from the prototype into `src/components/LoomSVG.tsx`:

```tsx
// LoomSVG.tsx — the reusable thread system
// Contains: warp threads, weft thread, clip-path logic, dot animations
// Props: scrollProgress (0-1), activeWarp (string | null)
```

### 2. Convert GSAP to React

Use `gsap` npm package (not CDN). Register ScrollTrigger:

```tsx
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
gsap.registerPlugin(ScrollTrigger);
```

### 3. Use Lenis for Smooth Scroll

```tsx
import { ReactLenis } from 'lenis/react';

function App() {
  return (
    <ReactLenis root options={{ lerp: 0.1 }}>
      <Hero />
      <Threads />
      <Shuttle />
      <Fabric />
      <Store />
      <Quiet />
      <OpenSource />
      <Footer />
    </ReactLenis>
  );
}
```

---

## SECTION-BY-SECTION IMPLEMENTATION ORDER

### Priority 1: Core Loom (Week 1)
- [ ] Convert prototype Hero to React
- [ ] Build Threads section
- [ ] Build Shuttle section
- [ ] Set up Lenis smooth scroll
- [ ] Set up GSAP ScrollTrigger

### Priority 2: Content Sections (Week 2)
- [ ] Build Fabric section (with AI-generated fabric image)
- [ ] Build Store section (with bento grid + price flip)
- [ ] Build Quiet section (big type, minimal motion)
- [ ] Build Open Source section (GitHub API integration)

### Priority 3: Polish (Week 3)
- [ ] Build Footer section
- [ ] Add responsive breakpoints
- [ ] Add reduced motion support
- [ ] Integrate all images
- [ ] Performance optimization
- [ ] Lighthouse audit (target 90+)

---

## IMAGE GENERATION PROMPTS

Send these to your AI image generator:

### Fabric Texture (Section 4)
```
Abstract dark woven fabric texture, intersecting threads in 
amber gold and terracotta on deep black background, minimalist 
technical aesthetic, high contrast, subtle grid pattern, 
4k resolution, seamless tile
```

### Store Card Backgrounds (Section 5)
For each feature, generate an abstract background:
```
Abstract dark tech background, [COLOR] geometric accents, 
minimalist, high contrast, 400x300, subtle glow effects
```
Replace [COLOR] with:
- AI Chat: blue (`#3b82f6`)
- Content Studio: purple (`#a855f7`)
- Focus Sessions: teal (`#14b8a6`)
- Lyceum Learn: coral (`#fb7185`)
- Gold & Finance: amber (`#fbbf24`)
- River of Years: teal (`#14b8a6`)
- Terminal Workspace: blue (`#3b82f6`)
- Context Brain: purple (`#a855f7`)

### Bundle Card Backgrounds (Section 5)
```
Dark abstract background, gold accent lines, premium feel, 
600x400, subtle woven texture, amber highlights
```

---

## RULES

1. **One motif only** — The loom threads are reused across ALL sections. Never introduce a second unrelated animated object.
2. **No existing app visualizations** — Solar system, city viz, 3D maps are OFF LIMITS. They stay inside the app.
3. **Every animation has a named technique** — Before adding any animation, name it and explain what it communicates.
4. **Dark mode only** — This is a privacy app, not a SaaS dashboard.
5. **Mobile must carry the metaphor** — Warp threads persist; weft animation triggers on viewport entry instead of scroll scrub on narrow screens.
6. **Reduced motion** — With all motion disabled, the page must still read as a labeled loom diagram with a finished fabric pattern.
7. **Images are secondary** — The loom animation is the primary visual system. Images are texture/background only, never the main attraction.

---

## DELIVERABLES CHECKLIST

Before saying you're done, verify:
- [ ] All 8 sections built and scrollable
- [ ] Loom SVG system reused across sections 1-4
- [ ] Weave animation works on desktop (scroll-scrubbed)
- [ ] Weave animation works on mobile (viewport-triggered)
- [ ] Store section has bento grid with price flip
- [ ] Admin toggle flips all prices to "Included"
- [ ] Images inserted where specified
- [ ] Reduced motion fallback works
- [ ] Responsive at 400px, 768px, 1280px, 2560px
- [ ] Lighthouse score > 90
- [ ] No console errors
- [ ] All text is real HTML (not images)
- [ ] All buttons are real buttons (not images)
- [ ] CTA links to actual download page

---

## QUESTIONS FOR CZ (Answer before starting)

1. **Screenshots:** Do you have app screenshots for the Store section? If not, should I generate abstract backgrounds instead?
2. **Hero font:** Use Geist (need to self-host or npm install) or keep Inter (Google Fonts)?
3. **Fabric section:** CSS mask-image wipe or Rive animation or Canvas 2D?
4. **Download link:** GitHub releases page URL?

---

*Start with Priority 1. Build the core loom system first. Everything else hangs off that.*
