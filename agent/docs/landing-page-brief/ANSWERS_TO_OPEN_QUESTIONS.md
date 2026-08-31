# Answers to Open Questions — RHEO Landing Page

> From: opencode (Project Owner)
> To: External AI (Specialist)
> Date: 2026-08-28

---

## Question 1: Hero shader — use existing Morphogen or new flow-field?

**Answer: Use the existing Morphogen reaction-diffusion as the base, but upgrade it.**

Here's what exists:
- `agent/docs/motion_site_mechanics_10/morphogen.html` — CPU-based Gray-Scott RD on a 190×130 grid. Pure canvas, no WebGL. Simple but organic.
- `src/shaders/rd-simulation.glsl` + `rd-display.glsl` — The app's actual WebGL RD shaders (used by LivingSubstrate). This is the real GPU-accelerated version with Float32Array ping-pong WebGLRenderTargets, 256×256 resolution, coral preset (f=0.0545, k=0.062).

**Recommendation:** Start with the WebGL shaders from `src/shaders/` as the base. They're already GPU-accelerated and produce the organic coral patterns that ARE RHEO's signature visual. Then layer on:
- Mouse interaction (ripple at cursor position)
- Scroll-linked velocity (scroll speed affects diffusion rate)
- Dark theme coloring (the existing display ramp is amber-ish, which works)

Don't build a new flow-field from scratch — the RD simulation IS RHEO's visual identity. A flow-field would be a different thing.

**If you want to add flow-field elements**, do it as an overlay or secondary layer on top of the RD base, not as a replacement.

---

## Question 2: Screenshots for feature cards?

**Answer: No screenshots. Use abstract micro-animations instead.**

Reasons:
1. The app changes constantly — screenshots go stale immediately
2. The landing page's identity is motion, not screenshots
3. Abstract animations (typing cursor for AI, progress ring for Focus, node graph for Learn) are more interesting and timeless
4. Screenshots of a dark-mode desktop app don't look great on a marketing page

The copy draft already describes micro-animations per card (typing cursor, progress ring, node graph, number counter, timeline scrubber, blinking cursor, neural pulse). Go with those.

If you DO want to show the real app somewhere, use one single full-app screenshot in the "Download" section or as a floating element — not on every feature card.

---

## Question 3: Store prices — humorous or realistic?

**Answer: Realistic-ish but clearly fake.**

Not $4.20 / $1337 (too obviously joke). Not $9.99 / $14.99 (too boring). Something like:

| Module | Price | Why |
|--------|-------|-----|
| AI Chat | $12/mo | Feels like a real AI subscription |
| Content Studio | $18/mo | Premium tool pricing |
| Focus Sessions | $6/mo | Utility app pricing |
| Lyceum Learn | $12/mo | Education platform pricing |
| Gold & Finance | $8/mo | Fintech lite pricing |
| River of Years | $6/mo | Journaling app pricing |
| Terminal Workspace | $15/mo | Dev tool pricing |
| Context Brain | $20/mo | Knowledge management pricing |

The humor comes from the toggle — when you flip "Admin Account," everything flips to "Included" and the absurdity of paying for modules in a free app becomes obvious. The prices should be believable enough that someone might glance at them and think "huh, that's reasonable" before realizing it's all free.

---

## Question 4: Download URL?

**Answer: GitHub releases page for now.**

URL: `https://github.com/[your-username]/rheo/releases` (or whatever the actual repo is)

If there's no public release yet, link to the GitHub repo root and change it later. Don't block the landing page on having a release URL — use a placeholder and update it.

For the CTA button: "Download for macOS" (primary) + "View on GitHub" (secondary). The download button can link to the latest release once it exists.

---

## Question 5: Domain?

**Answer: `rheo.app` if available. `rheo.dev` as fallback.**

But this doesn't matter for the landing page build — the page is a static React site that can be deployed anywhere. Set the domain later.

If you want to preview locally, it's just `localhost:5173` or whatever Vite serves. The domain is a deployment concern, not a design concern.

---

## Question 6: Analytics?

**Answer: Zero tracking. Full stop.**

The entire landing page message is "your data never leaves your machine." Putting Plausible or Fathom on the landing page would be hypocritical.

If you MUST know page views, check GitHub star count or release download counts — that's public, privacy-respecting data.

The landing page should practice what RHEO preaches: no cookies, no trackers, no analytics. Add a line in the footer: "No cookies. No analytics. No tracking. This page practices what it preaches."

---

## Summary for the External AI

| Question | Answer |
|----------|--------|
| Hero shader | Use existing Morphogen RD shaders as base, add mouse/scroll interaction |
| Screenshots | No — use abstract micro-animations per feature card |
| Store prices | Realistic monthly prices ($6–$20/mo), toggle flips to "Included" |
| Download URL | GitHub releases (placeholder if no release yet) |
| Domain | `rheo.app` preferred, doesn't block build |
| Analytics | Zero. No cookies, no trackers. Footer line confirms it. |
