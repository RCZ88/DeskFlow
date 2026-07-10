# CONTEXT_BUNDLE.md — AiPage Complete Source Reference

## User's Verbatim Request

> adding a goal crashed the app — "The model returned an error (this operation was aborted)"
> creating a goal now gives this error: Uncaught (in promise) TypeError: Failed to fetch

Extended scope (multi-cycle audit): EVERY component of the AiPage must be reviewed and hardened. The goal crash was the trigger, but the root issues (error handling, loading states, empty states, UX feedback) exist across all 30+ components.

---

## 1. Type/Interface Definitions

### `src/services/providers/types.ts` — Provider System Types

```typescript
export interface ProviderConfig {
  id: string;
  label?: string;
  templateId: string;
  baseUrl?: string;
  apiKey?: string;
  models?: string[];
  monthlyTokenBudget?: number;
  tokensUsedThisMonth?: number;
}

export interface ResolvedProvider {
  id: string;
  label: string;
  template: ProviderTemplate;
  baseUrl: string;
  apiKey: string;
  models: string[];
}

export interface ProviderTemplate {
  id: string;
  label: string;
  provider: string;
  baseUrl: string;
  headers: Record<string, string>;
  body: Record<string, any>;
  modelField: string;
  keyField: string;
  prioritize?: ('speed' | 'quality')[];
}

export interface CanonicalRequest {
  model: string;
  messages: { role: string; content: string }[];
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
  preference?: 'speed' | 'quality';
}

export interface CanonicalResponse {
  content: string;
  model?: string;
  provider?: string;
  usage?: { promptTokens?: number; completionTokens?: number; totalTokens?: number };
  latencyMs?: number;
}
```

### `src/components/ai/chat/parsed.ts` — 9 Card Types

```typescript
export type ParsedMessageType =
  | 'goal_suggestion'
  | 'plan_update'
  | 'stats_summary'
  | 'action_list'
  | 'digest_topic'
  | 'connector_status'
  | 'form_fill'
  | 'chart_data'
  | 'error';

export interface ParsedMessage {
  id: string;
  type: ParsedMessageType;
  raw: string;
  data: Record<string, any>;
  timestamp: number;
  actions?: CardAction[];
}

export interface CardAction {
  label: string;
  handler: string;
  payload?: any;
}
```

### `src/components/ai/deck/types.ts` — Deck Section Types

```typescript
export type DeckSection =
  | 'chat'
  | 'focus'
  | 'plan'
  | 'reflect'
  | 'digest'
  | 'connectors'
  | 'metrics'
  | 'quick_commands'
  | 'progress';

export interface DeckSectionConfig {
  id: DeckSection;
  label: string;
  icon: string;
  defaultVisible: boolean;
  priority: number;
  minHeight?: number;
}
```

### `src/services/aiContextBundle.ts` — Context Bundle Types

```typescript
export interface AiContextBundle {
  systemPrompt: string;
  goals: GoalSummary[];
  recentActivity: string[];
  currentContext: string;
  providerSlot: 'default' | 'goalAssistant' | 'researchDigest';
}

export interface GoalSummary {
  id: number;
  title: string;
  status: 'active' | 'done' | 'abandoned';
  createdDate: string;
  completedDate?: string;
}
```

---

## 2. Top-Level Orchestrator — `src/pages/AiPage.tsx`

```typescript
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { AiPageDeck } from '../components/ai/deck/AiPageDeck';
import { DailyDigestBoard } from '../components/ai/digest/DailyDigestBoard';
import { AIFeaturesModal } from '../components/AIFeaturesModal';
import { useAiChat } from '../hooks/useAiChat';

type AiTab = 'command-deck' | 'digest';

export default function AiPage() {
  const [activeTab, setActiveTab] = useState<AiTab>('command-deck');
  const [showFeaturesModal, setShowFeaturesModal] = useState(false);

  // Provider configs across 3 slots
  const [providerConfigs, setProviderConfigs] = useState<Record<string, ProviderConfig>>({
    default: null,
    goalAssistant: null,
    researchDigest: null,
  });

  // Goals state
  const [goals, setGoals] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [suggesting, setSuggesting] = useState(false);
  const [suggestionError, setSuggestionError] = useState<string | null>(null);
  const [reviewSuggestions, setReviewSuggestions] = useState<any[]>([]);
  const [reviewing, setReviewing] = useState(false);
  const [goalContext, setGoalContext] = useState<any>(null);

  // Long-term goals state
  const [longtermGoals, setLongtermGoals] = useState<any[]>([]);
  const [planningNotes, setPlanningNotes] = useState('');

  // Digest state
  const [digest, setDigest] = useState<any>(null);
  const [generatingDigest, setGeneratingDigest] = useState(false);

  // Connectors state
  const [connectors, setConnectors] = useState<Connector[]>([]);

  // Chat state (via useAiChat hook)
  const {
    messages,
    sendMessage,
    stopGeneration,
    resetChat,
    isGenerating,
    streamingMessage,
    error: chatError,
  } = useAiChat(providerConfigs.default);

  // Load provider configs on mount
  useEffect(() => {
    loadProviderConfigs();
    loadGoals();
    loadLongtermGoals();
    loadConnectors();
  }, []);

  const loadProviderConfigs = async () => {
    const configs = await window.deskflowAPI!.getProviderConfigs();
    setProviderConfigs(configs);
  };

  const loadGoals = async () => {
    const result = await window.deskflowAPI!.getGoals();
    if (result.success) setGoals(result.goals);
  };

  const loadLongtermGoals = async () => {
    const result = await window.deskflowAPI!.getLongtermGoals();
    if (result.success) {
      setLongtermGoals(result.goals || []);
      setPlanningNotes(result.planningNotes || '');
    }
  };

  const loadConnectors = async () => {
    const result = await window.deskflowAPI!.connectorList();
    if (result.success) setConnectors(result.connectors || []);
  };

  const loadGoalContext = async () => {
    const ctx = await window.deskflowAPI!.getGoalContext();
    setGoalContext(ctx);
  };

  // --- Goal Handlers ---

  const handleSuggest = async () => {
    setSuggestions([]);
    setSuggestionError(null);
    setSuggesting(true);
    try {
      const ctx = await window.deskflowAPI!.getGoalContext();
      const longterm = await window.deskflowAPI!.getLongtermGoals();
      const result = await window.deskflowAPI!.suggestGoals(
        new Date().toISOString().split('T')[0],
        {
          planningContent: ctx?.planningContent,
          longtermGoals: longterm?.goals || [],
          unfinished: ctx?.unfinished,
          recentlyCompleted: ctx?.recentlyCompleted,
        }
      );
      if (result.success) {
        setSuggestions(result.suggestions ?? []);
      } else {
        setSuggestionError(result.error || 'Failed to get suggestions');
      }
    } catch (err: any) {
      setSuggestionError(err.message || 'Unknown error getting suggestions');
      console.error('[AiPage] suggestGoals error:', err);
    } finally {
      setSuggesting(false);
    }
  };

  const handleToggleGoal = async (goalId: number, newStatus: string) => {
    const result = await window.deskflowAPI!.toggleGoalStatus(goalId, newStatus);
    if (result.success) {
      setGoals(prev => prev.map(g => g.id === goalId ? { ...g, status: newStatus } : g));
    }
  };

  const handleAcceptSuggestion = async (suggestion: any) => {
    const result = await window.deskflowAPI!.saveGoal({
      title: suggestion.title,
      description: suggestion.description || '',
      category: suggestion.category || 'general',
    });
    if (result.success) {
      setSuggestions(prev => prev.filter(s => s.title !== suggestion.title));
      loadGoals();
    }
  };

  const handleReview = async () => {
    setReviewing(true);
    try {
      const result = await window.deskflowAPI!.reviewGoals();
      if (result.success) {
        setReviewSuggestions(result.review ?? []);
      }
    } catch (err) {
      console.error('[AiPage] reviewGoals error:', err);
    } finally {
      setReviewing(false);
    }
  };

  const handleSaveNotes = async (notes: string) => {
    setPlanningNotes(notes);
    await window.deskflowAPI!.saveLongtermGoals({ goals: longtermGoals, planningNotes: notes });
  };

  const handleDigestTopicClick = async (topicId: string) => {
    // Scroll to digest section or open detail view
    setActiveTab('digest');
  };

  // --- Connector Handlers ---

  const handleConnectorAction = async (action: string, connectorId: string) => {
    switch (action) {
      case 'test':
        const testResult = await window.deskflowAPI!.connectorTest(connectorId);
        return testResult;
      case 'sync':
        const syncResult = await window.deskflowAPI!.connectorSync(connectorId);
        if (syncResult.success) loadConnectors();
        return syncResult;
      case 'disconnect':
        await window.deskflowAPI!.connectorDelete(connectorId);
        loadConnectors();
        break;
    }
  };

  const handleQuickCommand = (cmd: string) => {
    switch (cmd) {
      case 'suggest-goals': handleSuggest(); break;
      case 'review-goals': handleReview(); break;
      case 'generate-digest': handleGenerateDigest(); break;
      case 'open-features': setShowFeaturesModal(true); break;
    }
  };

  const handleGenerateDigest = async () => {
    setGeneratingDigest(true);
    try {
      const result = await window.deskflowAPI!.getTopicDigest();
      if (result.success) setDigest(result.digest);
    } catch (err) {
      console.error('[AiPage] generateDigest error:', err);
    } finally {
      setGeneratingDigest(false);
    }
  };

  // --- Provider Config Handler ---

  const handleProviderChange = (slot: string, config: ProviderConfig | null) => {
    setProviderConfigs(prev => ({ ...prev, [slot]: config }));
  };

  return (
    <div className="ai-page-container">
      {/* Tab bar */}
      <div className="ai-tab-bar">
        <button
          className={`ai-tab ${activeTab === 'command-deck' ? 'active' : ''}`}
          onClick={() => setActiveTab('command-deck')}
        >
          <TerminalIcon /> Command Deck
        </button>
        <button
          className={`ai-tab ${activeTab === 'digest' ? 'active' : ''}`}
          onClick={() => setActiveTab('digest')}
        >
          <NewspaperIcon /> Digest
        </button>
      </div>

      {/* Tab content */}
      {activeTab === 'command-deck' ? (
        <AiPageDeck
          messages={messages}
          onSend={sendMessage}
          onStop={stopGeneration}
          onReset={resetChat}
          isGenerating={isGenerating}
          streamingMessage={streamingMessage}
          chatError={chatError}
          goals={goals}
          suggestions={suggestions}
          suggesting={suggesting}
          suggestionError={suggestionError}
          onSuggest={handleSuggest}
          onToggleGoal={handleToggleGoal}
          onAcceptSuggestion={handleAcceptSuggestion}
          reviewSuggestions={reviewSuggestions}
          reviewing={reviewing}
          onReview={handleReview}
          goalContext={goalContext}
          longtermGoals={longtermGoals}
          planningNotes={planningNotes}
          onSaveNotes={handleSaveNotes}
          digest={digest}
          generatingDigest={generatingDigest}
          onGenerateDigest={handleGenerateDigest}
          onDigestTopicClick={handleDigestTopicClick}
          connectors={connectors}
          onConnectorAction={handleConnectorAction}
          onQuickCommand={handleQuickCommand}
          providerConfigs={providerConfigs}
          onProviderChange={handleProviderChange}
          onRefreshGoals={loadGoals}
        />
      ) : (
        <DailyDigestBoard
          digest={digest}
          generating={generatingDigest}
          onGenerate={handleGenerateDigest}
          onTopicClick={handleDigestTopicClick}
        />
      )}

      {/* Features modal */}
      {showFeaturesModal && (
        <AIFeaturesModal onClose={() => setShowFeaturesModal(false)} />
      )}
    </div>
  );
}
```

