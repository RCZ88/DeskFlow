# 📝 Compiled Prompts

**Purpose:** Collection of proven prompts for common tasks.

---

## 🔧 Development Prompts

### Fix Texture Not Showing
```
The planets are showing as solid colors instead of procedural textures.
Check:
1. texture.colorSpace = THREE.SRGBColorSpace is set
2. texture.needsUpdate = true is called
3. texture.wrapS and texture.wrapT are set correctly
4. Material uses map={texture}
5. Canvas drawing is actually executing (check category matches)

Fix the texture pipeline to ensure patterns wrap properly around spheres.
```

### Fix Orbit Path Mismatch
```
The orbit path doesn't match the planet's actual orbit position.
The orbit line is circular but the planet moves in an ellipse.

Fix:
1. Use the same Keplerian formula for both orbit path and planet position
2. Formula: r = a(1-e²)/(1+e*cos(θ))
3. Apply same inclination and longitudeOfPerihelion transforms
4. Ensure OrbitPath component uses same calculation as useFrame
```

### Fix Planet Not Following Orbit
```
The planet's position calculation doesn't match its orbit path.
Check:
1. useFrame uses same formula as OrbitPath
2. semiLatusRectum calculation is correct
3. inclination and longitudeOfPerihelion applied consistently
4. No conflicting position overrides

Fix the planet's orbital position calculation to match the orbit path exactly.
```

### Add Proper Lighting
```
Planets are too dark or lighting is uneven.
Add:
1. Ambient light for base visibility (intensity 0.8)
2. Hemisphere light for sky/ground (intensity 0.6)
3. Sun point light from origin (intensity 12, distance 600)
4. Secondary fill light for outer planets
5. Emissive glow on planets (intensity 0.4)

Ensure all planets are visible regardless of distance from sun.
```

---

## 🎨 Visual Enhancement Prompts

### Improve Texture Wrapping
```
Textures have seams or don't wrap properly around spheres.
Fix:
1. texture.wrapS = THREE.RepeatWrapping
2. texture.wrapT = THREE.RepeatWrapping
3. Use ClampToEdgeWrapping if seams persist
4. Ensure canvas dimensions are power of 2
5. Check UV mapping on sphere geometry
```

### Create Category-Specific Textures
```
Create unique procedural textures for each app category:

IDE/Productivity: Gas giant bands (like Jupiter)
- Multiple colored horizontal bands
- Turbulence lines between bands
- Random band count 6-10

AI Tools: Spiral galaxy pattern
- Radial gradient background
- 3-5 spiral arms
- Glowing nodes at intersections

Browser: Spotted/swirled pattern
- Colorful radial spots
- Flowing wave lines
- Gradient background

Entertainment: Radial burst
- Rays from center
- Sparkle particles
- Vibrant colors

Communication: Network nodes
- Connected node graph
- Bright node centers
- Line connections

Other: Noise pattern
- Random noise squares
- Gradient background
- Subtle variation
```

### Fix Size/Distance Logic
```
Planet size and distance from sun should follow real solar system logic:

Current (wrong): Most used apps are closest and smallest
Correct: Most used apps are largest and furthest from sun

Fix:
1. Sort apps by usage time ascending (least used first)
2. Assign smallest radius to first (closest)
3. Assign largest radius to last (furthest)
4. Use logarithmic spacing: baseRadius * Math.pow(1.8, idx)
5. Maintain collision avoidance with minSpacing
```

---

## 🐛 Debugging Prompts

### Fix "Cannot find module" Error
```
Electron error: Cannot find module 'dist-electron/main.cjs'

Check:
1. npm run build:electron completed successfully
2. dist-electron/main.cjs exists
3. package.json "main" points to correct file
4. TypeScript compiled without errors
5. File was renamed to .cjs

Fix: Run npm run build:electron and verify output.
```

### Fix "setHeatmap is not defined" Error
```
Runtime error: setHeatmap is not defined

Cause: Removed useState for heatmap but references remain

Fix:
1. Search for all setHeatmap references
2. Remove or replace with heatmap useMemo
3. Ensure no state setters for removed states
4. Rebuild and test
```

### Fix Texture Still Black After Lighting Fix
```
Lighting is working but textures still appear black.

Debug steps:
1. Check console for texture creation logs
2. Verify canvas dimensions (1024x512)
3. Check colorSpace = SRGBColorSpace
4. Verify needsUpdate = true
5. Test with simple solid color texture first
6. Check if category matches pattern conditions

Common issues:
- Emissive overriding texture
- color property darkening texture
- Wrong material type (use meshStandardMaterial)
```

---

## 🏗️ Architecture Prompts

### Setup Electron + React + Three.js
```
Create Electron app with React and Three.js:

1. Main process (main.ts):
   - BrowserWindow with webPreferences
   - preload: preload.cjs
   - Load dist/index.html
   - IPC handlers for data

2. Preload script (preload.ts):
   - contextBridge with safe APIs
   - exposeInMainWorld('deskflowAPI', {...})
   - IPC invoke/handle methods

3. React renderer:
   - HashRouter (not BrowserRouter)
   - vite.config.ts: base: './'
   - Canvas from @react-three/fiber
   - Procedural textures

4. Build:
   - tsc for Electron → .cjs
   - vite build for React → dist/
   - electron . to run
```

### Implement SQLite with JSON Fallback
```
Create database system with fallback:

1. Try SQLite first:
   try {
     const Database = require('better-sqlite3');
     const db = new Database(dbPath);
     // Use SQLite
   } catch (err) {
     // Fall back to JSON
   }

2. JSON fallback:
   - Same API as SQLite
   - Read/write JSON file
   - Handle errors gracefully

3. Deferred initialization:
   - Call after app.whenReady()
   - Don't load at module level
   - Prevents Electron startup crashes
```

---

## 🔄 Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-04-04 | Initial creation |

---

**Last Updated:** 2026-04-04
**Maintained By:** AI Development Team
