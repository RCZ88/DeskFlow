# Questions for Architect — AI Cityscape Visualization

> These need resolution before I can write implementation code.

---

## Q1: Does the city REPLACE or ADD TO existing charts?

The FIX PACKET says the city "replaces" the Doughnut, Model Timeline, Multi-Agent Comparison, and Per-Agent bar charts. But does it also replace the **Input/Output Ratio** card (line 2532) and the **StatsDashboard** section (line 2128)?

**Recommendation:** Replace everything from line 2396 (`AI Charts Section` motion.div) forward. Keep the summary bar (line 2005) + agent cards grid (line 2252) + StatsDashboard.

---

## Q2: Which of the 6 view modes should ship in this cycle?

The request defines 6 modes: Agent, Project, Model, Time, Category, Weekday. Implementing all 6 in one cycle is risky.

**Recommendation:** Ship 3 modes this cycle:
1. **Agent** (default) — buildings are agents, height = tokens/cost/sessions/messages
2. **Model** — buildings are LLM models (claude-sonnet-4, gemini-2.5-pro, gpt-4o, etc.)
3. **Time-lapse** — buildings animate from oldest to newest day (scrub bar control)

Leave Project, Category, Weekday for a follow-up cycle.

---

## Q3: Layout algorithm choice?

- **Flat grid** (simpler, renderer-friendly, easier to click)
- **Organic / radial** (taller buildings toward center, more scenic)

If radial: should distance from center be random, or encode data (e.g., older projects on outskirts)?

**Recommendation:** Radial layout with height = selected metric value. Distance from center = random jitter within agent zone (avoids overlap naturally).

---

## Q4: Building height = which metric?

The current chart mode toggle lets users switch between tokens / messages / sessions / cost (and input/output sub-modes for tokens). Should the city buildings' height follow the selected chart metric?

**Recommendation:** Yes — building height, color intensity, and all rendered values update live when user toggles metric. This gives the city an interactive data-linked feel.

---

## Q5: New file strategy?

One monolithic R3F component file vs. a subfolder?

**Recommendation:** Single file `src/components/AICityscape.tsx` (~250–350 lines). The component is self-contained (canvas, buildings, ground, slide-in panel, time controls). If it exceeds 400 lines, refactor into `src/components/cityscape/` subfolder in a follow-up cycle.

---

## Q6: Shared post-processing with OrbitSystem?

OrbitSystem uses `@react-three/postprocessing` with UnrealBloomPass + ToneMappingPass.

**Recommendation:** Use `<EffectComposer>` + `<Bloom>` + `<Vignette>` from drei in AICityscape too. This keeps visual style consistent across 3D views in the app.

---

## Q7: Click building → what detail panel?

When user clicks a building, what should the slide-in panel show? The existing agent cards display tokens / messages / cost / sessions / avg-per-message.

**Recommendation:** Show the same metrics the agent cards show — but tailored to whatever the building represents (agent, model, or project depending on view mode). Reuse the slide-in pattern from `PlanetDetailPanel` in OrbitSystem.

---

## Q8: Time-lapse mode UX?

The time-lapse mode needs a playback control. Options:
- **Slider only** (drag to scrub day-by-day)
- **Play/pause + slider** (auto-animate through days)

**Recommendation:** Slider only (simpler for first cycle). The existing period selector (7D/30D/All) still gates the date range; the slider scrubs within it.
