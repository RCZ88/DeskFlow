import { useState } from "react"
import { Plug } from "lucide-react"
import { CardShell } from "./CardShell"
import type { CardAction, ConnectorStatusItem } from "../parsed"

export function ConnectorStatusCard({
  connectors,
  onAction,
  syncing,
}: {
  connectors: ConnectorStatusItem[]
  onAction?: (a: CardAction) => void
  syncing?: Record<string, true>
}) {
  const [localSync, setLocalSync] = useState<Record<string, true>>({})
  return (
    <CardShell title="Connectors" badge="connector_status" accent="cyan" icon={<Plug size={14} />} subtitle={connectors.length + " configured"}>
      {connectors.map((c, i) => {
        const busy = syncing?.[c.name] || localSync[c.name] || c.status === "syncing"
        return (
          <div className="dk-conn" key={(c.id || c.name) + i}>
            <div className="dk-conn-l">
              <span className={"dk-sdot " + (c.status === "error" ? "dk-off" : "dk-ok")} />
              <div>
                <div className="dk-conn-nm">{c.name}</div>
                <div className="dk-conn-st">
                  {c.status}{c.lastSync ? " · synced " + c.lastSync : ""}
                  {typeof c.itemsCount === "number" ? " · " + c.itemsCount + " items" : ""}
                </div>
              </div>
            </div>
            <button
              className="dk-btn dk-ghost dk-mini"
              disabled={busy}
              onClick={() => {
                setLocalSync((p) => ({ ...p, [c.name]: true }))
                onAction?.({ kind: "sync-connector", id: c.id, name: c.name })
              }}
            >
              {busy ? "…" : "Sync"}
            </button>
          </div>
        )
      })}
    </CardShell>
  )
}
