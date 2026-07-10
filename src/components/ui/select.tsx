import { Select as SelectPrimitive } from "@base-ui/react/select"
import { cn } from "@/lib/utils"
import { ChevronDownIcon } from "lucide-react"
import type { ReactNode } from "react"

function Select({
  className,
  children,
  ...props
}: SelectPrimitive.Root.Props & { className?: string; children?: ReactNode }) {
  return (
    <SelectPrimitive.Root {...props}>
      <SelectPrimitive.Trigger
        data-slot="select-trigger"
        className={cn(
          "flex h-8 w-full items-center justify-between gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800 px-2.5 py-1 text-sm text-zinc-200 shadow-none transition-colors hover:border-zinc-600 focus-visible:border-indigo-500 focus-visible:ring-2 focus-visible:ring-indigo-500/20 outline-none disabled:cursor-not-allowed disabled:opacity-50 [&_svg:not([class*='size-'])]:size-4",
          className
        )}
      >
        <SelectPrimitive.Value placeholder="Select..." />
        <ChevronDownIcon className="size-4 shrink-0 text-zinc-400" />
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Positioner className="z-50">
          <SelectPrimitive.Popup
            data-slot="select-popup"
            className="min-w-[180px] rounded-lg border border-zinc-700 bg-zinc-900 p-1 text-sm shadow-xl shadow-black/50 backdrop-blur-xl"
          >
            {children}
          </SelectPrimitive.Popup>
        </SelectPrimitive.Positioner>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  )
}

function SelectItem({
  className,
  children,
  ...props
}: SelectPrimitive.Item.Props) {
  return (
    <SelectPrimitive.Item
      data-slot="select-item"
      className={cn(
        "flex cursor-default items-center rounded-md px-2.5 py-1.5 text-sm text-zinc-200 outline-none select-none data-highlighted:bg-zinc-800 data-highlighted:text-white data-disabled:pointer-events-none data-disabled:opacity-50",
        className
      )}
      {...props}
    >
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  )
}

export { Select, SelectItem }
