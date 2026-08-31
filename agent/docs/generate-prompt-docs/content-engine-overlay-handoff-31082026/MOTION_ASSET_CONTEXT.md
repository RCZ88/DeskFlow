# MOTION_ASSET_CONTEXT.md — Motion Lab asset generation, for the handoff spec

> Companion to CONTEXT_BUNDLE.md. Describes the existing `motion-lab/` asset pipeline the
> target AI should wire into the Content Engine → Overlay Studio flow so that generated
> motion graphics (animated lower-thirds, data viz, icon draws, ridgelines) become usable
> overlay/visual assets on the 9:16 canvas — alongside the transcript captions.

## 1. What motion-lab is

`motion-lab/` is a **zero-build library of 6 self-contained HTML motion primitives** under
`C:\Users\cleme\Documents\COMPUTAH_SAYENCE\App Tracker\motion-lab\`:

| File | Primitive | Interaction | Use as overlay asset |
|------|-----------|------------|----------------------|
| `01-field.html` | ASCII Flow Field (pointer-reactive glyph field) | pointer | ambient background / energy field |
| `02-scrub.html` | Scroll Scrub (time ruler + counters + phase chips + polyline) | scroll | stat counters / progress HUD |
| `03-icon-draw.html` | Icon Draw (SVG monoline draw-on) | none (auto) | logo / mark reveal |
| `04-wake.html` | Bezier Wake (dot travels a bezier leaving ticks) | none (loop) | path/route accent |
| `05-ridgelines.html` | Ridgelines (chaotic→calm wave crossfade) | scroll | ambient bg / mood |
| `06-console.html` | Console Cycle (typed user line → traces → answer + bar) | none (loop) | "AI thinking" / answer reveal |

**Design contract (motion-lab/README.md):**
- Palette: `#050506` background, white strokes, hairlines `rgba(255,255,255,.08)`
- Fonts: Space Grotesk (headings/UI), JetBrains Mono (data/code)
- CDN deps: `motion@11.18.2`, `simplex-noise@4.0.3`
- Every tunable is a top-level const (see README tables) — change value, reload, observe.
- Performance: DPR capped at 1.5; static frame under `prefers-reduced-motion: reduce`.

## 2. How videos are generated — `scripts/record-lab.mjs` (Playwright recorder)

This is the **asset generation pipeline**. It records each HTML primitive to a 1280×800
`.webm` via Playwright's `recordVideo`, with synthetic interaction (pointer sweep / scroll pass):

```js
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1280, height: 800 },
  deviceScaleFactor: 1.5,
  recordVideo: { dir: vidDir, size: { width: 1280, height: 800 } },
});
// ... for each FILE: goto file://..., wait, drive interaction, collect frame stats ...
// page.video().path() → motion-lab/videos/page@<hash>.webm
```

**Already recorded:** 12 `.webm` files in `motion-lab/videos/` (one per primitive per run,
hashed filenames like `page@2cf6d36552d3d0d00f75af9bff22a6d6.webm`).

This proves the pattern: **an HTML motion source → Playwright headless record → `.webm` asset**.
The handoff spec should reuse this exact mechanism to turn a Content Engine episode's
generated overlays/captions into a rendered `.webm` (or to inject motion-lab primitives as
background/accents on the 9:16 preview canvas).

## 3. Where motion assets plug into the existing app

- **Episode detail "Assets" tab is EMPTY** — `EpisodesView.tsx` lines 800–806:
  ```tsx
  {tab === 'assets' && (
    <EmptyState icon={<Film size={28} />} title="Assets coming soon"
      hint="Raw footage, B-roll, SFX and music for this episode will live here." />
  )}
  ```
  This is the natural home for generated motion-lab assets + caption track per episode.
- **Overlay Studio Visualizer/Export stages** (`studioTypes.ts` stages: `visualizer`, `export`)
  are where rendered outputs are previewed/exported. Motion assets belong on the 9:16 canvas
  as background layers or accents behind the text overlays + captions.
- **Master spec principle (cc_full_spec_fix.md §2.3):** Overlay Studio is *suggestion-based, not
  destructive* — it must say "Preview / Export", never "cut source video". So motion assets are
  **suggestion layers**, not baked destructively into the user's source video.

## 4. Integration idea the spec should design

1. Content Engine episode → ASSEMBLE → handoff payload (cut list + overlay plan + caption track)
   [see CONTEXT_BUNDLE.md].
2. The Overlay Studio Visualizer should be able to **mount a motion-lab primitive as a canvas
   layer** (e.g. `05-ridgelines` as ambient bg, `02-scrub` as a stat HUD, `03-icon-draw` as a
   mark reveal) behind the episode's text overlays + caption track.
3. A "Render / Export" action reuses `record-lab.mjs`'s Playwright pattern: spin up a headless
   browser, compose the 9:16 stage (motion layer + overlays + caption track timed to transcript),
   and record to `.webm` — producing the actual overlay video the user can "put on my caption."
4. The generated `.webm` + caption `.srt` are stored per episode in the Assets tab and as a
   linked Overlay Studio export artifact.

## 5. Concretely reusable code (verbatim)

`scripts/record-lab.mjs` record block (the pattern to generalize):
```js
const context = await browser.newContext({
  viewport: VP, deviceScaleFactor: 1.5,
  recordVideo: { dir: vidDir, size: VP },
});
const page = await context.newPage();
await page.goto(`file:///${resolve(labDir, file.name).replace(/\\/g, '/')}`, { waitUntil: 'networkidle' });
await page.waitForTimeout(1000);
// drive interaction (pointer/scroll/none), then:
const videoPath = await page.video().path();
await context.close();
```

This is the closest thing the repo has to "render those videos." The spec should lift it into
a main-process helper (e.g. `src/main/...` or `python/...` per master spec's Python render layer)
exposed via a new IPC channel so the UI's Export button triggers a real render, not a stub.
