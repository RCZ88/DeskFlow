# HANDOFF 01 — RHEO landing state

## 1 Spec & files status
- `design/LANDING_DESIGN_SPEC.md` — v1.2 (LAMINAR) present, parsed. §1 enforces @theme tokens from the draft's globals.css; monochrome law, hairlines-not-shadows, bloom ≤8%, grain 4%, naming RHEO.
- `docs/motion_patterns.md` — present, parsed (Motion API snapshot + 5 code sketches, incl. 300vh-pinned playhead + velocity-coupled spring).
- `docs/perf_playbook.md` — present, parsed (Canvas 2D ASCII glyph field performance, 60fps mid-tier Android target, fillText batching, offscreen canvas, DPR cap, rAF lifecycle, layout-thrash avoidance).
- `"The Loom"` (v1.0, `rheo-landing/LANDING_DESIGN_SPEC.md`) → archived at `design/archive/loom/LANDING_DESIGN_SPEC.md`. Removed from load path.
- `src/components/ui/chart.tsx` (shadcn/Recharts) present — unused by RHEO; dead weight (W7).

## 2 Work order v2
Prior `docs/landing_gap.md` (348 lines) stands; its W1 caveat is now resolved.

| # | item | section | severity | status | fix owner | effort |
|---|---|---|---|---|---|---|
| W1 | Spec files missing | all | BLOCKER | RESOLVED | — | — |
| W2 | Download CTAs # placeholders | S8 | BLOCKER | OPEN | LOCAL | S |
| W3 | Draft not runnable as-imported | build | MAJOR | RESOLVED | LOCAL | M |
| W4 | Footer clock ticks under RM | footer | MINOR | OPEN | LOCAL | S |
| W5 | DayRuler right-4/.08 vs old Loom 24px/.3 | chrome | MINOR | RESOLVED-BY-AMENDMENT | — | — |
| W6 | Hero energy 0.35+min(.04,.55) vs old Loom 0.9 | S1 | MINOR | RESOLVED-BY-AMENDMENT | — | — |
| W7 | ui/chart.tsx dead weight | color/bundle | MINOR | OPEN | LOCAL | S |
| W8 | Layout audit @1280 & @375 | layout | MINOR | RESOLVED | — | — |
| W9 | useScrollVelocity idle rAF | S1/perf | MINOR | OPEN | LOCAL | S |
| W10 | useScrollVelocity cap 0.55 matches spec | S1/perf | — | CONFIRMED | — | — |
| W11 | Placeholder copy (manifesto, console, testimonials, press) | content | MAJOR | OPEN | GLM-EXTRACT | M |
| W12 | Loom removed from load path | archive | — | RESOLVED | LOCAL | S |

## 3 TASK 2 — New requirements census
**a. S9 ATLAS:** ABSENT (pending GLM build). No S9 component or section exists in `landing-mvp-draft/src/app/page.tsx`. Verdict: ABSENT — expected absent.

**b. Act III caption verbatim:** MISSING from draft. `ActUnderstand.tsx` has no caption element containing "SIMULATED RECORD SHOWN — RHEO'S AI QUERIES YOUR ACTUAL TIMELINE". The section shows a console + node graph but lacks the required honesty caption. Finding: ABSENT.

**c. Workspace TUI pane labels:** Draft `Capabilities.tsx` `TuiDemo()` uses three panes titled `timeline`, `focus`, `ai` (lines 381–399). Spec requires `EDITOR / AGENT / TIMELINE`. Draft also lacks the required caption "the room your agents work in." Finding: DEVIATED — labels and caption both wrong/absent.

**d. Manifesto word-window math:** Draft `Manifesto.tsx` `WordReveal` maps each word `i` linearly: `start = i / words.length`, `end = (i + 1) / words.length` (lines 50–62). Spec requires all words complete by `p=0.75`, hold to `0.95`. Current mapping: last word finishes at `p=1.0`, not `0.75`. Finding: DEVIATED — math does not match spec target.

**e. Capabilities grid spans:** Draft uses `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4` (line 30). All 5 cards are equal-width; no card spans more than 1 column. Spec target: 6-col grid with AI-NATIVE spanning 4 of 6; Learning 2, Workspace 2, Timeline 2, Phases 2. Finding: ABSENT — draft does not implement spec bento spans.

