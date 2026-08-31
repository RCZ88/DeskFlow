# EXTERNAL AI DESIGNER BRIEF — RHEO Landing Page

> **Project:** RHEO Landing Page  
> **Role:** You are the creative design specialist. Generate 3-5 candidate design directions.  
> **Constraint:** DO NOT use any existing app visualizations (solar system, city viz, etc.). The landing page must have its OWN unique visual identity.  
> **Output:** For each candidate, provide: concept name, visual metaphor, color scheme, section architecture, hero idea, animation strategy, and why it fits RHEO.

---

## PART 1: WHAT IS RHEO

RHEO is a **local-first, privacy-first desktop application** built with Electron + React + better-sqlite3. It is a multi-functional productivity and life-management system.

**Core philosophy:** Your data never leaves your machine. No telemetry. No sync servers. No accounts. Everything lives in a single SQLite database file on your computer.

**Key differentiators:**
- Not a web app — it's a desktop app (Electron)
- Not cloud-based — everything is local
- Not subscription-based — free and open source (MIT)
- AI-native — multi-provider AI chat (OpenRouter, Ollama local, direct API)
- Tracking-heavy — app usage, browser tabs, coding time, focus sessions
- Visualization-rich — but those visualizations are INSIDE the app, not on the landing page
- Modular — 15+ subsystems that work together

**The app feels like:** A personal command center. A private dashboard. A second brain that lives on your machine.

---

## PART 2: FEATURE INVENTORY (15+ Subsystems)

### Productivity & Tracking
- **App/Web Usage Tracking** — Monitors foreground apps and browser tabs in real-time. Live stopwatch, session history, activity heatmap, daily/weekly/monthly analytics.
- **Focus Sessions** — Productive-time focus timer with strict/lenient modes, focus groups (whitelist-based allowed apps/sites), daily goals, streaks, and progress rings.
- **Timer System** — Live stopwatch that counts productive time, pauses on distracting apps, tracks browser websites via extension.

### AI & Content
- **AI Chat** — Multi-provider AI chat (OpenRouter, Ollama local, direct API). Supports vision/multimodal models. Chat history, context brain integration.
- **Content Engine** — Full content-creation pipeline: brainstorm → ideas → episodes/scripts with retention evidence → themes → analytics → lessons → frameworks. Script scoring, SEO injection, gate validation.
- **AI Tools Dashboard** — Per-tool usage stats, model usage timelines, dominance phases, daily averages, cost tracking.

### Learning
- **Lyceum Learn** — Hierarchical lesson system: Topics → Groups → Nodes. Mastery levels (L0-L5), prerequisites, visual grounding, annotated blocks, knowledge intake (Survey/Extract/TopicFocus modes), learner profiles, quiz system.

### Life & Finance
- **Life Phases (River of Years)** — Visual timeline of life eras. Ring & Grain visualization, phase cards, era trends, reflections, covenant completion.
- **Gold (Goals & Journal)** — Daily goals, weekly habits, long-term goals with progress rings, deadline radar, day journal, streak tracking.
- **Finance** — Wallet management, income/expense tracking, subscriptions, Follow-Through (on-behalf-of transactions), spending by category, monthly recaps, wallet health scores.

### Workspace & Dev Tools
- **Terminal Workspace** — Multi-pane terminal with AI agent integration. 5-group sidebar (Setup/Work/Insights/Studio/Context). Presets, configs, file browser, session management.
- **IDE Projects** — Project detection, code activity tracking (via VS Code extension), AI usage per project, architecture visualization.
- **Database Browser** — Browse all 175+ tables, view recent changes, ER diagram visualization.

### Intelligence
- **Context Brain** — Bitemporal knowledge graph. Episodes, entities, facts, embeddings. Keyword + graph retrieval. MCP server for external tools.
- **Browser Extension** — AI context capture from ChatGPT/Claude/Perplexity/Gemini. Two-way loop: capture conversations, insert context into chats.
- **Insights & Reports** — Day/weekly/activity analytics, sleep patterns, productivity comparisons.

