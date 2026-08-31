# RHEO Landing Page — Master Design Specification

> **Status:** Planning Phase Complete | **Version:** 1.0 | **Date:** 2026-08-28
> **Project:** RHEO Landing Page — Local-first, privacy-first desktop productivity app
> **Philosophy:** The beauty of the process. Time is precious. Track it. See it. Improve.

---

## 1. Design Philosophy & Identity

### What RHEO Feels Like

RHEO is a **living command center** — not cold, not clinical. It is:
- **Controlled power** — everything you need, nothing you don't
- **Organic precision** — like a neural network that grew in a garden
- **Private sanctuary** — your data, your machine, your rules
- **Process beauty** — the joy of seeing time turn into insight

### Core Metaphor: "The River of Time"

The entire landing page is built around the metaphor of a **river**:
- Time flows (scrolling = flowing downstream)
- Data accumulates like sediment (tracking = layers)
- AI is the current that organizes everything
- Your life phases are tributaries joining the main stream
- The app is the vessel that lets you navigate it all

### Tone of Voice

| Aspect | Direction |
|--------|-----------|
| **Voice** | Confident but warm. Technical but human. |
| **Headlines** | Bold, declarative, slightly poetic |
| **Body copy** | Clear, precise, benefit-driven |
| **CTAs** | Action-oriented, low-friction |
| **Microcopy** | Witty, intentional, never generic |

### One Thing to Remember

> **"Your time leaves traces. RHEO makes them visible."**

---

## 2. Visual Direction

### Color System

The app uses dark amber zinc. The landing page **amplifies** this into a cinematic dark experience:

| Token | Value | Usage |
|-------|-------|-------|
| `--bg-void` | `#050505` | Deepest background (hero, sections) |
| `--bg-primary` | `#09090b` | Main background |
| `--bg-surface` | `#18181b` | Card backgrounds |
| `--bg-elevated` | `#27272a` | Borders, dividers |
| `--accent-amber` | `#fbbf24` | Primary accent (CTAs, highlights) |
| `--accent-gold` | `#f59e0b` | Hover states, secondary accent |
| `--accent-coral` | `#fb7185` | Tertiary accent (data viz, heat) |
| `--text-primary` | `#fafafa` | Headlines |
| `--text-secondary` | `#a1a1aa` | Body text |
| `--text-muted` | `#71717a` | Labels, captions |
| `--text-dim` | `#52525b` | Subtle elements |
| `--river-blue` | `#3b82f6` | Data flow, AI current |
| `--river-teal` | `#14b8a6` | Life phases, growth |

### Typography

| Role | Font | Weight | Size |
|------|------|--------|------|
| Display / Hero | Geist (or Inter Display) | 700-900 | 72px–120px |
| Headings | Geist | 600-700 | 32px–56px |
| Body | Geist | 400-500 | 16px–18px |
| Mono / Code | JetBrains Mono | 400-500 | 13px–14px |
| Labels | JetBrains Mono | 500 | 11px–12px |

**Special:** Hero uses a **variable font weight animation** — text breathes from 400 to 700 on scroll.

### Motion Density

| Level | Where | Description |
|-------|-------|-------------|
| **Ambient** | Hero background, section borders | Always moving, subtle, never distracting |
| **Reactive** | Buttons, cards, hover states | Responds to user input |
| **Narrative** | Scroll-driven section transitions | Tells the story as you scroll |
| **Cinematic** | Hero entrance, major transitions | High impact, once per session |

---

## 3. Section Architecture (Scroll Narrative)

The page follows a **river journey** metaphor. Scrolling = floating downstream through RHEO's world.

