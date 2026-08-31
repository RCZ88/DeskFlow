import * as React from "react";
import { cn } from "./cn";

// LAMINAR Card — hairline border instead of shadow, bg-0 canvas, white-only accent.
// No color value exists outside tokens.css; everything reads from var() tokens.
const cardBase =
  "relative rounded-[var(--radius-card)] border border-[var(--hairline)] bg-[var(--surface-1)] " +
  "backdrop-blur-xl text-[var(--text-hi)] transition-[border-color,background-color,transform] " +
  "duration-[var(--dur-normal)] ease-[var(--ease-out-expo)]";

function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn(cardBase, className)} {...props} />;
}
Card.displayName = "LandingCard";

function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col gap-1.5 p-5", className)} {...props} />;
}
CardHeader.displayName = "LandingCardHeader";

// Mono label treatment: 11px uppercase +14% tracking (LAMINAR spec).
function CardLabel({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("laminar-label", className)}
      {...props}
    />
  );
}
CardLabel.displayName = "LandingCardLabel";

function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn(
        "text-[15px] font-semibold leading-tight text-[var(--text-hi)]",
        className
      )}
      {...props}
    />
  );
}
CardTitle.displayName = "LandingCardTitle";

function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn("text-[13px] leading-relaxed text-[var(--text-mid)]", className)} {...props} />
  );
}
CardDescription.displayName = "LandingCardDescription";

function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-5 pt-0", className)} {...props} />;
}
CardContent.displayName = "LandingCardContent";

function CardFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 border-t border-[var(--hairline)] p-5",
        className
      )}
      {...props}
    />
  );
}
CardFooter.displayName = "LandingCardFooter";

export {
  Card,
  CardHeader,
  CardLabel,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
};
