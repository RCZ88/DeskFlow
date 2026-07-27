import React from 'react';
import { Home, BookOpen, GraduationCap } from 'lucide-react';
import { motion } from 'framer-motion';

export type LearnView = 'home' | 'library' | 'reader' | 'study';

interface LearnTabBarProps {
  view: LearnView;
  onChange: (view: LearnView) => void;
  activeLessonId: string | null;
}

const tabs = [
  { id: 'home' as LearnView, icon: Home, label: 'Home', shortcut: 'g h' },
  { id: 'library' as LearnView, icon: BookOpen, label: 'Library', shortcut: 'g l' },
  { id: 'study' as LearnView, icon: GraduationCap, label: 'Study', shortcut: 'g s' },
];

export const LearnTabBar: React.FC<LearnTabBarProps> = ({ view, onChange, activeLessonId }) => {
  const isLibraryActive = view === 'library' || view === 'reader';

  return (
    <>
      {/* Desktop Left Rail */}
      <aside className="hidden w-14 shrink-0 flex-col items-center gap-3 border-r border-white/10 py-4 md:flex">
        {tabs.map((tab) => {
          const isActive = tab.id === 'library' ? isLibraryActive : view === tab.id;
          const isDisabled = tab.id === 'study' && !activeLessonId;

          return (
            <button
              key={tab.id}
              onClick={() => !isDisabled && onChange(tab.id)}
              disabled={isDisabled}
              className={`relative flex h-10 w-10 items-center justify-center rounded-lg transition-colors ${
                isActive ? 'text-clay-300' : 'text-zinc-500 hover:text-zinc-200'
              } ${isDisabled ? 'cursor-not-allowed opacity-30' : ''}`}
              title={`${tab.label} (${tab.shortcut})`}
            >
              {isActive && (
                <motion.div
                  layoutId="active-tab-bg"
                  className="absolute inset-0 rounded-lg bg-clay-500/15"
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              )}
              <tab.icon className="relative h-5 w-5" />
              {isLibraryActive && tab.id === 'library' && view === 'reader' && (
                <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-clay-400" />
              )}
            </button>
          );
        })}
      </aside>

      {/* Mobile Bottom Pill Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 flex items-center justify-around border-t border-white/10 bg-[#1c1917]/90 p-2 backdrop-blur-md md:hidden">
        {tabs.map((tab) => {
          const isActive = tab.id === 'library' ? isLibraryActive : view === tab.id;
          const isDisabled = tab.id === 'study' && !activeLessonId;

          return (
            <button
              key={tab.id}
              onClick={() => !isDisabled && onChange(tab.id)}
              disabled={isDisabled}
              className={`flex flex-1 flex-col items-center gap-1 rounded-lg py-1.5 text-[10px] font-medium ${
                isActive ? 'bg-clay-500/15 text-clay-300' : 'text-zinc-500'
              } ${isDisabled ? 'opacity-30' : ''}`}
            >
              <tab.icon className="h-5 w-5" />
              {tab.label}
            </button>
          );
        })}
      </nav>
    </>
  );
};
