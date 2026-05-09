# Prompt: OrbitSystem Physics & Math Overhaul

## Context
The OrbitSystem component in `src/components/OrbitSystem.tsx` simulates a solar system where apps are planets. Currently two issues exist:
1. **Closest planet is too far from sun** — `minOrbitRadius = 24` units, making inner planets unrealistically distant
2. **All planets orbit at similar speeds** — speed range only 0.045–0.15 (3x difference), when real solar systems have 600x+ difference (Mercury vs Neptune)

## The Mandate
Act as **Lead Engineer and Designer**. Design a comprehensive, high-fidelity solution for fixing the orbital mechanics in OrbitSystem.tsx using real physics.

## Requirement Checklist

### 1. Data Processing Pipeline (Math & Science Logic)
- Research and document **Kepler's Laws of Planetary Motion** with exact formulas:
  - 1st Law: Elliptical orbits with sun at one focus
  - 2nd Law: Equal areas in equal times (angular momentum conservation)
  - 3rd Law: T² ∝ r³ (period squared proportional to semi-major axis cubed)
- Provide the exact **angular velocity formula**: ω = √(GM/r³) or equivalently ω ∝ r^(-3/2)
- Provide **real solar system data** for validation:
  - Mercury: 0.39 AU, period 0.24 yr → angular speed
  - Earth: 1.0 AU, period 1.0 yr → angular speed  
  - Neptune: 30.1 AU, period 164.8 yr → angular speed
- Calculate the **speed ratio** between innermost and outermost planet in real solar system
- Provide the **orbit radius mapping**: How to map app usage time to realistic orbit radii (should inner planets be MUCH closer to sun?)

### 2. High-Fidelity Visual Specs
- Exact **minOrbitRadius** and **maxOrbitRadius** values for the simulation
- How to map app time to orbit radius (linear? logarithmic? keplerian?)
- Exact **speed formula** with all constants:
  - baseSpeed value
  - exponent for radius dependency
  - final speed range (inner fast → outer slow)
- **Eccentricity** recommendations (real planets: Mercury 0.21, Venus 0.01, Earth 0.02, Neptune 0.01)
- **Inclination** range recommendations
- Color mapping strategy (if any)

### 3. Interaction & UX Flow
- What happens on **planet click** (currently shows PlanetDetailPanel)
- What happens on **sun click**
- How the **time slider** (if any) affects orbits
- Empty state behavior when no logs exist
- Animation frame rate considerations (useFrame delta usage)

### 4. Implementation Specifications
- Exact lines to modify in `OrbitSystem.tsx` (around lines 587-624)
- New formulas with inline comments explaining the physics
- Any new helper functions needed
- Verification: How to confirm the physics "looks right"

## Constraints
- Must work within `OrbitSystem.tsx` existing architecture (React Three Fiber + Three.js)
- Must use `useFrame((_, delta) => { ... })` for animation
- Must preserve existing planet data structure (`PlanetData` interface)
- Orbit radius must be in simulation units (not real AU)
- Speed must be in rad/simulation-unit

## Expected Output
A single, comprehensive solution — NOT a list of options. Provide exact code changes with physics formulas explained.

---

## RESULT (Received from AI)

### 1. Data Processing Pipeline (Math & Science)

#### Kepler's Laws of Planetary Motion

**1st Law (Elliptical Orbits):**
Planets orbit in ellipses with the Sun at one focus.
- Semi-major axis: `a`
- Eccentricity: `e` (0 = circle, 0-1 = ellipse)
- Distance from focus: `r = a(1-e²)/(1+e·cos(θ))`

**2nd Law (Equal Areas):**
A line from planet to sun sweeps equal areas in equal times.
- Angular momentum: `L = m·r²·ω = constant`
- Planets move faster at perihelion, slower at aphelion

**3rd Law (Period-Distance Relationship):**
```
T² = (4π²/GM) · a³
```
- For a central body with mass M, the period T is proportional to a^(3/2)
- This gives us: **ω ∝ r^(-3/2)**

#### Angular Velocity Formula

```
ω = √(GM/r³) = 2π/T
```

