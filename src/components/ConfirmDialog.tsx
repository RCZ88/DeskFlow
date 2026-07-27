import { ConfirmModal } from './workspace/_ds/modal';

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
    <ConfirmModal
      open={true}
      onClose={onCancel}
      onConfirm={onConfirm}
      title={title}
      message={message}
      confirmLabel={confirmLabel}
      danger={danger}
    />
  );
}