**f. Footer clock under RM:** `Footer.tsx` `useNow()` runs `setInterval(() => setNow(new Date()), 1000)` unconditionally (lines 7–13). No `usePrefersReducedMotion()` guard. Spec: "STATIC time — no ticking" under RM. Finding: ABSENT — clock always ticks.

**g. `src/components/ui/chart.tsx`:** PRESENT at `landing-mvp-draft/src/components/ui/chart.tsx` (9781 bytes, May 12). Never imported by any RHEO component. Finding: PRESENT (dead weight, W7).

**h. `useScrollVelocity` idle behavior:** `useScrollVelocity.ts` runs `requestAnimationFrame(loop)` unconditionally on mount (line 52), even when velocity has decayed to 0. No check for hero offscreen (`document.hidden` is checked at line 55, but the loop runs whenever the tab is visible, regardless of hero visibility). Spec wants skip rAF when idle + hero offscreen. Finding: PARTIAL — visibility pause exists, idle/offscreen skip does not.

## 4 TASK 3 — Component finds
| slot | find | 6-gate | landing section | ADOPT / PARK / REJECT |
|---|---|---|---|---|
| Number counter/ticker | `@magicuidesign/magicui` number-ticker.tsx (codeload) | recolorable PASS / reversible PASS / transform-opacity PASS / ≤5kb PASS / RM-freeze PASS / on-concept PASS | ActRecord, DayRuler, StatsBand | PARK — draft's `round(p·total)` spring counter is better (scroll-scrubbed, reversible); Magic UI version is `useInView` once + spring, wrong pattern |
| Bento grid | `@magicuidesign/magicui` bento-grid.tsx | recolorable FAIL (glassmorphism shadows) / reversible N/A | Capabilities/Pricing/Principles | REJECT — draft's `surface-panel sheen-top card-lift` is cleaner LAMINAR; bento-grid has heavy `box-shadow` + `dark:[...]` + neutral-700/400 text |
| Animated beams | `@magicuidesign/magicui` animated-beam.tsx | recolorable FAIL (gradientStart default `#ffaa40→#9c40ff`, hue-violation built-in) / reversible PASS | ActFlow (intended) | REJECT as-drop-in — connector-beam shape (two named DOM refs), not standalone wave; would fight existing chaos↔calm ridgeline crossfade |
| Text scramble | `appletosolutions/reactbits` DecryptedText.tsx + ScrambleText.tsx | recolorable PASS / reversible PASS / transform-opacity PASS / ≤5kb PASS / RM-freeze PASS / on-concept PASS (JetBrains Mono, per-char, speed prop) | Hero (intended) | ADOPT — clean fit; `text`/`speed`/`maxIterations`/`sequential`/`animateOn: view|hover` |
| Marquee | draft's own (Manifesto + TrustedBy) | recolorable PASS / reversible PASS / transform-opacity PASS / ≤5kb PASS / RM-freeze PASS / on-concept PASS | Manifesto, TrustedBy | ADOPT — dual rows, pause on hover + offscreen (`useInView` → `marquee-paused`), transform-only CSS loop |
| Spotlight card | `appletosolutions/reactbits` SpotlightCard.tsx | (fetched, API not deeply profiled) | TBD | PARK — needs LAMINAR treatment (white-light ≤8%, radius-of-light); not in Magic UI catalog |
| Terminal/typewriter | draft's own (ActUnderstand, Capabilities terminal, Hero bottom line) | recolorable PASS / reversible PASS / transform-opacity PASS / ≤5kb PASS / RM-freeze PASS / on-concept PASS | ActUnderstand, Capabilities, Hero | ADOPT — block cursor (`blink-cursor`), mono, loop + offscreen pause + RM stop |
| Scroll progress rail | draft's own (Nav scroll-progress bar + DayRuler playhead + SectionIndex ring) | recolorable PASS / reversible PASS / transform-opacity PASS / ≤5kb PASS / RM-freeze PASS / on-concept PASS | Nav, DayRuler, SectionIndex | ADOPT — progress-driven, transform-only |
| Hover sheen | draft's own `btn-sheen-sweep` | recolorable PASS / reversible PASS / transform-opacity PASS / ≤5kb PASS / RM-freeze PASS / on-concept PASS (white sweep ≤10%, ~300ms, 100°) | Hero CTA, Download | ADOPT — white sweep ≤10%, ~0.5s |
| Magnetic button | — | — | SectionIndex dots (≤4px) | PARK — draft's SectionIndex dots are magnetic ≤4px already; no generic magnetic-button component yet |
| Horizontal rail/carousel | draft's own (Testimonials auto-advancing carousel, TrustedBy marquee) | recolorable PASS / reversible PASS / transform-opacity PASS / ≤5kb PASS / RM-freeze PASS / on-concept PASS | Testimonials, TrustedBy | ADOPT |
| Atlas carousel | — | — | S9 ATLAS (not built) | OPEN — needs a horizontal rail/carousel for the Atlas; not yet sourced |
| Staggered3DGrid | Not in Magic UI or React Bits main catalogs | — | — | OPEN — would need a separate source (Codrops-style); leave for future procurement |
| TextDistortion | Not in Magic UI or React Bits main catalogs | — | — | OPEN — would need a separate source; leave for future procurement |

