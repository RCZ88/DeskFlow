import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import type { ValidationIssue } from '../../shared/learn/types';

interface ImportDialogProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export const ImportDialog: React.FC<ImportDialogProps> = ({ open, onClose, children }) => {
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
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed left-1/2 top-1/2 z-50 flex max-h-[85vh] w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xl border border-white/10 bg-[#1c1917] shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-white/10 p-4">
              <h2 className="font-serif text-lg text-zinc-100">Import Lesson</h2>
              <button onClick={onClose} className="text-zinc-400 hover:text-zinc-100 transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
