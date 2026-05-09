# 🐛 Debugging Guide

**Purpose:** Common issues, debugging strategies, and known fixes.

---

## 🔍 Debugging Workflow

### Step 1: Identify the Issue
1. Check console errors
2. Reproduce consistently
3. Note the exact error message
4. Check when it started happening

### Step 2: Isolate the Problem
1. Check agent/state.md for known issues
2. Review recent changes
3. Test with minimal repro
4. Check file existence and paths

---

## 🔴 React TDZ Error: "Cannot access 'X' before initialization"

**Symptoms:**
- Runtime error in compiled output: "Cannot access 'At' before initialization" (minified var)
- Error points to line in compiled code, not source
- Usually happens after code changes to component

**Root Cause:**
- `const` variable (ref, state) declared AFTER its first usage in same scope
- Common when adding refs at bottom of component, but using in useEffect dep array at top
- React's exhaustive-deps ESLint rule doesn't catch this (different scope issue)
- Minified variables (At, bs, Jt, etc.) = original variable names

**Example:**
```typescript
// Line 342: Using ref in dep array
}, [currentProductiveMs, stopwatchStartRef.current, ...]);

// Line 557: Ref declared here (AFTER usage)
const stopwatchStartRef = useRef<number | null>(null);
```

**Fix:**
1. Move ALL ref declarations to TOP of component (right after useState calls)
2. Ensure declaration order matches usage order
3. Run build after moving to catch minified variable errors
4. Use grep/search to find ALL references before renaming variables

**Prevention:**
- Always declare refs immediately after useState declarations
- Never declare refs at bottom of component
- Use `Select-String -Pattern "refName"` to verify no forward references exist
- When renaming: update ALL references before testing

**Real Example (2026-05-07):**
- Renamed `productiveStartRef` → `stopwatchStartRef`
- Forgot to update lines 327 and 342
- Caused "productiveStartRef is not defined" error
- Then moved refs to line 557 but dep array at line 342 referenced them → TDZ error

---

## 🐛 Common Issue: Empty Data Showing "--" or Empty

**Symptom:** UI shows "--" or empty instead of actual data

**Root Cause:** API not exposed in preload.ts

**Debug Steps:**
1. Find where data comes from (e.g., `window.deskflowAPI.getSomeData`)
2. Check if function exists in preload.ts
3. Check if IPC handler exists in main.ts
4. Only then check display logic

**Example:** Activity buttons showing "--" → `getExternalStats` existed in main.ts but not in preload.ts

### Step 3: Fix and Verify
1. Make minimal fix
2. Rebuild
3. Test the fix
4. Check for regressions

---

## 🐛 SQLite ALTER TABLE Pattern

### Problem
Running `ALTER TABLE ... ADD COLUMN` on existing database fails if column already exists, causing SQLite to fall back to JSON mode and lose all data.

### Solution
**Always wrap ALTER TABLE in try-catch:**
```javascript
try { db.exec(`ALTER TABLE projects ADD COLUMN health_score INTEGER`); } catch {}
```

### Rule
Never run ALTER TABLE without error handling. Always assume the column might already exist.

---

## 🐛 External Activity/Stopwatch Persistence

### Problem
Timer doesn't persist when leaving page or restarting app.

### Root Causes
1. Activity might be on different page than expected (check routes!)
2. Start might not be saving to database (just local React state)
3. Restore might be checking before data loads (race condition)
4. localStorage doesn't survive app restart - only navigation within session

### Debug Steps
1. **Ask user:** Which page has the feature? Check routes in App.tsx
2. **Check routes:** Look for `<Route path="/external"` etc.
3. **Verify DB writes:** Does startActivity call `window.deskflowAPI.startExternalSession()`?
4. **Check session ID:** Is it "temp-xxx" (local only) or real DB ID?
5. **Fix race condition:** Load data FIRST, THEN check for active session

### Example Fix
```javascript
// WRONG - race condition
useEffect(() => {
  getActiveExternalSession().then(session => {...}); // runs before activities load
  getExternalActivities().then(data => {...});
}, []);

// CORRECT - sequential
useEffect(() => {
  getExternalActivities().then(data => {
    setActivities(data);
    // AFTER activities load, check session
    getActiveExternalSession().then(session => {
      if (session) {
        const activity = data.find(a => a.id === session.activity_id);
        // restore session...
      }
    });
  });
}, []);
```

---

## 🚨 Common Errors & Fixes

