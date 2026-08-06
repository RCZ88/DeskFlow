"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

const alertVariants = {
  default: "border-border bg-background text-foreground",
  info: "border-sky-500/25 bg-sky-500/5 text-sky-300",
  warning: "border-amber-500/25 bg-amber-500/5 text-amber-300",
  destructive: "border-rose-500/25 bg-rose-500/5 text-rose-300",
} as const

function Alert({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<"div"> & { variant?: keyof typeof alertVariants }) {
  return (
    <div
      data-slot="alert"
      role="alert"
      className={cn(
        "relative w-full rounded-lg border px-3 py-2.5 text-sm [&>svg]:absolute [&>svg]:left-3 [&>svg]:top-3 [&>svg]:size-4 [&>svg]:translate-y-[1px] [&>svg~*]:pl-7",
        alertVariants[variant],
        className
      )}
      {...props}
    />
  )
}

function AlertTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-title"
      className={cn("mb-0.5 text-[13px] font-medium leading-none", className)}
      {...props}
    />
  )
}

function AlertDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-description"
      className={cn("text-[12px] leading-relaxed opacity-80", className)}
      {...props}
    />
  )
}

export { Alert, AlertDescription, AlertTitle }
