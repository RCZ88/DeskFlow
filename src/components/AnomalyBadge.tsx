import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';

interface Anomaly {
  severity: 'low' | 'medium' | 'high';
  detail: string;
}

interface AnomalyBadgeProps {
  anomalies: Anomaly[];
  loading: boolean;
  onDismiss: () => void;
}

export function AnomalyBadge({ anomalies, loading, onDismiss }: AnomalyBadgeProps) {
  const hasHigh = anomalies.some(a => a.severity === 'high');
  const count = anomalies.length;

  if (loading || count === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.8 }}
        className="relative"
      >
        <button
          onClick={onDismiss}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium transition-colors"
          style={{
            backgroundColor: hasHigh ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)',
            color: hasHigh ? '#ef4444' : '#f59e0b',
            border: `1px solid ${hasHigh ? 'rgba(239, 68, 68, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
          }}
          title={anomalies.map(a => a.detail).join('\n')}
        >
          <AlertTriangle className="w-3 h-3" />
          <span>{count} anomaly{count !== 1 ? 'ies' : 'y'}</span>
          <X className="w-2.5 h-2.5 opacity-60" />
        </button>
      </motion.div>
    </AnimatePresence>
  );
}