---

## PART 3: DESIGN TOKENS (The App's Existing System)

The app uses a dark-mode-only glass morphism design system. The landing page can use these as a base or evolve from them.

| Token | Value | Usage |
|-------|-------|-------|
| `--bg-primary` | `#09090b` (zinc-950) | Main background |
| `--bg-secondary` | `#18181b` (zinc-900) | Card backgrounds |
| `--bg-tertiary` | `#27272a` (zinc-800) | Borders, dividers |
| `--accent-primary` | `#fbbf24` (amber-400) | Primary accent |
| `--accent-secondary` | `#f59e0b` (amber-500) | Hover states |
| `--text-primary` | `#fafafa` (zinc-50) | Headlines |
| `--text-secondary` | `#a1a1aa` (zinc-400) | Body text |
| `--text-muted` | `#71717a` (zinc-500) | Labels, captions |
| Font (body) | Geist / Inter, 13px | |
| Font (mono) | JetBrains Mono | Code, labels |
| Border radius | `rounded-xl` (12px) max | Never larger |
| Card padding | `p-5` (20px) | Consistent |
| Glass | `bg-[rgba(24,24,27,0.60)]` + backdrop-blur | Card surfaces |

**Landing page can evolve from this** — darker, more cinematic, or completely different. You decide.

---

## PART 4: WHAT THE LANDING PAGE MUST COMMUNICATE

### Message Hierarchy (most to least important)

1. **"Your data never leaves your machine"** — This is THE differentiator. Privacy-first, local-first.
2. **"It's not one app — it's 15+ tools that work together"** — Multi-functional, modular.
3. **"AI-native, not AI-bolted-on"** — AI is woven into every feature, not a chatbot sidebar.
4. **"Track everything, see everything, improve everything"** — The beauty of the process. Time tracking, data visualization, self-improvement.
5. **"Free and open source"** — No subscription, no lock-in, MIT license.

### Target Audience
- Power users who value privacy
- Developers who want a local alternative to Notion/Obsidian/Toggl
- People who want AI but don't want to send their data to the cloud
- Self-trackers, quantified-self enthusiasts
- People who want ONE app instead of 15 subscriptions

### Tone
- Confident but not arrogant
- Technical but not cold
- Private but not paranoid
- Powerful but not overwhelming
- Beautiful but not flashy

---

## PART 5: CRITICAL CONSTRAINTS

### ❌ DO NOT USE THESE (they're inside the app, not on the landing page)
- Solar system visualization
- City visualization
- 3D architecture map
- Life phases ring & grain visualization
- Any existing app UI screenshots as the main visual
- Reaction-diffusion (Morphogen) — unless reimagined completely
- Force-directed graph (Adjacent) — unless reimagined completely

### ✅ THE LANDING PAGE NEEDS ITS OWN IDENTITY
- The landing page is the **invitation** to the app
- It should feel like entering a private club, a secure vault, a command center
- It should make people FEEL something before they understand features
- It should be memorable, shareable, screenshot-worthy

---

## PART 6: AVAILABLE TOOLS & COMPONENTS

### Animation Libraries
- **Motion.dev** (Framer Motion successor) — React animations, gestures, scroll-linked
- **GSAP + ScrollTrigger** — Scroll-driven animations, pinning, timelines
- **Lenis** — Smooth scroll
- **React Three Fiber** — WebGL/3D (use sparingly, only if concept demands it)

### Component Libraries (MCP)
- **shadcn/ui** — Buttons, cards, badges, switches, tooltips
- **Magic UI** — Animated beams, particles, text effects, bento grids, border beams, shiny text, blur fade, scroll velocity, circular progress
- **React Bits** — Aurora, threads, waves, silk backgrounds
- **Lucide** — 1500+ icons

