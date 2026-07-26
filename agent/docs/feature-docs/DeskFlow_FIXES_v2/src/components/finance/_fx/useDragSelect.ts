import { useCallback, useEffect, useRef, useState } from 'react'

export interface DragSelectHandlers {
  onPointerDown: (e: React.PointerEvent) => void
  onPointerEnter: () => void
}

export function useDragSelect(
  onSelect: (id: number) => void,
): {
  getRowHandlers: (id: number) => DragSelectHandlers
  wasDragging: () => boolean
  dragging: boolean
} {
  const [dragging, setDragging] = useState(false)
  const dragMovedRef = useRef(false)
  const pointerDownIdRef = useRef<number | null>(null)
  const onSelectRef = useRef(onSelect)
  onSelectRef.current = onSelect

  useEffect(() => {
    const up = () => {
      setDragging(false)
      dragMovedRef.current = false
      pointerDownIdRef.current = null
    }
    window.addEventListener('pointerup', up)
    return () => window.removeEventListener('pointerup', up)
  }, [])

  const getRowHandlers = useCallback(
    (id: number): DragSelectHandlers => ({
      onPointerDown: (e: React.PointerEvent) => {
        if (e.button !== 0) return
        pointerDownIdRef.current = id
        dragMovedRef.current = false
      },
      onPointerEnter: () => {
        const startId = pointerDownIdRef.current
        if (startId === null) return

        if (!dragMovedRef.current && startId !== id) {
          dragMovedRef.current = true
          setDragging(true)
          onSelectRef.current(startId)
        }

        if (dragMovedRef.current) {
          onSelectRef.current(id)
        }
      },
    }),
    [],
  )

  const wasDragging = useCallback(() => dragMovedRef.current, [])

  return { getRowHandlers, wasDragging, dragging }
}