**Notable issues in AiPage.tsx:**
- `handleReview` has a bare `catch` with only `console.error` — no error state, no user feedback
- `handleGenerateDigest` has a bare `catch` with only `console.error` — no error state, no user feedback
- `loadProviderConfigs` has no error handling at all — if the IPC call fails, `configs` is undefined
- `loadGoals`, `loadLongtermGoals`, `loadConnectors` all silently swallow failures (no user feedback)
- `handleToggleGoal` has no error handling — if IPC fails, the optimistic update leaves incorrect state
- `handleAcceptSuggestion` has no error handling — if IPC fails, the suggestion just vanishes
- `handleConnectorAction`'s `disconnect` case has no error handling
- `suggestionError` state exists but is never rendered in the JSX (missing UI element)
- No loading spinners for initial data loads
- No empty states for any section
- Provider config loading has no loading/error state

---

## 3. Deck Layout — `src/components/ai/deck/AiPageDeck.tsx`

```typescript
import React from 'react';
import { ChatPanel } from '../chat/ChatPanel';
import { FocusBoard } from '../focus/FocusBoard';
import { PlanBoard } from '../plan/PlanBoard';
import { ReflectFeed } from '../reflect/ReflectFeed';
import { DailyDigestBoard } from '../digest/DailyDigestBoard';
import { ConnectorsPanel } from '../connectors/ConnectorsPanel';
import { QuickCommands } from './QuickCommands';
import { SummaryGrid } from './SummaryGrid';
import { AgentProgressSteps } from './AgentProgressSteps';
import { GlassCard } from '../../ui/GlassCard';
import type { ParsedMessage } from '../chat/parsed';
import type { Connector } from '../connectors/types';

interface AiPageDeckProps {
  messages: ParsedMessage[];
  onSend: (text: string) => void;
  onStop: () => void;
  onReset: () => void;
  isGenerating: boolean;
  streamingMessage: string | null;
  chatError: string | null;
  goals: any[];
  suggestions: any[];
  suggesting: boolean;
  suggestionError: string | null;
  onSuggest: () => void;
  onToggleGoal: (id: number, status: string) => void;
  onAcceptSuggestion: (suggestion: any) => void;
  reviewSuggestions: any[];
  reviewing: boolean;
  onReview: () => void;
  goalContext: any;
  longtermGoals: any[];
  planningNotes: string;
  onSaveNotes: (notes: string) => void;
  digest: any;
  generatingDigest: boolean;
  onGenerateDigest: () => void;
  onDigestTopicClick: (topicId: string) => void;
  connectors: Connector[];
  onConnectorAction: (action: string, id: string) => Promise<any>;
  onQuickCommand: (cmd: string) => void;
  providerConfigs: Record<string, any>;
  onProviderChange: (slot: string, config: any) => void;
  onRefreshGoals: () => void;
}

export function AiPageDeck(props: AiPageDeckProps) {
  return (
    <div className="ai-deck-grid">
      {/* Quick glance metrics */}
      <SummaryGrid
        goals={props.goals}
        suggestions={props.suggestions}
        reviewing={props.reviewing}
      />

      {/* Main chat panel */}
      <GlassCard className="ai-deck-chat">
        <ChatPanel
          messages={props.messages}
          onSend={props.onSend}
          onStop={props.onStop}
          onReset={props.onReset}
          isGenerating={props.isGenerating}
          streamingMessage={props.streamingMessage}
          error={props.chatError}
          providerConfigs={props.providerConfigs}
          onProviderChange={props.onProviderChange}
        />
      </GlassCard>

      {/* Quick commands bar */}
      <QuickCommands onCommand={props.onQuickCommand} />

      {/* Focus board (goals) */}
      <GlassCard className="ai-deck-focus">
        <FocusBoard
          goals={props.goals}
          suggestions={props.suggestions}
          suggesting={props.suggesting}
          suggestionError={props.suggestionError}
          onSuggest={props.onSuggest}
          onToggleGoal={props.onToggleGoal}
          onAcceptSuggestion={props.onAcceptSuggestion}
          reviewSuggestions={props.reviewSuggestions}
          reviewing={props.reviewing}
          onReview={props.onReview}
          goalContext={props.goalContext}
          onRefresh={props.onRefreshGoals}
        />
      </GlassCard>

      {/* Plan board (long-term goals) */}
      <GlassCard className="ai-deck-plan">
        <PlanBoard
          longtermGoals={props.longtermGoals}
          planningNotes={props.planningNotes}
          onSaveNotes={props.onSaveNotes}
          onRefresh={props.onRefreshGoals}
        />
      </GlassCard>

      {/* Reflect feed */}
      <GlassCard className="ai-deck-reflect">
        <ReflectFeed />
      </GlassCard>

      {/* Daily digest board */}
      <GlassCard className="ai-deck-digest">
        <DailyDigestBoard
          digest={props.digest}
          generating={props.generatingDigest}
          onGenerate={props.onGenerateDigest}
          onTopicClick={props.onDigestTopicClick}
          compact={true}
        />
      </GlassCard>

      {/* Connectors panel */}
      <GlassCard className="ai-deck-connectors">
        <ConnectorsPanel
          connectors={props.connectors}
          onAction={props.onConnectorAction}
        />
      </GlassCard>

      {/* Agent progress steps */}
      <AgentProgressSteps />
    </div>
  );
}
```

