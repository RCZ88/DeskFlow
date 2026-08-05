import type { CanvasCard as CanvasCardType } from '../../../types/canvas'
import type { DynamicUIComponent } from '../../../types/dynamicUI'
import { DynamicCardRenderer } from './DynamicCardRenderer'

interface DynamicCardProps {
  card: CanvasCardType
  onDismiss?: (id: string) => void
  onAction?: (id: string, actionId: string) => void
}

export function DynamicCard({ card, onDismiss, onAction }: DynamicCardProps) {
  const comp: DynamicUIComponent | undefined = card.data?.dynamicComponent
  if (!comp) return <div className="p-4 text-xs text-zinc-500">No component data</div>

  return (
    <DynamicCardRenderer
      component={comp}
      onDismiss={onDismiss}
      onAction={onAction}
    />
  )
}
