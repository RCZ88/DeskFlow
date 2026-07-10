import * as THREE from 'three'

function canvas(w: number, h: number) {
  const c = document.createElement('canvas')
  c.width = w; c.height = h
  return { c, ctx: c.getContext('2d')! }
}

let _mask: THREE.CanvasTexture | null = null
export function makeWindowMask(cols = 10, rows = 16): THREE.CanvasTexture {
  if (_mask) return _mask
  const W = 256, H = 512
  const { c, ctx } = canvas(W, H)
  ctx.fillStyle = '#05070d'; ctx.fillRect(0, 0, W, H)
  const mx = W * 0.12, my = H * 0.06
  const cw = (W - 2 * mx) / cols, ch = (H - 2 * my) / rows
  for (let r = 0; r < rows; r++) {
    for (let cN = 0; cN < cols; cN++) {
      const x = mx + cN * cw + cw * 0.18
      const y = my + r * ch + ch * 0.16
      const ww = cw * 0.64, wh = ch * 0.68
      const lit = Math.random()
      const v = lit > 0.55 ? 200 + Math.floor(Math.random() * 55) : lit > 0.3 ? 60 : 18
      ctx.fillStyle = `rgb(${v},${v},${v})`
      ctx.fillRect(x, y, ww, wh)
    }
  }
  const tex = new THREE.CanvasTexture(c)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.colorSpace = THREE.NoColorSpace
  _mask = tex
  return tex
}

let _glow: THREE.CanvasTexture | null = null
export function makeUnderglow(): THREE.CanvasTexture {
  if (_glow) return _glow
  const S = 128
  const { c, ctx } = canvas(S, S)
  const g = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2)
  g.addColorStop(0, 'rgba(255,255,255,1)')
  g.addColorStop(0.35, 'rgba(255,255,255,0.55)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g; ctx.fillRect(0, 0, S, S)
  const tex = new THREE.CanvasTexture(c)
  _glow = tex
  return tex
}

export function makeGridTexture(size = 512, cells = 16, line = '#00e5ff'): THREE.CanvasTexture {
  const { c, ctx } = canvas(size, size)
  ctx.fillStyle = '#05070d'; ctx.fillRect(0, 0, size, size)
  ctx.strokeStyle = line; ctx.lineWidth = 2; ctx.globalAlpha = 0.5
  const step = size / cells
  for (let i = 0; i <= cells; i++) {
    ctx.beginPath(); ctx.moveTo(i * step, 0); ctx.lineTo(i * step, size); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(0, i * step); ctx.lineTo(size, i * step); ctx.stroke()
  }
  const tex = new THREE.CanvasTexture(c)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  return tex
}