**Notable issues:** None critical — it's a layout component. But it lacks loading/empty state handling for sections where data hasn't loaded yet.

---

## 4. Chat System

### `src/components/ai/chat/ChatPanel.tsx` (key parts)

```typescript
import React, { useState, useRef, useEffect } from 'react';
import { ChatInput } from './ChatInput';
import { MessageBubble } from './MessageBubble';
import { ThinkingIndicator } from './ThinkingIndicator';
import { TypewriterText } from './TypewriterText';
import { ParsedMessageRouter } from './ParsedMessageRouter';
import type { ParsedMessage } from './parsed';

interface ChatPanelProps {
  messages: ParsedMessage[];
  onSend: (text: string) => void;
  onStop: () => void;
  onReset: () => void;
  isGenerating: boolean;
  streamingMessage: string | null;
  error: string | null;
  providerConfigs: Record<string, ProviderConfig>;
  onProviderChange: (slot: string, config: ProviderConfig | null) => void;
}

export function ChatPanel({
  messages, onSend, onStop, onReset,
  isGenerating, streamingMessage, error,
  providerConfigs, onProviderChange,
}: ChatPanelProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [currentModel, setCurrentModel] = useState('gpt-4');

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingMessage]);

  // Model selector change handler
  const handleModelChange = (model: string) => {
    setCurrentModel(model);
    // Update provider config model
  };

  return (
    <div className="chat-panel">
      {/* Error banner */}
      {error && (
        <div className="chat-error-banner">
          <AlertCircleIcon />
          <span>{error}</span>
          <button onClick={onReset}>Dismiss</button>
        </div>
      )}

      {/* Message list */}
      <div className="chat-messages">
        {messages.length === 0 && !isGenerating && (
          <div className="chat-empty">
            <MessageCircleIcon />
            <p>Start a conversation or use Quick Commands below</p>
          </div>
        )}

        {messages.map(msg => (
          <MessageBubble key={msg.id} message={msg}>
            <ParsedMessageRouter message={msg} />
          </MessageBubble>
        ))}

        {/* Streaming message */}
        {isGenerating && streamingMessage && (
          <TypewriterText text={streamingMessage} />
        )}

        {/* Thinking indicator */}
        {isGenerating && !streamingMessage && (
          <ThinkingIndicator />
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <ChatInput
        onSend={onSend}
        onStop={onStop}
        isGenerating={isGenerating}
        currentModel={currentModel}
        onModelChange={handleModelChange}
        providerConfigs={providerConfigs}
        onProviderChange={onProviderChange}
      />
    </div>
  );
}
```

**Notable issues:**
- `error` state is displayed as a banner but no retry mechanism
- Empty state exists ("Start a conversation") but is just text — no action prompt
- `handleModelChange` says "Update provider config model" as a TODO comment
- No message loading skeleton

### `src/components/ai/chat/parsed.ts` — Full source

```typescript
export type ParsedMessageType =
  | 'goal_suggestion'
  | 'plan_update'
  | 'stats_summary'
  | 'action_list'
  | 'digest_topic'
  | 'connector_status'
  | 'form_fill'
  | 'chart_data'
  | 'error';

export interface ParsedMessage {
  id: string;
  type: ParsedMessageType;
  raw: string;
  data: Record<string, any>;
  timestamp: number;
  actions?: { label: string; handler: string; payload?: any }[];
}

// Parser: takes raw LLM response text -> typed ParsedMessage
export function parseMessage(raw: string, id: string): ParsedMessage {
  // Try to detect type from JSON wrapper or markdown structure
  // Falls back to error type if parsing fails
  try {
    // Check for JSON-wrapped messages: {"type": "...", "data": {...}}
    const jsonMatch = raw.match(/^```json\n([\s\S]*?)\n```$/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[1]);
      return {
        id,
        type: parsed.type || 'error',
        raw,
        data: parsed.data || {},
        timestamp: Date.now(),
        actions: parsed.actions,
      };
    }
    // Heuristic detection by content patterns
    if (raw.includes('goal_suggestion') || raw.match(/suggest.*goal/i)) {
      return { id, type: 'goal_suggestion', raw, data: extractGoalData(raw), timestamp: Date.now() };
    }
    if (raw.includes('## Plan') || raw.match(/plan.*update/i)) {
      return { id, type: 'plan_update', raw, data: { content: raw }, timestamp: Date.now() };
    }
    if (raw.includes('- [ ]') || raw.match(/action items?/i)) {
      return { id, type: 'action_list', raw, data: extractActions(raw), timestamp: Date.now() };
    }
    // Default: treat as generic text
    return { id, type: 'stats_summary', raw, data: { content: raw }, timestamp: Date.now() };
  } catch {
    return { id, type: 'error', raw, data: { message: 'Failed to parse response', original: raw }, timestamp: Date.now() };
  }
}

function extractGoalData(raw: string): Record<string, any> {
  const titleMatch = raw.match(/## (?:\d+[.)]\s*)?(.+)/);
  const descMatch = raw.match(/(?:Description|Desc):\s*(.+)/i);
  const categoryMatch = raw.match(/(?:Category|Cat):\s*(.+)/i);
  return {
    title: titleMatch?.[1]?.trim() || 'Untitled Goal',
    description: descMatch?.[1]?.trim() || '',
    category: categoryMatch?.[1]?.trim()?.toLowerCase() || 'general',
    suggested: true,
  };
}

function extractActions(raw: string): Record<string, any> {
  const lines = raw.split('\n').filter(l => l.match(/[-*]\s\[.?\]/));
  return {
    items: lines.map(l => ({
      text: l.replace(/[-*]\s\[.?\]\s*/, '').trim(),
      checked: l.includes('[x]'),
    })),
  };
}

// Card action handler routing
export function handleCardAction(action: CardAction, messageId: string): void {
  switch (action.handler) {
    case 'acceptGoal':
      // dispatch acceptSuggestion
      break;
    case 'viewDetail':
      // open detail view
      break;
    case 'dismiss':
      // remove card
      break;
    case 'retry':
      // retry operation
      break;
  }
}
```

**Notable issues:**
- `handleCardAction` is a stub — the switch cases have no real implementation
- Goal card "Accept" action is handled in AiPage.tsx but must be wired through the card action system
- No loading state for parsing (fine for sync ops)
- Fallback to `error` type could produce false positives for well-formed but unrecognized responses

---

## 5. Focus Board — `src/components/ai/focus/FocusBoard.tsx`

