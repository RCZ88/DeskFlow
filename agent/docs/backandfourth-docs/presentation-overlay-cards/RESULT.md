# RESULT.md — Presentation Overlay Card System

> Produced by Specialist AI, Round 02. Awaiting Project Owner review + implementation.

---

## 1. Architecture Overview & Core Decisions

### A. Rendering Approach: iframe srcdoc
Render slides as complete, standalone HTML documents inside `<iframe srcdoc={htmlContent} sandbox="allow-scripts">`. The Pro Max design language requires heavy custom CSS, JS event listeners for sliders/animations, and strict isolation from the app's Tailwind CSS. React components rendered directly into the DOM would bleed styles. srcdoc gives us a perfect sandbox to execute the AI-generated HTML/CSS/JS without crashing the main Electron app if the AI generates malformed code.

### B. Slide Generation & Editing
Single-HTML-File generation. The AI generates the final HTML. If the user wants changes, they use a Code View to edit the HTML directly in a Monaco editor, or adjust high-level parameters (like text content via a JSON side-panel) and click Regenerate HTML.

### C. Export Pipeline
Use Electron's native webContents.capturePage() for PNG export. html2canvas struggles with backdrop-filter: blur(24px) and CSS gradients. By temporarily resizing a hidden BrowserWindow to 1080x960, loading the slide HTML, and calling capturePage(), we get pixel-perfect, native screenshots with alpha-channel transparency support.

### D. MCP Components
Use vanilla JS equivalents of TextAnimate (blurInUp), NumberTicker, and MagicCard (mouse-following glow) directly in the slide prompt. Since slides are raw HTML, we cannot use React MCP components directly. The AI prompt will include the vanilla JS snippets for these animations.

---

## 2. The System Prompt (Backend)

Save as `src/services/presentation/prompts.ts`.

```typescript
export const PROMPT_GENERATE_SLIDE = `
You are a Senior Frontend Engineer & Motion Designer at Vercel/Framer. You generate high-fidelity, perfectly styled, interactive HTML/CSS/JS presentation slides for educational YouTube Shorts.

STRICT DESIGN CONSTRAINTS (NON-AI SLOP RULES)
1. ASPECT RATIO: The root body must have width: 1080px; height: 960px; overflow: hidden; margin: 0; position: relative;
2. COLORS (Use exactly these CSS variables on :root):
   - --bg: #0A0A0B;
   - --surface: rgba(255, 255, 255, 0.03);
   - --border: rgba(255, 255, 255, 0.08);
   - --fg: #FAFAFA;
   - --muted: #8B8B8B;
   - --accent: #10b981;
   - --accent-2: #a855f7;
   - --warning: #f59e0b;
3. TYPOGRAPHY: Import Inter and JetBrains Mono from Google Fonts. Letter-spacing -0.02em on headers.
4. NO DEFAULT BROWSER UI: You are forbidden from using default select, input[type=range], or standard button styles. Build custom UI.
5. ANIMATIONS: Use CSS keyframes. Staggered entrance: use animation-delay incrementing by 50ms per element. Spring physics: transition: all 0.6s cubic-bezier(0.16, 1, 0.3, 1).

VANILLA JS MICRO-INTERACTIONS (Include these exact snippets)
1. Custom Slider: Track 4px #333, thumb 16px circle var(--accent) with box-shadow glow. Scales 1.2x on hover.
2. Mouse-Following Glow (MagicCard effect): Add a div with id glow that follows the mouse with a radial-gradient background, opacity 0.1, filter: blur(40px). Update via JS on mousemove.

INPUT DATA
You will receive a ScriptFrame object.
- frame_type dictates layout:
  - hook -> Massive typography, centered, blurInUp animation.
  - value -> Split layout (Text left, Visual right).
  - visual_only -> Full bleed visual, minimal text.
- visual field dictates what chart/diagram to render (use pure CSS/SVG).
- text field is the exact spoken text to display.

OUTPUT FORMAT
Output ONLY valid HTML. Start with DOCTYPE html. Include all CSS in style tags and JS in script tags. Do not use external libraries except Google Fonts.
`;
```

---

## 3. Database Schema

```sql
CREATE TABLE IF NOT EXISTS presentations (
  id TEXT PRIMARY KEY,
  episode_id TEXT,
  title TEXT NOT NULL,
  status TEXT DEFAULT 'generating',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (episode_id) REFERENCES content_episodes (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS presentation_slides (
  id TEXT PRIMARY KEY,
  presentation_id TEXT NOT NULL,
  index_order INTEGER NOT NULL,
  frame_type TEXT NOT NULL,
  html_content TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (presentation_id) REFERENCES presentations (id) ON DELETE CASCADE
);
```

---

## 4. Backend Service & IPC Bridge

`src/services/presentation/index.ts` follows the contentEngine pattern:

- `presentation:generate` — takes episodeId, fetches script frames, loops each frame through AI with PROMPT_GENERATE_SLIDE, saves HTML to presentation_slides table
- `presentation:get` — returns presentation + all slides ordered by index
- `presentation:list` — returns all presentations
- `presentation:export-slide` — takes slideId, renders HTML in hidden BrowserWindow, captures PNG with transparency

---

## 5. Frontend Architecture

### A. Entry Point & Mode Toggle
Update OverlayStudioPage.tsx: extend mode to `'studio' | 'engine' | 'presentation'`, add third toggle button, render `<PresentationWorkspace />`.

### B. PresentationWorkspace
- Sidebar: list of presentations + "Generate from Episode" button
- Main stage: 8:9 aspect ratio iframe viewer with navigation controls
- Controls: prev/next slide, export PNG, code view (Monaco editor)

### C. Slide Viewer
- iframe with srcdoc={slide.html_content}
- Container: max-width 1080px, max-height 960px, aspect-ratio 9/8
- Navigation: chevron buttons + slide counter
- Export: calls presentation:export-slide IPC

---

## 6. Implementation Plan

1. `src/services/providers/router.ts` — Add 'presentation' to feature union
2. `src/main.ts` — Import and wire registerPresentationHandlers
3. `src/preload.ts` — Add presentation bridge methods
4. `src/types/deskflow-api.d.ts` — Add PresentationApi interface
5. `src/services/presentation/index.ts` (NEW) — DB migrations + IPC handlers
6. `src/services/presentation/prompts.ts` (NEW) — PROMPT_GENERATE_SLIDE
7. `src/services/presentation/export.ts` (NEW) — Hidden BrowserWindow PNG export
8. `src/features/presentation/PresentationWorkspace.tsx` (NEW) — Main UI
9. `src/features/overlay-studio/OverlayStudioPage.tsx` — Add third mode

---

## 7. Backend Audit & Missing Gaps

- The content_episodes table stores script as JSON in the `script` column. The presentation service reads `episode.script` (not `script_frames`) and parses it.
- Export requires a hidden BrowserWindow with transparent: true and show: false. This needs careful lifecycle management to avoid orphan windows.
- The AI prompt generates raw HTML. If the AI fails to include DOCTYPE or wraps in markdown fences, the regex extraction must handle it gracefully.
