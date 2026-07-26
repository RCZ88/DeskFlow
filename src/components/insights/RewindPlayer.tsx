import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, Share2, Palette } from 'lucide-react';
import { InsightCard } from './InsightCard';
import { ShareCard } from './ShareCard';
import { REWIND_THEMES, REWIND_THEME_MAP, loadRewindTheme, saveRewindTheme } from './rewind-themes';
import type { RewindTheme } from './rewind-themes';
import type { InsightAtom } from '../../shared/insights';

interface RewindPlayerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function RewindPlayer({ isOpen, onClose }: RewindPlayerProps) {
  const [rewind, setRewind] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [showShare, setShowShare] = useState(false);
  const [themeId, setThemeId] = useState<string>(loadRewindTheme);
  const [showThemePicker, setShowThemePicker] = useState(false);
  const api = window.deskflowAPI;

  const theme: RewindTheme = REWIND_THEME_MAP[themeId] || REWIND_THEME_MAP.midnight;

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    setCurrentIdx(0);
    setShowShare(false);
    setShowThemePicker(false);

    const now = new Date();
    const periodKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    if (api?.getRewind) {
      api.getRewind(periodKey).then((data: any) => {
        setRewind(data);
        setLoading(false);
      }).catch(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [isOpen]);

  const insights: InsightAtom[] = rewind?.insights || [];
  const current: InsightAtom | undefined = insights[currentIdx];

  const goNext = useCallback(() => {
    if (currentIdx < insights.length - 1) {
      setCurrentIdx(i => i + 1);
      setShowShare(false);
    }
  }, [currentIdx, insights.length]);

  const goPrev = useCallback(() => {
    if (currentIdx > 0) {
      setCurrentIdx(i => i - 1);
      setShowShare(false);
    }
  }, [currentIdx]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); goNext(); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); goPrev(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, goNext, goPrev, onClose]);

  const handleThemeChange = (id: string) => {
    setThemeId(id);
    saveRewindTheme(id);
    setShowThemePicker(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black z-[9999]" onClick={(e) => e.stopPropagation()}>
      <div className={`relative w-full h-full flex flex-col overflow-hidden transition-colors duration-500 ${theme.headerBg}`} style={{ background: theme.bgHex }}>
        {/* Header */}
        <div className={`flex items-center justify-between px-6 py-4 border-b flex-shrink-0 transition-colors duration-300`} style={{ borderColor: theme.borderHex }}>
          <div className="flex items-center gap-3">
            <span className={`text-sm font-semibold ${theme.headline}`}>Your Rewind</span>
            {rewind?.period && (
              <span className={`text-xs px-2.5 py-1 rounded-full ${theme.accentBg} ${theme.label}`}>{rewind.period}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* Theme picker */}
            <div className="relative">
              <button
                onClick={() => setShowThemePicker(s => !s)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg transition-all ${theme.accentBg} ${theme.label} hover:opacity-80`}
                title="Change theme"
              >
                <Palette className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{theme.name}</span>
              </button>
              <AnimatePresence>
                {showThemePicker && (
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.95 }}
                    transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                    className="absolute right-0 top-full mt-2 z-50 rounded-xl border p-2 min-w-[200px] shadow-2xl"
                    style={{ background: theme.bgHex, borderColor: theme.borderHex }}
                  >
                    <div className={`text-[10px] uppercase tracking-wider font-semibold px-2 py-1.5 mb-1 ${theme.muted}`}>
                      Card Theme
                    </div>
                    {REWIND_THEMES.map(t => (
                      <button
                        key={t.id}
                        onClick={() => handleThemeChange(t.id)}
                        className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-all ${
                          t.id === themeId
                            ? `${t.accentBg} ${t.accent}`
                            : `hover:bg-white/5 ${theme.subtext}`
                        }`}
                      >
                        <span className="text-base">{t.icon}</span>
                        <span className="text-xs font-medium">{t.name}</span>
                        {t.id === themeId && (
                          <div className={`ml-auto w-1.5 h-1.5 rounded-full ${t.accent.replace('text-', 'bg-')}`} />
                        )}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {current && current.shareable && (
              <button
                onClick={() => setShowShare(s => !s)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg transition-all ${theme.accentBg} ${theme.label} hover:opacity-80`}
              >
                <Share2 className="w-3.5 h-3.5" />
                Share
              </button>
            )}
            <button
              onClick={onClose}
              className={`p-2 rounded-lg transition-colors ${theme.muted} hover:opacity-80`}
              style={{ background: 'rgba(255,255,255,0.03)' }}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="px-6 flex-shrink-0">
          <div className="flex gap-1 h-0.5">
            {insights.map((_, i) => (
              <div
                key={i}
                className={`flex-1 rounded-full transition-all duration-300 ${
                  i <= currentIdx ? theme.progressFill : theme.progressBg
                }`}
              />
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex items-center justify-center overflow-hidden p-6">
          {loading ? (
            <div className="flex flex-col items-center gap-3">
              <div className={`w-8 h-8 border-2 rounded-full animate-spin ${theme.spinner}`} />
              <span className={`text-sm ${theme.muted}`}>Building your rewind...</span>
            </div>
          ) : !current ? (
            <div className="text-center">
              <p className={`text-lg ${theme.subtext}`}>No insights for this period yet</p>
              <p className={`text-sm mt-1 ${theme.muted}`}>Keep tracking to unlock your rewind</p>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={current.id}
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -40 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className="w-full max-w-lg"
              >
                {showShare ? (
                  <ShareCard atom={current} width={400} themeId={themeId} />
                ) : (
                  <InsightCard atom={current} themeId={themeId} />
                )}
              </motion.div>
            </AnimatePresence>
          )}
        </div>

        {/* Navigation */}
        {!loading && insights.length > 0 && (
          <div className={`flex items-center justify-between px-6 py-4 border-t flex-shrink-0 transition-colors duration-300`} style={{ borderColor: theme.borderHex }}>
            <button
              onClick={goPrev}
              disabled={currentIdx === 0}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${theme.subtext} hover:opacity-80`}
            >
              <ChevronLeft className="w-4 h-4" />
              Prev
            </button>

            <div className="flex items-center gap-2">
              <span className={`text-xs ${theme.muted}`}>
                {currentIdx + 1} / {insights.length}
              </span>
            </div>

            <button
              onClick={goNext}
              disabled={currentIdx === insights.length - 1}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${theme.subtext} hover:opacity-80`}
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
