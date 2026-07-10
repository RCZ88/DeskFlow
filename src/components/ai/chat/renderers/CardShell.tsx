import { type ReactNode } from "react"

export interface CardShellProps {
  icon?: ReactNode
  title: string
  badge?: string
  subtitle?: string
  right?: ReactNode
  children: ReactNode
  className?: string
}

export function CardShell({
  icon,
  title,
  badge,
  subtitle,
  right,
  children,
  className,
}: CardShellProps) {
  return (
    <div className={"dk-inst" + (className ? " " + className : "")}>
      <div className="dk-inst-head">
        <div className="dk-inst-lt">
          {icon ? <span aria-hidden>{icon}</span> : null}
          {title}
        </div>
        {badge ? <span className="dk-badge">{badge}</span> : null}
      </div>
      {(subtitle || right) ? (
        <div className="flex items-center justify-between px-[15px] py-[6px] border-b border-[var(--line)]">
          {subtitle ? <span className="text-[11px] text-[var(--tm)]">{subtitle}</span> : null}
          {right ? <div className="flex items-center gap-2">{right}</div> : null}
        </div>
      ) : null}
      <div className="dk-inst-ib">{children}</div>
    </div>
  )
}