```typescript
import React, { useState } from 'react';
import { GoalRow } from './GoalRow';
import { GlassCard } from '../../ui/GlassCard';

interface FocusBoardProps {
  goals: any[];
  suggestions: any[];
  suggesting: boolean;
  suggestionError: string | null;
  onSuggest: () => void;
  onToggleGoal: (id: number, status: string) => void;
  onAcceptSuggestion: (suggestion: any) => void;
  reviewSuggestions: any[];
  reviewing: boolean;
  onReview: () => void;
  goalContext: any;
  onRefresh: () => void;
}

export function FocusBoard(props: FocusBoardProps) {
  const goalsByStatus = {
    active: props.goals.filter(g => g.status === 'active'),
    done: props.goals.filter(g => g.status === 'done'),
    abandoned: props.goals.filter(g => g.status === 'abandoned'),
  };

  return (
    <div className="focus-board">
      <div className="focus-header">
        <h3><TargetIcon /> Focus</h3>
        <div className="focus-actions">
          <button onClick={props.onSuggest} disabled={props.suggesting}>
            {props.suggesting ? 'Generating...' : 'Suggest Goals'}
          </button>
          <button onClick={props.onReview} disabled={props.reviewing}>
            {props.reviewing ? 'Reviewing...' : 'Review'}
          </button>
        </div>
      </div>

      {/* Suggestion error banner */}
      {props.suggestionError && (
        <div className="suggestion-error-banner">
          <AlertCircleIcon />
          <span>{props.suggestionError}</span>
          <button onClick={props.onSuggest}>Retry</button>
        </div>
      )}

      {/* Goal suggestions from AI */}
      {props.suggestions.length > 0 && (
        <div className="goal-suggestions">
          <h4>Suggested Goals</h4>
          {props.suggestions.map((s, i) => (
            <div key={i} className="goal-suggestion-card">
              <div className="suggestion-content">
                <strong>{s.title}</strong>
                {s.description && <p>{s.description}</p>}
              </div>
              <div className="suggestion-actions">
                <button onClick={() => props.onAcceptSuggestion(s)}>
                  <CheckIcon /> Accept
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Active goals */}
      <div className="goals-section">
        <h4>Active Goals ({goalsByStatus.active.length})</h4>
        {goalsByStatus.active.length === 0 ? (
          <div className="empty-state">
            <p>No active goals. Click "Suggest Goals" to get AI-powered suggestions.</p>
          </div>
        ) : (
          goalsByStatus.active.map(goal => (
            <GoalRow
              key={goal.id}
              goal={goal}
              onToggle={props.onToggleGoal}
            />
          ))
        )}
      </div>

      {/* Review suggestions */}
      {props.reviewSuggestions.length > 0 && (
        <div className="review-section">
          <h4>Review Suggestions</h4>
          {props.reviewSuggestions.map((r, i) => (
            <div key={i} className="review-card">
              <p>{r.feedback}</p>
            </div>
          ))}
        </div>
      )}

      {/* Done goals (collapsible) */}
      {goalsByStatus.done.length > 0 && (
        <details className="goals-section done">
          <summary>Completed ({goalsByStatus.done.length})</summary>
          {goalsByStatus.done.map(goal => (
            <GoalRow key={goal.id} goal={goal} onToggle={props.onToggleGoal} />
          ))}
        </details>
      )}
    </div>
  );
}
```

**Notable issues:**
- `suggestionError` banner IS rendered here (good), but no error state for `reviewSuggestions` failure
- No error state when `loadGoals` fails upstream
- No retry mechanism for suggestion accept failures
- Empty state for active goals exists but is basic text
- `reviewSuggestions` shown but no reject/dismiss action on review cards
- No loading skeleton for goals list
- Abandoned goals not shown at all in the UI despite being filtered

---

## 6. Plan Board — `src/components/ai/plan/PlanBoard.tsx`

```typescript
import React, { useState } from 'react';
import { LongTermGoalRow } from './LongTermGoalRow';
import { BulkImportDialog } from './BulkImportDialog';

interface PlanBoardProps {
  longtermGoals: any[];
  planningNotes: string;
  onSaveNotes: (notes: string) => void;
  onRefresh: () => void;
}

export function PlanBoard({ longtermGoals, planningNotes, onSaveNotes, onRefresh }: PlanBoardProps) {
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSaveNotes = async () => {
    setSaving(true);
    await onSaveNotes(planningNotes);
    setSaving(false);
  };

  return (
    <div className="plan-board">
      <div className="plan-header">
        <h3><ClipboardListIcon /> Plan</h3>
        <button onClick={() => setShowBulkImport(true)}>
          <UploadIcon /> Bulk Import
        </button>
      </div>

      {/* Planning notes */}
      <div className="planning-notes">
        <textarea
          value={planningNotes}
          onChange={e => onSaveNotes(e.target.value)}
          placeholder="Add planning notes, ideas, or reflections..."
          rows={4}
        />
        {saving && <span className="saving-indicator">Saving...</span>}
      </div>

      {/* Long-term goals */}
      <div className="longterm-goals">
        {longtermGoals.length === 0 ? (
          <div className="empty-state">
            <p>No long-term goals yet. Add them below or use Bulk Import to load multiple at once.</p>
          </div>
        ) : (
          longtermGoals.map((goal, i) => (
            <LongTermGoalRow key={goal.id || i} goal={goal} />
          ))
        )}
      </div>

      {showBulkImport && (
        <BulkImportDialog
          onClose={() => setShowBulkImport(false)}
          onImport={(goals) => {
            // Save imported goals
            setShowBulkImport(false);
            onRefresh();
          }}
        />
      )}
    </div>
  );
}
```

**Notable issues:**
- `handleSaveNotes` writes to `planningNotes` on every keystroke (via onChange) — no debounce
- `BulkImportDialog` `onImport` callback doesn't actually save the goals to backend — it's a no-op wrapper
- No error state for saving
- No loading state for initial load
- `LongTermGoalRow` — needs source to verify but likely has delete/complete actions without error handling

---

## 7. Reflect Feed — `src/components/ai/reflect/ReflectFeed.tsx`

```typescript
import React, { useState, useEffect } from 'react';

export function ReflectFeed() {
  const [days, setDays] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadReflections();
  }, []);

  const loadReflections = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await window.deskflowAPI!.getGoalContext();
      if (result.success) {
        // Transform goal context into daily reflection items
        const reflections = transformToReflections(result);
        setDays(reflections);
      } else {
        setError(result.error || 'Failed to load reflections');
      }
    } catch (err: any) {
      setError(err.message || 'Error loading reflections');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="reflect-feed">
        <h3><HistoryIcon /> Reflect</h3>
        <div className="reflect-loading">Loading reflections...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="reflect-feed">
        <h3><HistoryIcon /> Reflect</h3>
        <div className="reflect-error">
          <p>{error}</p>
          <button onClick={loadReflections}>Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="reflect-feed">
      <div className="reflect-header">
        <h3><HistoryIcon /> Reflect</h3>
        <button onClick={loadReflections} disabled={loading}>
          <RefreshIcon /> Refresh
        </button>
      </div>

      {days.length === 0 ? (
        <div className="empty-state">
          <p>No reflections yet. Start tracking goals to see daily summaries here.</p>
        </div>
      ) : (
        <div className="reflect-timeline">
          {days.map((day, i) => (
            <details key={i} className="reflect-day">
              <summary>
                <span className="day-date">{day.date}</span>
                <span className="day-count">{day.items.length} reflections</span>
              </summary>
              <div className="day-items">
                {day.items.map((item: any, j: number) => (
                  <div key={j} className="reflect-item">
                    <p>{item.text}</p>
                    <span className="reflect-meta">{item.time}</span>
                  </div>
                ))}
              </div>
            </details>
          ))}
        </div>
      )}
    </div>
  );
}

function transformToReflections(ctx: any): any[] {
  // Transform raw goal context into day-grouped reflection items
  if (!ctx?.unfinished && !ctx?.recentlyCompleted) return [];
  const days: Record<string, any[]> = {};
  const today = new Date().toISOString().split('T')[0];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000).toISOString().split('T')[0];
    days[d] = [];
  }
  // Add unfinished goals as "still working on" reflections
  if (ctx.unfinished) {
    const todayStr = today;
    days[todayStr] = days[todayStr] || [];
    ctx.unfinished.forEach((g: any) => {
      days[todayStr].push({
        text: `Still working on: ${g.title}`,
        time: 'ongoing',
        type: 'unfinished',
      });
    });
  }
  // Add recently completed as accomplishments
  if (ctx.recentlyCompleted) {
    ctx.recentlyCompleted.forEach((g: any) => {
      const completedDate = g.completedDate || today;
      days[completedDate] = days[completedDate] || [];
      days[completedDate].push({
        text: `Completed: ${g.title}`,
        time: g.completedDate,
        type: 'completed',
      });
    });
  }
  return Object.entries(days)
    .filter(([_, items]) => items.length > 0)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, items]) => ({ date, items }));
}
```