```
┌─────────────────────────────────────────────────────────────┐
│  SECTION 1: THE SOURCE (Hero)                                │
│  → Full-viewport WebGL river simulation                      │
│  → "RHEO" — Your time, visualized                            │
│  → Subtitle + CTA floating on glass surface                  │
├─────────────────────────────────────────────────────────────┤
│  SECTION 2: THE CURRENT (Philosophy)                         │
│  → "Your data never leaves your machine"                     │
│  → ASCII/code rain effect transitioning to clean text        │
│  → 3 pillars: Local · Private · Yours                      │
├─────────────────────────────────────────────────────────────┤
│  SECTION 3: THE TRIBUTARIES (Features) — Bento Grid          │
│  → 8 curated feature cards in asymmetric bento layout      │
│  → Each card has micro-animation on hover                    │
│  → Cards: AI Chat, Focus, Learning, Finance, Life, etc.     │
├─────────────────────────────────────────────────────────────┤
│  SECTION 4: THE DEPTHS (AI Infrastructure)                   │
│  → "The beauty of AI infrastructure"                        │
│  → Visual: Neural network / graph animation                  │
│  → Show AI chat, context brain, terminal workspace           │
├─────────────────────────────────────────────────────────────┤
│  SECTION 5: THE LANDSCAPE (Data & Tracking)                  │
│  → "See the process. See yourself."                          │
│  → Visual: Contour isolines / terrain (Freeboard mechanic)   │
│  → Stats, heatmaps, timeline visualizations                  │
├─────────────────────────────────────────────────────────────┤
│  SECTION 6: THE WORKSHOP (Store Concept)                     │
│  → "Build your RHEO" — Modular feature store                 │
│  → Playful paywall gimmick with admin unlock                 │
│  → Cards with price tags that flip to "Unlocked" on toggle   │
├─────────────────────────────────────────────────────────────┤
│  SECTION 7: THE DELTA (Download/CTA)                         │
│  → "Start your river"                                        │
│  → Download button with ripple effect                        │
│  → GitHub link, system requirements, version info              │
├─────────────────────────────────────────────────────────────┤
│  SECTION 8: THE BANK (Footer)                                │
│  → Minimal, with subtle wave animation at top edge          │
│  → Links, credits, privacy note                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. Section-by-Section Design Spec

### SECTION 1: THE SOURCE (Hero)

**Job:** Stop the scroll. Communicate identity in 3 seconds.

**Visual:**
- **Background:** Custom WebGL shader — a dark, flowing "river" of particles/data points
  - Particles flow from top-left to bottom-right (the "current")
  - Colors: deep blacks, amber highlights, occasional teal sparks
  - Mouse interaction: cursor creates ripples in the flow
  - Scroll interaction: scroll speed increases flow velocity
  - **Inspiration:** Stripe's parametric ribbon + RHEO's Morphogen reaction-diffusion

- **Foreground:**
  - Centered "RHEO" in massive display type (120px+, weight animates 400→700)
  - Below: "Your time, visualized." — 24px, text-secondary
  - Below: Two CTAs side by side:
    - Primary: "Download for macOS" (amber, glass morphism button)
    - Secondary: "View on GitHub" (ghost button, mono font)
  - **Floating elements:** Small data particles orbit the headline slowly

**Animation Sequence (on load):**
1. Background fades in (0.5s)
2. "RHEO" letters stagger in from bottom (0.8s, spring physics)
3. Subtitle fades in (0.3s)
4. CTAs slide up + fade (0.4s)
5. Ambient particle flow begins

**Technical:**
- **Shader:** Custom GLSL fragment shader (reaction-diffusion + flow field)
- **Framework:** React Three Fiber (already in project stack)
- **Fallback:** Static gradient image for mobile/low-power mode

---

### SECTION 2: THE CURRENT (Philosophy)

**Job:** Establish trust. Explain local-first in 10 seconds.

**Visual:**
- **Background:** Clean `#09090b` with subtle grid pattern (1px lines at 5% opacity)
- **Entrance Animation:** ASCII code rain effect (Matrix-style) that "decodes" into clean text
  - Characters fall, then resolve into the section heading
  - **Reference:** ASCII simulated code effect mentioned by CZ

