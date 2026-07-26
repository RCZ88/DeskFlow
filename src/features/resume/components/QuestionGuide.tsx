import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, Lightbulb, ChevronDown } from 'lucide-react';

interface QuestionGuideProps {
  include?: string[];
  exclude?: string[];
  tips?: string[];
  defaultExpanded?: boolean;
}

export function QuestionGuide({ include, exclude, tips, defaultExpanded = true }: QuestionGuideProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const hasContent = (include && include.length > 0) || (exclude && exclude.length > 0) || (tips && tips.length > 0);
  if (!hasContent) return null;

  return (
    <div className="rounded-xl bg-gradient-to-br from-zinc-900/80 to-zinc-800/40 border border-zinc-800/60 overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-zinc-800/20 transition-colors"
      >
        <span className="text-xs font-semibold text-zinc-300">Answer Guide</span>
        <ChevronDown className={`w-3.5 h-3.5 text-zinc-500 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-3">
              {include && include.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-[11px] font-semibold text-emerald-400">Include</span>
                  </div>
                  <ul className="space-y-1">
                    {include.map((item, i) => (
                      <li key={i} className="text-[11px] text-emerald-400/80 leading-relaxed pl-5 relative">
                        <span className="absolute left-0 top-1.5 w-1 h-1 rounded-full bg-emerald-400/50" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {exclude && exclude.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <XCircle className="w-3.5 h-3.5 text-red-400" />
                    <span className="text-[11px] font-semibold text-red-400">Avoid</span>
                  </div>
                  <ul className="space-y-1">
                    {exclude.map((item, i) => (
                      <li key={i} className="text-[11px] text-red-400/80 leading-relaxed pl-5 relative">
                        <span className="absolute left-0 top-1.5 w-1 h-1 rounded-full bg-red-400/50" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {tips && tips.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
                    <span className="text-[11px] font-semibold text-amber-400">Pro Tips</span>
                  </div>
                  <ul className="space-y-1">
                    {tips.map((item, i) => (
                      <li key={i} className="text-[11px] text-amber-400/80 leading-relaxed pl-5 relative">
                        <span className="absolute left-0 top-1.5 w-1 h-1 rounded-full bg-amber-400/50" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