**Notable issues:**
- Relies on `getGoalContext` which returns `planningContent`, `unfinished`, `recentlyCompleted` — but no dedicated "reflections" IPC channel exists. This is a frontend-only transform.
- `transformToReflections` creates empty day slots that are then filtered out — wasteful
- No pagination — always loads 7 days
- `loading` state is just text, no skeleton
- `error` state has retry button
- Good: has loading, error, and empty states

---

## 8. Daily Digest Board — `src/components/ai/digest/DailyDigestBoard.tsx`

```typescript
import React, { useState } from 'react';
import { GlassCard } from '../../ui/GlassCard';

interface DailyDigestBoardProps {
  digest: any;
  generating: boolean;
  onGenerate: () => void;
  onTopicClick?: (topicId: string) => void;
  compact?: boolean;
}

export function DailyDigestBoard({ digest, generating, onGenerate, onTopicClick, compact }: DailyDigestBoardProps) {
  // Inline digest slot within deck
  if (compact) {
    return (
      <div className="daily-digest compact">
        <div className="digest-header">
          <h3><NewspaperIcon /> Daily Digest</h3>
          <button onClick={onGenerate} disabled={generating}>
            {generating ? 'Generating...' : digest ? 'Regenerate' : 'Generate'}
          </button>
        </div>
        {generating && (
          <div className="digest-loading">
            <div className="loading-pulse" />
            <p>Generating your daily digest...</p>
          </div>
        )}
        {!generating && !digest && (
          <div className="empty-state">
            <p>No digest yet. Click "Generate" to create a daily summary of your goals and progress.</p>
          </div>
        )}
        {!generating && digest && (
          <div className="digest-preview">
            <p className="digest-summary">{digest.summary}</p>
            {digest.topics?.slice(0, 3).map((topic: any) => (
              <div
                key={topic.id}
                className="digest-topic-chip"
                onClick={() => onTopicClick?.(topic.id)}
              >
                {topic.title}
              </div>
            ))}
            {digest.topics?.length > 3 && (
              <p className="digest-more">+{digest.topics.length - 3} more topics</p>
            )}
          </div>
        )}
      </div>
    );
  }

  // Full-page digest view
  return (
    <div className="daily-digest full">
      <div className="digest-header">
        <h1><NewspaperIcon /> Daily Digest</h1>
        <button onClick={onGenerate} disabled={generating}>
          {generating ? 'Generating...' : digest ? 'Regenerate Today' : 'Generate Today'}
        </button>
      </div>
      {generating && (
        <div className="digest-loading full">
          <div className="loading-pulse" />
          <p>Curating your daily intelligence...</p>
        </div>
      )}
      {!generating && !digest && (
        <div className="digest-empty full">
          <NewspaperIcon size={48} />
          <h2>No Digest Yet</h2>
          <p>Generate a daily digest to see AI-curated insights about your goals and productivity.</p>
          <button className="generate-cta" onClick={onGenerate}>Generate Your First Digest</button>
        </div>
      )}
      {!generating && digest && (
        <div className="digest-content">
          <div className="digest-date">{digest.date}</div>
          <p className="digest-summary">{digest.summary}</p>
          <div className="digest-topics">
            {digest.topics?.map((topic: any) => (
              <GlassCard key={topic.id} className="digest-topic-card" onClick={() => onTopicClick?.(topic.id)}>
                <h3>{topic.title}</h3>
                <p>{topic.preview}</p>
                <div className="topic-meta">
                  <span className="topic-category">{topic.category}</span>
                  <span className="topic-relevance">{topic.relevance}% relevant</span>
                </div>
              </GlassCard>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

**Notable issues:**
- Good: has loading, empty, and populated states for both compact and full views
- No error state — if `onGenerate` fails, the user sees nothing (error is caught in AiPage.tsx `handleGenerateDigest` with only `console.error`)
- No retry mechanism
- Digest data shape is undocumented — assumes `digest.summary`, `digest.topics[].{id,title,preview,category,relevance}`

---

## 9. Connectors Panel — `src/components/ai/connectors/ConnectorsPanel.tsx`

```typescript
import React, { useState } from 'react';
import { ConnectorSetupModal } from './ConnectorSetupModal';

interface Connector {
  id: string;
  type: 'email' | 'calendar';
  name: string;
  connected: boolean;
  lastSync?: string;
  status: 'active' | 'error' | 'disconnected';
}

interface ConnectorsPanelProps {
  connectors: Connector[];
  onAction: (action: string, connectorId: string) => Promise<any>;
}

export function ConnectorsPanel({ connectors, onAction }: ConnectorsPanelProps) {
  const [showSetup, setShowSetup] = useState(false);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [setupType, setSetupType] = useState<'email' | 'calendar'>('email');

  const handleSync = async (id: string) => {
    setSyncing(id);
    await onAction('sync', id);
    setSyncing(null);
  };

  const handleTest = async (id: string) => {
    const result = await onAction('test', id);
    // Show result toast
  };

  const handleDisconnect = async (id: string) => {
    await onAction('disconnect', id);
  };

  return (
    <div className="connectors-panel">
      <div className="connectors-header">
        <h3><PlugIcon /> Connectors</h3>
        <button onClick={() => { setSetupType('email'); setShowSetup(true); }}>
          <PlusIcon /> Add Connector
        </button>
      </div>

      {connectors.length === 0 ? (
        <div className="empty-state">
          <p>Connect your email or calendar to let the AI assist with scheduling and context.</p>
        </div>
      ) : (
        <div className="connector-list">
          {connectors.map(conn => (
            <div key={conn.id} className={`connector-card ${conn.status}`}>
              <div className="connector-info">
                <span className={`status-dot ${conn.status}`} />
                <strong>{conn.name}</strong>
                <span className="connector-type">{conn.type}</span>
              </div>
              <div className="connector-actions">
                <button onClick={() => handleTest(conn.id)}>Test</button>
                <button
                  onClick={() => handleSync(conn.id)}
                  disabled={syncing === conn.id}
                >
                  {syncing === conn.id ? 'Syncing...' : 'Sync'}
                </button>
                <button onClick={() => handleDisconnect(conn.id)} className="danger">
                  Disconnect
                </button>
              </div>
              {conn.lastSync && (
                <div className="connector-meta">Last synced: {conn.lastSync}</div>
              )}
            </div>
          ))}
        </div>
      )}

      {showSetup && (
        <ConnectorSetupModal
          type={setupType}
          onClose={() => setShowSetup(false)}
          onComplete={() => {
            setShowSetup(false);
            // Refresh connectors list
          }}
        />
      )}
    </div>
  );
}
```

**Notable issues:**
- `handleTest` calls `onAction('test', id)` but the result is unused — no visual feedback
- `handleDisconnect` has no error handling — if the IPC fails, the connector stays in the list but appears removed
- `handleSync` has sync state per connector but no error handling
- `ConnectorSetupModal.onComplete` says "Refresh connectors list" as a TODO
- No loading state for initial connector list load (handled upstream in AiPage.tsx)

---

## 10. AI Provider System

### `src/services/providers/callProvider.ts` — Full source

```typescript
import { CanonicalRequest, CanonicalResponse, ResolvedProvider, ProviderConfig } from './types';
import { PROVIDER_TEMPLATES } from './templates';

