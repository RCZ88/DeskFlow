# RHEO Landing Page — Context Bundle

> Self-contained reference for an external AI (Claude, GPT-4, Gemini) to design a landing page.
> The external AI has zero codebase access — everything it needs is in this file.

---

## 1. What is RHEO

RHEO is a **local-first, privacy-first desktop application** built with Electron + React + better-sqlite3. It is a multi-functional productivity and life-management system. There are no accounts, no cloud, no subscription. Everything lives on the user's computer in a single SQLite database.

**Core philosophy:** Your data never leaves your machine. No telemetry. No sync servers. No accounts.

---

## 2. Feature Inventory

RHEO has 15+ major subsystems. These are the real features that exist in production:

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

### Visual & Ambient
- **Living Substrate** — Gray-Scott reaction-diffusion ambient background (organic coral patterns via WebGL).
- **The Current** — Signature motion system: a persistent directional pulse that interprets each page's information structure differently.
- **3D Architecture Map** — Neural-network-style codebase visualization.

---

## 3. Technical Stack

| Layer | Technology |
|-------|-----------|
| Desktop shell | Electron |
| Frontend | React + TypeScript + Tailwind CSS |
| Database | better-sqlite3 (single file: `deskflow-data.db`) |
| State | Zustand + localStorage (for UI prefs) |
| Charts | Chart.js + react-chartjs-2 |
| 3D/WebGL | Three.js via @react-three/fiber |
| Build | Vite (renderer), esbuild (preload + main), custom build.mjs |
| AI providers | OpenRouter, Ollama (local), direct API calls |
| Design system | Glass morphism, dark mode only, Geist/JetBrains Mono fonts |

---

## 4. The 10 Motion Mechanics

RHEO has a library of 10 standalone HTML/CSS/JS visual mechanics. Each is a complete landing-page-style demo with hero, stats, how-it-works, pricing, FAQ, and footer sections. They use pure canvas/DOM — no frameworks, no dependencies.

### The Mechanics

| # | Name | Visual | Semantic Meaning |
|---|------|--------|-----------------|
| 01 | **Morphogen** | Gray-Scott reaction-diffusion (organic coral growth on canvas) | "RHEO is alive" — organic, growing, living material |
| 02 | **Overpass** | Wireframe Earth with orbital satellite ground tracks | Global reach, observation, coverage |
| 03 | **Adjacent** | Force-directed graph (220 nodes, spring physics, labeled clusters) | Connection, knowledge graph, citation networks |
| 04 | **Nearside** | Voronoi tessellation (animated seed points → cell boundaries) | Edge compute, proximity, distributed presence |
| 05 | **Freeboard** | Contour isolines (continuous terrain field) | Risk mapping, data landscape, topography |
| 06 | **Headway** | Flow-field streamlines (vector field routing) | Workflow, data movement, freight routing |
| 07 | **Foreshock** | Strip-chart seismograph (8 persistent traces with event spikes) | Monitoring, incident detection, persistent traces |
| 08 | **Quorum** | Cellular automaton (Game of Life grid, emergent patterns) | Agent orchestration, emergent behavior, simple rules → complex outcomes |
| 09 | **Harmonic** | Hidden-line wireframe (rotating gear/cad drawing) | Precision engineering, zero-tolerance, mechanical |
| 10 | **Deident** | Redaction bars (PII masking, accumulating redactions) | Privacy, security, data protection |

### Key Design Rule
Every visual mechanic MUST map to the page's information type. Never use a mechanic just because it looks cool.

### Demo Structure (each HTML file follows this pattern)
- **Hero**: Full-viewport canvas animation + copy (kicker, headline, subtitle, CTA)
- **Stats/Properties**: 3-column grid with large numbers
- **How it works**: 3-step process
- **Pricing**: Table or cards
- **FAQ**: Accordion
- **Footer**: Minimal, with pattern

---

## 5. Landing Page Concept

### The Idea
A single-page marketing site for RHEO that communicates:
1. **What it is** — A local-first desktop app for productivity, learning, AI, finance, and life management
2. **Why it matters** — Your data stays on your computer. No accounts. No cloud. No subscription.
3. **What it does** — Feature showcase pulling from the real feature inventory
4. **How it works** — The beauty of local-first architecture

