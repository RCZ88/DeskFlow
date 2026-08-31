import { type ComponentPropsWithoutRef, type ReactNode } from "react";
import { ArrowRightIcon } from "lucide-react";
import { cn } from "./cn";
import { Button } from "./Button";

// LAMINAR restyle of Magic UI's BentoGrid (real layout preserved).
// Monochrome: hairline borders + white-only accents (no box-shadow, no hue).
// Mono label 11px uppercase +14% tracking applied to the CTA.
interface BentoGridProps extends ComponentPropsWithoutRef<"div"> {
  children: ReactNode;
  className?: string;
}

const BentoGrid = ({ children, className, ...props }: BentoGridProps) => (
  <div className={cn("grid w-full auto-rows-[22rem] grid-cols-1 gap-4 md:grid-cols-3", className)} {...props}>
    {children}
  </div>
);

interface BentoCardProps extends ComponentPropsWithoutRef<"div"> {
  name: string;
  className: string;
  background: ReactNode;
  Icon: React.ElementType;
  description: string;
  href: string;
  cta: string;
}

const BentoCard = ({
  name,
  className,
  background,
  Icon,
  description,
  href,
  cta,
  ...props
}: BentoCardProps) => (
  <div
    key={name}
    className={cn(
      "group relative col-span-1 flex flex-col justify-between overflow-hidden rounded-[var(--radius-card)]",
      "border border-[var(--hairline)] bg-[var(--surface-1)] backdrop-blur-xl",
      "transition-[border-color,background-color] duration-[var(--dur-normal)] ease-[var(--ease-out-expo)]",
      "hover:border-[var(--hairline-strong)] hover:bg-[var(--surface-2)]",
      className
    )}
    {...props}
  >
    <div className="pointer-events-none absolute inset-0">{background}</div>
    <div className="relative z-10 p-4">
      <div className="pointer-events-none flex transform-gpu flex-col gap-1 transition-all duration-300 lg:group-hover:-translate-y-10">
        <Icon className="h-12 w-12 origin-left text-[var(--text-hi)] transition-transform duration-300 ease-[var(--ease-out-expo)] group-hover:scale-75" />
        <h3 className="text-[15px] font-semibold text-[var(--text-hi)]">{name}</h3>
        <p className="max-w-lg text-[13px] text-[var(--text-mid)]">{description}</p>
      </div>
      <div className="pointer-events-none flex w-full translate-y-0 flex-row items-center transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 lg:hidden">
        <Button variant="outline" size="sm" className="pointer-events-auto p-0">
          <a href={href} className="flex items-center gap-1.5">
            {cta}
            <ArrowRightIcon className="ms-1.5 size-4" />
          </a>
        </Button>
      </div>
    </div>
    <div className="pointer-events-none absolute bottom-0 hidden w-full translate-y-10 flex-row items-center p-4 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 lg:flex">
      <Button variant="outline" size="sm" className="pointer-events-auto p-0">
        <a href={href} className="flex items-center gap-1.5">
          {cta}
          <ArrowRightIcon className="ms-1.5 size-4" />
        </a>
      </Button>
    </div>
  </div>
);

export { BentoCard, BentoGrid };