### ERR_FILE_NOT_FOUND
**Error:** `Failed to load URL: file:///.../dist/index.html`

**Cause:** dist/ folder doesn't exist

**Fix:**
```bash
npm run build:renderer
```

### Cannot find module 'dist-electron/main.cjs'
**Error:** `Unable to find Electron app at ...`

**Cause:** dist-electron/ doesn't have main.cjs

**Fix:**
```bash
npm run build:electron
```

### setHeatmap is not defined
**Error:** `Uncaught ReferenceError: setHeatmap is not defined`

**Cause:** Removed useState but references remain

**Fix:**
1. Search for `setHeatmap` in App.tsx
2. Remove all references
3. Use heatmap useMemo instead

### Texture Not Showing
**Symptoms:** Planets are solid colors, no patterns visible

**Checklist:**
1. `texture.colorSpace = THREE.SRGBColorSpace` ✓
2. `texture.needsUpdate = true` ✓
3. `texture.wrapS = THREE.RepeatWrapping` ✓
4. `texture.wrapT = THREE.RepeatWrapping` ✓
5. Material uses `map={texture}` ✓
6. Canvas drawing actually executes ✓
7. Category matches pattern conditions ✓

**Common Issues:**
- Emissive color overriding texture
- `color` property darkening texture
- Wrong material type (use meshStandardMaterial)
- Canvas context is null

### Orbit Path Mismatch
**Symptoms:** Planet doesn't follow the orbit line

**Fix:** Ensure same formula in both:
```typescript
// OrbitPath and useFrame must use:
const semiLatusRectum = semiMajorAxis * (1 - eccentricity * eccentricity);
const distance = semiLatusRectum / (1 + eccentricity * Math.cos(angle + longitudeOfPerihelion));
```

### Better-SQLite3 NODE_MODULE_VERSION Mismatch
**Error:** `The module 'better_sqlite3.node' was compiled against a different Node.js version`

**Cause:** Native module compiled for Node.js, not Electron; rebuild fails if Visual Studio Build Tools are missing

**Fix (Preferred - if rebuild fails):**
Use sql.js (pure JS/WebAssembly, no native dependencies) to read databases:
1. Read buffer: `const dbBuffer = fs.readFileSync(dbPath)`
2. Init: `const SQL = await initSqlJs()`
3. Load: `const db = new SQL.Database(new Uint8Array(dbBuffer))`
4. Check tables: `db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name='table'")`
- **Why**: No native bindings, works across all Node/Electron versions, no rebuild needed

**Fix (If build tools available):**
1. Ensure Visual Studio Build Tools installed
2. Path must not have spaces
3. Run: `npm rebuild better-sqlite3 --runtime=electron --target=41.1.1`
4. JSON fallback will work if rebuild fails

---

## 🎯 Data Mismatch Debugging Pattern (CRITICAL)

**When data doesn't match between components, use this workflow:**

### Step 1: Find the Source of Truth
- Identify a component that shows CORRECT data
- That component is your reference

### Step 2: Trace Data Flow FROM Source
```
StatsPage (correct) → computedAppStats → worked correctly
OrbitSystem (wrong) → filteredLogs → was wrong
```

### Step 3: Compare the Two Paths
Look for WHERE the data diverges:
```javascript
// Source of truth (StatsPage)
const appLogs = filtered.filter(log => {
  if (log.is_browser_tracking) return false;  // ← Filter exists
  return true;
});

// Broken component (OrbitSystem received)
<OrbitSystem logs={filteredLogs} />  // ← No filter at source
```

### Step 4: Fix at the Divergence Point
```javascript
// Wrong: Trying to fix downstream
<OrbitSystem logs={filteredLogs} />

// Right: Fix at the source
<OrbitSystem logs={filteredLogs.filter(l => !l.is_browser_tracking)} />
```

### Key Lessons
1. **Don't fix downstream** - Fix at where data diverges
2. **Compare with working implementation** - Find what worked, trace it
3. **Trust data flow, not assumptions** - Verify what data actually contains
4. **Minimal fixes** - One line at the right place vs complex downstream fixes

### When to Apply
- Data totals don't match
- Different number of items
- Missing or extra entries
- Different values for same item

---

## 🧮 Data Computation Pattern (CRITICAL)

**When data computation is wrong or inconsistent between components:**

### The Problem
Data gets computed in MULTIPLE places with DIFFERENT logic, leading to inconsistencies.