### Proposed Sections
1. **Hero** — Full-bleed motion mechanic background + app name + tagline + CTA
2. **"What is RHEO"** — Brief, punchy explanation of local-first philosophy
3. **Feature Grid** — Real features displayed as cards (content engine, learn system, focus tracking, AI tools, finance, life phases, terminal workspace, context brain)
4. **"Your Data Never Leaves"** — Privacy/security emphasis (Deident mechanic could work here)
5. **"The Beauty of the Process"** — How components work together, the interconnected system
6. **Modular Store (concept)** — The idea that RHEO's subsystems could eventually be attachable modules from a store (visual gimmick for now, real feature later)
7. **Feature Paywall (gimmick)** — Each feature could show a price tag, but an admin account unlocks everything
8. **Download / Get Started** — CTA

### Open Questions
- Which motion mechanic fits RHEO's identity best for the hero? (Morphogen = alive/organic, Quorum = emergent/agent, Overpass = global/tech)
- What tone? (The 10 demos range from organic/scientific to surveillance/tech to agent/emergent)
- Is the "modular store" concept a real future plan or just a visual gimmick?
- Which features get showcase cards? (All 15+ or a curated subset?)
- Is there a tagline already? Or should we brainstorm?

---

## 6. Design System (DeskFlow Tokens)

The app uses a dark-mode-only glass morphism design system:

| Token | Value | Usage |
|-------|-------|-------|
| `--bg-primary` | `#09090b` (zinc-950) | Main background |
| `--bg-secondary` | `#18181b` (zinc-900) | Card backgrounds |
| `--bg-tertiary` | `#27272a` (zinc-800) | Borders, dividers |
| `--accent-primary` | `#fbbf24` (amber-400) | Primary accent |
| `--accent-secondary` | `#f59e0b` (amber-500) | Hover states |
| `--text-primary` | `#fafafa` (zinc-50) | Headings |
| `--text-secondary` | `#a1a1aa` (zinc-400) | Body text |
| `--text-muted` | `#71717a` (zinc-500) | Labels, captions |
| Font (body) | Geist / Inter, 13px | |
| Font (mono) | JetBrains Mono | Code, labels |
| Border radius | `rounded-xl` (12px) max | Never larger |
| Card padding | `p-5` (20px) | Consistent |
| Glass | `bg-[rgba(24,24,27,0.60)]` + backdrop-blur | Card surfaces |

---

## 7. Available MCP Tools (for the coding agent to pull components)

| MCP Server | What it gives |
|------------|--------------|
| **shadcn** | Thousands of Tailwind+React components (hero sections, pricing tables, feature grids, navs, cards, bento layouts) |
| **Magic UI** | 150+ animated components (beams, particles, bento grids, text animations, backgrounds) |
| **Lucide** | 1500+ SVG icons |
| **@21st-dev/magic** | Prompt-to-component generation |
| **React Bits** | 135+ animated React components |
| **Iconify** | 200,000+ icons |
| **Unsplash** | Stock photography with attribution |
| **Google Design** | Material Design icons, fonts, color schemes |

### Source Routing
| Need | Use |
|------|-----|
| Standard UI block | shadcn MCP |
| Animated effect | Magic UI MCP |
| Icon | Lucide MCP |
| Specific component from description | @21st-dev/magic |
| Real photography | Unsplash MCP |
| Theme generation | tweakcn.com (external tool) |

---

## 8. Collaboration Protocol

This is a back-and-forth design conversation. The workflow:

1. **External AI designs** — Produces landing page structure, section copy, visual direction
2. **CZ relays** — Copy-pastes between the two AIs
3. **opencode provides context** — Fetches source code, component examples, MCP component sources
4. **Iterate** — Until the design converges on a RESULT.md

### Rules
- External AI asks specific questions (REQUEST format)
- opencode answers with actual source code (CONTEXT format)
- No hallucinated APIs — if it doesn't exist, say so
- When converged, produce RESULT.md with complete implementation spec

---

## 9. What We Need From You

Before designing, answer these:

1. **Hero mechanic** — Which of the 10 motions fits RHEO? Or a combination?
2. **Tagline** — Got one, or should we brainstorm?
3. **Tone** — Organic/warm? Technical/precise? Agent/emergent? Something else?
4. **Feature cards** — All features or a curated top-8?
5. **Store concept** — Real future plan or just a visual section?
6. **Paywall gimmick** — How literal? Fake prices? "Admin unlocks all" toggle?
7. **CTA** — Download? GitHub? "Try it free"?
8. **Any existing landing page inspiration?** Links or descriptions.
