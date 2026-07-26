/**
 * Recent Chat History — Last N Messages Display
 * 
 * Shows recent messages from active session with:
 * - Timestamps and role indicators
 * - Message previews (expandable)
 * - Delete/Copy buttons
 * - Metadata display
 * 
 * Location: src/components/context-ui/RecentChatHistory.tsx
 */

import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Trash2, Copy, MessageCircle } from 'lucide-react';

import type { RecentChatHistoryProps, RAGMessage } from '@/types/context';

// ──────────────────────────────────────────────────────────────
// Message Row Component
// ──────────────────────────────────────────────────────────────

interface MessageRowProps {
  message: RAGMessage;
  onSelect: () => void;
  onDelete: () => Promise<void>;
  onCopy: () => void;
}

const MessageRow: React.FC<MessageRowProps> = ({ message, onSelect, onDelete, onCopy }) => {
  const [expanded, setExpanded] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await onDelete();
    } finally {
      setDeleting(false);
    }
  };

  const roleColor = message.role === 'assistant' ? 'text-indigo-400' : 'text-emerald-400';
  const roleLabel = message.role === 'assistant' ? 'Assistant' : 'User';
  const preview = message.content.substring(0, 150);
  const hasMore = message.content.length > 150;

  return (
    <div className="border-t border-gray-700">
      {/* Row */}
      <div className="flex items-start gap-2 px-3 py-2 hover:bg-gray-700/50 transition-colors">
        {/* Expand button */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="p-1 hover:bg-gray-600 rounded transition-colors flex-shrink-0 mt-0.5"
        >
          {expanded ? (
            <ChevronDown size={14} className="text-gray-400" />
          ) : (
            <ChevronRight size={14} className="text-gray-400" />
          )}
        </button>

        {/* Role indicator */}
        <div className={`${roleColor} p-1 rounded flex-shrink-0 mt-0.5`}>
          <MessageCircle size={12} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <span className={`text-xs font-semibold ${roleColor}`}>{roleLabel}</span>
            <span className="text-xs text-gray-500">{message.timestamp.toLocaleTimeString()}</span>
            {message.metadata?.category && (
              <span className="text-xs px-1.5 py-0.5 bg-gray-700 text-gray-300 rounded">
                {message.metadata.category}
              </span>
            )}
          </div>
          <p className="text-xs text-gray-300 mt-1 line-clamp-2">{preview}</p>
          {hasMore && <p className="text-xs text-gray-600 mt-0.5">...</p>}
        </div>

        {/* Token count */}
        <div className="text-right flex-shrink-0">
          <p className="text-xs font-mono text-gray-500">{message.tokens} tokens</p>
        </div>

        {/* Actions */}
        <div className="flex gap-1 flex-shrink-0">
          <button
            onClick={onCopy}
            className="p-1 hover:bg-gray-600 rounded transition-colors"
            title="Copy to clipboard"
          >
            <Copy size={12} className="text-gray-400" />
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="p-1 hover:bg-red-600/50 rounded transition-colors disabled:opacity-50"
            title="Delete message"
          >
            <Trash2 size={12} className="text-gray-400 hover:text-red-400" />
          </button>
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="px-12 py-3 bg-gray-700/30 border-t border-gray-700 space-y-2">
          {/* Full content */}
          <div>
            <p className="text-xs text-gray-400 mb-1">Content:</p>
            <p className="text-xs text-gray-300 whitespace-pre-wrap break-words">{message.content}</p>
          </div>

          {/* Metadata */}
          {message.metadata && (
            <div className="pt-2 border-t border-gray-600 space-y-1">
              <p className="text-xs text-gray-400">Metadata:</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {message.metadata.productArea && (
                  <div>
                    <span className="text-gray-500">Product Area:</span>
                    <p className="text-gray-300">{message.metadata.productArea}</p>
                  </div>
                )}
                {message.metadata.agentName && (
                  <div>
                    <span className="text-gray-500">Agent:</span>
                    <p className="text-gray-300">{message.metadata.agentName}</p>
                  </div>
                )}
                {message.metadata.problemId && (
                  <div>
                    <span className="text-gray-500">Problem:</span>
                    <p className="text-gray-300">#{message.metadata.problemId}</p>
                  </div>
                )}
                {message.metadata.requestId && (
                  <div>
                    <span className="text-gray-500">Request:</span>
                    <p className="text-gray-300">#{message.metadata.requestId}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ──────────────────────────────────────────────────────────────
// Recent Chat History Component
// ──────────────────────────────────────────────────────────────

export const RecentChatHistory: React.FC<RecentChatHistoryProps> = ({
  messages,
  limit = 5,
  onSelectMessage,
  onDelete,
}) => {
  // Show only most recent N messages
  const displayMessages = messages.slice(0, limit).reverse();

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content);
  };

  if (messages.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-center">
        <div>
          <MessageCircle size={24} className="mx-auto mb-2 text-gray-600" />
          <p className="text-gray-400 text-sm">No messages in this session</p>
          <p className="text-gray-600 text-xs mt-1">Start a chat to see history here</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Summary */}
      <div className="px-3 py-2 bg-gray-700/30 rounded border border-gray-700 text-xs">
        <p className="text-gray-300">
          Showing <span className="font-semibold text-emerald-400">{displayMessages.length}</span> of{' '}
          <span className="font-semibold">{messages.length}</span> recent messages
        </p>
      </div>

      {/* Messages */}
      <div className="border border-gray-700 rounded-lg overflow-hidden">
        {displayMessages.map(message => (
          <MessageRow
            key={message.id}
            message={message}
            onSelect={() => onSelectMessage(message.id)}
            onDelete={() => onDelete(message.id)}
            onCopy={() => handleCopy(message.content)}
          />
        ))}
      </div>
    </div>
  );
};

export default RecentChatHistory;
