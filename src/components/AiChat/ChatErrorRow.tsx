import { type FC } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle } from 'lucide-react';
import { MOTION } from '../ai/tokens';

interface ChatErrorRowProps {
  message: string;
  onRetry: () => void;
}

export const ChatErrorRow: FC<ChatErrorRowProps> = ({ message, onRetry }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: MOTION.fast }}
      className="flex items-center gap-3 px-4 py-3"
    >
      <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
      <span className="text-sm text-zinc-400">{message}</span>
      <button
        onClick={onRetry}
        className="ml-auto text-xs font-medium text-pink-400 hover:text-pink-300 transition-colors shrink-0"
      >
        Retry
      </button>
    </motion.div>
  );
};
