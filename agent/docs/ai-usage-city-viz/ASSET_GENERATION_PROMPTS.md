# 🎨 AI Cityscape — Asset Generation Prompts

> **Purpose:** Generate a comprehensive list of image/texture/asset prompts for image-generating AIs (Midjourney, DALL-E, Stable Diffusion) or for manual asset sourcing. These assets will replace or enhance the current procedural shaders and canvas-generated textures in the AI Usage Cityscape.

---

## Current State

The cityscape currently uses **100% procedural generation**:
- Building textures: Canvas-drawn window grids (64×128px)
- Ground: GLSL shader with grid + radial avenues + traffic dashes
- Atmosphere: GLSL point particles (rain + embers)
- Roofs: Instanced geometry (box, cone, cylinder) with additive glow
- No external assets, no images, no 3D models

The goal is to enhance visual fidelity with real textures while keeping the procedural backbone.

---

## Asset Categories & Prompts

### 1. Building Facade Textures (Seamless Tileable)

**Purpose:** Replace the flat `#141826` building shell color with real architectural textures. Each texture should be seamless (tileable) for instanced rendering.

| # | Prompt for Image AI | Format | Size | Notes |
|---|---------------------|--------|------|-------|
| 1a | `seamless dark concrete building facade texture, cyberpunk style, subtle panel lines, weathered surface, dark blue-gray #141826 base, no windows, PBR normal map compatible, top-down tileable, 4K` | PNG (tileable) | 1024×1024 | Base shell texture for all buildings |
| 1b | `seamless art deco building facade texture, vertical setback lines, dark gunmetal color, subtle metallic sheen, gothic architecture influence, tileable, 4K` | PNG (tileable) | 1024×1024 | Alternative for tall buildings (antenna/pyramid roofs) |
| 1c | `seamless industrial warehouse wall texture, corrugated metal panels, dark steel color, rust accents, cyberpunk dystopian, tileable, 4K` | PNG (tileable) | 1024×1024 | For low/short buildings (performance mode) |

### 2. Window Texture Atlas (Replace Canvas-Generated)

**Purpose:** Replace the current `buildWindowAtlas()` canvas-drawn window patterns with real photographic window grids. The atlas is a 5×3 grid (5 lit-ratio steps × 3 pattern types).

| # | Prompt for Image AI | Format | Size | Notes |
|---|---------------------|--------|------|-------|
| 2a | `office building window grid at night, 6 columns × 14 rows, dark glass background #04060c, warm yellow lit windows #ffd9a0, random on/off pattern, photorealistic, straight-on view, no perspective distortion, 512×1024` | PNG | 512×1024 | Pattern 0: standard grid (claude/reasoning models) |
| 2b | `apartment building window grid at night, 8 columns × 10 rows, dark glass, warm yellow lit windows, checkerboard on/off pattern, photorealistic, straight-on, no distortion, 512×1024` | PNG | 512×1024 | Pattern 1: dot-grid/checkerboard (gpt/gemini models) |
| 2c | `skyscraper window grid at night, 4 columns × 8 rows, dark glass, warm yellow lit windows, sparse lighting (mostly dark), photorealistic, straight-on, no distortion, 512×1024` | PNG | 512×1024 | Pattern 2: sparse (other models) |
| 2d | `same as 2a but with 80% of windows lit (high occupancy)` | PNG | 512×1024 | Lit ratio step 4 (80%+) |
| 2e | `same as 2a but with 60% of windows lit` | PNG | 512×1024 | Lit ratio step 3 (60-80%) |
| 2f | `same as 2a but with 40% of windows lit` | PNG | 512×1024 | Lit ratio step 2 (40-60%) |
| 2g | `same as 2a but with 20% of windows lit` | PNG | 512×1024 | Lit ratio step 1 (20-40%) |
| 2h | `same as 2a but with 5% of windows lit (mostly dark)` | PNG | 512×1024 | Lit ratio step 0 (0-20%) |

### 3. Ground / Road Surface Textures

**Purpose:** Enhance the NeonGround shader with real asphalt/concrete textures underneath the procedural grid glow.