export async function callProvider(
  provider: ResolvedProvider | ProviderConfig,
  req: CanonicalRequest,
): Promise<CanonicalResponse> {
  const isResolved = 'template' in provider;
  const template = isResolved
    ? (provider as ResolvedProvider).template
    : PROVIDER_TEMPLATES[(provider as ProviderConfig).templateId];
  if (!template) throw new Error(`No template for provider ${(provider as ProviderConfig).templateId}`);

  const baseUrl = isResolved ? (provider as ResolvedProvider).baseUrl : (provider as ProviderConfig).baseUrl || template.baseUrl;
  const apiKey = isResolved ? (provider as ResolvedProvider).apiKey : (provider as ProviderConfig).apiKey;
  const models = isResolved ? (provider as ResolvedProvider).models : (provider as ProviderConfig).models;

  const model = req.model || models?.[0] || template.body?.model || 'gpt-4';
  const url = `${baseUrl.replace(/\/+$/, '')}/chat/completions`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...template.headers,
  };
  if (apiKey) headers[template.keyField] = `Bearer ${apiKey}`;

  const body = {
    ...template.body,
    model,
    messages: [
      ...(req.systemPrompt ? [{ role: 'system', content: req.systemPrompt }] : []),
      ...req.messages,
    ],
    max_tokens: req.maxTokens ?? template.body?.max_tokens ?? 4096,
    temperature: req.temperature ?? template.body?.temperature ?? 0.7,
  };

  const controller = new AbortController();
  // This WAS 10000ms — CHANGED to 120000ms in a previous cycle
  const timeout = setTimeout(() => controller.abort(), 120000);
  let response;
  try {
    const startTime = Date.now();
    response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const latencyMs = Date.now() - startTime;

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(`HTTP ${response.status}: ${errorText || response.statusText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    return {
      content,
      model: data.model || model,
      provider: provider.label || provider.id,
      usage: data.usage ? {
        promptTokens: data.usage.prompt_tokens,
        completionTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens,
      } : undefined,
      latencyMs,
    };
  } finally {
    clearTimeout(timeout);
  }
}
```

**Current state:** Timeout is already 120s (changed from 10s in a prior cycle). No other issues in this file.

### `src/services/providers/router.ts` — Full source

```typescript
import { callProvider } from './callProvider';
import { CanonicalRequest, CanonicalResponse, ProviderConfig, ResolvedProvider } from './types';

export async function callWithTokenTiers(
  configs: ProviderConfig[],
  req: CanonicalRequest,
): Promise<CanonicalResponse> {
  // Sort configs by monthlyTokenBudget descending (higher budget = higher tier = try first)
  const sorted = [...configs].sort((a, b) => (b.monthlyTokenBudget || Infinity) - (a.monthlyTokenBudget || Infinity));
  let lastError: any;

  for (const config of sorted) {
    if (config.monthlyTokenBudget && (config.tokensUsedThisMonth || 0) >= config.monthlyTokenBudget) {
      continue; // Skip exhausted tiers
    }
    try {
      return await callProvider(config, req);
    } catch (err: any) {
      lastError = err;
      if (err.status !== 402) throw err; // Only 402 (budget exhausted) is retryable
      // Budget exhausted, try next tier
    }
  }
  throw lastError || new Error('No providers configured');
}

export async function runWithFallback(
  primaryConfigs: ProviderConfig[],
  fallbackConfigs: ProviderConfig[],
  req: CanonicalRequest,
): Promise<CanonicalResponse> {
  const errors: { name: string; error: string }[] = [];

  // Try primary configs
  for (const config of primaryConfigs) {
    try {
      return await callWithTokenTiers([config], req);
    } catch (err: any) {
      errors.push({ name: config.label || config.id, error: err.message || String(err) });
    }
  }

  // Try fallback configs
  for (const config of fallbackConfigs) {
    try {
      return await callWithTokenTiers([config], req);
    } catch (err: any) {
      errors.push({ name: config.label || config.id, error: err.message || String(err) });
    }
  }

  throw new Error(`All ${errors.length} provider(s) failed — ${errors.map(e => `${e.name}: ${e.error}`).join('; ')}`);
}
```

**Notable issues:**
- Line 76: `if (err.status !== 402) throw err;` — AbortError has no `.status`, so it's re-thrown, bypassing token-tier retry
- `runWithFallback` error message format: "All N provider(s) failed — ..." — doesn't distinguish timeout from failure
- No timeoutMs propagation from ProviderConfig

### `src/services/providers/types.ts` (see Section 1 above)

### Provider Templates (`src/services/providers/templates.ts`)

```typescript
export const PROVIDER_TEMPLATES: Record<string, ProviderTemplate> = {
  'openai': {
    id: 'openai',
    label: 'OpenAI',
    provider: 'openai',
    baseUrl: 'https://api.openai.com/v1',
    headers: { 'Authorization': 'Bearer ${API_KEY}' },
    body: { model: 'gpt-4', max_tokens: 4096, temperature: 0.7 },
    modelField: 'model',
    keyField: 'Authorization',
  },
  'openrouter': {
    id: 'openrouter',
    label: 'OpenRouter',
    provider: 'openrouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    headers: { 'Authorization': 'Bearer ${API_KEY}', 'HTTP-Referer': 'https://deskflow.app' },
    body: { model: 'anthropic/claude-3.5-sonnet', max_tokens: 4096, temperature: 0.7 },
    modelField: 'model',
    keyField: 'Authorization',
  },
  'anthropic': {
    id: 'anthropic',
    label: 'Anthropic',
    provider: 'anthropic',
    baseUrl: 'https://api.anthropic.com/v1',
    headers: { 'x-api-key': '${API_KEY}', 'anthropic-version': '2023-06-01' },
    body: { model: 'claude-3-opus-20240229', max_tokens: 4096, temperature: 0.7 },
    modelField: 'model',
    keyField: 'x-api-key',
  },
};
```

### `src/components/AiProviderSelectModal.tsx` — Full source

```typescript
import React, { useState, useEffect } from 'react';
import { GlassCard } from './ui/GlassCard';

interface AiProviderSelectModalProps {
  slot: 'default' | 'goalAssistant' | 'researchDigest';
  currentConfig: ProviderConfig | null;
  onSelect: (config: ProviderConfig | null) => void;
  onClose: () => void;
}

export function AiProviderSelectModal({ slot, currentConfig, onSelect, onClose }: AiProviderSelectModalProps) {
  const [providers, setProviders] = useState<ProviderConfig[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProviders();
  }, []);

  const loadProviders = async () => {
    setLoading(true);
    try {
      const configs = await window.deskflowAPI!.getProviderConfigs();
      // Slot-specific filtering is done by the user selecting from all configs
      const list = Object.values(configs || {});
      setProviders(list);
    } catch (err) {
      console.error('Failed to load provider configs:', err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = searchQuery
    ? providers.filter(p =>
        p.label?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.id?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : providers;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <GlassCard className="provider-select-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Select Provider — {slot}</h2>
          <button onClick={onClose}>&times;</button>
        </div>

        {/* Search */}
        <input
          type="text"
          placeholder="Search providers..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="search-input"
        />

        {/* Current selection */}
        {currentConfig && (
          <div className="current-selection">
            <strong>Current: {currentConfig.label || currentConfig.id}</strong>
            <button onClick={() => { onSelect(null); }}>Clear</button>
          </div>
        )}

        {/* Provider list */}
        <div className="provider-list">
          {loading ? (
            <div className="loading-state">Loading providers...</div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              {searchQuery ? 'No providers match your search' : 'No providers configured. Add one in Settings.'}
            </div>
          ) : (
            filtered.map(p => (
              <div
                key={p.id}
                className={`provider-item ${currentConfig?.id === p.id ? 'selected' : ''}`}
                onClick={() => { onSelect(p); onClose(); }}
              >
                <div className="provider-info">
                  <strong>{p.label || p.id}</strong>
                  <span className="provider-template">{p.templateId}</span>
                </div>
                {currentConfig?.id === p.id && <span className="check-mark">✓</span>}
              </div>
            ))
          )}
        </div>
      </GlassCard>
    </div>
  );
}
```

**Notable issues:**
- `loadProviders` catch block only `console.error` — no error state in UI
- No way to add a NEW provider config from this modal (must go to Settings)
- Search is frontend-only (fine)
- Good: has loading, empty, and populated states

---

## 11. useAiChat Hook — `src/hooks/useAiChat.ts`

```typescript
import { useState, useCallback, useRef } from 'react';
import type { ParsedMessage } from '../components/ai/chat/parsed';
import { parseMessage } from '../components/ai/chat/parsed';
import { buildContextBundle } from '../services/aiContextBundle';

interface UseAiChatReturn {
  messages: ParsedMessage[];
  sendMessage: (text: string) => Promise<void>;
  stopGeneration: () => void;
  resetChat: () => void;
  isGenerating: boolean;
  streamingMessage: string | null;
  error: string | null;
}

export function useAiChat(providerConfig: any): UseAiChatReturn {
  const [messages, setMessages] = useState<ParsedMessage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim()) return;

    // Add user message
    const userMsg: ParsedMessage = {
      id: `user-${Date.now()}`,
      type: 'stats_summary',
      raw: text,
      data: { content: text, role: 'user' },
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMsg]);
    setIsGenerating(true);
    setError(null);

    try {
      // Build context bundle
      const contextBundle = await buildContextBundle();

      // Call provider via main process IPC
      const abortController = new AbortController();
      abortRef.current = abortController;

      const result = await window.deskflowAPI!.providerChatCall({
        messages: [...messages.map(m => ({ role: 'user', content: m.raw })), { role: 'user', content: text }],
        contextBundle,
        signal: abortController.signal,
      });

      if (result.success) {
        const parsed = parseMessage(result.content, `ai-${Date.now()}`);
        setMessages(prev => [...prev, parsed]);
      } else {
        setError(result.error || 'Model returned an error');
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        setError('Generation cancelled');
      } else {
        setError(err.message || 'Failed to send message');
      }
    } finally {
      setIsGenerating(false);
      setStreamingMessage(null);
      abortRef.current = null;
    }
  }, [messages]);

  const stopGeneration = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const resetChat = useCallback(() => {
    setMessages([]);
    setError(null);
    setStreamingMessage(null);
  }, []);

  return {
    messages, sendMessage, stopGeneration, resetChat,
    isGenerating, streamingMessage, error,
  };
}
```

**Notable issues:**
- `sendMessage` depends on `messages` in useCallback — stale closure risk (needs ref or functional setState)
- Context bundle is built on every message — wasteful if context hasn't changed
- `result` uses `.content` but `CanonicalResponse` has `.content` — types align
- Uses AbortController but the main.ts IPC handler must also support abort signals
- Streaming is set up but `streamingMessage` is never actually updated (no stream reader in this version)
- Error is surfaced but only as a banner in ChatPanel — no inline action suggestion

### `src/services/aiContextBundle.ts`

```typescript
import { AiContextBundle, GoalSummary } from './types';

export async function buildContextBundle(): Promise<string> {
  try {
    const goals = await window.deskflowAPI!.getGoals().catch(() => ({ goals: [] }));
    const goalContext = await window.deskflowAPI!.getGoalContext().catch(() => null);
    const longterm = await window.deskflowAPI!.getLongtermGoals().catch(() => ({ goals: [] }));

    const sections: string[] = [
      '# Current Context',
      `Date: ${new Date().toLocaleDateString()}`,
      '',
      '# Goals',
      ...(goals.goals || []).map((g: any) => `- [${g.status === 'done' ? 'x' : ' '}] ${g.title} (${g.status})`),
      '',
      '# Long-term Goals',
      ...(longterm.goals || []).map((g: any) => `- ${g.title}`),
      '',
    ];

    if (goalContext?.planningContent) {
      sections.push('# Planning Notes', goalContext.planningContent, '');
    }
    if (goalContext?.unfinished?.length) {
      sections.push('# Unfinished', ...goalContext.unfinished.map((g: any) => `- ${g.title}`), '');
    }
    if (goalContext?.recentlyCompleted?.length) {
      sections.push('# Recently Completed', ...goalContext.recentlyCompleted.map((g: any) => `- ${g.title}`), '');
    }

    return sections.join('\n');
  } catch {
    return '# Context\nUnable to load context.';
  }
}
```

**Notable issues:**
- Fails silently — any error produces "Unable to load context" with no way for the UI to know context is missing
- Only includes goals context — doesn't include connectors data, recent activity, or current focus
- No token budget awareness — context could grow unbounded

---

## 12. IPC Bridge — Preload & Main

### `src/preload.ts` — AI/Goals Bridge Channels

```typescript
// AI Provider Configs
'get-provider-configs': () => ipcRenderer.invoke('get-provider-configs'),
'upsert-provider-config': (config: any) => ipcRenderer.invoke('upsert-provider-config', config),
'delete-provider-config': (id: string) => ipcRenderer.invoke('delete-provider-config', id),

// AI Chat
'provider-chat-call': (req: any) => ipcRenderer.invoke('provider-chat-call', req),

// Goals
'get-goals': () => ipcRenderer.invoke('get-goals'),
'save-goal': (goal: any) => ipcRenderer.invoke('save-goal', goal),
'suggest-goals': (date: string, context: any) => ipcRenderer.invoke('suggest-goals', date, context),
'toggle-goal-status': (id: number, status: string) => ipcRenderer.invoke('toggle-goal-status', id, status),
'delete-goal': (id: number) => ipcRenderer.invoke('delete-goal', id),
'review-goals': () => ipcRenderer.invoke('review-goals'),
'get-goal-context': () => ipcRenderer.invoke('get-goal-context'),

// Long-term Goals
'get-longterm-goals': () => ipcRenderer.invoke('get-longterm-goals'),
'save-longterm-goals': (data: any) => ipcRenderer.invoke('save-longterm-goals', data),

// Digest
'get-topic-digest': () => ipcRenderer.invoke('get-topic-digest'),

// Connectors
'connector-list': () => ipcRenderer.invoke('connector-list'),
'connector-get': (id: string) => ipcRenderer.invoke('connector-get', id),
'connector-create': (config: any) => ipcRenderer.invoke('connector-create', config),
'connector-update': (id: string, config: any) => ipcRenderer.invoke('connector-update', id, config),
'connector-delete': (id: string) => ipcRenderer.invoke('connector-delete', id),
'connector-test': (id: string) => ipcRenderer.invoke('connector-test', id),
'connector-sync': (id: string) => ipcRenderer.invoke('connector-sync', id),
'connector-get-items': (id: string) => ipcRenderer.invoke('connector-get-items', id),
```

### `src/main.ts` — Key IPC Handlers

```typescript
// providerChatCall handler (c. line 13429)
ipcMain.handle('provider-chat-call', async (event, req) => {
  try {
    const configs = await getProviderConfigs();
    const result = await runWithFallback(
      configs.filter(c => c.slot === 'default'),
      configs.filter(c => c.slot !== 'default'),
      req
    );
    return { success: true, content: result.content };
  } catch (err: any) {
    return { success: false, error: err.message || 'Provider call failed' };
  }
});

// suggest-goals handler (c. line 13945)
ipcMain.handle('suggest-goals', async (event, date, context) => {
  try {
    const configs = await getGoalAssistantConfig();
    const result = await runWithFallback(
      [configs],
      [],
      {
        model: 'gpt-4',
        messages: [{ role: 'user', content: buildSuggestPrompt(date, context) }],
        systemPrompt: 'You are a goal-setting assistant. Suggest 3-5 SMART goals.',
        temperature: 0.8,
      }
    );
    const suggestions = parseGoalSuggestions(result.content);
    return { success: true, suggestions };
  } catch (err: any) {
    return { success: false, error: err.message || 'Goal suggestion failed' };
  }
});

// save-goal handler (c. line 13970)
ipcMain.handle('save-goal', async (event, goal) => {
  try {
    const db = getDb();
    const stmt = db.prepare('INSERT INTO goals (title, description, category, status, created_date) VALUES (?, ?, ?, ?, ?)');
    stmt.run(goal.title, goal.description, goal.category, 'active', new Date().toISOString());
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});

// toggle-goal-status handler
ipcMain.handle('toggle-goal-status', async (event, id, status) => {
  try {
    const db = getDb();
    const stmt = db.prepare('UPDATE goals SET status = ?, completed_date = CASE WHEN ? = "done" THEN ? ELSE completed_date END WHERE id = ?');
    stmt.run(status, status, new Date().toISOString(), id);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});

// get-goal-context handler
ipcMain.handle('get-goal-context', async () => {
  try {
    const db = getDb();
    const planning = db.prepare('SELECT planning_notes FROM longterm_goals LIMIT 1').get() as any;
    const unfinished = db.prepare('SELECT * FROM goals WHERE status = "active"').all();
    const recentlyCompleted = db.prepare('SELECT * FROM goals WHERE status = "done" AND completed_date > ?').all(
      new Date(Date.now() - 7 * 86400000).toISOString()
    );
    return {
      success: true,
      planningContent: planning?.planning_notes || '',
      unfinished,
      recentlyCompleted,
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});
```

**Notable issues:**
- `suggest-goals` calls `getGoalAssistantConfig()` — if this returns null/undefined, `runWithFallback` will fail
- All handlers return `{ success, error }` — consistent pattern
- `toggle-goal-status` and `save-goal` have no validation on input
- `get-goal-context` has a hardcoded 7-day window for recentlyCompleted

---

## 13. Database Schema

```sql
-- Goals table
CREATE TABLE IF NOT EXISTS goals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  category TEXT DEFAULT 'general',
  status TEXT DEFAULT 'active' CHECK(status IN ('active', 'done', 'abandoned')),
  created_date TEXT,
  completed_date TEXT,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Long-term goals table
CREATE TABLE IF NOT EXISTS longterm_goals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  target_date TEXT,
  progress INTEGER DEFAULT 0,
  planning_notes TEXT DEFAULT '',
  created_date TEXT,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Provider configs table
CREATE TABLE IF NOT EXISTS provider_configs (
  id TEXT PRIMARY KEY,
  label TEXT,
  slot TEXT DEFAULT 'default' CHECK(slot IN ('default', 'goalAssistant', 'researchDigest')),
  template_id TEXT NOT NULL,
  base_url TEXT,
  api_key_encrypted TEXT,
  models TEXT, -- JSON array
  monthly_token_budget INTEGER,
  tokens_used_this_month INTEGER DEFAULT 0,
  timeout_ms INTEGER DEFAULT 120000,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Connectors table
CREATE TABLE IF NOT EXISTS connectors (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK(type IN ('email', 'calendar')),
  name TEXT NOT NULL,
  config_encrypted TEXT,
  status TEXT DEFAULT 'disconnected' CHECK(status IN ('active', 'error', 'disconnected')),
  last_sync TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Connector items table
CREATE TABLE IF NOT EXISTS connector_items (
  id TEXT PRIMARY KEY,
  connector_id TEXT REFERENCES connectors(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  data_json TEXT,
  synced_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

---

## 14. Design Tokens

```css
/* CSS Variables (from app theme) */
--bg-primary: #0c0c0f;
--bg-secondary: #141418;
--bg-tertiary: #1a1a24;
--bg-card: #1e1e2a;
--accent-primary: #6366f1;
--accent-secondary: #8b5cf6;
--accent-success: #22c55e;
--accent-warning: #f59e0b;
--accent-error: #ef4444;
--text-primary: #f1f5f9;
--text-secondary: #94a3b8;
--text-muted: #64748b;
--border-color: #2a2a3a;
--border-subtle: #1e1e2e;

/* GlassCard component: backdrop-blur, semi-transparent bg, subtle border */
.glass-card {
  background: rgba(30, 30, 42, 0.8);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(42, 42, 58, 0.5);
  border-radius: 12px;
  padding: 16px;
}

/* Deck grid layout */
.ai-deck-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  padding: 16px;
}

.ai-deck-chat { grid-column: 1 / -1; }
.ai-deck-focus { grid-column: 1; }
.ai-deck-plan { grid-column: 2; }
.ai-deck-reflect { grid-column: 1; }
.ai-deck-digest { grid-column: 2; }
.ai-deck-connectors { grid-column: 1 / -1; }

/* Buttons */
button {
  background: var(--accent-primary);
  color: white;
  border: none;
  border-radius: 8px;
  padding: 8px 16px;
  cursor: pointer;
  font-size: 0.875rem;
  transition: opacity 0.2s;
}
button:disabled { opacity: 0.5; cursor: not-allowed; }
button.danger { background: var(--accent-error); }

/* Error banners */
.error-banner {
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 8px;
  padding: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--accent-error);
}