- **Content:**
  - Kicker: "PHILOSOPHY" (mono, 11px, amber, tracked)
  - Headline: "Your data never leaves your machine." (48px, bold)
  - Subhead: "No accounts. No cloud. No subscription. Everything lives in a single SQLite file on your computer."

- **3 Pillars (horizontal cards):**
  1. **Local** — "One file. Your entire life." (icon: hard drive)
  2. **Private** — "Zero telemetry. Zero tracking." (icon: shield)
  3. **Yours** — "Open source. Extensible. Forever." (icon: key)

  Each pillar card has a **glass morphism** surface with subtle border glow on hover.

**Animation:**
- Scroll-triggered: Cards stagger in from bottom (0.15s delay each)
- Hover: Card lifts (translateY -4px), border glow intensifies

---

### SECTION 3: THE TRIBUTARIES (Features — Bento Grid)

**Job:** Show the breadth. Make it tangible.

**Visual:**
- **Layout:** Asymmetric bento grid (masonry-style)
  - Large card: AI Chat + Content Engine (spans 2x2)
  - Medium card: Focus Sessions (spans 2x1)
  - Medium card: Lyceum Learn (spans 1x2)
  - Small cards: Finance, Life Phases, Terminal, Context Brain (1x1 each)

- **Card Design:**
  - Background: `rgba(24,24,27,0.60)` + backdrop-blur
  - Border: 1px solid `rgba(255,255,255,0.06)`
  - Border-radius: 12px
  - Padding: 24px
  - Each card has a **unique micro-animation**:
    - AI Chat: Typing cursor blink animation in corner
    - Focus: Circular progress ring that fills on hover
    - Learn: Node graph that connects on hover
    - Finance: Number counter animation
    - Life Phases: Timeline scrubber animation
    - Terminal: Blinking cursor + command prompt
    - Context Brain: Neural pulse ripple

**Animation:**
- Scroll-triggered: Grid items stagger in with scale(0.95→1) + opacity
- Hover: Card scales 1.02, shadow deepens, micro-animation activates

**Content (8 Cards):**

| Card | Title | One-liner | Icon |
|------|-------|-----------|------|
| AI Chat | AI Assistant | Multi-provider chat with vision & memory | MessageSquare |
| Content Engine | Content Studio | Brainstorm → script → publish pipeline | PenTool |
| Focus | Focus Sessions | Strict timer with app blocking & streaks | Target |
| Learn | Lyceum | Hierarchical lessons with AI-powered mastery | GraduationCap |
| Finance | Gold & Finance | Track spending, habits, goals with rings | Wallet |
| Life | River of Years | Visual timeline of your life phases | Calendar |
| Terminal | Workspace | Multi-pane terminal with AI agents | Terminal |
| Brain | Context Brain | Bitemporal knowledge graph for everything | Brain |

---

### SECTION 4: THE DEPTHS (AI Infrastructure)

**Job:** Sell the AI story. This is the differentiation.

**Visual:**
- **Background:** Darker section (`#050505`) with a **force-directed graph** animation
  - Nodes = features, edges = connections
  - Nodes pulse with data
  - Graph reconfigures as you scroll (different clustering)
  - **Reference:** Adjacent mechanic (force-directed graph)

- **Content:**
  - Kicker: "AI INFRASTRUCTURE" (mono, amber)
  - Headline: "The beauty of AI infrastructure" (56px)
  - Subhead: "Every feature talks to every other feature. The AI doesn't just chat — it understands your entire context."

- **3 Sub-sections (pinned scroll):**
  1. **AI Chat** — "Not just another chatbot. RHEO's AI sees your tracked time, your learning progress, your financial goals — and gives advice that actually fits your life."
  2. **Context Brain** — "A bitemporal knowledge graph that remembers everything. Episodes, entities, facts, embeddings. Your second brain, powered by AI."
  3. **Terminal Workspace** — "AI agents in your terminal. Multi-pane, multi-session, with an agent that knows your codebase."