### Inspiration References
- **motion.dev** — Clean, black & white, precise animations
- **pacomepertant.com** — Awwwards SOTD, rhythm-driven, spiral views, mouse trails
- **vshslv.com** — Viacheslav Novoseltsev, Three.js/WebGL/GSAP, award-winning interactive
- **podium-studios.com/services** — Scrolling animations, section transitions
- **variant.com** — Design system, animation principles

---

## PART 7: WHAT WE NEED FROM YOU

Generate **3-5 candidate design directions** for the RHEO landing page. Each candidate must be completely different from the others.

### For Each Candidate, Provide:

#### 1. Concept Name
A memorable name for the design direction.

#### 2. Visual Metaphor
What is the core metaphor? (e.g., "The Vault", "The Observatory", "The Forge", "The Archive", "The Pulse")
Why does this metaphor fit RHEO?

#### 3. Color Scheme
- Background colors
- Text colors
- Accent colors
- Why these colors?

#### 4. Typography Approach
- Font choices
- Scale relationships
- Special treatments (outlines, gradients, mono accents)

#### 5. Hero Section Design
- What does the user see first?
- What's the visual hook? (NOT solar system, NOT city viz)
- What's the headline?
- What's the subheadline?
- What's the CTA?
- Animation on load?

#### 6. Section Architecture (8 sections)
Map out the full page flow. What happens as the user scrolls?

#### 7. Key Animations
- What are the 3 most important animations?
- What libraries/effects would you use?
- What do they communicate?

#### 8. Why This Fits RHEO
Explain the intention. Why is this the right design for THIS app?

---

## PART 8: EXAMPLE CANDIDATES (to show depth expected)

### Example Candidate A: "The Vault"
**Metaphor:** RHEO is a secure vault for your life data. The landing page feels like approaching a high-security facility.
**Hero:** A massive vault door that slowly opens as you scroll, revealing the app interface behind it. The door has RHEO engraved in steel.
**Colors:** Deep gunmetal gray, steel silver, amber warning lights (like a secure facility)
**Animation:** The vault door rotates on scroll (3D transform), gears turn, locks click. Behind the door: a glimpse of the app's dark interface.
**Why:** Communicates security, impenetrability, preciousness of data.

### Example Candidate B: "The Observatory"
**Metaphor:** RHEO is a lens into your own life. Like an astronomical observatory, it lets you see patterns you couldn't see before.
**Hero:** A massive telescope pointing at a starfield. As you scroll, the telescope focuses and the stars resolve into data points — your tracked time, your habits, your goals.
**Colors:** Deep space black, telescope bronze, data-point cyan
**Animation:** Starfield parallax, telescope tracking cursor, stars connect into constellations (your data patterns).
**Why:** Communicates insight, pattern recognition, the beauty of seeing yourself clearly.

### Example Candidate C: "The Forge"
**Metaphor:** RHEO is where you forge your ideal self. Raw data goes in, insights come out.
**Hero:** A blacksmith's forge, but digital. Molten data streams, hammer strikes create sparks that become features.
**Colors:** Forge black, molten amber, spark white, cooled steel gray
**Animation:** Molten flow shaders, hammer impact on scroll (screen shake + spark burst), cooling metal transition between sections.
**Why:** Communicates transformation, craftsmanship, raw-to-refined.

---

## PART 9: ADDITIONAL CONTEXT

### The "Store" Concept (Gimmick Section)
The landing page includes a playful section where features are displayed as purchasable modules:
- Individual features: $2.99
- Bundles (3 features): $6.99
- Admin toggle unlocks everything
This is a visual metaphor for modularity, not real commerce.

### Domain
rheo.work.gd

### Download
Electron app — .exe, .dmg, .AppImage via GitHub releases

### Privacy Stance
Zero tracking on the landing page. No analytics. No cookies.

---

## PART 10: YOUR DELIVERABLE

Please generate **3-5 candidate design directions** following the format above.

Be bold. Be unexpected. But always tie back to what RHEO actually is.

The landing page should make someone stop scrolling and think: "I need to know what this is."