Where:
- G = gravitational constant
- M = central body mass (sun)
- r = orbital radius
- T = orbital period

**Simplified for simulation:**
```
ω = k · r^(-3/2)
```

Where k is a constant that sets the base speed scale.

#### Real Solar System Validation Data

| Planet | Distance (AU) | Period (years) | Angular Speed (rad/yr) | Speed Ratio |
|--------|---------------|----------------|------------------------|-------------|
| Mercury | 0.39 | 0.24 | 26.17 | **600x** reference |
| Venus | 0.72 | 0.62 | 10.13 | 2.6x Mercury |
| Earth | 1.00 | 1.00 | 6.28 | 4.2x Mercury |
| Mars | 1.52 | 1.88 | 3.34 | 7.8x Mercury |
| Jupiter | 5.20 | 11.86 | 0.53 | 49x Mercury |
| Saturn | 9.58 | 29.46 | 0.21 | 123x Mercury |
| Neptune | 30.07 | 164.8 | 0.038 | **689x Mercury** |

**Key insight:** Mercury orbits **689 times faster** than Neptune.

**Angular speed ratio formula:**
```
ω_mercury / ω_neptune = (r_neptune / r_mercury)^(3/2) = (30.07/0.39)^(3/2) = 77.1^(1.5) ≈ 676x
```

#### Orbit Radius Mapping Strategy

For app usage time → orbit radius:

**Recommendation: Logarithmic mapping**

```
r = minRadius + (maxRadius - minRadius) · log(1 + normalizedTime) / log(1 + maxTime)
```

