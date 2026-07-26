import type { CanvasCard } from '../types/canvas'

const GAP = 40
const ROW_MAX_WIDTH = 800

export function autoArrange(cards: CanvasCard[]): Record<string, { x: number; y: number }> {
  const sorted = [...cards].sort((a, b) => {
    if (a.type !== b.type) return a.type.localeCompare(b.type)
    return (a.createdAt || 0) - (b.createdAt || 0)
  })

  // First pass: compute layout positions starting at (0, 0)
  const positions: Record<string, { x: number; y: number }> = {}
  let currentX = 0
  let currentY = 0
  let rowHeight = 0
  let rowCardCount = 0

  for (const card of sorted) {
    const cardWidth = card.size.w * 40 + GAP
    const cardHeight = card.size.h * 40 + GAP

    if (rowCardCount > 0 && currentX + cardWidth > ROW_MAX_WIDTH) {
      currentX = 0
      currentY += rowHeight + GAP
      rowHeight = 0
      rowCardCount = 0
    }

    positions[card.id] = { x: currentX, y: currentY }
    currentX += cardWidth
    rowHeight = Math.max(rowHeight, cardHeight)
    rowCardCount++
  }

  // Second pass: center the entire layout around (0, 0)
  let layoutMinX = Infinity, layoutMinY = Infinity, layoutMaxX = -Infinity, layoutMaxY = -Infinity
  for (const pos of Object.values(positions)) {
    layoutMinX = Math.min(layoutMinX, pos.x)
    layoutMinY = Math.min(layoutMinY, pos.y)
    layoutMaxX = Math.max(layoutMaxX, pos.x)
    layoutMaxY = Math.max(layoutMaxY, pos.y)
  }
  const layoutCenterX = (layoutMinX + layoutMaxX) / 2
  const layoutCenterY = (layoutMinY + layoutMaxY) / 2

  for (const id of Object.keys(positions)) {
    positions[id] = {
      x: Math.round(positions[id].x - layoutCenterX),
      y: Math.round(positions[id].y - layoutCenterY),
    }
  }

  return positions
}
