# Generate Prompt — rheo-landing scroll animation fix

> Prompt type: bug-fix
> Target AI: claude
> Date: 2026-08-29

---

## Raw Request

The user reported: "NO ANIMATION IS WORKING NOW. U BROKE IT." The scroll-driven animations on the RHEO landing page (`rheo-landing`) are completely frozen — the weft thread doesn't draw, warp highlights don't switch, and the fabric doesn't zoom as the user scrolls. The user does NOT trust the current state of the fix and wants a proper prompt generated to send to an external AI (Claude) to design and implement the correct fix.

---

## Problem Statement

The scroll-driven SVG animations on the RHEO landing page are not working. The root cause is in `src/index.css` line 25: `html { overflow-x: hidden }` makes the `<html>` element the scroll container instead of the viewport. This causes `window.scrollY` to stop updating and `window` scroll events to not fire, which breaks every scroll-driven animation section (Hero, Fabric, Threads) that reads `window.scrollY` or `el.getBoundingClientRect()`.

Additionally, there may be a stale dependency issue: `package.json` lists `gsap` and `lenis` as dependencies, but `Hero.tsx`, `Fabric.tsx`, and `Threads.tsx` do NOT import them — they use native scroll listeners. Only `Quiet.tsx` uses gsap/ScrollTrigger.

---

## Context Bundle Reference

**Read `CONTEXT_BUNDLE.md` first.** It contains the full codebase context including all source files, design tokens, component architecture, and the exact bug location with line numbers.

---

## Engineering Task

Design a complete fix for the scroll-driven animations not working on the RHEO landing page.

### Specific requirements:

1. **Fix the scroll container bug** — `html { overflow-x: hidden }` must be changed so that `window.scrollY` updates and `window.addEventListener('scroll', ...)` fires reliably. The fix must work in a Vite + React + TypeScript environment and in Electron (if applicable).

2. **Verify all animation sections work** — each section's `update()` function must receive correct scroll progress:
   - **Hero.tsx** (`src/sections/Hero.tsx`): `window.scrollY - el.offsetTop` over `el.offsetHeight - innerHeight` → drives `strokeDashoffset` on weft paths + `activeWarp` highlighting
   - **Fabric.tsx** (`src/sections/Fabric.tsx`): `-rect.top / distance` → drives `scale(3)` → `scale(1)` + opacity fade
   - **Threads.tsx** (`src/sections/Threads.tsx`): `-rect.top / distance` → drives `activeIndex` → lights up 7 thread lines amber
   - **Quiet.tsx** (`src/sections/Quiet.tsx`): gsap/ScrollTrigger must continue to work (it currently works correctly — do NOT break it)

3. **Remove unused dependencies** if `gsap`/`lenis` are truly unused in Hero/Fabric/Threads. If they are used, verify the imports resolve correctly.

4. **Fix must be minimal and surgical** — do not rewrite the animation architecture. The pattern of `window.addEventListener('scroll', update)` is correct; only fix what's broken.

---

## Design Task

Design the visual fix with these specifications:

- **Colors**: Use the existing Tailwind v4 theme tokens only (`--color-amber`, `--color-bg`, `--color-surface`, etc.)
- **Fonts**: Geist (sans), JetBrains Mono (mono)
- **Glass effect**: `bg-surface/80 backdrop-blur-md` for cards, `bg-[rgba(24,24,27,0.60)]` for glass cards
- **Rounded corners**: `rounded-xl` maximum
- **No new dependencies** unless absolutely necessary for the fix
- **No AI slop**: No neon gradients, no purple gradients, no generic glassmorphism. Use the existing amber/rust palette.

### Anti-Slop Checklist (MUST follow):
1. Re-skin to DeskFlow tokens (colors → `--bg-primary`, `--accent-primary`, etc.)
2. Max `rounded-xl`, `p-5` padding
3. Dark mode only
4. Geist + JetBrains Mono fonts
5. Glass layer (`bg-zinc-900/80 backdrop-blur-xl`)

---

## UX Task

1. **Scroll interaction**: The user must see the weft thread drawing in progressively as they scroll down the Hero section. Warp lines (MONEY, LEARNING, TERMINAL) must highlight amber as the user scrolls past them.
2. **Fabric zoom**: The woven grid must smoothly zoom from 3x (close-up) to 1x (full view) as the Fabric section scrolls into view.
3. **Thread highlighting**: Thread lines must light up amber sequentially as the user scrolls through the Threads section, with the description card appearing beside the active thread.
4. **Quiet section**: The gsap fade-in must still trigger when the section enters the viewport (top 70%).
5. **Reduced motion**: All sections respect `prefers-reduced-motion: reduce` — show static final state.
6. **Responsive**: No horizontal overflow at 400px, 768px, or 1280px viewport widths.

---

## Constraints

- **No backend changes** — this is a pure frontend landing page, no IPC, no database
- **No new dependencies** unless the target AI determines one is absolutely essential for the fix
- **Minimal changes** — fix what's broken, preserve everything else
- **TypeScript strict** — `tsc -b` must pass with zero errors
- **Vite build must succeed** — `npm run build` must produce `dist/` without errors
- **Do NOT use `scroll-behavior: smooth` on html/body** — it can interfere with scroll events
- **Do NOT set `overflow: hidden` on `body`** — this was the original bug pattern
- **Preserve the `color-scheme: dark`** on html
- **Maintain the existing design tokens** in `index.css`

---

## MCP Inventory (for the target AI)

| Component | Source | Use for |
|-----------|--------|---------|
| scroll behavior | CSS overflow | Fix scroll container |
| gsap + ScrollTrigger | npm package | Quiet.tsx fade-in (already working) |
| tailwindcss v4 | npm package | Existing styling |
| react 19 | npm package | Existing framework |

---

## Output Format

The target AI must produce:

1. **Complete code changes** — exact file contents for every file that needs to change
2. **Explanation** — what was changed and why
3. **Verification steps** — how to confirm the fix works (build + scroll test)
4. **No options** — do not present Option A / Option B / Option C. Provide ONE comprehensive solution.