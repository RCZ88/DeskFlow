import * as React from "react";
import { cn } from "./cn";

// LAMINAR Button — monochrome. Default = white-ink-on-near-white-invert or
// hairline outline; hover brightens via white-alpha overlay (no hue).
type Variant = "default" | "outline" | "ghost" | "invert";
type Size = "default" | "sm" | "lg" | "icon";

const variantCls: Record<Variant, string> = {
  // filled near-white, ink text — the single "accent" is pure white
  default:
    "bg-[var(--text-hi)] text-[var(--on-invert)] hover:bg-white border border-transparent",
  // hairline only
  outline:
    "border border-[var(--hairline)] text-[var(--text-hi)] hover:border-[var(--hairline-strong)] hover:bg-[var(--surface-1)]",
  ghost:
    "border border-transparent text-[var(--text-mid)] hover:text-[var(--text-hi)] hover:bg-[var(--surface-1)]",
  // inverted faint fill
  invert:
    "bg-[var(--surface-2)] text-[var(--text-hi)] border border-[var(--hairline)] hover:bg-[var(--surface-3)]",
};

const sizeCls: Record<Size, string> = {
  default: "h-9 gap-1.5 px-4 text-[13px]",
  sm: "h-8 gap-1 px-3 text-[12px]",
  lg: "h-10 gap-2 px-6 text-[14px]",
  icon: "size-9",
};

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", type = "button", ...props }, ref) => {
    return (
      <button
        ref={ref}
        type={type}
        className={cn(
          "inline-flex shrink-0 select-none items-center justify-center whitespace-nowrap rounded-[var(--radius-sm)] font-medium",
          "outline-none transition-[background-color,border-color,color,transform,opacity] duration-[var(--dur-fast)] ease-[var(--ease-out-expo)]",
          "active:translate-y-px disabled:pointer-events-none disabled:opacity-40",
          "focus-visible:ring-2 focus-visible:ring-[var(--text-hi)]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-0)]",
          "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
          variantCls[variant],
          sizeCls[size],
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "LandingButton";