**Animation:**
- **Pinned section:** As user scrolls, the graph morphs to highlight each sub-section
- Text reveals with **SplitText** animation (words slide up individually)
- Graph nodes glow amber when their section is active

---

### SECTION 5: THE LANDSCAPE (Data & Tracking)

**Job:** Show the beauty of tracking. Make data feel emotional.

**Visual:**
- **Background:** Contour isolines terrain (Freeboard mechanic) — animated topographic lines
  - Lines flow and shift like a living landscape
  - Color: monochromatic with amber highlights on peaks

- **Content:**
  - Kicker: "THE BEAUTY OF THE PROCESS"
  - Headline: "See the process. See yourself." (56px)
  - Subhead: "Time is the one thing you can't get back. RHEO makes sure you can see exactly where it went — and where to steer next."

- **Stats Row:**
  - "15+" Subsystems
  - "1" SQLite File
  - "0" Cloud Servers
  - "∞" Possibilities

  Numbers count up on scroll (animated counters).

- **Visual Elements:**
  - Small heatmap preview (app usage tracking)
  - Mini timeline scrubber (life phases)
  - Sparkline graphs (finance trends)

**Animation:**
- Contour lines animate continuously (subtle drift)
- Stats count up when entering viewport
- Heatmap cells fade in sequentially

---

### SECTION 6: THE WORKSHOP (Store Concept)

**Job:** Introduce modularity. Playful but intentional.

**Visual:**
- **Background:** `#09090b` with a **shelf/grid** metaphor
  - Features displayed as "products" on shelves

- **Content:**
  - Kicker: "BUILD YOUR RHEO"
  - Headline: "Every feature is a module. Pick what you need." (48px)
  - Subhead: "Start with the core. Add modules as you grow. Or unlock everything at once."

- **Store Grid:**
  - Cards arranged like app store items
  - Each has: icon, name, description, **price tag** (gimmick)
  - Price tags show fake prices: "$4.99", "$9.99", "$14.99"
  - **Toggle:** "Admin Mode" switch at top
    - Off: Prices visible, "Add to RHEO" buttons
    - On: All prices change to "Included", buttons change to "Installed"
    - **Playful micro-interaction:** Price tags flip with a 3D rotation animation

**Toggle Design:**
- Label: "🔓 Admin Account"
- Switch: Amber toggle
- When toggled: All cards get a subtle gold border pulse

**Animation:**
- Cards stagger in from sides
- Price tag flip animation (3D rotateX)
- Admin toggle triggers cascade of flips across all cards

---

### SECTION 7: THE DELTA (Download CTA)

**Job:** Convert. Make downloading feel like an event.

**Visual:**
- **Background:** Deepest section (`#050505`) with a **converging particle flow**
  - Particles flow toward center (like a river delta meeting the sea)
  - Center: Large download button

- **Content:**
  - Headline: "Start your river." (72px, bold)
  - Subhead: "RHEO is free and open source. Download for macOS, Windows, or Linux."

- **Download Button:**
  - Large, amber, glass morphism
  - Ripple effect on hover (like dropping a stone in water)
  - Text: "Download RHEO 1.0.0"
  - Below: "macOS 14+ · Windows 11 · Linux AppImage"

- **Secondary Actions:**
  - "View on GitHub" (ghost button)
  - "Read the Docs" (text link, mono)

**Animation:**
- Particles converge faster as user approaches this section (scroll-linked)
- Button has persistent subtle glow pulse
- Hover: Ripple expands from cursor position
- Click: Particles explode outward, then page transitions

---

### SECTION 8: THE BANK (Footer)

**Job:** Clean landing. Leave a final impression.

**Visual:**
- **Top edge:** Wave animation (SVG path that undulates slowly)
  - Color: subtle amber gradient at 10% opacity

