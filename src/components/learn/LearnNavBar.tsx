import React from 'react';
import { BookOpen, User, Keyboard, HelpCircle, ChevronRight } from 'lucide-react';

export interface BreadcrumbSegment {
  label: string;
  view: 'home' | 'library' | 'reader' | 'study';
}

interface LearnNavBarProps {
  breadcrumb: BreadcrumbSegment[];
  onNavigate: (view: BreadcrumbSegment['view']) => void;
  onOpenProfile: () => void;
  onOpenHelp: () => void;
  onOpenShortcuts?: () => void;
}

export const LearnNavBar: React.FC<LearnNavBarProps> = ({
  breadcrumb,
  onNavigate,
  onOpenProfile,
  onOpenHelp,
  onOpenShortcuts,
}) => {
  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between border-b border-white/10 bg-[#1c1917]/80 px-4 backdrop-blur-md md:px-6">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 rounded-md bg-clay-500/10 p-1.5 text-clay-400">
          <BookOpen className="h-4 w-4" />
        </div>
        
      </div>

      <nav className="hidden flex-1 items-center justify-center gap-2 md:flex">
        {breadcrumb.map((seg, i) => {
          const isLast = i === breadcrumb.length - 1;
          return (
            <React.Fragment key={i}>
              <button
                onClick={() => !isLast && onNavigate(seg.view)}
                className={`flex items-center font-mono text-xs uppercase tracking-wider transition-colors ${
                  isLast ? 'text-clay-300 font-medium' : 'text-zinc-400 hover:text-zinc-200 hover:underline'
                }`}
                title={seg.label}
              >
                <span className="max-w-[200px] truncate">{seg.label}</span>
              </button>
              {!isLast && <ChevronRight className="h-3 w-3 text-zinc-600" />}
            </React.Fragment>
          );
        })}
      </nav>

      <div className="flex items-center gap-1">
        <button
          onClick={onOpenProfile}
          className="flex h-8 w-8 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-white/5 hover:text-zinc-100"
          title="Profile"
        >
          <User className="h-4 w-4" />
        </button>
        <button
          onClick={onOpenHelp}
          className="flex h-8 w-8 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-white/5 hover:text-zinc-100"
          title="How it works"
        >
          <HelpCircle className="h-4 w-4" />
        </button>
        <button
          onClick={onOpenShortcuts || onOpenHelp}
          className="flex h-8 w-8 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-white/5 hover:text-zinc-100"
          title="Keyboard shortcuts"
        >
          <Keyboard className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
};
