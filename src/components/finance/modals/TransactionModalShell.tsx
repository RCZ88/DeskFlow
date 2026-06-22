import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check } from 'lucide-react';

export interface TxModalProps {
  open: boolean;
  onClose: () => void;
  walletId: number;
  walletName: string;
  walletCurrency: string;
  accent: string;
  IconComponent: React.FC<{ className?: string }>;
  onSubmit: (data: Record<string, any>) => Promise<boolean>;
}

interface ShellProps {
  open: boolean;
  onClose: () => void;
  accent: string;
  IconComponent: React.FC<{ className?: string }>;
  title: string;
  typeLabel: string;
  children: (props: {
    saving: boolean; setSaving: (v: boolean) => void;
    justAdded: boolean; setJustAdded: (v: boolean) => void;
    resetForm: () => void;
  }) => React.ReactNode;
  onSubmit: () => Promise<boolean>;
  onReset?: () => void;
}

export function TransactionModalShell({ open, onClose, accent, IconComponent, title, typeLabel, children, onSubmit, onReset }: ShellProps) {
  const [saving, setSaving] = useState(false);
  const [justAdded, setJustAdded] = useState(false);
  const resetKey = useState(0)[1];

  const resetForm = () => setJustAdded(false);

  const handleSubmit = async () => {
    setSaving(true);
    const ok = await onSubmit();
    setSaving(false);
    if (ok) {
      setJustAdded(true);
      onReset?.();
      // Auto-clear the "Added!" indicator after 2s
      setTimeout(() => setJustAdded(false), 2000);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[var(--z-modal)] flex items-center justify-center p-5"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-md bg-zinc-900/95 backdrop-blur-xl border border-zinc-700/50 rounded-xl overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="px-5 pt-5 pb-3 border-b border-zinc-700/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${accent}20` }}>
                    <IconComponent className="w-4 h-4" style={{ color: accent }} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white">{title}</h3>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium" style={{ color: accent, backgroundColor: `${accent}15` }}>{typeLabel}</span>
                  </div>
                </div>
                <button onClick={onClose}
                  className="min-h-[44px] min-w-[44px] flex items-center justify-center p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors focus-visible:ring-2 ring-emerald-500/50 ring-offset-2 ring-offset-zinc-950">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-5 space-y-3">
              {children({ saving, setSaving, justAdded, setJustAdded, resetForm })}

              <AnimatePresence>
                {justAdded && (
                  <motion.div
                    initial={{ opacity: 0, y: -4, height: 0 }}
                    animate={{ opacity: 1, y: 0, height: 'auto' }}
                    exit={{ opacity: 0, y: -4, height: 0 }}
                    transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/15 border border-emerald-500/20 text-emerald-400 text-xs font-medium"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Transaction added — form cleared for next entry
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex gap-2 pt-2">
                <button onClick={onClose}
                  className="flex-1 py-2 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white text-sm transition-colors focus-visible:ring-2 ring-emerald-500/50 ring-offset-2 ring-offset-zinc-950">
                  Done
                </button>
                <button onClick={handleSubmit} disabled={saving}
                  className="flex-1 py-2 rounded-lg text-white text-sm font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 focus-visible:ring-2 ring-emerald-500/50 ring-offset-2 ring-offset-zinc-950"
                  style={{ backgroundColor: accent, opacity: saving ? 0.7 : 1 }}>
                  {saving ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    'Add Transaction'
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
