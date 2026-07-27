import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles } from 'lucide-react';
import { IntentLibrary } from './IntentLibrary';

interface IntentLibraryPanelProps {
  open: boolean;
  onClose: () => void;
  onGenerate: (intent: any) => void;
}

export const IntentLibraryPanel: React.FC<IntentLibraryPanelProps> = ({ open, onClose, onGenerate }) => {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed right-0 top-0 z-50 flex h-full w-[480px] max-w-[90vw] flex-col border-l border-white/10 bg-[#1c1917]/95 backdrop-blur-md"
          >
            <div className="flex items-center justify-between border-b border-white/10 p-4">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-clay-400" />
                <h2 className="font-serif text-xl text-zinc-100">Saved Ideas</h2>
              </div>
              <button onClick={onClose} className="text-zinc-400 hover:text-zinc-100 transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <IntentLibrary onGenerateFromIntent={onGenerate} />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
