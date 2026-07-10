import { type FC, useState, useEffect, useCallback, useRef } from 'react';
import { AnimatePresence } from 'framer-motion';
import { ChatHeader } from './ChatHeader';
import { MessageList } from './MessageList';
import { MessageBubble } from './MessageBubble';
import { ChatInput } from './ChatInput';
import type { ChatInputHandle } from './ChatInput';
import { ChatEmptyState } from './ChatEmptyState';
import { ChatErrorRow } from './ChatErrorRow';
import { BlockRenderer } from './BlockRenderer';
import { TypewriterText } from './TypewriterText';
import { ThinkingIndicator } from './ThinkingIndicator';
import { AgentProgressBar } from './AgentProgressBar';
import { parseStructuredResponse } from '../../services/parseBlocks';
import type { ParsedResponse } from '../../services/wireFormat';
import { aiAgentService } from '../../services/ai';
import { useNavigate } from 'react-router-dom';
import { navigateTo } from '../../lib/deepNav';
import { useVoiceInput } from '../../hooks/useVoiceInput';
import type { ACCENT } from '../ai/tokens';
import type { ConnectorConfig } from '../../types/connectors';
import * as chatPersistence from '../../services/chatPersistence';
import type { ChatMessage } from '../../services/chatPersistence';

type Props = {
  today?: string;
  onConfigure?: () => void;
  providerBadge?: { label: string; color: string } | null;
};

let idCounter = 0;
function nextId(): string { return `msg_${Date.now()}_${++idCounter}`; }

function badgeToProvider(badge: { label: string; color: string } | null): { label: string; model: string; accent: 'violet' | 'pink' | 'emerald' | 'amber' | 'red' } | null {
  if (!badge) return null;
  const parts = badge.label.split(' · ');
  return { label: parts[0], model: parts[1] ?? '', accent: 'violet' };
}

const INBOX_RE = /\b(inbox|email|unread|meeting|calendar|schedule)\b/i;

