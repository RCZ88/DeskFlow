import { useCallback, useMemo, useState } from 'react'

export type SelectionMode = 'idle' | 'manual' | 'filter'

export interface SelectionState {
  mode: SelectionMode
  selectedIds: Set<number>
  filterAnchored: boolean
  deselectedIds: Set<number>
  lastAnchorId: number | null
}

export interface DerivedSelection {
  selectedIds: Set<number>
  count: number
  totalVisible: number
  headerState: 'none' | 'some' | 'all'
  isMixed: boolean
}

export interface SelectionApi {
  toggleOne: (id: number) => void
  selectOne: (id: number) => void
  toggleWithCtrl: (id: number) => void
  selectRangeTo: (id: number, order: number[]) => void
  toggleGroup: (groupIds: number[]) => void
  selectAllFiltered: () => void
  clear: () => void
  isSelected: (id: number) => boolean
}

const EMPTY: SelectionState = {
  mode: 'idle',
  selectedIds: new Set(),
  filterAnchored: false,
  deselectedIds: new Set(),
  lastAnchorId: null,
}

export function useTransactionSelection(filteredIds: number[]) {
  const [state, setState] = useState<SelectionState>(EMPTY)

  const derivedSelectedIds = useMemo(() => {
    if (state.filterAnchored) {
      return new Set(filteredIds.filter((id) => !state.deselectedIds.has(id)))
    }
    return state.selectedIds
  }, [state, filteredIds])

  const derived = useMemo<DerivedSelection>(() => {
    const count = derivedSelectedIds.size
    const totalVisible = filteredIds.length
    const headerState =
      count === 0 ? 'none'
        : count >= totalVisible && totalVisible > 0 ? 'all'
          : 'some'
    const isMixed = (state.filterAnchored && state.deselectedIds.size > 0) || headerState === 'some'
    return { selectedIds: derivedSelectedIds, count, totalVisible, headerState, isMixed }
  }, [derivedSelectedIds, filteredIds.length, state])

  const isSelected = useCallback(
    (id: number) => derivedSelectedIds.has(id),
    [derivedSelectedIds],
  )

  const explicitFrom = (prev: SelectionState) =>
    prev.filterAnchored
      ? new Set(filteredIds.filter((x) => !prev.deselectedIds.has(x)))
      : new Set(prev.selectedIds)

  const commit = (base: Set<number>, anchor: number | null): SelectionState => ({
    mode: base.size ? 'manual' : 'idle',
    selectedIds: base,
    filterAnchored: false,
    deselectedIds: new Set(),
    lastAnchorId: anchor,
  })

  const toggleOne = useCallback((id: number) => {
    setState((prev) => {
      const base = explicitFrom(prev)
      if (base.has(id)) base.delete(id)
      else base.add(id)
      return commit(base, id)
    })
  }, [filteredIds])

  const selectOne = useCallback((id: number) => {
    setState((prev) => {
      const base = explicitFrom(prev)
      base.add(id)
      return commit(base, id)
    })
  }, [filteredIds])

  const toggleWithCtrl = useCallback((id: number) => {
    setState((prev) => {
      if (prev.filterAnchored) {
        const deselectedIds = new Set(prev.deselectedIds)
        if (deselectedIds.has(id)) deselectedIds.delete(id)
        else deselectedIds.add(id)
        return { ...prev, deselectedIds, lastAnchorId: id }
      }
      const base = new Set(prev.selectedIds)
      if (base.has(id)) base.delete(id)
      else base.add(id)
      return commit(base, id)
    })
  }, [])

  const selectRangeTo = useCallback((id: number, order: number[]) => {
    setState((prev) => {
      const anchor = prev.lastAnchorId ?? id
      const a = order.indexOf(anchor)
      const b = order.indexOf(id)
      if (a === -1 || b === -1) return prev
      const lo = Math.min(a, b)
      const hi = Math.max(a, b)
      const base = explicitFrom(prev)
      for (let i = lo; i <= hi; i++) base.add(order[i])
      return commit(base, id)
    })
  }, [filteredIds])

  const toggleGroup = useCallback((groupIds: number[]) => {
    setState((prev) => {
      const base = explicitFrom(prev)
      const allOn = groupIds.every((id) => base.has(id))
      for (const id of groupIds) {
        if (allOn) base.delete(id)
        else base.add(id)
      }
      return commit(base, groupIds[groupIds.length - 1] ?? null)
    })
  }, [filteredIds])

  const selectAllFiltered = useCallback(() => {
    setState((prev) => {
      const fullyOn = prev.filterAnchored && prev.deselectedIds.size === 0
      if (fullyOn) return EMPTY
      return {
        mode: 'filter',
        selectedIds: new Set(),
        filterAnchored: true,
        deselectedIds: new Set(),
        lastAnchorId: null,
      }
    })
  }, [])

  const clear = useCallback(() => setState(EMPTY), [])

  const api = useMemo<SelectionApi>(
    () => ({
      toggleOne, selectOne, toggleWithCtrl, selectRangeTo, toggleGroup, selectAllFiltered, clear, isSelected,
    }),
    [toggleOne, selectOne, toggleWithCtrl, selectRangeTo, toggleGroup, selectAllFiltered, clear, isSelected],
  )

  return { state, derived, derivedSelectedIds, api }
}
