import { motion } from 'framer-motion';
import { type ReactNode } from 'react';
import { easeOutQuint } from './financeMotion';

// Unified page/section header for every finance tab.
// Replaces the legacy SectionHeader so all tabs share one header style
// that matches the Overview design language (emerald icon chip + uppercase title).
interface TabHeaderProps {
  title: string;
  icon?: ReactNode;
  action?: ReactNode;
}

const headerInitial = { opacity: 0, y: 8 };
const headerAnimate = { opacity: 1, y: 0 };
const headerTransition = { duration: 0.25, ease: easeOutQuint };

export function TabHeader({ title, icon, action }: TabHeaderProps) {
  return (
    <motion.div
      initial={headerInitial}
      animate={headerAnimate}
      transition={headerTransition}
      className="flex items-center justify-between gap-3"
    >
      <div className="flex items-center gap-2.5 min-w-0">
        {icon && (
          <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 shrink-0">
            {icon}
          </span>
        )}
        <h2 className="text-[13px] font-semibold tracking-[0.08em] uppercase text-zinc-300 truncate">
          {title}
        </h2>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </motion.div>
  );
}
