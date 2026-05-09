# Orbit System Visual & Physics Research

## Context
We're building an interactive 3D orbit visualization in React Three Fiber that represents app usage patterns as planets orbiting a central sun.

**Current Problem:**
- All planets are clustered in a tight group far from the sun
- No planets appear visually close to the sun (inner orbits barely visible)
- Sun has no texture/detail (appears as plain shiny sphere)
- Orbital spacing doesn't feel right visually

**Technology Stack:**
- React Three Fiber (Three.js wrapper)
- Three.js for 3D rendering
- Existing ORBIT_CONFIG with minOrbitRadius=10, maxOrbitRadius=80
- Need to work within canvas-based 3D environment

## Research Request

### 1. Orbital Mechanics & Spacing
**Goal:** Planets should spread visually from close to sun → far from sun with proper Keplerian physics

**Questions to Research:**
- What logarithmic or exponential formulas best distribute planets visually while maintaining Kepler's 3rd Law (ω ∝ r^(-3/2))?
- How should we handle the minimum orbit radius so inner planets appear visually close to sun?
- What speed ratios (inner vs outer planet) feel natural in 3D visualization without looking glitchy?
- Should we use elliptical orbits? What eccentricity values look good?
- Are there established visualization techniques for orbital systems (games, educational tools)?

### 2. Sun Visuals & Lighting
**Goal:** Create a textured, realistic sun that feels like a light source

**Questions to Research:**
- What Three.js techniques create realistic sun:
  - Sphere geometry + texture maps?
  - Procedural textures (Perlin noise)?
  - Glow/bloom post-processing effects?
  - Corona/halo effects?
  - Realistic lighting model?
- What color temperature/intensity should the sun emit?
- Should sun cast shadows on planets or just provide ambient light?
- Are there Three.js libraries or shaders for stellar visuals?

### 3. Visual Polish
**Goal:** Make the orbital system feel alive and scientifically grounded

**Questions to Research:**
- Particle effects (solar wind, asteroid belts)?
- Planet shadow/lighting relative to sun position?
- Camera positioning to show depth and scale?
- Recommended visual libraries for space/astronomy visualizations?

## Requirements (Not Prescriptive - Let AI Decide)
- Must work with React Three Fiber + Three.js
- Performance: Should render smoothly with 10-50 planets
- Visually: Inner planets should appear close to sun, outer planets far
- Physics: Kepler's law (faster inner, slower outer) should be observable
- NOT: Don't force specific libraries or math - research and recommend best approach

## Deliverables Expected
1. **Orbital Spacing Algorithm** - Detailed formula with reasoning
2. **Sun Visuals Approach** - Recommended texturing/lighting technique
3. **Speed Ratios** - What ratio between inner/outer feels right?
4. **Implementation Notes** - Specific Three.js functions/patterns to use
5. **Optional Enhancements** - Particle effects, shadows, etc. if applicable

## Context Files
- `src/components/OrbitSystem.tsx` - Main component (3350+ lines)
- Current ORBIT_CONFIG values: minOrbitRadius=10, maxOrbitRadius=80, baseAngularSpeed=2.0
- Planet data includes: orbitRadius, speed, eccentricity, inclination, color
- Existing helper functions: `calculateAngularSpeed()`, `mapTimeToRadius()`, `getPlanetColorByOrbit()`

---

**Note:** This research should inform implementation decisions, not dictate them. AI should feel free to suggest alternatives or improvements based on Three.js capabilities and visual best practices.
