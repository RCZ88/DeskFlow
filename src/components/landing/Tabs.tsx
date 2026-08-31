import * as React from "react";
import { cn } from "./cn";

// LAMINAR Tabs — neutral at rest, active earns a white hairline underline + raised surface.
// Mono labels at 11-12px uppercase +14% tracking per the LAMINAR spec.
interface TabsCtx {
  value: string;
  onValueChange: (v: string) => void;
}
const Ctx = React.createContext<TabsCtx | null>(null);

export function Tabs({
  value,
  onValueChange,
  children,
  className,
}: {
  value: string;
  onValueChange: (v: string) => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Ctx.Provider value={{ value, onValueChange }}>
      <div className={className}>{children}</div>
    </Ctx.Provider>
  );
}

export function TabsList({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 rounded-[var(--radius-sm)] border border-[var(--hairline)] bg-[var(--surface-1)] p-1",
        className
      )}
    >
      {children}
    </div>
  );
}

export function TabsTrigger({
  value,
  children,
  className,
}: {
  value: string;
  children: React.ReactNode;
  className?: string;
}) {
  const ctx = React.useContext(Ctx);
  const active = ctx?.value === value;
  return (
    <button
      type="button"
      onClick={() => ctx?.onValueChange(value)}
      className={cn(
        "laminar-label laminar-label--12 rounded-[6px] px-3 py-1.5 transition-[background-color,color] duration-[var(--dur-fast)] ease-[var(--ease-out-expo)]",
        active
          ? "bg-[var(--surface-3)] text-[var(--text-hi)]"
          : "text-[var(--text-mid)] hover:text-[var(--text-hi)] hover:bg-[var(--surface-2)]",
        className
      )}
    >
      {children}
    </button>
  );
}

export function TabsContent({
  value,
  children,
  className,
}: {
  value: string;
  children: React.ReactNode;
  className?: string;
}) {
  const ctx = React.useContext(Ctx);
  if (ctx?.value !== value) return null;
  return <div className={className}>{children}</div>;
}