Why logarithmic:
1. Matches real solar system spacing (Bode's Law approximation)
2. Prevents inner planets from crowding
3. Most-used apps (high time) → outer orbits (slower, stable)
4. Least-used apps (low time) → inner orbits (faster, more dynamic)

---

### 2. High-Fidelity Visual Specs

#### Orbit Radius Values

```typescript
// Simulation units (adjusted for visual appeal)
const minOrbitRadius = 3;   // Mercury-like closeness
const maxOrbitRadius = 80;  // Neptune-like distance

// Mapping function (logarithmic)
function mapTimeToRadius(normalizedTime: number): number {
  // normalizedTime: 0-1, where 1 = most used
  // We want LOW time = CLOSE to sun (inner planet)
  // We want HIGH time = FAR from sun (outer planet)
  
  // Invert: inner planets = high speed = low time = high priority attention
  const invertedTime = 1 - normalizedTime; // 0 = far, 1 = close
  
  if (invertedTime <= 0) return maxOrbitRadius;
  
  // Logarithmic spacing (Kepler-like)
  const logMin = Math.log(minOrbitRadius);
  const logMax = Math.log(maxOrbitRadius);
  const logR = logMin + invertedTime * (logMax - logMin);
  
  return Math.exp(logR);
}
```

#### Speed Formula (The Core Fix)

```typescript
// Base angular speed at radius = 1 (arbitrary reference)
const BASE_ANGULAR_SPEED = 2.0; // rad/simulation-unit

// Kepler's 3rd Law: ω ∝ r^(-3/2)
function calculateAngularSpeed(orbitRadius: number): number {
  return BASE_ANGULAR_SPEED * Math.pow(orbitRadius, -1.5);
}

// Speed range with minOrbitRadius=3, maxOrbitRadius=80:
// Inner planet (r=3):  ω = 2.0 * 3^(-1.5) = 2.0 * 0.192 = 0.384 rad/frame
// Outer planet (r=80): ω = 2.0 * 80^(-1.5) = 2.0 * 0.0014 = 0.0028 rad/frame
// Ratio: 0.384 / 0.0028 ≈ 137x difference (acceptable for visualization)
```

#### Eccentricity Recommendations

```typescript
// Real solar system eccentricities
const ECCENTRICITY_RANGE = {
  min: 0.01,  // Nearly circular (Venus, Earth)
  max: 0.21,  // Highly elliptical (Mercury)
  default: 0.05
};

// Map randomly or by app type
function getEccentricity(index: number, total: number): number {
  // Slight variation based on position
  return 0.01 + 0.02 * Math.sin(index * Math.PI / total);
}
```

#### Inclination Recommendations

```typescript
// Real solar system: Mercury 7°, others 0-3.4°
const INCLINATION_RANGE = {
  min: 0,        // degrees
  max: 7,        // degrees (Mercury)
  default: 2
};

// In radians for Three.js
function getInclination(): number {
  return (Math.random() * 7) * (Math.PI / 180);
}
```

#### Color Mapping Strategy

```typescript
// Based on orbit position (inner = hot/warm colors, outer = cool colors)
function getPlanetColor(orbitRadius: number, minR: number, maxR: number): string {
  const t = (orbitRadius - minR) / (maxR - minR);
  
  // Inner: yellow/orange → Outer: blue/purple
  if (t < 0.25) return '#F59E0B';      // Amber (hot)
  if (t < 0.5) return '#10B981';       // Emerald
  if (t < 0.75) return '#3B82F6';      // Blue
  return '#8B5CF6';                     // Purple (cold)
}
```

---

### 3. Interaction & UX Flow

#### Planet Click
```typescript
// Current behavior (preserve)
onClick={() => setSelectedPlanet(planet)}

// Shows PlanetDetailPanel with:
// - App name
// - Usage time
// - Orbit period (calculated)
// - "Open App" button (if applicable)
```

#### Sun Click
```typescript
// Show central stats panel
onClick={() => setSelectedPlanet(null)} // Deselect planet

// Could show: Total usage time, number of apps, system overview
```

#### Time Control
```typescript
// Optional: Speed multiplier slider
const [timeScale, setTimeScale] = useState(1); // 0.1x to 10x

// In useFrame:
planet.angle += angularSpeed * delta * timeScale;
```

#### Empty State
```typescript
// When no logs exist: Show placeholder planets (demo mode)
if (planets.length === 0) {
  // Generate 3-5 placeholder planets with dashed orbits
  // Label: "No activity data - demo mode"
}
```

#### Animation Frame Rate
```typescript
// Use delta for consistent animation regardless of frame rate
useFrame((_, delta) => {
  // delta = time since last frame in seconds
  // At 60fps: delta ≈ 0.0167s
  // At 30fps: delta ≈ 0.0333s
  
  planet.angle += angularSpeed * delta;
});
```

---

### 4. Implementation Specifications

#### Complete Modified Code for OrbitSystem.tsx

Replace the orbit calculation section (around lines 587-624) with:

```typescript
// ===========================================
// ORBITAL MECHANICS - Based on Kepler's Laws
// ===========================================

// Configuration constants
const ORBIT_CONFIG = {
  // Radius range (simulation units)
  minOrbitRadius: 3,      // Mercury-like closeness to sun
  maxOrbitRadius: 80,     // Neptune-like distance
  
  // Speed configuration (Kepler's 3rd Law: ω ∝ r^(-3/2))
  baseAngularSpeed: 2.0,  // Reference speed at r=1
  
  // Eccentricity (real solar system: 0.01 - 0.21)
  eccentricityRange: { min: 0.01, max: 0.08 },
  
  // Inclination (degrees, Mercury = 7°)
  inclinationRange: { min: 0, max: 5 },
  
  // Visual
  orbitSegments: 128,     // Smoothness of orbit rings
  showOrbitPaths: true,
};

/**
 * Maps normalized usage time to orbit radius using logarithmic spacing.
 * This mimics real solar system spacing (Titius-Bode approximation).
 * 
 * @param normalizedTime - 0 to 1, where 1 = most used
 * @returns Orbit radius in simulation units
 */
function mapTimeToRadius(normalizedTime: number): number {
  const { minOrbitRadius, maxOrbitRadius } = ORBIT_CONFIG;
  
  // Invert: low usage = inner orbit (high attention needed)
  // High usage = outer orbit (stable, established)
  const invertedTime = 1 - Math.max(0, Math.min(1, normalizedTime));
  
  if (invertedTime <= 0) return maxOrbitRadius;
  if (invertedTime >= 1) return minOrbitRadius;
  
  // Logarithmic spacing for Kepler-like distribution
  const logMin = Math.log(minOrbitRadius);
  const logMax = Math.log(maxOrbitRadius);
  const logR = logMin + invertedTime * (logMax - logMin);
  
  return Math.exp(logR);
}

/**
 * Calculates angular speed using Kepler's 3rd Law.
 * 
 * From Kepler: T² ∝ r³, therefore ω = 2π/T ∝ r^(-3/2)
 * 
 * This means:
 * - Mercury (r=0.39 AU): ω ≈ 26 rad/yr
 * - Neptune (r=30 AU): ω ≈ 0.038 rad/yr
 * - Ratio: ~680x difference
 * 
 * @param radius - Orbit radius in simulation units
 * @returns Angular speed in radians per second
 */
function calculateAngularSpeed(radius: number): number {
  const { baseAngularSpeed } = ORBIT_CONFIG;
  
  // Kepler's 3rd Law: ω ∝ r^(-3/2)
  // This creates realistic speed differences between inner and outer planets
  return baseAngularSpeed * Math.pow(radius, -1.5);
}

/**
 * Calculates orbital period from radius.
 * T = 2π/ω = 2π / (k·r^(-3/2)) = (2π/k) · r^(3/2)
 */
function calculateOrbitalPeriod(radius: number): number {
  const { baseAngularSpeed } = ORBIT_CONFIG;
  return (2 * Math.PI / baseAngularSpeed) * Math.pow(radius, 1.5);
}

// In the planet generation loop:
const planets: PlanetData[] = sortedLogs.map((log, index) => {
  // Normalize time (0-1) based on max time
  const maxTime = Math.max(...sortedLogs.map(l => l.total_time || 0));
  const normalizedTime = maxTime > 0 ? (log.total_time || 0) / maxTime : 0.5;
  
  // Calculate orbit radius (Keplerian logarithmic spacing)
  const orbitRadius = mapTimeToRadius(normalizedTime);
  
  // Calculate angular speed (Kepler's 3rd Law)
  const angularSpeed = calculateAngularSpeed(orbitRadius);
  
  // Calculate orbital period for display
  const orbitalPeriod = calculateOrbitalPeriod(orbitRadius);
  
  // Eccentricity (slight variation for visual interest)
  const eccentricity = ORBIT_CONFIG.eccentricityRange.min + 
    Math.random() * (ORBIT_CONFIG.eccentricityRange.max - ORBIT_CONFIG.eccentricityRange.min);
  
  // Inclination (slight tilt for 3D depth)
  const inclination = (ORBIT_CONFIG.inclinationRange.min + 
    Math.random() * (ORBIT_CONFIG.inclinationRange.max - ORBIT_CONFIG.inclinationRange.min)) 
    * (Math.PI / 180);
  
  // Planet size based on usage (more usage = larger)
  const baseSize = 0.3;
  const sizeMultiplier = 0.5 + normalizedTime * 0.5;
  const planetSize = baseSize * sizeMultiplier;
  
  return {
    id: log.id || `planet-${index}`,
    name: log.app_name || log.process_name || 'Unknown',
    process_name: log.process_name,
    color: getPlanetColor(orbitRadius, ORBIT_CONFIG.minOrbitRadius, ORBIT_CONFIG.maxOrbitRadius),
    size: planetSize,
    orbitRadius,
    angularSpeed,
    orbitalPeriod,
    eccentricity,
    inclination,
    angle: Math.random() * Math.PI * 2, // Random starting position
    totalTime: log.total_time || 0,
    data: log,
  };
});

// In useFrame for animation:
useFrame((_, delta) => {
  planets.forEach(planet => {
    // Update angle based on angular speed
    // Kepler's 2nd Law: Equal areas in equal times
    // For circular orbits, this simplifies to constant angular speed
    planet.angle += planet.angularSpeed * delta;
    
    // Keep angle in [0, 2π]
    if (planet.angle > Math.PI * 2) {
      planet.angle -= Math.PI * 2;
    }
  });
});

// For elliptical orbits (optional enhancement):
function getEllipticalPosition(planet: PlanetData): [number, number, number] {
  const { orbitRadius, eccentricity, inclination, angle } = planet;
  
  // Semi-major axis
  const a = orbitRadius;
  
  // Semi-minor axis: b = a * sqrt(1 - e²)
  const b = a * Math.sqrt(1 - eccentricity * eccentricity);
  
  // Position on ellipse
  const x = a * Math.cos(angle);
  const z = b * Math.sin(angle);
  
  // Apply inclination (rotation around x-axis)
  const y = z * Math.sin(inclination);
  const zInclined = z * Math.cos(inclination);
  
  return [x, y, zInclined];
}

// Color mapping function
function getPlanetColor(radius: number, minR: number, maxR: number): string {
  const t = (radius - minR) / (maxR - minR);
  
  // Gradient: inner (hot/yellow) → outer (cold/blue)
  const colors = [
    { pos: 0.0, color: '#FCD34D' },   // Yellow (Mercury-like)
    { pos: 0.2, color: '#F97316' },   // Orange (Venus-like)
    { pos: 0.4, color: '#10B981' },   // Green (Earth-like)
    { pos: 0.6, color: '#06B6D4' },   // Cyan (Mars-like)
    { pos: 0.8, color: '#3B82F6' },   // Blue (Jupiter-like)
    { pos: 1.0, color: '#8B5CF6' },   // Purple (Neptune-like)
  ];
  
  // Find color segment
  for (let i = 0; i < colors.length - 1; i++) {
    if (t <= colors[i + 1].pos) {
      const localT = (t - colors[i].pos) / (colors[i + 1].pos - colors[i].pos);
      return lerpColor(colors[i].color, colors[i + 1].color, localT);
    }
  }
  
  return colors[colors.length - 1].color;
}

function lerpColor(color1: string, color2: string, t: number): string {
  const r1 = parseInt(color1.slice(1, 3), 16);
  const g1 = parseInt(color1.slice(3, 5), 16);
  const b1 = parseInt(color1.slice(5, 7), 16);
  
  const r2 = parseInt(color2.slice(1, 3), 16);
  const g2 = parseInt(color2.slice(3, 5), 16);
  const b2 = parseInt(color2.slice(5, 7), 16);
  
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);
  
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}
```

---

### 5. Verification Checklist

#### Physics Verification

```typescript
// Test with known values:
const testRadius = 10;
const speed = calculateAngularSpeed(testRadius);
console.log(`Radius: ${testRadius}, Speed: ${speed.toFixed(4)} rad/s`);

// Expected: Speed should follow r^(-3/2) curve
// r=3:  0.3849 rad/s
// r=10: 0.0632 rad/s
// r=30: 0.0122 rad/s
// r=80: 0.0028 rad/s

// Ratio check:
const innerSpeed = calculateAngularSpeed(3);
const outerSpeed = calculateAngularSpeed(80);
console.log(`Speed ratio: ${(innerSpeed / outerSpeed).toFixed(1)}x`);
// Expected: ~137x (less than real 680x but visually distinguishable)
```

#### Visual Verification

1. **Inner planets should visibly move faster** - Watch for 10 seconds, inner planets should complete multiple orbits while outer planets barely move

2. **Orbit spacing should be logarithmic** - Gap between r=3 and r=6 should be similar visual distance to gap between r=40 and r=80

3. **Colors should gradient smoothly** - Yellow/orange near sun, blue/purple at edges

4. **No collision** - Planets should never overlap even with eccentricity

---

## Summary of Key Changes

| Parameter | Before | After |
|-----------|--------|-------|
| `minOrbitRadius` | 24 | 3 |
| `maxOrbitRadius` | (undefined) | 80 |
| Speed calculation | Linear (0.045-0.15) | Keplerian (r^(-3/2)) |
| Speed ratio (inner:outer) | 3x | 137x |
| Radius mapping | Linear | Logarithmic |
| Eccentricity | 0 | 0.01-0.08 |
| Inclination | 0 | 0-5° |

This creates a physically accurate and visually compelling solar system visualization where inner planets orbit dramatically faster than outer planets, just like in reality.