- **Content:**
  - Left: "RHEO" wordmark + tagline "Your time, visualized."
  - Center: Links — Features, GitHub, Docs, Roadmap
  - Right: "Built with obsession. No tracking." + version number

- **Bottom:**
  - "© 2026 RHEO. Open source under MIT."
  - "Your data never leaves your machine."

**Animation:**
- Wave undulates continuously (CSS animation, 8s loop)
- Links have underline slide-in on hover

---

## 5. Animation & Motion Strategy

### Global Motion System

| Effect | Library | Implementation | Where |
|--------|---------|----------------|-------|
| **Smooth Scroll** | Lenis | `lenis/react` wrapper, lerp: 0.1 | Entire page |
| **Scroll-triggered reveals** | GSAP ScrollTrigger | `scrub: 1`, `pin` for sections | All sections |
| **Text splits** | GSAP SplitText | Word/char stagger | Headlines |
| **Spring physics** | Motion.dev | `type: "spring"` | Buttons, cards |
| **Parallax layers** | GSAP ScrollTrigger | Multiple scrub speeds | Hero, Depths |
| **3D transforms** | CSS + GSAP | `perspective`, `rotateX/Y` | Store toggle, cards |

### Section-Specific Motion

| Section | Primary Effect | Secondary Effects |
|---------|---------------|-------------------|
| Hero | WebGL flow field | Particle mouse interaction, text weight animation |
| Philosophy | ASCII decode rain | Glass card hover lift |
| Features | Bento stagger reveal | Micro-animations per card |
| AI Depths | Pinned morphing graph | SplitText reveals, node glow |
| Landscape | Contour line drift | Counter animations, heatmap fade |
| Store | 3D price flip cascade | Shelf parallax, toggle ripple |
| Download | Converging particles | Ripple button, glow pulse |
| Footer | SVG wave undulation | Link underline slide |

### Performance Rules

1. **GPU-only animations** — `transform` and `opacity` only
2. **Will-change hints** — Apply to scroll-driven elements
3. **Reduced motion** — `@media (prefers-reduced-motion: reduce)` disables all non-essential motion
4. **Mobile fallback** — Hero WebGL → static gradient. Complex scroll effects → simple fades.
5. **Lazy loading** — Three.js canvas loads after first paint

---

## 6. Component Sources (MCP & Libraries)

### Primary Animation Libraries

| Library | Purpose | Install |
|---------|---------|---------|
| **Motion.dev** (Framer Motion) | React animations, gestures, layout | `npm install motion` |
| **GSAP + ScrollTrigger** | Scroll-driven animations, pinning | `npm install gsap` |
| **Lenis** | Smooth scroll | `npm install lenis` |
| **React Three Fiber** | WebGL hero background | Already in project |
| **@react-three/drei** | R3F helpers | Already in project |

### MCP Component Sources

| Source | Components to Pull | Usage |
|--------|-------------------|-------|
| **shadcn-ui-mcp** | Button, Card, Badge, Switch, Separator | UI primitives |
| **magicui** | AnimatedBeam, Particles, BorderBeam, Shine | Feature card accents |
| **reactbits** | Text animations, background effects | Section transitions |
| **lucide** | All icons (1500+) | Feature icons, UI icons |
| **iconify** | Supplementary icons | If Lucide lacks something |

### Specific Components to Source

| Component | Source | Notes |
|-----------|--------|-------|
| Glass morphism cards | shadcn Card + custom CSS | `bg-[rgba(24,24,27,0.60)] backdrop-blur-xl` |
| Animated beam connectors | Magic UI | Between feature cards in AI section |
| Particle background | Magic UI or custom WebGL | Hero ambient particles |
| Text gradient | Tailwind | `bg-gradient-to-r from-amber-400 to-amber-600 bg-clip-text` |
| Number counter | Custom hook + GSAP | Stats in Landscape section |
| 3D card flip | CSS `transform-style: preserve-3d` | Store price tags |
| Split text reveal | GSAP SplitText | Section headlines |
| Smooth scroll wrapper | Lenis React | Page wrapper |