### Step 1: Find Where Data is Computed
```typescript
// Component A - StatsPage.tsx (computing locally)
const stats = useMemo(() => { ... }, [logs]);

// Component B - App.tsx (computing globally)
const computedAppStats = useMemo(() => { ... }, [allLogs]);
```

### Step 2: Compare Computations
| Location | Logic | Result |
|----------|-------|--------|
| StatsPage | Complex, local | Wrong |
| App.tsx | Clean, centralized | Correct |

### Step 3: Apply Single Source of Truth
```typescript
// WRONG: Computing in child component
function StatsPage({ logs }) {
  const stats = useMemo(() => computeStats(logs), [logs]);
  // ...
}

// RIGHT: Pass computed data as props
function App() {
  const computedAppStats = useMemo(() => computeStats(allLogs), [allLogs]);
  return <StatsPage appStats={computedAppStats} />;
}

function StatsPage({ appStats }) {
  // Just display, don't compute
  return <div>{appStats.map(...)}</div>;
}
```

### Key Lessons
1. **Compute ONCE at highest level** - Usually App.tsx for global data
2. **Pass down as props** - Child components display, don't compute
3. **Remove redundant computations** - Delete local useMemo hooks
4. **Share computed data** - If two components need same data, compute once

### When to Apply
- Child component computing what parent already computed
- Same computation logic duplicated
- Data inconsistent between similar views
- Performance issues from duplicate computations

### Signs You're Computing Twice
```typescript
// Red flag 1: Component receives logs AND computes stats
function Component({ logs }) {
  const stats = useMemo(() => computeFromLogs(logs), [logs]);
  // ...
}

// Red flag 2: Multiple components computing same thing
// StatsPage.tsx computes stats
// ProductivityPage.tsx computes similar stats
// Dashboard.tsx computes yet another version

// Solution: Centralize in App.tsx, pass as props
```

---

## 🛠️ Debugging Tools

### Console Logging
```typescript
// Main process
console.log('[DeskFlow] ✅ SQLite initialized');
console.error('[DeskFlow] Error:', err.message);

// Renderer
console.log('[DeskFlow] Loaded', logs.length, 'logs');
console.warn('[DeskFlow] Texture fallback used');
```

### DevTools
- **Electron:** Open with Ctrl+Shift+I
- **Console:** Check for errors
- **Network:** Verify asset loading
- **Elements:** Inspect DOM

### State Inspection
```typescript
// Check current state
console.log('Planets:', planets);
console.log('Texture:', texture);
console.log('Logs:', logs.length);
```

---

## 📊 Performance Debugging

### FPS Drops
**Causes:**
- Too many planets (>12)
- High geometry segments
- Unnecessary re-renders
- Memory leaks

**Fixes:**
- Limit to 12 planets
- Use 64x64 segments max
- Memoize expensive computations
- Clean up event listeners

### Memory Leaks
**Check for:**
- Event listeners not removed
- Textures not disposed
- State growing unbounded

**Fixes:**
```typescript
useEffect(() => {
  const interval = setInterval(...);
  return () => clearInterval(interval); // Cleanup
}, []);
```

---

## 🔧 Build Issues

### Vite Build Fails
**Check:**
1. TypeScript errors
2. Missing imports
3. Circular dependencies
4. File paths correct

**Fix:**
```bash
npx tsc --noEmit  # Check types
npm run build:renderer  # Rebuild
```

### Electron Build Fails
**Check:**
1. TypeScript config correct
2. Output directory exists
3. File renamed to .cjs

**Fix:**
```bash
npx tsc src/main.ts src/preload.ts \
  --module commonjs \
  --target ES2020 \
  --esModuleInterop \
  --outDir dist-electron \
  --skipLibCheck
```

---

## 🤖 AI-Specific Issues & Fixes

### "x is not a function" / "Callback is not defined"
**Problem:** When calling props callbacks like `onCategoryOverridesChange(...)`

**What NOT to do:**
- ❌ Call directly: `onCategoryOverridesChange(value)` - will throw if undefined
- ❌ Use optional chaining with await: `await window.deskflowAPI?.method()` - returns undefined, not promise
- ❌ Multiple nested try-catch blocks - makes debugging harder

**What TO do:**
- ✅ Check type first: `if (typeof onCallback === 'function') { onCallback(value); }`
- ✅ Wrap in try-catch: `try { onCallback(value); } catch (e) { /* ignore */ }`

**Why it fails:**
- Props may not be passed (undefined)
- Optional chaining (`?.`) returns undefined, not a caught error
- React may unmount between check and call
- TypeScript types may not match runtime

