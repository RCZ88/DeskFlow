# 🔍 FINAL DEBUG: Three.js CanvasTexture Black in Electron + R3F v9

**Status:** CRITICAL - Planets render solid black despite correct texture creation.

## 📋 Confirmed Facts
1. ✅ `meshBasicMaterial color={...}` works → WebGL pipeline works
2. ❌ `map={anyCanvasTexture}` → Black
3. ❌ `texture.colorSpace = THREE.SRGBColorSpace` → Still black
4. ❌ Inline test texture (yellow/black stripes) → Still black
5. ✅ No console errors, 60 FPS, textures log as created
6. Stack: React 19, Three.js 0.183, R3F 9.5, Electron 41, Vite 7

## 🎯 Root Cause Hypotheses Remaining
- **H1:** R3F v9 reconciliation drops `needsUpdate` flag on CanvasTexture
- **H2:** Electron 41 WebGL context restricts CanvasTexture uploads
- **H3:** Three.js r183 changed CanvasTexture constructor/requirements
- **H4:** Vite dev server HMR corrupts texture references

## 🛠️ Required Debugging Steps

### Step 1: Isolate R3F vs Three.js
Paste this **directly in browser console** while app runs:
```js
const c = document.createElement('canvas');
c.width = 256; c.height = 256;
const ctx = c.getContext('2d');
ctx.fillStyle = '#ff0000';
ctx.fillRect(0,0,256,256);
ctx.fillStyle = '#000';
ctx.fillRect(20,20,216,216);
const t = new THREE.CanvasTexture(c);
t.colorSpace = THREE.SRGBColorSpace;
t.needsUpdate = true;

// Create debug sphere at origin
const geo = new THREE.SphereGeometry(2, 32, 32);
const mat = new THREE.MeshBasicMaterial({ map: t });
const mesh = new THREE.Mesh(geo, mat);
mesh.position.set(0, 0, 0);
scene.add(mesh);
console.log('✅ Debug sphere added');
```
**If red/black sphere appears → R3F issue. If black → Electron/Three issue.**

### Step 2: Check WebGL Capabilities
Paste in console:
```js
console.log('GPU:', gl.getParameter(gl.RENDERER));
console.log('WebGL2:', gl instanceof WebGL2RenderingContext);
console.log('MaxTexSize:', gl.getParameter(gl.MAX_TEXTURE_SIZE));
```

### Step 3: Test Data URL Texture
Replace texture creation with:
```tsx
const tex = new THREE.TextureLoader().load(
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
);
```
**If works → CanvasTexture specifically broken in this env.**

### Step 4: Force Renderer Output Color Space
In `<Canvas>` props add:
```tsx
<Canvas
  gl={{ outputColorSpace: THREE.SRGBColorSpace, toneMapping: THREE.NoToneMapping }}
  ...
>
```

## 📤 Expected Output from AI
1. Exact code fix based on Step 1 result
2. Fallback rendering strategy if CanvasTexture fundamentally broken
3. Electron-specific WebGL config if needed
4. Verification checklist

**Paste console results from Steps 1-3 to proceed.**