---

## 7. Technical Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 19 + Vite (consistent with app) |
| Language | TypeScript |
| Styling | Tailwind CSS 4 |
| Animation | Motion.dev + GSAP + Lenis |
| 3D/WebGL | React Three Fiber (existing) |
| Icons | Lucide React |
| Fonts | Geist (variable), JetBrains Mono |
| Build | Vite (consistent with app build system) |

### File Structure

```
landing-page/
├── src/
│   ├── sections/
│   │   ├── Hero.tsx              # WebGL background + headline
│   │   ├── Philosophy.tsx        # ASCII decode + 3 pillars
│   │   ├── Features.tsx          # Bento grid
│   │   ├── AIDepths.tsx          # Pinned graph + AI features
│   │   ├── Landscape.tsx         # Contour lines + stats
│   │   ├── Store.tsx             # Module store gimmick
│   │   ├── Download.tsx          # CTA + converging particles
│   │   └── Footer.tsx            # Wave + links
│   ├── components/
│   │   ├── WebGLBackground.tsx   # R3F flow field shader
│   │   ├── ASCIIDecode.tsx       # Text decode effect
│   │   ├── BentoCard.tsx         # Reusable bento card
│   │   ├── GlassCard.tsx         # Glass morphism wrapper
│   │   ├── AnimatedCounter.tsx   # Number counter
│   │   ├── PriceFlip.tsx         # 3D price tag flip
│   │   ├── SplitText.tsx         # GSAP text reveal
│   │   └── WaveSVG.tsx           # Footer wave
│   ├── hooks/
│   │   ├── useScrollProgress.ts  # Scroll position tracking
│   │   ├── useInView.ts          # Intersection observer
│   │   └── useReducedMotion.ts   # Accessibility check
│   ├── shaders/
│   │   └── flowField.frag        # GLSL fragment shader
│   ├── lib/
│   │   └── utils.ts              # cn() and helpers
│   ├── App.tsx
│   └── main.tsx
├── public/
│   ├── fonts/
│   └── images/
├── index.html
├── vite.config.ts
└── tailwind.config.ts
```

---

## 8. The "Store" Concept — Detailed Design

### Philosophy

The store is a **visual metaphor for modularity**, not a real e-commerce flow. It communicates:
- RHEO is composed of independent modules
- You can build your ideal setup
- Everything is included for contributors/admins

### Interaction Design

1. **Default State:**
   - Features shown as "products" with price tags
   - Prices are clearly fake/playful ($4.99, $9.99, etc.)
   - "Add to RHEO" buttons

2. **Admin Toggle (top-right of section):**
   - Toggle switch labeled "🔓 Admin Account"
   - When activated:
     - All price tags flip 180° (3D rotateX)
     - Front: "$X.99" → Back: "Included"
     - Buttons change: "Add to RHEO" → "Installed"
     - Cards get gold border glow
     - Subtle confetti burst from toggle

3. **Hover States:**
   - Card lifts with shadow
   - Price tag wobbles slightly
   - "Add to RHEO" button glows amber

4. **Copy:**
   - Headline: "Build your RHEO"
   - Subhead: "Start with the core. Add modules as you grow."
   - Toggle label: "Have an admin account? Unlock everything."

### Implementation Notes

- Use CSS `transform-style: preserve-3d` for price flip
- GSAP timeline for coordinated flip cascade
- State managed with React `useState` at section level
- Prices stored as data, not hardcoded

---

## 9. Responsive Strategy

| Breakpoint | Adjustments |
|------------|-------------|
| **Desktop (1280px+)** | Full experience — WebGL, all scroll effects, bento grid |
| **Tablet (768–1279px)** | Bento grid → 2 columns, reduced particle count, simpler graph |
| **Mobile (<768px)** | WebGL → static gradient, bento → single column, store → horizontal scroll, no pin sections |

