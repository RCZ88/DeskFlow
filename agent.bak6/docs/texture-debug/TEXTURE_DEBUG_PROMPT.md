# 🔍 Debugging Prompt: Three.js Canvas Texture Not Rendering (Black Planets)

**Instructions for AI:** Read this entire prompt carefully. I need a systematic debugging plan to identify why procedural canvas textures are not rendering on Three.js spheres in a React Three Fiber application. The planets consistently render as solid black despite the texture being created and applied correctly.

---

## 📋 Problem Summary

**Issue:** Procedural canvas textures applied to `<meshBasicMaterial map={texture} />` render as solid black spheres. No texture patterns are visible.

**Expected:** Planets should display colorful procedural patterns (bands, spirals, spots) generated on a 2D canvas and mapped as textures.

**Actual:** All planets appear as solid black spheres regardless of material type or texture settings.

---

## 💻 Technical Stack

| Component | Version |
|-----------|---------|
| React | ^19.2.0 |
| TypeScript | ~5.9.3 |
| Electron | ^41.1.1 |
| Three.js | ^0.183.2 |
| @react-three/fiber | ^9.5.0 |
| @react-three/drei | ^10.7.7 |
| Vite | ^7.3.1 |
| Node.js | (Electron bundled) |

**Build Setup:** Vite + TypeScript, compiled to `dist/` folder, served via Electron's `loadFile()`.

---

## 🔍 What Has Been Tried (All Failed)

### Attempt 1: PBR Material with Emissive
```tsx
<meshStandardMaterial
  map={colorTexture}
  normalMap={normalMap}
  normalScale={1.2}
  emissive={data.color}
  emissiveIntensity={0.1}
  roughness={0.8}
/>
```
**Result:** Black planets. Emissive was washing out texture.

### Attempt 2: PBR Material with Color Tint
```tsx
<meshStandardMaterial
  map={colorTexture}
  color={data.color}
  roughness={0.7}
  metalness={0.1}
/>
```
**Result:** Black planets. Color multiplier darkened already-dark texture.

### Attempt 3: White Color + No Emissive
```tsx
<meshStandardMaterial
  map={colorTexture}
  color="#ffffff"
  roughness={0.7}
  metalness={0.1}
/>
```
**Result:** Black planets. Still no texture visible.

### Attempt 4: Basic Material (No Lighting)
```tsx
<meshBasicMaterial map={colorTexture} />
```
**Result:** Black planets. Should ignore lighting entirely but still black.

### Attempt 5: Inline Test Texture
```tsx
<meshBasicMaterial 
  color="#ffffff"
  map={(() => {
    const c = document.createElement('canvas');
    c.width = 256; c.height = 256;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#ffcc00';
    ctx.fillRect(0, 0, 256, 256);
    ctx.fillStyle = '#000000';
    for (let i = 0; i < 256; i += 40) ctx.fillRect(i, 0, 20, 256);
    const tex = new THREE.CanvasTexture(c);
    tex.needsUpdate = true;
    return tex;
  })()}
/>
```
**Result:** Black planets. Even a simple yellow/black stripe pattern fails.

### Attempt 6: Solid Color (No Texture)
```tsx
<meshBasicMaterial color={data.color} />
```
**Result:** ✅ Colored planets work! This proves the rendering pipeline works, but textures specifically fail.

---

## 📝 Current Texture Creation Code

```typescript
function createProceduralTexture(color: string, category: string, seed: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    console.warn('[DeskFlow] Canvas context failed');
    const fallback = document.createElement('canvas');
    fallback.width = 64; fallback.height = 64;
    const fCtx = fallback.getContext('2d')!;
    fCtx.fillStyle = color;
    fCtx.fillRect(0, 0, 64, 64);
    const tex = new THREE.CanvasTexture(fallback);
    tex.needsUpdate = true;
    return tex;
  }

  const rand = seededRandom(seed);
  
  console.log(`[DeskFlow] Creating texture for: ${category} (${color})`);
  
  // Bright solid base
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 512, 512);

  // White border
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 20;
  ctx.strokeRect(10, 10, 492, 492);

  // Category label
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 48px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(category, 256, 280);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  
  console.log(`[DeskFlow] Texture created: ${canvas.width}x${canvas.height}`);
  return texture;
}
```

**Console Output:** The logs show textures ARE being created:
```
[DeskFlow] Creating texture for: IDE (#4f46e5)
[DeskFlow] Texture created: 512x512
```

---

## 🎯 Key Observations

1. ✅ `meshBasicMaterial color={data.color}` → Colored spheres work
2. ❌ `meshBasicMaterial map={texture}` → Black spheres
3. ✅ Texture creation logs confirm canvas is being drawn
4. ❌ No console errors related to textures
5. ✅ App runs at 60 FPS, no WebGL errors
6. ❌ Same issue across all material types (Standard, Basic, Phong)

---

## 🤔 Hypotheses to Investigate

### H1: CanvasTexture Not Updating
- Maybe `needsUpdate = true` isn't sufficient in R3F v9?
- Maybe texture needs to be recreated each render?

### H2: Color Space / Gamma Issue
- Three.js 0.183 uses SRGBColorSpace by default
- Canvas textures might need explicit color space setting
- `texture.colorSpace = THREE.SRGBColorSpace` might be required

### H3: R3F Material Update Cycle
- Maybe R3F isn't detecting the texture change?
- Maybe the texture object reference needs to be stable?

### H4: Electron WebGL Context Issue
- Electron 41 might have different WebGL defaults
- Maybe powerPreference or antialias settings affect texture sampling?

### H5: Canvas Size / Power of 2
- 512x512 is power of 2, but maybe R3F expects different dimensions?
- Maybe canvas needs to be created outside React render cycle?

### H6: Material Property Conflicts
- Maybe `color` + `map` together cause issues?
- Maybe `emissive` interferes even at low intensity?

---

## 📋 Requested Output

Please provide:

### 1. **Root Cause Analysis**
- Most likely reason textures are black
- Why solid colors work but maps don't

### 2. **Systematic Debugging Plan**
- Step-by-step tests to isolate the issue
- What to check in DevTools (WebGL tab, console, network)
- Minimal reproducible example to test

### 3. **Code Fix**
- Exact code changes needed
- Which file(s) to modify
- Before/after snippets

### 4. **Verification Steps**
- How to confirm the fix works
- What to look for in the rendered output

### 5. **Fallback Options**
- Alternative approaches if primary fix fails
- Workarounds for Electron + R3F texture issues

---

## 📁 Relevant File Structure

```
src/
├── components/
│   └── OrbitSystem.tsx    ← Main file with texture creation + material
├── App.tsx                ← Parent component passing data
├── main.tsx               ← Entry point with HashRouter
└── main.ts                ← Electron main process
package.json               ← Dependencies listed above
vite.config.ts             ← Vite config (base: './', no special texture settings)
```

---

## 🎯 Success Criteria

After fix:
- [ ] Planets display visible texture patterns (not black)
- [ ] Each category shows distinct visual style
- [ ] No console errors or warnings
- [ ] Maintains 60 FPS performance
- [ ] Works in Electron production build (not just dev)

---

**Ready? Please analyze the issue and provide your debugging plan and solution.**
