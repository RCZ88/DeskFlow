// Shared 4-state view for every data-driven canvas card (RESULT.md R2/R4).
// Enforces Empty / Loading / Error / Populated coverage with one component.
// Populated content is passed as children; all other states are configured
// via props so cards never ship a bare text fallback.
import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Skeleton } from '../../../ui/skeleton'

export type ViewState = 'empty' | 'loading' | 'error' | 'populated'
export type LoadingShape = 'list' | 'text' | 'chart'

interface StateViewProps {
  state: ViewState
  emptyProps?: {
    icon: LucideIcon
    title: string
    description?: string
    ctaLabel?: string
    onCta?: () => void
  }
  errorProps?: { message: string; onRetry?: () => void }
  loadingType?: LoadingShape
  children: ReactNode
}

const LOADING_SHAPES: Record<LoadingShape, ReactNode[]> = {
  list: [
    <Skeleton key="l1" className="h-8 w-full" />,
    <Skeleton key="l2" className="h-8 w-full" />,
    <Skeleton key="l3" className="h-8 w-3/4" />,
  ],
  text: [
    <Skeleton key="t1" className="h-4 w-full" />,
    <Skeleton key="t2" className="h-4 w-5/6" />,
    <Skeleton key="t3" className="h-4 w-4/6" />,
  ],
  chart: [
    <Skeleton key="c1" className="h-32 w-full" />,
    <Skeleton key="c2" className="h-8 w-full" />,
    <Skeleton key="c3" className="h-8 w-full" />,
  ],
}

export function StateView({ state, emptyProps, errorProps, loadingType = 'list', children }: StateViewProps) {
  if (state === 'loading') {
    return (
      <div className="dk-state-loading">
        {LOADING_SHAPES[loadingType].map((s, i) => (
          <div key={i} className="dk-state-skeleton-row">{s}</div>
        ))}
      </div>
    )
  }

  if (state === 'error') {
    const Icon = emptyProps?.icon
    return (
      <div className="dk-state dk-state-error">
        {Icon && (
          <div className="dk-state-icon">
            <Icon size={16} />
          </div>
        )}
        <div className="dk-state-title">Couldn't load this card</div>
        <div className="dk-state-message">{errorProps?.message || 'Something went wrong.'}</div>
        {errorProps?.onRetry && (
          <button className="dk-state-cta" onClick={errorProps.onRetry}>Try again</button>
        )}
      </div>
    )
  }

  if (state === 'empty') {
    const Icon = emptyProps?.icon
    return (
      <div className="dk-state">
        {Icon && (
          <div className="dk-state-icon">
            <Icon size={16} />
          </div>
        )}
        <div className="dk-state-title">{emptyProps?.title || 'Nothing here yet'}</div>
        {emptyProps?.description && <div className="dk-state-message">{emptyProps.description}</div>}
        {emptyProps?.ctaLabel && emptyProps?.onCta && (
          <button className="dk-state-cta" onClick={emptyProps.onCta}>{emptyProps.ctaLabel}</button>
        )}
      </div>
    )
  }

  return <>{children}</>
}