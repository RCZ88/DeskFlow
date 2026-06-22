# Restoration Prompt for DeskFlow App.tsx

## The Problem
The file `src/App.tsx` is corrupted and won't build. The build error is:
```
ERROR: Unterminated regular expression
App.tsx:1766:22
```

The error is FALSE - it's actually a structural JSX nesting issue, NOT a regex.

## What's Actually Broken
1. The file used to have 9 Route definitions (Dashboard + 8 other pages)
2. During a corrupted "revert" attempt, the Route structure broke
3. Most logic/state is still intact (allLogs, selectedPeriod, computedAppStats, etc.)
4. The JSX structure in the Routes section is broken

## Current State
- File: ~2073 lines
- Only has 1 Route (Dashboard at "/")
- Missing Routes for: /stats, /productivity, /browser, /ide, /reports, /database, /pricing, /settings
- The broken section is around lines 1460-1770

## Your Job

### Step 1: Analyze the File
Read the entire App.tsx and understand its current structure. Look for:
- Where Routes starts (should be line ~1460)
- What's inside the Dashboard Route (lines 1462-~1760)
- Where it goes wrong

### Step 2: Fix or Rebuild
Either:
- A) Fix the broken JSX structure to make it build
- B) Delete everything inside the Routes and replace with minimal working structure

The goal is to get `npm run build` to succeed.

### Step 3: Add Back Routes
Once it builds, add back these Route definitions inside the Routes block:

```jsx
<Route path="/" element={/* existing Dashboard code */} />

{/* After Dashboard Route closes - add these: */}
<Route path="/stats" element={<StatsPage logs={logs} appStats={computedAppStats} />} />
<Route path="/productivity" element={<ProductivityPage logs={logs} />} />
<Route path="/browser" element={<BrowserActivityPage logs={browserLogs} categoryStats={browserCategoryStats} />} />
<Route path="/ide" element={<StatsPage logs={logs} appStats={computedAppStats} />} />
<Route path="/reports" element={<StatsPage logs={logs} appStats={computedAppStats} />} />
<Route path="/database" element={<div className="glass rounded-3xl p-8">Database Coming Soon</div>} />
<Route path="/pricing" element={<div className="glass rounded-3xl p-8">Pricing Coming Soon</div>} />
<Route path="/settings" element={<SettingsPage onRegister={handleRegisterSave} />} />
```

### Step 4: Build and Test
Run `npm run build` and verify it compiles.

## Important Notes
- The Page components exist in `src/pages/` (StatsPage, ProductivityPage, BrowserActivityPage, SettingsPage)
- They need the props shown above
- The imports at top of file are already correct

## Resources
- Package components: StatsPage, ProductivityPage, BrowserActivityPage, SettingsPage from './pages/...'
- OrbitSystem from './components/OrbitSystem'
- The file uses Tailwind CSS and Framer Motion

## Success Criteria
`npm run build` completes without errors.