### Promise/Async Issues
**Problem:** `Uncaught (in promise) TypeError`

**Fix:**
- Always wrap async calls in try-catch
- Don't use `await` with optional chaining: `await window.api?.method()` can fail silently
- Check if result exists before using: `if (result) { ... }`

---

## 📷 3D Camera/Clipping Debugging Pattern

**When you see black squares, cut-off objects, or particles disappearing when rotating camera:**

### Step 1: Check Camera Far Plane
```typescript
// Wrong - far plane defaults to ~2000
camera={{ position: [0, 100, 200], fov: 45 }}

// Right - explicit far plane
camera={{ position: [0, 100, 200], fov: 45, near: 0.1, far: 10000 }}
```

### Step 2: Check Position Mismatches
Verify all positioned elements match their constants:
```typescript
const APPS_GALAXY_POS: [number, number, number] = [0, 0, 0];
const WEBSITES_GALAXY_POS: [number, number, number] = [3250, 0, 0];

// Element must match constant
<group position={WEBSITES_GALAXY_POS}>  // NOT [650, 0, 0]
```

### Step 3: Check OrbitControls Limits
```typescript
// Wrong - can't zoom out far enough
<OrbitControls maxDistance={800} />

// Right - allow viewing entire scene
<OrbitControls maxDistance={5000} />
```

### Step 4: Add Fog for Smooth Fade
```typescript
// Fog helps objects fade naturally instead of clipping
<fog attach="fog" args={['#0a0a14', 1500, 4500]} />
```

### Step 5: Check Stars Coverage
```typescript
// Wrong - stars disappear when zooming out
<Stars radius={500} depth={100} count={3000} />

// Right - stars cover entire viewable area
<Stars radius={4000} depth={200} count={8000} />
```

### Key Numbers to Remember for DeskFlow
| Setting | Value | Reason |
|---------|-------|--------|
| Galaxy distance | 3250 | 5x galaxy width |
| Camera far | 10000 | Covers both galaxies |
| OrbitControls maxDistance | 5000 | Can zoom to see both |
| Stars radius | 4000 | Background covers scene |
| Fog range | 1500-4500 | Smooth particle fade |

### Signs of Camera/Clipping Issues
- Black square appears when rotating
- Particles cut off sharply instead of fading
- Can't zoom out far enough
- Stars disappear when moving camera
- Objects "pop" into existence

---

## 🕹️ Electron + Three.js/WebGL Memory Leak Pattern

**Symptoms:** App freezes during page navigation, console stops output, memory grows

**Root Causes:**
1. React StrictMode causes double-mounting (duplicate WebGL contexts)
2. Three.js geometries/materials/textures not disposed on unmount
3. Particle counts too high (memory accumulation)
4. Chart.js instances not destroyed
5. Event listeners not cleaned up

**Fix Workflow:**
1. Remove StrictMode from main.tsx (causes double-mount)
2. Add GLCleanup component in Canvas for WebGL disposal
3. Dispose in onUnmount/useEffect cleanup
4. Reduce particle counts if >10K total
5. Lazy-load heavy 3D components
6. Add Chart.js cleanup with destroy()

**Key Numbers:**
| Component | Safe Count | Problem Threshold |
|-----------|------------|-------------------|
| Galaxy particles | 3000-4000 | >6000 |
| Website particles | 2000-3000 | >5000 |
| Stars | 2000-4000 | >6000 |
| Total | <12000 | >15000 leaks |

**Fixed in:** 2026-04-17 (OrbitSystem.tsx, main.tsx, StatsPage.tsx)

---

## 🎨 Tailwind v4 CSS Silent Failure (CRITICAL)

**Severity:** P0 — Entire app looks unstyled/broken with zero build errors

**Symptoms:**
- App renders but looks completely wrong — no colors, no spacing, no layout
- Build succeeds with no errors
- CSS output file is suspiciously small (~14KB instead of 68KB+)
- Most utility classes (bg-zinc-*, text-*, p-*, gap-*, etc.) are missing from built CSS
- May see "Invalid code point" errors in Tailwind — these are RED HERRINGS

**Root Cause:**
`src/index.css` has Tailwind v3 directives instead of v4 directive:
```css
/* WRONG — Tailwind v3 syntax, does NOT work with v4 */
@tailwind base;
@tailwind components;
@tailwind utilities;
```

**Fix:**
```css
/* CORRECT — Tailwind v4 syntax */
@import "tailwindcss";
```

