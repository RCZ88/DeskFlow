import React from 'react'
import { useStudio } from '../../state/StudioProvider'
import { StudioSidebar } from './StudioSidebar'
import { StudioWorkspace } from './StudioWorkspace'
import { StudioInspector } from './StudioInspector'

export function StudioShell() {
  const { state } = useStudio()
  const { sidebarCollapsed, inspectorCollapsed } = state.ui
  return (
    <div className="flex h-full min-h-0 overflow-hidden">
      {!sidebarCollapsed && <StudioSidebar />}
      <StudioWorkspace />
      {!inspectorCollapsed && <StudioInspector />}
    </div>
  )
}
