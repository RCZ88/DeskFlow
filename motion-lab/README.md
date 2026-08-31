# Motion Lab — Tuning Contract

Six self-contained HTML files, zero build step. Each isolates one motion primitive.
All tunables are listed below — change the value, reload, observe.

**Palette:** `#050506` background, white strokes, hairlines `rgba(255,255,255,.08)`
**Fonts:** Space Grotesk (headings/UI), JetBrains Mono (data/code)
**CDN deps:** `motion@11.18.2`, `simplex-noise@4.0.3`

---

## 01-field.html — ASCII Flow Field

| Param | Current | What changing it does |
|-------|---------|----------------------|
| `GRID` | `12` | Pixel size of each glyph cell. Smaller = denser, more glyphs, heavier GPU. Larger = sparser. |
| `DPR_CAP` | `1.5` | Max device pixel ratio for canvas. Lower = sharper on high-DPI but cheaper. Higher = crisper text but 2× draw calls. |
| `GLYPHS` | `' .·:;+=×#@'` | Character ramp from sparse to dense. More chars = finer energy gradient. |
| `DRIFT` | `0.0016` | Noise time increment per frame. Higher = faster flow. Lower = calmer drift. |
| `K` | `0.00035` | Velocity→energy sensitivity. Higher = glyphs react more aggressively to pointer speed. |
| `VEL_CAP` | `8` | Max smoothed velocity. Clamps the energy contribution. |
| `RECOVER_S` | `1.2` | Seconds for energy to decay to baseline after pointer stops. Higher = longer trail. |
| `REPULSE_R` | `90` | Radius (px) of pointer repulsor. Larger = more glyphs pushed away. |
| `REPULSE_F` | `2.5` | Repulsor force multiplier. Higher = stronger push. |
| `MAX_GLYPHS` | `1500` | Hard cap on rendered glyphs. Lower = better perf on weak GPUs. |

**HUD overlay:** shows live velocity and glyph count for tuning K.

---

## 02-scrub.html — Scroll Scrub

| Param | Current | What changing it does |
|-------|---------|----------------------|
| `TOTAL_TASKS` | `247` | Max value for the "tasks" counter at p=1. |
| `TOTAL_TOKENS` | `184200` | Max value for the "tokens" counter at p=1. |
| `TOTAL_COST` | `4.73` | Max value for the "cost" counter at p=1. |
| `TOTAL_H` | `86400` | Total seconds mapped to the 24h ruler (86400 = 24h). |
| `PHASES` | `['boot','plan','execute','verify','report']` | Phase chips that crossfade at scroll boundaries. |
| `SPRING_CFG.stiffness` | `120` | Spring stiffness for progress smoothing. Higher = snappier tracking. |
| `SPRING_CFG.damping` | `25` | Spring damping. Higher = less overshoot. |
| `SPRING_CFG.restDelta` | `0.001` | Threshold to consider spring settled. |

**Interaction:** scroll the page (0–300vh). Playhead moves on ruler, counters count backwards on scroll-up, SVG polyline stroke-dashoffset binds to progress, phase chips crossfade at 250ms.

---

## 03-icon-draw.html — Icon Draw

| Param | Current | What changing it does |
|-------|---------|----------------------|
| SVG path `d` | rho-like monoline (~600px viewBox) | Replace with any SVG path. The draw animation adapts to any path length. |
| `DURATION` | `900` (ms) | Draw duration. Lower = snappier. Higher = more deliberate reveal. |
| easing | `1 - Math.pow(1 - t, 3)` (ease-out-cubic) | Change the power for different deceleration curves. |
| dot radius | `5` (px) | Size of the leading dot at path tip. |
| dot glow | `filter: drop-shadow(0 0 6px ...)` | Glow intensity behind the leading dot. |

**Interaction:** auto-plays on load. Click "Replay" to restart.

---

## 04-wake.html — Bezier Wake

| Param | Current | What changing it does |
|-------|---------|----------------------|
| `P0–P3` | viewport-relative cubic bezier | Control points define the path shape. Adjust for different curves. |
| `MOVE_S` | `3` (seconds) | Travel duration over the full bezier. |
| `PAUSE_S` | `1` (second) | Pause at end before loop restart. |
| tick spacing | `> 3px` minimum distance | Controls tick density. Lower = more ticks, denser trail. |
| dot radius | `5` (px) | Size of the traveling dot. |
| tick radius | `2` (px) | Size of persistent tick marks. |

**Interaction:** auto-plays in a loop. Dot moves at constant arc-length speed, leaving tick marks.

---

## 05-ridgelines.html — Ridgelines

| Param | Current | What changing it does |
|-------|---------|----------------------|
| `NUM_LINES` | `5` | Number of stacked wave lines. |
| `POINTS` | `120` | Sample points per line. Higher = smoother curves. |
| `AMPLITUDE_CHAOTIC` | `40` | Amplitude of chaotic wave set (scroll=0). |
| `AMPLITUDE_CALM` | `8` | Amplitude of calm wave set (scroll=1). |
| `CALM_BREATHE_AMP` | `3` | Sine breathing amplitude on calm set. |
| `CALM_BREATHE_SPEED` | `0.0008` | Breathing oscillation speed. |
| `Y_SPREAD` | `420` | Vertical spread between first and last line. |
| `Y_OFFSET` | `70` | Top margin from SVG edge. |

**Interaction:** scroll (0–250vh). Crossfades from chaotic to calm wave sets. Calm set breathes via rAF sine.

---

## 06-console.html — Console Cycle

| Param | Current | What changing it does |
|-------|---------|----------------------|
| `USER_LINE` | `'> analyze session productivity'` | The typed user input line. |
| `TRACES` | `['scanning...', 'computing...', 'categorizing...']` | Three trace lines that appear staggered. |
| `ANSWER_TEXT` | `'Focus score: 73%...'` | The final answer line. |
| `LOOP_MS` | `7000` | Total cycle duration (ms). |
| `TYPE_SPEED` | `40` (ms/char) | Typing speed. Lower = faster typing. |
| `STAGGER_MS` | `150` | Delay between trace line reveals. |
| bar spring | `cubic-bezier(0.34,1.56,0.64,1)` | Bar chart spring-up overshoot. |

**Interaction:** auto-plays in 7s loop. Pauses on `visibilitychange` (tab hidden).

---

## Performance Notes

- All files render a static frame under `prefers-reduced-motion: reduce`.
- 01 and 02 cap DPR at 1.5 and use glyph sprite caching / transform-only animation.
- Target: < 14ms average frame time for 01 and 02 at default params on a mid-range GPU.