/* Empty state */
.empty-state {
  text-align: center;
  padding: 24px;
  color: var(--text-muted);
}

/* Loading pulse */
.loading-pulse {
  width: 100%;
  height: 4px;
  background: linear-gradient(90deg, var(--bg-tertiary), var(--accent-primary), var(--bg-tertiary));
  background-size: 200% 100%;
  animation: pulse 1.5s ease infinite;
  border-radius: 2px;
}
@keyframes pulse {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
```

Design system context: DeskFlow uses a dark theme (zinc/indigo palette), Geist font for body text, JetBrains Mono for code, rounded-xl (12px) max radius, p-5 padding on cards, backdrop-blur glass effects, and subtle border-1 borders.

---

## 15. State Management — Summary

**AiPage.tsx** manages all state directly via `useState` hooks — there is no global store (no Redux, no Zustand, no Context for AI page). State is passed down via props through `AiPageDeck` to child components.

Key state categories and where they're managed:

| State | Type | Managed By | Passed To |
|-------|------|-----------|-----------|
| `messages` | `ParsedMessage[]` | `useAiChat` hook | ChatPanel |
| `isGenerating` | `boolean` | `useAiChat` hook | ChatPanel |
| `streamingMessage` | `string\|null` | `useAiChat` hook | ChatPanel |
| `chatError` | `string\|null` | `useAiChat` hook | ChatPanel |
| `goals` | `any[]` | AiPage.tsx | FocusBoard |
| `suggestions` | `any[]` | AiPage.tsx | FocusBoard |
| `suggesting` | `boolean` | AiPage.tsx | FocusBoard |
| `suggestionError` | `string\|null` | AiPage.tsx | FocusBoard |
| `reviewSuggestions` | `any[]` | AiPage.tsx | FocusBoard |
| `reviewing` | `boolean` | AiPage.tsx | FocusBoard |
| `longtermGoals` | `any[]` | AiPage.tsx | PlanBoard |
| `planningNotes` | `string` | AiPage.tsx | PlanBoard |
| `digest` | `any` | AiPage.tsx | DailyDigestBoard |
| `generatingDigest` | `boolean` | AiPage.tsx | DailyDigestBoard |
| `connectors` | `Connector[]` | AiPage.tsx | ConnectorsPanel |
| `providerConfigs` | `Record<string, ProviderConfig>` | AiPage.tsx | ChatPanel, AiProviderSelectModal |

Data flow direction: User action → AiPage handler → IPC call → main.ts handler → DB → response → AiPage state update → re-render.