| # | Prompt for Image AI | Format | Size | Notes |
|---|---------------------|--------|------|-------|
| 3a | `seamless dark asphalt road texture, wet surface with subtle reflections, cyberpunk city street, dark #05070f base, faint tire marks, top-down view, tileable, 4K` | PNG (tileable) | 2048×2048 | Base ground texture |
| 3b | `seamless concrete sidewalk texture, dark gray, subtle cracks and wear, cyberpunk urban, top-down, tileable, 4K` | PNG (tileable) | 1024×1024 | For building base areas |
| 3c | `neon-lit road markings, cyan center lines, dashed white lane markers, top-down view, dark asphalt background, photorealistic, 1024×1024` | PNG (with alpha) | 1024×1024 | Overlay for lane glow |

### 4. Vehicle / Car Assets (Optional — Replace Shader Dashes)

**Purpose:** Replace the animated traffic dashes in the ground shader with actual vehicle silhouettes. These would be rendered as instanced sprites or simple 3D models.

| # | Prompt for Image AI | Format | Size | Notes |
|---|---------------------|--------|------|-------|
| 4a | `top-down view of a futuristic cyberpunk car, neon underglow (pink #ff3d81), dark body, glowing headlights, isolated on black background, PNG with transparent background` | PNG (transparent) | 256×256 | Traffic direction A |
| 4b | `top-down view of a futuristic cyberpunk car, neon underglow (amber #ffe066), dark body, glowing headlights, isolated on black background, PNG with transparent background` | PNG (transparent) | 256×256 | Traffic direction B |
| 4c | `top-down view of a cyberpunk delivery truck, larger vehicle, neon underglow (cyan #0bd7ff), isolated on black, PNG with transparent background` | PNG (transparent) | 256×256 | Heavy traffic variant |

### 5. Neon Sign / Holographic Textures

**Purpose:** Replace the canvas-drawn rooftop agent-name sprites with real neon sign textures.

| # | Prompt for Image AI | Format | Size | Notes |
|---|---------------------|--------|------|-------|
| 5a | `neon sign glow effect, cyan #00eaff, horizontal rectangular shape, soft bloom, isolated on black background, PNG with transparent background, 512×128` | PNG (transparent) | 512×128 | Generic neon sign base |
| 5b | `holographic billboard texture, purple/pink gradient glow, semi-transparent, futuristic, isolated on black, PNG with transparent background, 512×256` | PNG (transparent) | 512×256 | For tallest buildings |
| 5c | `neon arrow sign, pointing right, cyan glow, cyberpunk style, isolated on black, PNG with transparent background, 256×256` | PNG (transparent) | 256×256 | Directional signage |

### 6. Atmospheric Effects

**Purpose:** Enhance the rain/ember particle system with real particle textures instead of simple colored dots.

| # | Prompt for Image AI | Format | Size | Notes |
|---|---------------------|--------|------|-------|
| 6a | `rain drop particle texture, elongated streak, blue-white color, soft glow, isolated on black background, PNG with transparent background, 64×64` | PNG (transparent) | 64×64 | Rain particle texture |
| 6b | `ember spark particle texture, orange-red glow, circular with soft edges, isolated on black background, PNG with transparent background, 64×64` | PNG (transparent) | 64×64 | Ember particle texture |
| 6c | `volumetric fog texture, dark blue-gray, soft gradient, isolated on black background, PNG with transparent background, 512×512` | PNG (transparent) | 512×512 | For atmospheric haze overlay |

### 7. Sky / Background

**Purpose:** Replace the solid `#070912` void with a layered sky backdrop.

| # | Prompt for Image AI | Format | Size | Notes |
|---|---------------------|--------|------|-------|
| 7a | `dark cyberpunk night sky, deep blue-black gradient, subtle city light haze at horizon, no stars, atmospheric, 4K, equirectangular projection` | PNG (or HDR) | 4096×2048 | Sky dome / environment map |
| 7b | `distant city skyline silhouette at night, dark buildings with scattered window lights, atmospheric haze, cyberpunk mood, wide angle, 4K` | PNG | 4096×1024 | Background horizon layer |