export const AiChat: FC<Props> = ({ today: todayProp, onConfigure, providerBadge }) => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [typingId, setTypingId] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ round: number; totalRounds: number; toolName?: string; toolArgs?: Record<string, any>; status: 'thinking' | 'executing' | 'completed' | 'error'; message?: string; streamedContent?: string } | null>(null);
  const [streamedContent, setStreamedContent] = useState('');
  const [chatError, setChatError] = useState<string | null>(null);
  const [inputOverride, setInputOverride] = useState<string | null>(null);
  const [connectors, setConnectors] = useState<ConnectorConfig[]>([]);
  const threadIdRef = useRef<string>('');
  const lastUserMessageRef = useRef<string>('');
  const isLoadedRef = useRef(false);

  const inputRef = useRef<ChatInputHandle>(null);

  const voice = useVoiceInput({
    onTranscript: (finalText) => {
      inputRef.current?.appendText(finalText + ' ');
    },
  });

  const handleTypingDone = useCallback(() => setTypingId(null), []);

  useEffect(() => {
    const api = (window as any).deskflowAPI;
    if (api?.connectors?.list) {
      api.connectors.list().then((r: any) => {
        if (r?.connectors) setConnectors(r.connectors);
      }).catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (isLoadedRef.current) return;
    isLoadedRef.current = true;

    const activeId = chatPersistence.loadActiveThreadId();
    if (activeId) {
      const saved = chatPersistence.loadThread(activeId);
      if (saved.length > 0) {
        threadIdRef.current = activeId;
        setMessages(saved);
        setIsLoaded(true);
        return;
      }
    }

    const greeting = parseStructuredResponse("Hello! I'm your AI assistant. I can access your goals, projects, activities, sleep data, and more.");
    const initial: ChatMessage[] = [{
      id: nextId(), role: 'assistant',
      content: "Hello! I'm your AI assistant. I can access your goals, projects, activities, sleep data, and more.",
      parsed: greeting,
      timestamp: Date.now(),
    }];
    setMessages(initial);
    threadIdRef.current = chatPersistence.createThread(initial);
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (!isLoaded || !threadIdRef.current) return;
    chatPersistence.saveThread(threadIdRef.current, messages);
  }, [isLoaded, messages]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'M') {
        e.preventDefault();
        if (voice.state === 'listening') voice.stop();
        else voice.start();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [voice]);

  useEffect(() => {
    aiAgentService.setProgressCallback((progressData) => {
      setProgress(progressData);
      if (progressData.streamedContent) {
        setStreamedContent(progressData.streamedContent);
      }
    });
    return () => { aiAgentService.clearProgressCallback(); };
  }, []);

  const addMessage = useCallback((role: 'user' | 'assistant', content: string) => {
    const parsed = parseStructuredResponse(content);
    const msg: ChatMessage = { id: nextId(), role, content, parsed, timestamp: Date.now() };
    setMessages(prev => [...prev, msg]);
    return msg;
  }, []);

  const handleSend = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setChatError(null);

    const pendingConfirm = aiAgentService.getPendingConfirm();

    if (pendingConfirm) {
      const confirmed = /^(yes|yeah|confirm|go ahead|do it|sure|ok|okay)$/i.test(trimmed);
      const cancelled = /^(no|nope|cancel|never mind|stop|don't|dont)$/i.test(trimmed);

      if (cancelled) {
        aiAgentService.resolveConfirm(false);
        addMessage('assistant', 'Cancelled.');
        setIsThinking(false);
        setProgress(null);
        setStreamedContent('');
        return;
      }

      if (confirmed) {
        addMessage('user', trimmed);
        aiAgentService.resolveConfirm(true);
        return;
      }
    }

    if (isThinking) return;

    addMessage('user', trimmed);

    const needsConnectorContext = INBOX_RE.test(trimmed);
    if (needsConnectorContext) {
      try {
        const api = (window as any).deskflowAPI;
        if (api?.connectors?.list) {
          const r = await api.connectors.list();
          if (r?.connectors?.length) {
            const lines: string[] = [];
            for (const c of r.connectors) {
              const items = await api.connectors.items(c.id, { limit: 10 });
              if (items?.items?.length) {
                lines.push(`\n### ${c.displayName || c.provider}`);
                for (const item of items.items) {
                  lines.push(`- ${item.itemType === 'event' ? '\uD83D\uDCC5' : '\uD83D\uDCE7'} **${item.subject}** (${item.date})${item.summary ? ' \u2014 ' + item.summary.slice(0, 120) : ''}`);
                }
              }
            }
            if (lines.length > 0) {
              aiAgentService.injectContext(`\n## Recent Connector Items\n${lines.join('\n')}\n`);
            }
          }
        }
      } catch {}
    }

    setIsThinking(true);
    lastUserMessageRef.current = trimmed;
    setProgress({ round: 0, totalRounds: aiAgentService.getConfig().maxRounds, status: 'thinking', message: 'Starting AI response...' });

    try {
      const response = await aiAgentService.processMessage(trimmed);
      setStreamedContent('');
      const msg = addMessage('assistant', response);
      setTypingId(msg.id);
    } catch (err: unknown) {
      setStreamedContent('');
      setChatError(err instanceof Error ? err.message : 'Something went wrong. Please check your AI provider settings and try again.');
    }

    if (threadIdRef.current && messages.length > 0) {
      const firstUser = messages.find(m => m.role === 'user');
      if (firstUser) {
        chatPersistence.saveThread(threadIdRef.current, messages, firstUser.content.slice(0, 60));
      }
    }

    setIsThinking(false);
    setProgress(null);
  }, [isThinking, addMessage, messages]);

  const handleRetry = useCallback(() => {
    if (lastUserMessageRef.current) {
      handleSend(lastUserMessageRef.current);
    }
  }, [handleSend]);

  const handleReset = useCallback(() => {
    aiAgentService.resetConversation();
    setChatError(null);
    setStreamedContent('');

    if (threadIdRef.current) {
      chatPersistence.resetThread(threadIdRef.current);
    }

    const greeting = parseStructuredResponse("Hello! I'm your AI assistant. I can access your goals, projects, activities, sleep data, and more.");
    const initial: ChatMessage[] = [{
      id: nextId(), role: 'assistant',
      content: "Hello! I'm your AI assistant. I can access your goals, projects, activities, sleep data, and more.",
      parsed: greeting,
      timestamp: Date.now(),
    }];
    setMessages(initial);
    threadIdRef.current = chatPersistence.createThread(initial);
  }, []);

  const handleFillInput = useCallback((text: string) => {
    setInputOverride(text);
  }, []);

  const handleClearOverride = useCallback(() => {
    setInputOverride(null);
  }, []);

  const status = chatError ? 'error' : isThinking ? 'thinking' : 'ready';
  const provider = badgeToProvider(providerBadge);
  const pendingConfirm = aiAgentService.getPendingConfirm();
  const isEmpty = !isThinking && messages.length === 0 && isLoaded;

  return (
    <div className="flex flex-col h-full">
      <ChatHeader
        status={status}
        provider={provider}
        onReset={handleReset}
        onConfigure={onConfigure ?? (() => {})}
        messageCount={messages.length}
      />

      {isEmpty ? (
        <ChatEmptyState onPick={handleFillInput} connectors={connectors} />
      ) : (
        <MessageList loading={!isLoaded}>
          {messages.map(msg => {
            const isTyping = msg.id === typingId;
            return (
              <MessageBubble key={msg.id} role={msg.role} timestamp={msg.timestamp} content={msg.content}>
                {msg.role === 'assistant' && isTyping ? (
                  <TypewriterText
                    nodes={msg.parsed.nodes}
                    refs={msg.parsed.refs}
                    onDone={handleTypingDone}
                  />
                ) : (
                  <BlockRenderer
                    nodes={msg.parsed.nodes}
                    refs={msg.parsed.refs}
                    onNavigate={(page, section, tab) => navigateTo({ route: page, section, tab }, navigate)}
                  />
                )}
              </MessageBubble>
            );
          })}

          <AnimatePresence>
            {chatError && !isThinking && (
              <ChatErrorRow message={chatError} onRetry={handleRetry} />
            )}
          </AnimatePresence>

          <AnimatePresence>
            {isThinking && (
              <MessageBubble role="assistant" key="thinking">
                {streamedContent ? (
                  <TypewriterText
                    nodes={parseStructuredResponse(streamedContent).nodes}
                    refs={{}}
                    onDone={() => {}}
                    streaming
                  />
                ) : (
                  <ThinkingIndicator />
                )}
              </MessageBubble>
            )}
          </AnimatePresence>

          {pendingConfirm && !isThinking && (
            <MessageBubble role="assistant" key="confirm" content={pendingConfirm.toolName}>
              <span className="text-sm text-zinc-200">Do you want to {pendingConfirm.toolName}? Reply "yes" to confirm or "no" to cancel.</span>
            </MessageBubble>
          )}
        </MessageList>
      )}

      <AnimatePresence>
        {progress && (
          <AgentProgressBar
            round={progress.round}
            totalRounds={progress.totalRounds}
            toolName={progress.toolName}
            status={progress.status as 'thinking' | 'executing' | 'completed' | 'error'}
            message={progress.message}
          />
        )}
      </AnimatePresence>

      <ChatInput
        ref={inputRef}
        onSend={handleSend}
        disabled={isThinking || typingId !== null}
        placeholder={
          pendingConfirm
            ? 'Reply yes or no\u2026'
            : 'Ask about goals, projects, activities\u2026'
        }
        voice={voice}
        overrideText={inputOverride}
        onOverrideConsumed={handleClearOverride}
      />
    </div>
  );
};
