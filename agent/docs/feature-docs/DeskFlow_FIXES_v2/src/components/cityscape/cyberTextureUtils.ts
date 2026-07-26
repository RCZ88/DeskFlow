import * as THREE from 'three'

export function tryLoadTexture(
  path: string,
  tile = false,
): Promise<THREE.Texture | null> {
  return new Promise((resolve) => {
    const loader = new THREE.TextureLoader()
    loader.load(
      path,
      (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace
        if (tile) {
          tex.wrapS = tex.wrapT = THREE.RepeatWrapping
        } else {
          tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping
        }
        resolve(tex)
      },
      undefined,
      () => resolve(null),
    )
  })
}

export function loadCheckerboardAsAlpha(
  path: string,
): Promise<THREE.DataTexture | null> {
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      try {
        const c = document.createElement('canvas')
        c.width = img.width
        c.height = img.height
        const ctx = c.getContext('2d')!
        ctx.drawImage(img, 0, 0)
        const id = ctx.getImageData(0, 0, c.width, c.height)
        const d = id.data

        const pk = idx(d, 0, 0)
        const pw = idx(d, c.width - 1, 0)
        const epsilon = 22

        function match(ar: number, ag: number, ab: number, br: number, bg: number, bb: number) {
          return Math.abs(ar - br) <= epsilon && Math.abs(ag - bg) <= epsilon && Math.abs(ab - bb) <= epsilon
        }

        const out = new Uint8Array(d.length)
        for (let i = 0; i < d.length; i += 4) {
          const r = d[i], g = d[i + 1], b = d[i + 2]
          if (match(r, g, b, pk.r, pk.g, pk.b) || match(r, g, b, pw.r, pw.g, pw.b)) {
            out[i] = 0; out[i + 1] = 0; out[i + 2] = 0; out[i + 3] = 0
          } else {
            out[i] = r; out[i + 1] = g; out[i + 2] = b; out[i + 3] = 255
          }
        }

        const tex = new THREE.DataTexture(out, c.width, c.height, THREE.RGBAFormat)
        tex.needsUpdate = true
        resolve(tex)
      } catch { resolve(null) }
    }
    img.onerror = () => resolve(null)
    img.src = path
  })
}

function idx(d: Uint8ClampedArray, x: number, y: number) {
  const i = (y * 2048 + x) * 4
  return { r: d[i], g: d[i + 1], b: d[i + 2] }
}

export function makeRadialGlow(
  size: number,
  inner: string,
): THREE.CanvasTexture {
  const c = document.createElement('canvas')
  c.width = size
  c.height = size
  const ctx = c.getContext('2d')!
  const half = size / 2
  const grad = ctx.createRadialGradient(half, half, 0, half, half, half)
  grad.addColorStop(0, inner)
  grad.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, size, size)
  const tex = new THREE.CanvasTexture(c)
  tex.needsUpdate = true
  return tex
}

export function makeRainStreakLight(
  size: number,
  color: THREE.Color,
): THREE.CanvasTexture {
  const c = document.createElement('canvas')
  c.width = size
  c.height = size
  const ctx = c.getContext('2d')!
  const cx = size / 2, cy = size / 2
  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, size / 2)
  const rgb = `rgba(${color.r * 255},${color.g * 255},${color.b * 255}`
  grad.addColorStop(0, `${rgb},0.9)`)
  grad.addColorStop(0.08, `${rgb},0.5)`)
  grad.addColorStop(0.25, `${rgb},0)`)
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, size, size)
  const tex = new THREE.CanvasTexture(c)
  tex.needsUpdate = true
  return tex
}