**Why it breaks silently:**
Tailwind v4's engine ignores `@tailwind` directives. They get passed through as inert CSS. The v4 plugin never triggers content scanning, so it never looks at your `.tsx` files to find which utility classes to generate. Only the baseline `@layer properties` and any custom styles in the CSS file itself get emitted.

**Verification checklist:**
1. `src/index.css` line 1 is `@import "tailwindcss";` (NOT `@tailwind base/components/utilities`)
2. `vite.config.ts` has `@tailwindcss/vite` plugin
3. `package.json` has `"tailwindcss": "4.x"` (NOT 3.x)
4. Built CSS file is 60KB+ (not ~14KB)
5. Do NOT install `autoprefixer` or `postcss` — they are v3 dependencies

**NEVER do these:**
- NEVER change `@import "tailwindcss"` to `@tailwind base/components/utilities`
- NEVER run `npm install tailwindcss@latest` — it may downgrade to v3
- NEVER add `autoprefixer` or `postcss` — they conflict with v4
- NEVER assume "build succeeded" means "CSS is correct" — always check output size

---

## 🎣 useMemo with Object Dependencies Causes React TDZ Initialization Error

**Severity:** P1 — Crashes component with "Cannot access 'X' before initialization"

**Symptoms:**
- Error message: "Cannot access 'Jt'/'bs' before initialization" (minified names)
- useMemo dependency array contains complex objects
- Error occurs during React's dependency comparison phase
- Only happens when object dependencies are invalidated/recreated
- Breaks component and all children unexpectedly

**Root Cause:**
useMemo's dependency comparison triggers React's Temporal Dead Zone (TDZ) when checking object references during initialization order issues.

**Wrong Pattern (DO NOT USE):**
```typescript
// ❌ BROKEN - Object dependencies in useMemo
const chartBarsResult = useMemo(() => {
  return expensiveComputation();
}, [heatmapData, chartExternalData]); // Objects cause TDZ
```

**Correct Pattern (USE THIS):**
```typescript
// ✅ FIXED - useState + useEffect with primitive dependencies
const [chartBarsResult, setChartBarsResult] = useState<T | null>(null);

useEffect(() => {
  const result = expensiveComputation();
  setChartBarsResult(result);
}, [primitive1, primitive2]); // Only primitives
```

**Why This Works:**
1. useEffect runs AFTER render (avoids TDZ)
2. Dependency array only contains primitives (no object comparison)
3. Explicit timing control (clearer intent)
4. React doesn't try to compare complex object references during init

**When to Apply:**
- useMemo dependency contains Map, array of objects, or complex structures
- You see minified React errors ('Jt', 'bs', 'ab', etc.)
- Error message mentions "before initialization"
- Changes in other components trigger hidden initialization bugs

**Fixed in:** 2026-05-06 (DashboardPage.tsx line 787)

---

## 🎯 generate-prompt Skill Workflow

**When user says:** "use prompt engineer skill" or "use generate-prompt skill"

**What to do:**
1. Update `state.md` FIRST (mark as IN PROGRESS)
2. Read `agent/skills/generate-prompt/SKILL.md`
3. Gather context: `state.md`, relevant files, data layer
4. CREATE a prompt (don't solve it yourself)
5. Save prompt to `agent/docs/<topic>-prompt.md`
6. Tell user: "Here's the prompt. Send it to the AI to get the full solution."

**What NOT to do:**
- ❌ Solve the problem yourself
- ❌ Edit code directly
- ❌ Skip updating state.md first

**The skill creates prompts FOR another AI to solve.**

**Added:** 2026-05-08 (after idiot moment #8)

---

## 🔄 Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-04-04 | Initial creation |
| 1.1 | 2026-04-16 | Added callback/promise fix patterns |
| 1.2 | 2026-04-16 | Added Data Mismatch Debugging Pattern |
| 1.3 | 2026-04-16 | Added Data Computation Pattern (Single Source of Truth) |
| 1.4 | 2026-04-16 | Added 3D Camera/Clipping Debugging Pattern |
| 1.5 | 2026-04-17 | Added Electron + Three.js/WebGL Memory Leak Pattern |
| 1.6 | 2026-04-19 | Added Tailwind v4 CSS Silent Failure pattern |
| 1.7 | 2026-05-06 | Added useMemo object dependencies TDZ pattern |

---

**Last Updated:** 2026-05-06
**Maintained By:** AI Development Team