### Mobile-Specific
- Hero: Static gradient background, reduced text size (64px)
- Features: Vertical stack, full-width cards
- AI Depths: Simple fade transitions instead of pinned scroll
- Store: Horizontal swipeable cards
- Download: Centered button, stacked secondary actions

---

## 10. Accessibility

- **Reduced motion:** All animations respect `prefers-reduced-motion`
- **Color contrast:** All text meets WCAG AA (4.5:1 minimum)
- **Focus states:** Visible focus rings on all interactive elements
- **Semantic HTML:** Proper heading hierarchy, landmark regions
- **Alt text:** All decorative elements marked `aria-hidden`
- **Keyboard nav:** Full keyboard accessibility for store toggle, CTAs

---

## 11. Asset Requirements

| Asset | Type | Source | Notes |
|-------|------|--------|-------|
| RHEO logo | SVG | Custom | Minimal, wordmark only |
| Feature icons | SVG | Lucide | 8 icons for feature cards |
| Hero shader | GLSL | Custom | Reaction-diffusion + flow field |
| Contour lines | Canvas/GLSL | Custom | Based on Freeboard mechanic |
| Graph visualization | Canvas/GLSL | Custom | Based on Adjacent mechanic |
| Screenshots | PNG | App captures | For feature card previews (optional) |

---

## 12. Implementation Roadmap

### Phase 1: Foundation (Week 1)
- [ ] Set up landing page project structure
- [ ] Install dependencies (Motion, GSAP, Lenis)
- [ ] Configure Tailwind with custom tokens
- [ ] Build global layout + smooth scroll wrapper
- [ ] Build reusable components (GlassCard, SplitText)

### Phase 2: Core Sections (Week 2)
- [ ] Hero section with WebGL background
- [ ] Philosophy section with ASCII decode
- [ ] Features bento grid
- [ ] Footer with wave animation

### Phase 3: Advanced Sections (Week 3)
- [ ] AI Depths with pinned graph
- [ ] Landscape with contour lines + counters
- [ ] Store with flip animation
- [ ] Download CTA with particles

### Phase 4: Polish (Week 4)
- [ ] Responsive breakpoints
- [ ] Reduced motion support
- [ ] Performance optimization
- [ ] Cross-browser testing
- [ ] Lighthouse audit (target: 90+)

---

## 13. Open Questions for CZ

1. **Hero shader complexity:** Should we use the existing Morphogen reaction-diffusion code as a base, or build a new flow-field shader?
2. **Screenshots:** Do you have app screenshots for feature cards, or should we use abstract visuals?
3. **Store prices:** Should the fake prices be humorous ($4.20, $42.0, $1337) or realistic?
4. **Download links:** What's the actual download URL? GitHub releases page?
5. **Domain:** Will this be `rheo.app`, `rheo.dev`, or a subdirectory of an existing site?
6. **Analytics:** Do you want any privacy-respecting analytics (Plausible, Fathom) or truly zero tracking?

---

## 14. Design Principles Checklist

Before shipping, verify:

- [ ] **No AI slop** — Every animation has a purpose
- [ ] **One focal element** per viewport
- [ ] **Motion supports meaning** — Not decoration-only
- [ ] **Typography hierarchy** — Scale + weight, not borders
- [ ] **Glass morphism consistency** — Same blur/radius everywhere
- [ ] **Color discipline** — Only tokens, no ad-hoc colors
- [ ] **Reduced motion fallback** — Works without animations
- [ ] **Mobile dignity** — Not just "shrunk desktop"
- [ ] **Fast load** — WebGL lazy-loaded, images optimized
- [ ] **Accessible** — Keyboard, screen reader, contrast

---

*This specification is ready for implementation. Each section can be built independently using the component sources and animation strategies outlined above.*
