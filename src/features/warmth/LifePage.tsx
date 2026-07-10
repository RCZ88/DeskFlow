import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HeartHandshake, Images } from 'lucide-react';
import CovenantPage from '../covenant/CovenantPage';
import MemoriesPage from '../memories/MemoriesPage';

const TABS = [
  { key: 'covenant', label: 'Covenant', icon: HeartHandshake, accent: '#e8866b' },
  { key: 'memories', label: 'Memories', icon: Images, accent: '#6fb38f' },
] as const;

type TabKey = typeof TABS[number]['key'];

const crossfade = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.2, ease: [0.16, 1, 0.3, 1] as const },
};

const pillTransition = { type: 'spring' as const, stiffness: 400, damping: 32 };

export default function LifePage() {
  const [activeTab, setActiveTab] = useState<TabKey>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get('tab');
      if (tab === 'memories') return tab;
    } catch { /* ignore */ }
    return 'covenant';
  });

  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('tab', activeTab);
      window.history.replaceState({}, '', url.toString());
    } catch { /* ignore */ }
  }, [activeTab]);

  const activeConfig = TABS.find(t => t.key === activeTab) || TABS[0];
  const iconWrapStyle = { background: `${activeConfig.accent}22` };
  const iconStyle = { color: activeConfig.accent };

  return (
    <div className="flex flex-col h-full" data-page={activeTab}>
      <div className="sticky top-0 z-30 -mx-5 px-5 bg-zinc-900/20 backdrop-blur-md border-b border-zinc-800/50">
        <div className="flex items-center gap-1 py-2">
          <div className="h-9 w-9 rounded-xl grid place-items-center mr-2" style={iconWrapStyle}>
            <activeConfig.icon className="w-5 h-5" style={iconStyle} />
          </div>
          <span className="text-lg font-semibold mr-4 text-[var(--text-primary)]">Life</span>
          <div className="flex gap-1 bg-zinc-800/50 p-0.5 rounded-lg">
            {TABS.map(tab => {
              const pillStyle = { background: `${tab.accent}22`, border: `1px solid ${tab.accent}40` };
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`relative px-3 py-1.5 text-xs rounded-md transition-colors min-h-[36px] flex items-center gap-1.5 ${
                    activeTab === tab.key ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  {activeTab === tab.key && (
                    <motion.div
                      layoutId="life-tab-pill"
                      className="absolute inset-0 rounded-md"
                      style={pillStyle}
                      transition={pillTransition}
                    />
                  )}
                  <tab.icon className="w-3.5 h-3.5 relative z-10" />
                  <span className="relative z-10 font-medium">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-auto p-5">
        <AnimatePresence mode="wait">
          {activeTab === 'covenant' && (
            <motion.div
              key="covenant"
              initial={crossfade.initial}
              animate={crossfade.animate}
              exit={crossfade.exit}
              transition={crossfade.transition}
              className="max-w-3xl mx-auto"
            >
              <CovenantPage embedded />
            </motion.div>
          )}
          {activeTab === 'memories' && (
            <motion.div
              key="memories"
              initial={crossfade.initial}
              animate={crossfade.animate}
              exit={crossfade.exit}
              transition={crossfade.transition}
              className="max-w-4xl mx-auto"
            >
              <MemoriesPage embedded />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
