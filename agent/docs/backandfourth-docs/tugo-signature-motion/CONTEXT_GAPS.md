# Context Gaps — RHEO Signature Motion System

## The Current Architecture Questions

| Context Needed | Status | Location | How to Obtain |
|----------------|--------|----------|---------------|
| AppBackground.tsx (full) | ✅ Have | src/components/AppBackground.tsx | Embedded in INITIAL_PROMPT.md |
| ambient-patterns.tsx (full) | ✅ Have | src/components/ui/ambient-patterns.tsx | Embedded in CONTEXT_BUNDLE.md |
| LivingSubstrate.tsx (full) | ⚠️ Partial | src/components/life-river/LivingSubstrate.tsx | First 100 lines embedded; full file (304 lines) available on request |
| index.css (design tokens) | ✅ Have | src/index.css | Embedded in CONTEXT_BUNDLE.md |
| 10 HTML motion mechanics | ✅ Have | agent/docs/motion_site_mechanics_10/ | Referenced; full HTML files available on request |
| R3F / Three.js patterns | ⚠️ Partial | LivingSubstrate uses R3F | Available on request |
| How App.tsx mounts AppBackground | ⚠️ Partial | src/App.tsx line ~150 | Available on request — need to see if it's inside Routes or outside |
| React Router context | ❌ Not gathered | How route changes propagate | Available on request |

## Questions the Specialist Must Answer

1. **Persistence architecture:** How does `<RheoCurrent />` survive route changes? Options:
   - Mount it OUTSIDE `<Routes>` in App.tsx (like AppBackground already is)
   - Use React context to pass currentPhase between routes
   - Use a zustand store for The Current's state
   
2. **State model:** What is the minimal state that persists?
   ```
   CurrentState = {
     phase: number        // 0-1, the pulse position — NEVER resets
     topology: Mode       // changes on route change
     accent: string       // --page-accent
     entities: Entity[]   // nodes/branches/streams — page-specific
   }
   ```

3. **Topology transition:** When navigating Dashboard → Life, how does the geometry morph?
   - Option A: Canvas interpolation (lerp between topology states over 300ms)
   - Option B: Crossfade (old topology fades out, new fades in)
   - Option C: Persistent stream that branches/merges at transition points

4. **Rendering engine:** Canvas 2D vs WebGL vs CSS?
   - Canvas 2D: lightweight, good for lines/curves, no Three.js dependency
   - WebGL: needed for complex shaders (contour fields, reaction-diffusion)
   - CSS: only for the simplest representations (not viable for The Current)

5. **Integration point:** Where does `<RheoCurrent />` mount in the component tree?
   - Currently: `AppBackground` is a sibling to Routes
   - The Current should be at the SAME level — persistent, never unmounted

6. **Reduced motion:** What does The Current look like when animation is disabled?
   - Option A: Static pulse at last known position (frozen)
   - Option B: Static line with pulse marker (no movement, but topology visible)
   - Option C: Minimal — just the line, no pulse, no deviation markers

7. **Workspace integration:** The terminal workspace (`/terminal`) currently has `ambient: "none"`. Should The Current:
   - A: Skip the terminal entirely (too complex for workspace)
   - B: Show a minimal stream with pulse (current agent task)
   - C: Show branch points for open terminal sessions

8. **Performance budget:** How many points/segments can we render at 60fps in Electron?
   - LivingSubstrate already uses WebGL at 256x256 — can we share that context?
   - Or does The Current need its own canvas layer?
