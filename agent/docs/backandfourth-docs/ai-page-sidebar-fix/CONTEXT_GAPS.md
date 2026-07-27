# Context Gap Analysis — Sidebar Navigation Bug

| Context Needed | Status | Location | How to Obtain |
|----------------|--------|----------|---------------|
| AI Assistant page component | ✅ Have | `src/pages/AiPage.tsx` | Already in bundle |
| Sidebar + Layout + Router | ✅ Have | `src/App.tsx` | Already in bundle |
| AI page CSS (deck.css) | ✅ Have | `src/components/ai/deck/deck.css` | Already in bundle |
| Canvas CSS (canvas.css) | ✅ Have | `src/components/ai/canvas/canvas.css` | Already in bundle |
| CanvasContainer component | ❌ Missing | `src/components/ai/canvas/CanvasContainer.tsx` | Agent must fetch |
| CanvasGrid component | ❌ Missing | `src/components/ai/canvas/CanvasGrid.tsx` | Agent must fetch |
| useCanvasState hook | ❌ Missing | `src/hooks/useCanvasState.ts` | Agent must fetch |
| ErrorBoundary component | ⚠️ Partial | `src/components/ErrorBoundary.tsx` | Include render method |
| Compiled CSS output | ❌ Missing | `dist/assets/index.css` | Agent must run build |
| Tailwind config | ❌ Missing | `tailwind.config.js` or `vite.config.ts` | Agent must fetch |
| Framer Motion version | ❌ Missing | `package.json` | Agent must check |
| Other pages' CSS (for comparison) | ❌ Missing | Various | Agent can compare working vs broken pages |
| Browser DevTools snapshot | ❌ Missing | Runtime | Specialist should request this from user |

## Key Gaps for Root Cause Analysis

1. **CanvasContainer/CanvasGrid source** — Need to verify if any global event listeners or pointer-events styles leak outside the canvas
2. **Compiled CSS** — Need to check if Tailwind or PostCSS generates unexpected rules that affect the sidebar
3. **Other page CSS** — Need to compare what's different about `/ai` vs working pages like `/dashboard`
4. **Runtime DOM snapshot** — The Specialist should request the user inspect the sidebar's computed z-index and pointer-events when on `/ai` vs another page