## 5 TASK 4 — Atlas truth table (feeds GLM Prompt A)
| EXACT in-app name | honest status | one-liner (≤12 words) |
|---|---|---|
| External Tracking (browser extension) | SOON | Browser extension scoped; no public build yet |
| Mobile companion | VISION | No mobile companion built |
| Content Engine (Documentation studio) | BETA | In Overlay Studio; handoff wired to landing |
| Lyceum (Learn) | SHIPPED | LearnVignette section renders today |
| IDE Projects | SOON | IDE integration scoped |
| Session Search | SOON | Session search scoped |
| Conductor (missions, sub-agents, approvals, budgets, providers) | VISION | Orchestrator layer; nothing shipped |
| Trace (evaluation) | SOON | Evaluation tooling scoped |
| Context Brain (self-expanding context system) | VISION | Research-demo stage |
| Research Digest | VISION | Not built |
| Resume | SHIPPED | Resume preview surface exists in app |
| Finance | VISION | Not built |
| Life Phases | SHIPPED | DesignYourDay interactive phase bar |
| Marketplace (self-expanding app store) | VISION | Not built |

## 6 TASK 5 — Pending GLM work
**GLM Prompt A — Atlas:** Needs §4 truth table above (supplied). GLM must produce the Atlas section (S9) content — honest status per §4, no marketing inflation, SHIPPED / BETA / SOON / VISION only.
**GLM Prompt B — App-vignettes:** Needs user's real screenshots + a day-data export. Act II dashboard + Learn card are spec'd as pixel-faithful HTML/SVG replicas of real RHEO screens driven by real exported data shape (spec §VIGNETTES). Cannot be authored without those assets.
**Not GLM (LOCAL punch-list):** W4 footer clock RM, W7 delete ui/chart.tsx, W9 useScrollVelocity idle skip, W11 copy/content (placeholder text — GLM-EXTRACT candidate if user wants marketing copy), W12 archive (done).

## 7 Open questions
1. **W11 scope:** Does GLM-extract cover only the landing-page copy (manifesto body, console scenarios, testimonials, press quotes, newsletter copy), or also the Atlas section (S9) which needs a full truth table? Hand off as two prompts (A + B).
2. **App-vignette data shape:** What is the exported day-data shape for Act II dashboard + Learn card? Spec says pixel-faithful HTML/SVG replicas of real RHEO screens driven by real exported data shape. Needs user's screenshot + data export.
3. **Download CTA destination:** `#` placeholders — where should the primary CTA ship? (Download build, waitlist, or docs?)
4. **Atlas completeness:** Are all 14 instruments in §4 the canonical Atlas, or are more coming? Confirms scope for GLM Prompt A.
5. **Production build:** Spec forbids `bun run build`, but a Lighthouse/perf-budget audit requires `next build`. When is the build gate allowed?
