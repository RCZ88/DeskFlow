# CONTEXT_BUNDLE — OrbitSystem Solar System Visualization

## Project
DeskFlow app tracker — Electron + React + Three.js (R3F) app that visualizes app/website usage data as a solar system.

## Tech Stack
- **Frontend:** React 18, TypeScript, Vite, Tailwind v4
- **3D:** @react-three/fiber, @react-three/drei, Three.js
- **State:** React useState/useRef/useMemo (no global store for orbit)
- **Build:** `npm run build` (renderer → preload → services → main)

## OrbitSystem Architecture

### File: `src/components/OrbitSystem.tsx` (~3580 lines)

Two view modes:
- **Galaxy view (`galaxy`):** Each app/website category = a mini solar system in 3D space. Systems arranged on a grid.
- **Solar System view (`solarSystem`):** Single category expanded — apps/websites as orbiting planets around a category sun.

### Key Components

| Component | Lines | Purpose |
|-----------|-------|---------|
| `Sun` | ~888 | Multi-layer 3D star sphere with glow, corona, lens flare |
| `Planet` | ~960 | Orbiting sphere with trail, label, glow |
| `OrbitRing` | ~1120 | Circular orbit path |
| `SolarSystemGroup` | ~1300 | Full solar system rendering for one category (sun + planets + orbits) |
| `computePlanets` | ~620 | Transforms app logs into planet data with orbit positions |
| `computeWebsitePlanets` | ~2200 | Same for website logs |
| `SolarSystemView` | ~2420 | Main solar system view orchestrator |

### Data Flow

```
DashboardPage
  → dashboardData.appStats[] (app, category, totalSeconds, sessions)  
  → dashboardData.websiteStats[] (domain, category, totalSeconds, sessions)
  → orbitLogs[] (id, timestamp, app, category, duration)
  → OrbitSystem props
    → computePlanets() → PlanetData[] (radius, orbitRadius, color, speed, etc.)
    → SolarSystemView renders planets orbiting sun
```

### Configuration Constants (ORBIT_CONFIG)
```
minOrbitRadius: 14     // Closest orbit to sun
maxOrbitRadius: 90     // Farthest orbit
baseAngularSpeed: 2.0  // Orbital speed at r=1
sunRadius: 5           // Sun sphere size (config fallback)
```

### Planet Sizing
- Planet radius: `Math.max(0.5, Math.sqrt(appTime / maxTime) * 1.5)` — ranges ~0.5–1.5
- Sun size: `config.sizeRange[0] * 0.9` — currently `4 * 0.9 = 3.6`

### Orbit Spacing
Logarithmic: `orbitRadius = minR * (maxR / minR) ^ (idx / total)`
- With 10+ planets: inner orbits at ~14-18, outer at ~60-90

### Colors
- Sun colors per category (hardcoded in `SUN_CONFIGS`, `WEBSITE_SUN_CONFIGS`)
- Planet colors: gradient from sun color to blue-purple based on orbit distance

## What the OrbitSystem Currently Does
- Shows app/website usage as orbiting planets
- Category suns with glow/corona effects
- Orbit rings around each sun
- Planet trails showing recent path
- Click planet → detail panel
- FPS counter + sparkline graph
- Speed controls (0.25x–4x)
- Timeline selector (Today/Week/Month/All)
- Galaxy/solar system toggle

## What's Being Used (Real Backend Data)
- App stats from `stats_daily` table via `getDashboardAggregates` IPC
- Category colors optionally passed from parent
- Website stats from same endpoint

## Design Tokens (CSS)
- Background: `bg-zinc-950` (near-black)
- Panel bg: `bg-zinc-900/80` with `backdrop-blur-md`
- Borders: `border-zinc-500/20`
- Text: `text-zinc-200` (primary), `text-zinc-400/500` (secondary/muted)
- Accent: `indigo-500` (interactive), `emerald-500` (success)
- Font: `font-mono` for data values, sans-serif for labels
