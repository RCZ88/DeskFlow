import { ModalOverlay } from './ModalOverlay';
import { GlassCard } from './GlassCard';

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  className?: string;
}

export function ConfirmDialog({ title, message, confirmLabel = 'Confirm', danger, onConfirm, onCancel, className = '' }: ConfirmDialogProps) {
  return (
    <ModalOverlay onClose={onCancel}>
      <GlassCard variant="elevated" className={`max-w-[400px] ${className}`}>
        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-2">{title}</h3>
        <p className="text-xs text-[var(--text-secondary)] mb-5">{message}</p>
        <div className="flex justify-end gap-2">
          <button onClick={onCancel} className="px-3 py-1.5 rounded-lg text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors duration-150">
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-colors duration-150 ${
              danger ? 'bg-[var(--error)] hover:bg-red-500' : 'bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)]'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </GlassCard>
    </ModalOverlay>
  );
}
