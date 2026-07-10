export type Side = 'right' | 'left' | 'top' | 'bottom'
export interface Anchored { x: number; y: number; side: Side }

export interface AnchorRect {
  left: number
  right: number
  top: number
  bottom: number
  width: number
  height: number
}

const MARGIN = 8
const PAD = 8

export function anchorTooltip(rect: AnchorRect, tipW: number, tipH: number): Anchored {
  const vw = window.innerWidth
  const vh = window.innerHeight
  const space: Record<Side, number> = {
    right: vw - rect.right,
    left: rect.left,
    top: rect.top,
    bottom: vh - rect.bottom,
  }
  const order: Side[] = ['right', 'left', 'bottom', 'top']
  const need = (s: Side) => (s === 'right' || s === 'left' ? tipW + MARGIN : tipH + MARGIN)
  let side: Side = order.find((s) => space[s] >= need(s)) ?? order.reduce((a, b) => (space[a] >= space[b] ? a : b))

  let x: number
  let y: number
  if (side === 'right') {
    x = rect.right + MARGIN
    y = rect.top + rect.height / 2 - tipH / 2
  } else if (side === 'left') {
    x = rect.left - MARGIN - tipW
    y = rect.top + rect.height / 2 - tipH / 2
  } else if (side === 'bottom') {
    x = rect.left + rect.width / 2 - tipW / 2
    y = rect.bottom + MARGIN
  } else {
    x = rect.left + rect.width / 2 - tipW / 2
    y = rect.top - MARGIN - tipH
  }

  x = Math.max(PAD, Math.min(x, vw - tipW - PAD))
  y = Math.max(PAD, Math.min(y, vh - tipH - PAD))
  return { x, y, side }
}