### 8. Street Furniture (Optional — Future Enhancement)

**Purpose:** Add detail to the ground plane with instanced street furniture models.

| # | Prompt for Image AI | Format | Size | Notes |
|---|---------------------|--------|------|-------|
| 8a | `cyberpunk street lamppost, tall thin pole with neon light fixture at top, cyan glow, isolated on black, PNG with transparent background, 256×512` | PNG (transparent) | 256×512 | Sprite-based lamppost |
| 8b | `futuristic traffic light, three vertical lights (red/amber/green), neon housing, isolated on black, PNG with transparent background, 128×256` | PNG (transparent) | 128×256 | Traffic signal |
| 8c | `cyberpunk street bench, metallic frame with neon accent strip, isolated on black, PNG with transparent background, 256×128` | PNG (transparent) | 256×128 | Street furniture |

### 9. Vegetation (Optional — Future Enhancement)

| # | Prompt for Image AI | Format | Size | Notes |
|---|---------------------|--------|------|-------|
| 9a | `cyberpunk tree, dark trunk with bioluminescent blue leaves, isolated on black, PNG with transparent background, 256×512` | PNG (transparent) | 256×512 | Street tree sprite |
| 9b | `neon-lit planter box, rectangular, cyan glow edges, dark soil, isolated on black, PNG with transparent background, 256×128` | PNG (transparent) | 256×128 | Ground-level greenery |

### 10. Special Effects Overlays

| # | Prompt for Image AI | Format | Size | Notes |
|---|---------------------|--------|------|-------|
| 10a | `lens flare texture, horizontal anamorphic streak, cyan and magenta, isolated on black, PNG with transparent background, 1024×256` | PNG (transparent) | 1024×256 | For bloom post-processing enhancement |
| 10b | `rain streak overlay, diagonal streaks, semi-transparent white, isolated on black, PNG with transparent background, tileable, 1024×1024` | PNG (tileable, transparent) | 1024×1024 | Rain overlay for cinematic mode |
| 10c | `smoke/fog wisps, dark gray translucent, isolated on black, PNG with transparent background, tileable, 512×512` | PNG (tileable, transparent) | 512×512 | For smog cloud enhancement |

---

## Usage Instructions

### For Image-Generating AIs (Midjourney, DALL-E, etc.)
1. Copy the prompt text from the "Prompt for Image AI" column
2. Add aspect ratio parameters if needed (e.g., `--ar 1:1` for Midjourney)
3. Generate at the specified resolution
4. Ensure transparent backgrounds are actually transparent (not white/black)
5. For tileable textures, use the `--tile` flag in Midjourney

### For Manual Asset Sourcing
1. Search on texture sites (Poly Haven, AmbientCG, TextureHaven) for PBR materials
2. Search on game asset sites (itch.io, Unity Asset Store, Unreal Marketplace) for 3D models
3. Search on icon/texture sites (OpenGameArt, Kenney.nl) for free assets
4. Ensure all assets are licensed for commercial use

### Integration Notes
- All textures should be converted to sRGB color space before use
- Transparent PNGs should have proper alpha channels
- Tileable textures must seamlessly tile on all edges
- Textures will be loaded via `THREE.CanvasTexture` or `THREE.TextureLoader`
- 3D models (if sourced) would need to be converted to GLTF/GLB format

---

## Priority Order

1. **HIGH:** Building facade textures (#1) + Window atlas (#2) — these directly fix "all buildings look the same"
2. **HIGH:** Ground/road textures (#3) — fixes "floor is invisible"
3. **MEDIUM:** Neon signs (#5) + Atmospheric effects (#6) — visual polish
4. **MEDIUM:** Sky/background (#7) — replaces void
5. **LOW:** Vehicles (#4) — replaces shader dashes with real cars
6. **LOW:** Street furniture (#8) + Vegetation (#9) — future enhancement
7. **LOW:** Special effects (#10) — post-processing enhancement
