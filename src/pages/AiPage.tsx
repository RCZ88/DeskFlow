import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, BookOpen, Newspaper, Bell, History, Sparkles, ListTodo } from 'lucide-react';
import { AiPageDeck } from '../components/ai/deck/AiPageDeck';
import { useCanvasState } from '../hooks/useCanvasState';
import { CanvasContainer } from '../components/ai/canvas/CanvasContainer';
import { CanvasGrid } from '../components/ai/canvas/CanvasGrid';
import { CanvasInput } from '../components/ai/canvas/CanvasInput';
import { CommandPalette } from '../components/ai/canvas/CommandPalette';
import { DailyPlannerCard } from '../components/ai/canvas/cards/DailyPlannerCard';
import { WeeklyScheduleCard } from '../components/ai/canvas/cards/WeeklyScheduleCard';
import { DeadlineTrackerCard } from '../components/ai/canvas/cards/DeadlineTrackerCard';
import type { CardType } from '../types/canvas';
import type { Intent } from '../services/intentParser';
import { FocusBoard } from '../components/ai/focus/FocusBoard';
import { PlanBoard } from '../components/ai/plan/PlanBoard';
import { ReflectFeed } from '../components/ai/reflect/ReflectFeed';
import { SummaryGrid } from '../components/ai/summary/SummaryGrid';
import { parseChecklist } from '../services/planningParser';
import { DailyDigestBoard } from '../components/ai/digest/DailyDigestBoard';
import { ConnectorsPanel } from '../components/ai/connectors/ConnectorsPanel';
import { AIFeaturesModal } from '../components/AIFeaturesModal';
import { AiProviderSelectModal, getProviderBadge } from '../components/AiProviderSelectModal';
import { ConnectorSetupModal } from '../components/ConnectorSetupModal';
import type { DataState, Goal, GoalDay, Mode, LongTermGoal } from '../components/ai/types';
import { useAiChat } from '../hooks/useAiChat';
import { useSlashCommands } from '../hooks/useSlashCommands';
import { useAutoSync } from '../hooks/useAutoSync';
import { useVoiceInput } from '../hooks/useVoiceInput';
import type { CardAction } from '../components/ai/chat/parsed';
import { GoalsRemindersDrawer } from '../components/ai/reminders/GoalsRemindersDrawer';
import { ChatHistory } from '../components/ai/chat/ChatHistory';
import { SlashCommandManager } from '../components/ai/chat/SlashCommandManager';
import type { ChatSuggestion } from '../components/ai/chat/ChatEmptyState';

// Toast system for transient feedback
interface Toast { id: string; message: string; type: 'success' | 'error' | 'info' }
let toastCounter = 0;

function getToday() { return new Date().toISOString().slice(0, 10); }

function timeAgoStr(date: Date): string {
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(diff / 3600000);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

function determineMode(goals: Goal[]): Mode {
  if (goals.length === 0) return 'morning';
  const now = new Date();
  const hour = now.getHours();
  if (hour >= 20) return 'review';
  const allDone = goals.every(g => g.status === 'done' || g.status === 'missed');
  if (allDone && goals.length > 0) return 'review';
  return 'in-progress';
}

const modeLabelMap: Record<Mode, string> = {
  morning: 'Morning Planning',
  'in-progress': 'In Progress',
  review: 'Evening Review',
};

export function AiPage() {
  const today = getToday();

  const [goals, setGoals] = useState<Goal[]>([]);
  const [review, setReview] = useState<string | null>(null);
  const [goalsState, setGoalsState] = useState<DataState>('loading');
  const [goalsError, setGoalsError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<Goal[]>([]);
  const [planGoals, setPlanGoals] = useState<Goal[]>([]);
  const [longTermGoals, setLongTermGoals] = useState<LongTermGoal[]>([]);
  const [planningNotes, setPlanningNotes] = useState('');
  const [showFeatures, setShowFeatures] = useState(false);
  const navigate = useNavigate();
  const openSettings = useCallback(() => {
    try { localStorage.setItem('settings-activeTab', 'ai'); } catch (e) { console.error('[AiPage] save activeTab:', e); }
    navigate('/settings');
  }, [navigate]);

  const [digestTopics, setDigestTopics] = useState<any[]>([]);
  const [digestState, setDigestState] = useState<DataState>('loading');
  const [digestReason, setDigestReason] = useState<string | null>(null);
  const digestPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [aiProviders, setAiProviders] = useState<Array<{ id: string; label: string; models: string[]; enabled: boolean }>>([]);
  const [aiRouting, setAiRouting] = useState<Record<string, { providerId: string; model: string } | null>>({});
  const [configuringFeature, setConfiguringFeature] = useState<'default' | 'researchDigest' | 'goalAssistant' | null>(null);
  const [showConnectorSetup, setShowConnectorSetup] = useState(false);
  const [connectorsState, setConnectorsState] = useState<'loading' | 'error' | 'empty' | 'ready'>('loading');
  const [connectors, setConnectors] = useState<Array<{ id: string; name: string; status: string; detail?: string; itemCount?: number; type?: string }>>([]);

  const chat = useAiChat();
  const slash = useSlashCommands();
  const voice = useVoiceInput({
    onTranscript: useCallback((text: string) => {
      if (text.trim()) chat.send(text.trim());
    }, [chat]),
  });
  const [actionResults, setActionResults] = useState<Record<string, 'running' | 'done' | 'error'>>({});
  const [connectorSyncing, setConnectorSyncing] = useState<Record<string, true>>({});
  const [reflectDays, setReflectDays] = useState<GoalDay[]>([]);
  const [connectorStatus, setConnectorStatus] = useState({
    unreadCount: 0,
    todayEventCount: 0,
    lastSyncTime: undefined as string | undefined,
    syncing: false,
  });
  // Toast system
  const [toasts, setToasts] = useState<Toast[]>([]);
  const showToast = useCallback((message: string, type: Toast['type'] = 'info') => {
    const id = `toast-${++toastCounter}`;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);
  const dismissToast = useCallback((id: string) => setToasts(prev => prev.filter(t => t.id !== id)), []);

  // Goals & Reminders state
  const [reminders, setReminders] = useState<any[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<any[]>([]);
  const [remindersLoading, setRemindersLoading] = useState(false);
  const [remindersError, setRemindersError] = useState<string | null>(null);

  // Focus board per-action errors
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [toggleErrors, setToggleErrors] = useState<Record<number, string>>({});
  const [acceptErrors, setAcceptErrors] = useState<Record<string, string>>({});

  // Chat context warnings
  const [contextWarnings, setContextWarnings] = useState<string[]>([]);
  const dismissError = useCallback((index: number) => {
    setContextWarnings(prev => prev.filter((_, i) => i !== index));
  }, []);

  const [dayWindow, setDayWindow] = useState(5);
  const handleLoadOlder = useCallback(() => setDayWindow(prev => prev + 5), []);

  // History drawer state
  const [historyOpen, setHistoryOpen] = useState(false);
  const [chatHistoryOpen, setChatHistoryOpen] = useState(false);
  const [commandsOpen, setCommandsOpen] = useState(false);
  const [expandedCardIds, setExpandedCardIds] = useState<Set<string>>(new Set());
  const [canvasMode, setCanvasMode] = useState(true);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const canvas = useCanvasState();
  const [autoApprove, setAutoApprove] = useState(false);
  const [autoFocus, setAutoFocus] = useState(true);
  const [focusedCardId, setFocusedCardId] = useState<string | null>(null);

  // ── Bridge: ParsedMessage → CanvasCard helpers ──
  const processedMsgIds = useRef<Set<string>>(new Set());
  const msgContentLengths = useRef<Map<string, number>>(new Map());
  const msgCardIds = useRef<Map<string, string>>(new Map());
  const lastCardId = useRef<string | null>(null);
  const recentCardSpawns = useRef<Map<string, number>>(new Map());
  const CARD_DEDUP_MS = 5000;

  function mapParsedToCardType(parsedType: string): CardType {
    switch (parsedType) {
      case 'goal_suggestion': return 'focus'
      case 'plan_update': return 'plan'
      case 'stats_summary': return 'finance'
      case 'digest_item': return 'digest'
      case 'action_list': return 'approval'
      case 'connector_status': return 'connectors'
      case 'form_fill': return 'response'
      case 'chart_data': return 'response'
      case 'reminder_create': return 'annotation'
      case 'goal_event_link': return 'annotation'
      case 'error': return 'response'
      default: return 'response'
    }
  }

  function isDuplicate(type: string, dataHash: string): boolean {
    const key = `${type}:${dataHash}`
    const last = recentCardSpawns.current.get(key)
    if (last && Date.now() - last < CARD_DEDUP_MS) return true
    recentCardSpawns.current.set(key, Date.now())
    return false
  }

  function getCardPosition(type: CardType): { x: number; y: number } {
    const existing = Object.values(canvas.allCards).filter((c: any) => c.type === type && c.pinned)
    const offset = existing.length * 40
    const basePositions: Record<string, { x: number; y: number }> = {
      focus: { x: 40, y: 40 }, plan: { x: 40, y: 320 },
      finance: { x: 360, y: 40 }, digest: { x: 360, y: 320 },
      approval: { x: 200, y: 200 }, connectors: { x: 40, y: 600 },
      response: { x: 40, y: 40 }, group: { x: 40, y: 40 },
      annotation: { x: 40, y: 40 }, reflect: { x: 360, y: 600 },
      transient: { x: 40, y: 40 },
    }
    const base = basePositions[type] || { x: 40, y: 40 }
    return { x: base.x + offset, y: base.y + offset }
  }

  function spawnTypedCard(parsed: any, pos: { x: number; y: number }): string | null {
    const dataHash = JSON.stringify(parsed).slice(0, 100)
    if (isDuplicate(parsed.type, dataHash)) return null

    switch (parsed.type) {
      case 'goal_suggestion':
        return canvas.addCard('focus', { goals: parsed.goals, source: parsed.source },
          { size: { w: 8, h: 6 }, pinned: false, source: 'ai', position: pos })
      case 'plan_update':
        return canvas.addCard('plan', { goals: parsed.changes?.map((c: any) => c.goal) || [], notes: parsed.note },
          { size: { w: 8, h: 6 }, pinned: false, source: 'ai', position: pos })
      case 'stats_summary': {
        const metrics = parsed.metrics || []
        const balance = metrics.find((m: any) => m.label?.toLowerCase().includes('balance'))?.value || 0
        const income = metrics.find((m: any) => m.label?.toLowerCase().includes('income'))?.value || 0
        const expense = metrics.find((m: any) => m.label?.toLowerCase().includes('expense'))?.value || 0
        return canvas.addCard('finance', { summary: { totalBalance: balance, monthlySpent: expense, monthlyBudget: income, subscriptions: [] }, metrics: parsed.metrics },
          { size: { w: 6, h: 4 }, pinned: false, source: 'ai', position: pos })
      }
      case 'digest_item':
        return canvas.addCard('digest', { topics: [{ topic: parsed.topic, summary: parsed.summary, sources: parsed.sources }] },
          { size: { w: 6, h: 4 }, pinned: false, source: 'ai', position: pos })
      case 'action_list':
        return canvas.addCard('approval', { title: parsed.actions?.[0]?.label || 'Action Required', description: parsed.note || parsed.actions?.map((a: any) => a.label).join(', '), actions: parsed.actions },
          { size: { w: 6, h: 4 }, pinned: true, source: 'ai', position: pos })
      case 'connector_status':
        return canvas.addCard('connectors', { connectors: parsed.connectors },
          { size: { w: 10, h: 8 }, pinned: false, source: 'ai', position: pos })
      case 'form_fill':
        return canvas.addCard('response', { content: `**Form:** ${parsed.title || 'Untitled'}\n\n` + (parsed.fields || []).map((f: any) => `- ${f.label}: ${f.value || '(empty)'}`).join('\n'), isToolOutput: false },
          { size: { w: 8, h: 5 }, pinned: false, source: 'ai', position: pos })
      case 'chart_data':
        return canvas.addCard('response', { content: `**Chart:** ${parsed.title || 'Data Visualization'}\n\nType: ${parsed.chartType}\nLabels: ${parsed.labels?.join(', ') || 'N/A'}`, isToolOutput: false },
          { size: { w: 8, h: 5 }, pinned: false, source: 'ai', position: pos })
      case 'reminder_create':
        return canvas.addCard('annotation', { text: `Reminder: ${parsed.text}${parsed.dueDate ? ` (due ${parsed.dueDate})` : ''}`, parentType: 'reminder' },
          { size: { w: 6, h: 3 }, pinned: false, source: 'ai', position: pos })
      case 'goal_event_link':
        return canvas.addCard('annotation', { text: `Linked event: ${parsed.eventTitle}`, parentType: 'goal link' },
          { size: { w: 6, h: 3 }, pinned: false, source: 'ai', position: pos })
      case 'error':
        return canvas.addCard('response', { content: `**Error:** ${parsed.message}\n\n${parsed.recovery ? `Recovery: ${parsed.recovery}` : ''}`, isToolOutput: false },
          { size: { w: 8, h: 4 }, pinned: false, source: 'ai', position: pos })
      default: return null
    }
  }

  // ── Main bridge useEffect ──
  useEffect(() => {
    if (!canvasMode) return;

    const newMsgs = chat.messages.filter(m => !processedMsgIds.current.has(m.id));
    
    // Also detect content updates to existing assistant messages (streaming)
    const updatedMsgs = chat.messages.filter(m => 
      processedMsgIds.current.has(m.id) && 
      m.role === 'assistant' && 
      m.content && 
      m.content.length > (msgContentLengths.current.get(m.id) || 0)
    );

    if (newMsgs.length === 0 && updatedMsgs.length === 0) return;

    // Handle streaming updates to existing assistant messages
    updatedMsgs.forEach(msg => {
      const cardId = msgCardIds.current.get(msg.id);
      if (cardId && canvas.allCards[cardId]) {
        canvas.updateCard(cardId, {
          data: {
            ...canvas.allCards[cardId].data,
            content: msg.content,
          },
        });
        msgContentLengths.current.set(msg.id, msg.content.length);
        setFocusedCardId(cardId);
      }
    });

    if (newMsgs.length === 0) return;

    newMsgs.forEach(msg => {
      if (msg.role === 'user') {
        processedMsgIds.current.add(msg.id);
        msgContentLengths.current.set(msg.id, msg.content.length);
        const cardId = canvas.addCard('response', {
          content: msg.content,
          timestamp: msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : undefined,
          isUserInput: true,
        }, {
          size: { w: 10, h: 4 },
          pinned: true,
          source: 'user',
          position: getCardPosition('response'),
        });
        setFocusedCardId(cardId);
        return;
      }

      if (msg.role !== 'assistant') return;

      // Skip empty assistant messages — they're placeholder slots before streaming fills content
      if (!msg.content && !msg.parsed) return;

      processedMsgIds.current.add(msg.id);
      msgContentLengths.current.set(msg.id, msg.content.length);

      const parsed = msg.parsed;
      const isStructured = parsed && parsed.type !== 'text';

      // ── STRUCTURED → typed card + optional prose card ──
      if (isStructured && parsed) {
        const prose = msg.content;
        const typedPos = getCardPosition(mapParsedToCardType(parsed.type));
        const typedCardId = spawnTypedCard(parsed, typedPos);
        if (typedCardId) lastCardId.current = typedCardId;

        if (prose && prose.trim().length > 10) {
          const prosePos = { x: typedPos.x, y: typedPos.y + (parsed.type === 'connector_status' ? 320 : 240) };
          const proseCardId = canvas.addCard('response', {
            content: prose,
            timestamp: msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : undefined,
            isToolOutput: false,
          }, {
            size: { w: 10, h: 5 },
            pinned: false,
            source: 'ai',
            position: prosePos,
          });
          lastCardId.current = proseCardId;
          msgCardIds.current.set(msg.id, proseCardId);
        }
        return;
      }

      // ── PLAIN TEXT → existing pairing logic ──
      if (lastCardId.current && canvas.allCards[lastCardId.current]) {
        const existing = canvas.allCards[lastCardId.current];
        if (existing.type === 'response' && existing.data?.isUserInput) {
          canvas.updateCard(lastCardId.current, {
            data: {
              ...existing.data,
              aiResponse: msg.content,
              aiTimestamp: msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : undefined,
            },
            size: { w: 10, h: 8 },
          });
          msgCardIds.current.set(msg.id, lastCardId.current);
          return;
        }
      }

      const standaloneCardId = canvas.addCard('response', {
        content: msg.content,
        timestamp: msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : undefined,
        isToolOutput: msg.content.includes('```tool') || msg.content.includes('```'),
      }, {
        size: { w: 10, h: 6 },
        pinned: false,
        source: 'ai',
        position: getCardPosition('response'),
      });
      lastCardId.current = standaloneCardId;
      msgCardIds.current.set(msg.id, standaloneCardId);
      setFocusedCardId(standaloneCardId);
    });
  }, [chat.messages, canvasMode]);

  // Auto-spawn connectors card in Canvas mode
  // Check canvas for existing connectors card instead of relying on ref (ref resets on mode switch)
  const connectorsCardIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!canvasMode) return;
    // Wait until connectors are loaded
    if (connectorsState === 'loading') return;
    // Check if a connectors card already exists in the canvas
    const existingConnectors = Object.values(canvas.allCards).find((c: any) => c.type === 'connectors');
    if (existingConnectors) {
      connectorsCardIdRef.current = existingConnectors.id;
      // Update card data when connectors change
      canvas.updateCard(existingConnectors.id, {
        data: {
          ...existingConnectors.data,
          state: connectorsState,
          connectors,
          syncing: connectorSyncing,
        },
      });
      return;
    }
    // Only spawn if ref is also null (double guard)
    if (connectorsCardIdRef.current) return;

    connectorsCardIdRef.current = canvas.addCard('connectors', {
      state: connectorsState,
      connectors,
      errorMessage: goalsError || undefined,
      onRetry: loadGoals,
      onAdd: () => setShowConnectorSetup(true),
      onSync: async (id: string) => {
        setConnectorSyncing(prev => ({ ...prev, [id]: true }));
        try {
          const r = await window.deskflowAPI!.connectors?.sync?.(id);
          if (r?.success) {
            showToast(`Synced — ${r.itemsAdded || 0} items`, 'success');
          } else {
            showToast(r?.error || 'Sync failed', 'error');
          }
          await loadConnectors();
        } catch (e: any) {
          showToast(e?.message || 'Sync error', 'error');
        } finally {
          setConnectorSyncing(prev => { const n = { ...prev }; delete n[id]; return n; });
        }
      },
      onRefresh: loadConnectors,
      syncing: connectorSyncing,
    }, {
      position: { x: 40, y: 40 },
      size: { w: 10, h: 8 },
      pinned: true,
      source: 'user',
    });
  }, [canvasMode, connectorsState]);

  // Auto-spawn schedule, deadline, and planner cards in Canvas mode
  const scheduleCardIdRef = useRef<string | null>(null);
  const deadlineCardIdRef = useRef<string | null>(null);
  const plannerCardIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!canvasMode) return;
    if (goalsState === 'loading') return;

    // Spawn planner card if goals exist and no planner card
    if (goals.length > 0 && !plannerCardIdRef.current) {
      const existing = Object.values(canvas.allCards).find((c: any) => c.type === 'planner');
      if (!existing) {
        plannerCardIdRef.current = canvas.addCard('planner', {}, {
          position: { x: 40, y: 400 },
          size: { w: 10, h: 8 },
          pinned: true,
          source: 'user',
        });
      } else {
        plannerCardIdRef.current = existing.id;
      }
    }

    // Spawn schedule card if we have goals (indicates active usage)
    if (goals.length > 0 && !scheduleCardIdRef.current) {
      const existing = Object.values(canvas.allCards).find((c: any) => c.type === 'schedule');
      if (!existing) {
        scheduleCardIdRef.current = canvas.addCard('schedule', {}, {
          position: { x: 440, y: 400 },
          size: { w: 12, h: 8 },
          pinned: true,
          source: 'user',
        });
      } else {
        scheduleCardIdRef.current = existing.id;
      }
    }
  }, [canvasMode, goalsState, goals.length]);

  const unfinishedCount = goals.filter(g => g.status !== 'done' && g.status !== 'missed').length;
  const mode = determineMode(goals);

  const goalsDataState = (() => {
    if (goalsState === 'loading') return 'loading';
    if (goalsError) return 'error';
    if (goals.length === 0) return 'empty';
    return 'ready';
  })();

  const digestDataState = (() => {
    if (digestState === 'loading') return 'loading';
    if (digestTopics.length === 0) return 'empty';
    return 'ready';
  })();

  const focusMetrics = {
    doneToday: goals.filter(g => g.status === 'done').length,
    inProgress: goals.filter(g => g.status === 'active').length,
    focusSeconds: 0,
  };

  const summaryStats = {
    goalsCompleted: goals.filter(g => g.status === 'done').length,
    focusSeconds: 0,
    streakDays: 0,
    activeGoals: goals.filter(g => g.status === 'active').length,
  };

  const glanceMetrics = [
    { label: 'Done today', value: String(summaryStats.goalsCompleted) },
    { label: 'Active', value: String(summaryStats.activeGoals) },
    { label: 'Unfinished', value: String(unfinishedCount) },
    { label: 'Focus', value: '—' },
  ];

  // Dynamic suggestions based on time + context
  const chatSuggestions = useMemo<ChatSuggestion[]>(() => {
    const hour = new Date().getHours();
    const base: ChatSuggestion[] = [];

    if (hour < 12) {
      base.push({ id: "morning-plan", label: "Plan my morning", prompt: "Help me plan my morning based on my goals and calendar." });
    } else if (hour < 17) {
      base.push({ id: "afternoon-focus", label: "Afternoon focus", prompt: "What should I focus on for the rest of the day?" });
    } else {
      base.push({ id: "evening-review", label: "Review today", prompt: "Review my progress today and suggest tomorrow's priorities." });
    }

    base.push(
      { id: "goal-check", label: "Check goal progress", prompt: "How am I doing on my active goals this week?" },
      { id: "summarize", label: "Summarize week", prompt: "Give me a summary of my week so far." },
      { id: "deep-work", label: "Deep work session", prompt: "Help me plan a 90-minute deep work session." },
    );

    return base;
  }, [chat.currentThreadDate]);

  const loadGoals = useCallback(async () => {
    setGoalsState('loading');
    setGoalsError(null);
    try {
      const day: GoalDay = await window.deskflowAPI!.getGoals(today);
      setGoals(day.goals || []);
      setReview(day.reviewSummary || null);
      setGoalsState(day.goals?.length ? 'ready' : 'empty');
    } catch (err: any) {
      setGoalsError(err.message || 'Failed to load goals');
      setGoalsState('error');
    }
  }, [today]);

  const loadDigest = useCallback(async (showLoader = true, force = false) => {
    if (showLoader) setDigestState('loading');
    try {
      const r = await window.deskflowAPI!.getTopicDigest(force ? { force: true } : undefined);
      if (r.success) { setDigestTopics(r.topics || []); setDigestReason(r.reason || null); setDigestState(r.topics?.length ? 'ready' : 'empty'); }
      else { setDigestState('error'); setDigestReason(null); }
    } catch (err: any) {
      console.error('[AiPage] loadDigest:', err);
      setDigestState('error');
    }
  }, []);

  const loadPlanGoals = useCallback(async () => {
    try {
      const r = await window.deskflowAPI!.readPlanningMd();
      if (r.content) {
        const items = parseChecklist(r.content).filter(i => !i.checked);
        setPlanGoals(items.map(i => ({ id: crypto.randomUUID(), title: i.title, targetSeconds: i.targetSeconds, category: 'work' as const, status: 'active' as const, period: 'daily', date: today, source: 'planning', links: [], createdAt: new Date().toISOString(), target: { type: 'completion' as const } })));
        setPlanningNotes(r.content);
      }
    } catch (e) { console.error('[AiPage] loadPlanGoals:', e); }
  }, [today]);

  const loadLongTermGoals = useCallback(async () => {
    try {
      const r = await window.deskflowAPI!.getLongtermGoals();
      if (r.success && r.goals) {
        setLongTermGoals(r.goals.map((g: any) => ({
          id: g.id,
          title: g.title,
          description: g.description,
          category: g.category,
          status: g.status === 'completed' ? 'done' : g.status,
          priority: g.priority ?? 3,
          createdAt: g.createdAt,
          completedAt: g.completedAt,
          links: g.links || [],
          target: g.target || { type: 'completion' },
        })));
      }
    } catch (e) { console.error('[AiPage] loadLongTermGoals:', e); }
  }, []);

  const loadReminders = useCallback(async () => {
    try {
      const result = await window.deskflowAPI!.getReminders();
      if (result?.success) setReminders(result.reminders || []);
    } catch (e: any) {
      setRemindersError(e.message);
    }
  }, []);

  const loadCalendarEvents = useCallback(async () => {
    if (!connectors.length) return;
    setRemindersLoading(true);
    try {
      const allEvents: any[] = [];
      for (const connector of connectors) {
        if (connector.type === "calendar") {
          const result = await (window.deskflowAPI! as any).connectors?.items?.(connector.id, { type: "event", limit: 20 });
          if (result?.items) {
            allEvents.push(...result.items.map((item: any) => ({
              id: item.id,
              title: item.subject || "Untitled Event",
              date: item.date,
              connectorName: connector.name,
              connectorId: connector.id,
            })));
          }
        }
      }
      setCalendarEvents(allEvents.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
    } catch (e: any) {
      setRemindersError(e.message);
    } finally {
      setRemindersLoading(false);
    }
  }, [connectors]);

  useEffect(() => { loadReminders(); }, [loadReminders]);
  useEffect(() => { loadCalendarEvents(); }, [loadCalendarEvents]);

  const loadReflect = useCallback(async () => {
    try {
      const start = new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10);
      const r = await window.deskflowAPI!.getGoalsBatch(start, today);
      if (r?.success && Array.isArray(r.days)) {
        setReflectDays(r.days.map((d: any) => ({ date: d.date, goals: d.goals || [], reviewSummary: d.reviewSummary || undefined })));
      }
    } catch (e) { console.error('[AiPage] loadReflect:', e); }
  }, [today]);

  const [bootState, setBootState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [bootError, setBootError] = useState<string | null>(null);

  const loadBoot = useCallback(async () => {
    setBootState('loading');
    setBootError(null);
    try {
      await Promise.all([
        loadGoals(),
        loadPlanGoals(),
        loadLongTermGoals(),
        loadReflect(),
      ]);
      setBootState('ready');
    } catch (e: any) {
      console.error('[AiPage] boot failed:', e);
      setBootError(e.message || 'Failed to initialize');
      setBootState('error');
    }
  }, [loadGoals, loadPlanGoals, loadLongTermGoals, loadReflect]);

  useEffect(() => {
    loadBoot();
    const initDigest = async () => {
      const generating = await window.deskflowAPI!.isDigestGenerating();
      if (generating) {
        setDigestState('loading');
        digestPollRef.current = setInterval(async () => {
          try {
            const r = await window.deskflowAPI!.getTopicDigest();
            if (r.success && r.topics?.length > 0) {
              setDigestTopics(r.topics);
              setDigestState('ready');
              if (digestPollRef.current) { clearInterval(digestPollRef.current); digestPollRef.current = null; }
            }
          } catch (e) { console.error('[AiPage] digest poll:', e); }
        }, 3000);
      } else {
        await loadDigest();
      }
    };
    initDigest();
    const cleanup = window.deskflowAPI?.onDigestGenerationComplete?.((data: any) => {
      if (digestPollRef.current) { clearInterval(digestPollRef.current); digestPollRef.current = null; }
      if (data.success && data.topics) { setDigestTopics(data.topics); setDigestState('ready'); }
    });

    return () => {
      if (digestPollRef.current) { clearInterval(digestPollRef.current); digestPollRef.current = null; }
      cleanup?.();
    };
  }, [loadBoot, loadDigest]);

  // ⌘K / Ctrl+K to open command palette
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setPaletteOpen(v => !v)
      }
      // ⌘⇧L / Ctrl+Shift+L to toggle transcript rail
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'L') {
        e.preventDefault()
        setRailOpen(v => !v)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // Ensure core cards exist on canvas (seed missing ones, don't touch existing)
  useEffect(() => {
    if (!canvasMode) return
    const existing = canvas.cards
    const existingTypes = new Set(Object.values(existing).map((c: any) => c.type))

    if (!existingTypes.has('focus')) {
      canvas.addCard('focus', { goals }, { position: { x: 40, y: 40 }, size: { w: 8, h: 6 }, pinned: true, source: 'system' })
    }
    if (!existingTypes.has('plan')) {
      canvas.addCard('plan', { goals: longTermGoals, notes: planningNotes }, { position: { x: 400, y: 40 }, size: { w: 8, h: 6 }, pinned: true, source: 'system' })
    }
    if (!existingTypes.has('finance')) {
      canvas.addCard('finance', {}, { position: { x: 40, y: 320 }, size: { w: 6, h: 4 }, pinned: true, source: 'system' })
    }
    if (!existingTypes.has('digest')) {
      canvas.addCard('digest', { topics: digestTopics }, { position: { x: 320, y: 320 }, size: { w: 6, h: 4 }, pinned: true, source: 'system' })
    }
    if (!existingTypes.has('reflect')) {
      canvas.addCard('reflect', { days: reflectDays }, { position: { x: 320, y: 600 }, size: { w: 6, h: 4 }, pinned: true, source: 'system' })
    }
    if (!existingTypes.has('schedule')) {
      canvas.addCard('schedule', {}, { position: { x: 600, y: 40 }, size: { w: 14, h: 10 }, pinned: true, source: 'system' })
    }
    if (!existingTypes.has('deadlines')) {
      canvas.addCard('deadlines', {}, { position: { x: 600, y: 520 }, size: { w: 6, h: 8 }, pinned: true, source: 'system' })
    }
    if (!existingTypes.has('planner')) {
      canvas.addCard('planner', {}, { position: { x: 40, y: 760 }, size: { w: 8, h: 8 }, pinned: true, source: 'system' })
    }
  }, [canvasMode, goals, longTermGoals, planningNotes, digestTopics, reflectDays])

  const handlePaletteIntent = useCallback((intent: Intent) => {
    switch (intent.type) {
      case 'open_card': {
        const cardType = intent.cardType as any
        const defaultSizes: Record<string, { w: number; h: number }> = {
          focus: { w: 8, h: 5 }, plan: { w: 8, h: 5 }, finance: { w: 8, h: 4 },
          digest: { w: 6, h: 4 }, reflect: { w: 6, h: 4 },
        }
        const size = defaultSizes[cardType] || { w: 8, h: 5 }
        const existingCount = canvas.cards.filter(c => c.type === cardType).length
        const offset = existingCount * 40
        canvas.addCard(cardType, {}, { position: { x: 40 + offset, y: 40 + offset }, size, pinned: true, source: 'user' })
        break
      }
      case 'run_command': chat.send(`/${intent.command} ${intent.args || ''}`.trim()); break
      case 'send_to_ai': chat.send(intent.prompt || ''); break
      case 'custom_command': chat.send(intent.prompt || ''); break
      case 'error': showToast(intent.message || 'Unknown command', 'error'); break
    }
  }, [canvas, chat, showToast]);

  useEffect(() => {
    (async () => {
      try {
        const state = await window.deskflowAPI!.getAiProviders();
        if (state?.providers) {
          setAiProviders(state.providers.map((p: any) => ({ id: p.id, label: p.label, models: p.models || [], enabled: p.enabled })));
          setAiRouting(state.routing || {});
        }
      } catch (e) { console.error('[AiPage] getAiProviders:', e); }
    })();
  }, []);

  const loadConnectors = useCallback(async () => {
    setConnectorsState('loading');
    try {
      const r = await window.deskflowAPI!.connectors?.list?.();
      if (r?.success && Array.isArray(r.connectors)) {
        const enriched = await Promise.all(r.connectors.map(async (c: any) => {
          let itemCount: number | undefined;
          try {
            const items = await window.deskflowAPI!.connectors?.items?.(c.id, { limit: 100 });
            itemCount = items?.items?.length;
          } catch {}
          return {
            id: c.id,
            name: c.display_name || c.name || c.provider,
            status: (c.status === 'connected' ? 'ready' : c.status === 'error' ? 'error' : c.last_sync ? 'ready' : 'idle') as 'ready' | 'error' | 'idle',
            detail: c.type === 'email' ? 'IMAP · ' + (c.config?.host || '') : 'CalDAV',
            itemCount,
            type: c.type,
          };
        }));
        setConnectors(enriched);
        setConnectorsState(enriched.length === 0 ? 'empty' : 'ready');
      } else {
        setConnectors([]);
        setConnectorsState('empty');
      }
    } catch (e) {
      console.error('[AiPage] loadConnectors:', e);
      setConnectorsState('error');
    }
  }, []);

  useEffect(() => { loadConnectors(); }, [loadConnectors]);

  // Update connector status bar
  const updateConnectorStatus = useCallback(async () => {
    let unread = 0;
    let todayEvents = 0;
    let lastSync: string | undefined;

    for (const c of connectors) {
      if (c.type === 'email' && (c.status === 'ready' || c.status === 'idle')) {
        try {
          const r = await window.deskflowAPI!.connectors?.items?.(c.id, { unreadOnly: true, limit: 50 });
          if (r?.success) unread += r.items?.length || 0;
        } catch {}
      }
      if (c.type === 'calendar' && (c.status === 'ready' || c.status === 'idle')) {
        try {
          const r = await window.deskflowAPI!.connectors?.items?.(c.id, { limit: 20, type: 'event' });
          if (r?.success) {
            const now = new Date();
            const today = (r.items || []).filter((item: any) => {
              const d = new Date(item.date);
              return d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
            });
            todayEvents += today.length;
          }
        } catch {}
      }
    }

    // Get the most recent lastSync from any connector
    try {
      const r = await window.deskflowAPI!.connectors?.list?.();
      if (r?.success && r.connectors) {
        for (const c of r.connectors) {
          if (c.lastSync && (!lastSync || new Date(c.lastSync) > new Date(lastSync))) {
            lastSync = c.lastSync;
          }
        }
      }
    } catch {}

    setConnectorStatus(prev => ({
      ...prev,
      unreadCount: unread,
      todayEventCount: todayEvents,
      lastSyncTime: lastSync ? timeAgoStr(new Date(lastSync)) : undefined,
    }));
  }, [connectors]);

  useEffect(() => { updateConnectorStatus(); }, [connectors, updateConnectorStatus]);

  // Auto-sync
  useAutoSync({
    connectors: connectors.map(c => ({ id: c.id, status: c.status })),
    enabled: true,
    onSyncAll: async () => {
      setConnectorStatus(prev => ({ ...prev, syncing: true }));
      for (const c of connectors.filter(c => c.status === 'ready' || c.status === 'idle')) {
        try { await window.deskflowAPI!.connectors?.sync?.(c.id); } catch {}
      }
      await loadConnectors();
      await updateConnectorStatus();
      setConnectorStatus(prev => ({ ...prev, syncing: false }));
    },
  });

  // Intercept send for slash commands
  const handleSend = useCallback(async (text: string) => {
    const result = await slash.parseAndExecute(text, { connectors, currentThreadDate: chat.currentThreadDate });
    if (result.handled && result.messages) {
      for (const msg of result.messages) {
        chat.addMessage(msg);
      }
      return;
    }
    chat.send(text);
  }, [slash, connectors, chat]);

  const [suggesting, setSuggesting] = useState(false);
  const handleSuggest = useCallback(async () => {
    setSuggesting(true);
    try {
      const [plan, contextStats, longterm] = await Promise.all([
        window.deskflowAPI!.readPlanningMd(),
        window.deskflowAPI!.getGoalContext(),
        window.deskflowAPI!.getLongtermGoals(),
      ]);
      const ctx: Record<string, any> = {};
      if (plan.content) ctx.planningContent = plan.content;
      if (contextStats?.success) ctx.stats = { last7dByCategory: contextStats.last7dByCategory };
      if (longterm?.success && longterm.goals?.length > 0) {
        ctx.longtermGoals = longterm.goals.filter((g: any) => g.status !== 'completed').map((g: any) => ({ title: g.title, category: g.category }));
      }
      const r = await window.deskflowAPI!.suggestGoals(today, ctx);
      if (r.success && r.suggestions?.length > 0) {
        setSuggestions(r.suggestions.map((s: any) => ({ id: crypto.randomUUID(), title: s.title, category: s.category, status: 'active' as const, period: 'daily', date: today, source: 'ai', links: [], createdAt: new Date().toISOString(), target: { type: 'completion' as const } })));
        showToast(`${r.suggestions.length} goal suggestion${r.suggestions.length > 1 ? 's' : ''} ready`, 'success');
      } else if (r.success) {
        showToast('No suggestions available — try adding more context', 'info');
      } else {
        showToast(r.error || 'Failed to get suggestions', 'error');
      }
    } catch (e: any) {
      console.error('[AiPage] handleSuggest:', e);
      showToast(e.message || 'Failed to get suggestions', 'error');
    }
    setSuggesting(false);
  }, [today, showToast]);

  const handleRoutingSave = useCallback(async (feature: 'default' | 'researchDigest' | 'goalAssistant', entry: { providerId: string; model: string } | null) => {
    try {
      const state = await window.deskflowAPI!.getAiProviders();
      const providers = state?.providers || [];
      const routing = { ...(state?.routing || {}) };
      routing[feature] = entry;
      await window.deskflowAPI!.saveAiProviders({ providers, routing });
      setAiRouting(routing);
    } catch (e) { console.error('[AiPage] handleRoutingSave:', e); }
  }, []);

  const handleToggleGoal = useCallback(async (goal: Goal) => {
    const snapshot = [...goals];
    const newStatus = goal.status === 'done' ? 'active' : 'done';
    try {
      setGoals(prev => prev.map(g => g.id === goal.id ? { ...g, status: newStatus, completedAt: newStatus === 'done' ? new Date().toISOString() : undefined } : g));
      await window.deskflowAPI!.saveGoal(today, { ...goal, status: newStatus, completedAt: newStatus === 'done' ? new Date().toISOString() : undefined });
      setToggleErrors(prev => { const n = { ...prev }; delete n[goal.id]; return n; });
    } catch (e: any) {
      setGoals(snapshot);
      setToggleErrors(prev => ({ ...prev, [goal.id]: e.message || 'Update failed' }));
      showToast(e.message || 'Failed to update goal', 'error');
    }
  }, [today, goals, showToast]);

  const handleSaveReview = useCallback(async (msg: string) => {
    try {
      const r = await window.deskflowAPI!.saveGoalReview(today, msg);
      if (r.success) { setReview(msg); setReviewError(null); }
      else { setReviewError(r.error || 'Save failed'); }
    } catch (e: any) {
      console.error('[AiPage] handleSaveReview:', e);
      setReviewError(e.message || 'Save failed');
    }
  }, [today]);

  const handleAcceptSuggestion = useCallback(async (goal: Goal) => {
    const suggestionSnapshot = [...suggestions];
    const goalsSnapshot = [...goals];
    const newGoal: Goal = { id: crypto.randomUUID(), title: goal.title, category: goal.category, target: { type: 'completion' }, status: 'active', period: 'daily', date: today, source: 'ai', links: [], createdAt: new Date().toISOString() };
    try {
      await window.deskflowAPI!.saveGoal(today, { id: newGoal.id, title: newGoal.title, category: newGoal.category, target: { type: 'completion' }, status: 'active', period: 'daily', date: today, source: 'ai', links: [], createdAt: new Date().toISOString() });
      setSuggestions(prev => prev.filter(x => x.title !== goal.title));
      setGoals(prev => [...prev, newGoal]);
      setAcceptErrors(prev => { const n = { ...prev }; delete n[goal.title]; return n; });
      showToast('Goal saved', 'success');
    } catch (e: any) {
      setSuggestions(suggestionSnapshot);
      setGoals(goalsSnapshot);
      setAcceptErrors(prev => ({ ...prev, [goal.title]: e.message || 'Failed to save' }));
      showToast(e.message || 'Failed to save goal', 'error');
    }
  }, [today, suggestions, goals, showToast]);

  const handleDismissSuggestion = useCallback((goal: Goal) => { setSuggestions(prev => prev.filter(x => x.title !== goal.title)); }, []);

  const onCardAction = useCallback(async (action: CardAction) => {
    const api = window.deskflowAPI!;
    switch (action.kind) {
      case 'accept-goal': {
        try {
          await api.saveGoal(today, { id: crypto.randomUUID(), title: action.goal.title, category: (action.goal.category as any) || 'work', target: { type: 'completion' }, status: 'active', period: 'daily', date: today, source: 'ai', links: [], createdAt: new Date().toISOString() });
          await loadGoals();
        } catch (e) { console.error('[AiPage] onCardAction accept-goal:', e); }
        break;
      }
      case 'dismiss-goal':
        break;
      case 'apply-plan': {
        try {
          const goals = action.changes.filter(c => c.action !== 'complete').map(c => ({ title: c.goal.title, category: c.goal.category, priority: c.goal.priority }));
          if (goals.length) await api.saveGoalsBatch(goals as any);
          await loadLongTermGoals();
        } catch (e) { console.error('[AiPage] onCardAction apply-plan:', e); }
        break;
      }
      case 'run-ipc': {
        const label = action.label || action.ipc;
        setActionResults(prev => ({ ...prev, [label]: 'running' }));
        try {
          const fn = (api as any)[action.ipc];
          if (typeof fn === 'function') await fn(action.payload);
          setActionResults(prev => ({ ...prev, [label]: 'done' }));
          loadGoals();
          loadDigest(false);
        } catch (e) {
          console.error('[AiPage] onCardAction run-ipc:', e);
          setActionResults(prev => ({ ...prev, [label]: 'error' }));
        }
        break;
      }
      case 'submit-form': {
        const summary = Object.entries(action.values).map(([k, v]) => k + ': ' + String(v)).join(', ');
        if (chat) chat.send(summary);
        break;
      }
      case 'sync-connector': {
        setConnectorSyncing(prev => ({ ...prev, [action.name]: true }));
        try {
          const connectors: any = (api as any).connectors;
          if (connectors?.sync) await connectors.sync(action.id || action.name);
        } catch (e) { console.error('[AiPage] onCardAction sync-connector:', e); }
        setConnectorSyncing(prev => { const n = { ...prev }; delete n[action.name]; return n; });
        break;
      }
      case 'open-url': {
        try { window.open(action.url, '_blank'); } catch (e) { console.error('[AiPage] onCardAction open-url:', e); }
        break;
      }
      case 'send-text': {
        if (chat) chat.send(action.text);
        break;
      }
      case 'retry': {
        const last = chat.messages.filter(m => m.role === 'user').at(-1);
        if (last) chat.send(last.content);
        break;
      }
      case 'create-reminder': {
        try {
          await window.deskflowAPI!.createReminder({ text: action.text, due_date: action.dueDate, goal_id: action.goalId });
          showToast('Reminder created', 'success');
          loadReminders();
        } catch (e: any) {
          showToast(e.message || 'Failed to create reminder', 'error');
        }
        break;
      }
      case 'link-goal-event': {
        const goal = longTermGoals.find(g => g.id === action.goalId) || goals.find(g => g.id === action.goalId);
        if (goal) {
          const links = [...(goal.links || [])];
          links.push({ type: 'event', title: action.eventTitle, eventId: action.eventId });
          await window.deskflowAPI!.saveGoalsBatch([{ ...goal, links, period: goal.period || 'daily', date: goal.date || '' }]);
          showToast('Goal linked to calendar event', 'success');
          loadGoals();
          loadLongTermGoals();
        }
        break;
      }
    }
  }, [today, loadGoals, loadLongTermGoals, loadDigest, chat, loadReminders, showToast, longTermGoals, goals]);

  const [savingNotes, setSavingNotes] = useState(false);
  const handleSaveNotes = useCallback(async (content: string) => {
    setSavingNotes(true);
    try {
      await window.deskflowAPI!.writePlanningMd({ content });
      setPlanningNotes(content);
      showToast('Notes saved', 'success');
    } catch (e: any) {
      console.error('[AiPage] handleSaveNotes:', e);
      showToast(e.message || 'Failed to save notes', 'error');
    }
    setSavingNotes(false);
  }, [showToast]);

  const handleAnalyzeDump = useCallback(async (text: string) => {
    try {
      const r = await window.deskflowAPI!.parseGoalDump(text);
      if (r.success && r.goals) {
        return r.goals.map((g: any) => ({ title: g.title, category: g.category || 'work', priority: g.priority || 3, description: g.description }));
      }
    } catch (e) { console.error('[AiPage] handleAnalyzeDump:', e); }
    return [];
  }, []);

  const handleSaveGoals = useCallback(async (goals: Partial<LongTermGoal>[]) => {
    try {
      const enriched = goals.map((g) => ({
        ...g,
        id: g.id || crypto.randomUUID(),
        date: g.date || today,
        status: g.status || 'active',
        period: g.period || 'longterm',
        source: g.source || 'planning',
        links: g.links || [],
        createdAt: new Date().toISOString(),
      }));
      await window.deskflowAPI!.saveGoalsBatch(enriched as any);
      await loadLongTermGoals();
    } catch (e) { console.error('[AiPage] handleSaveGoals:', e); }
  }, [loadLongTermGoals, today]);

  const handleToggleLongTermGoal = useCallback(async (goal: LongTermGoal) => {
    try {
      const newStatus = goal.status === 'done' ? 'active' : 'done';
      await window.deskflowAPI!.saveGoal(today, { id: goal.id, title: goal.title, category: goal.category, priority: goal.priority, status: newStatus, period: 'longterm', date: today, source: 'planning', links: [], createdAt: new Date().toISOString(), completedAt: newStatus === 'done' ? new Date().toISOString() : undefined, target: { type: 'completion' } });
      await loadLongTermGoals();
    } catch (e) { console.error('[AiPage] handleToggleLongTermGoal:', e); }
  }, [today, loadLongTermGoals]);

  const handleDeleteLongTermGoal = useCallback(async (id: string) => {
    try {
      await window.deskflowAPI!.deleteGoal(id);
      showToast('Goal deleted', 'success');
      loadLongTermGoals();
    } catch (e: any) {
      showToast(e.message || 'Failed to delete goal', 'error');
    }
  }, [loadLongTermGoals, showToast]);

  const handleUpdateLongTermGoal = useCallback(async (goal: LongTermGoal) => {
    try {
      await window.deskflowAPI!.saveGoalsBatch([{ ...goal, period: 'longterm', date: '' }]);
      showToast('Goal updated', 'success');
      loadLongTermGoals();
    } catch (e: any) {
      showToast(e.message || 'Failed to update goal', 'error');
    }
  }, [loadLongTermGoals, showToast]);

  const handleCreateReminder = useCallback(async (text: string, dueDate?: string) => {
    try {
      await window.deskflowAPI!.createReminder({ text, due_date: dueDate, goal_id: undefined });
      showToast('Reminder created', 'success');
      loadReminders();
    } catch (e: any) {
      showToast(e.message || 'Failed to create reminder', 'error');
    }
  }, [loadReminders, showToast]);

  const handleToggleReminder = useCallback(async (id: string, done: boolean) => {
    try {
      await window.deskflowAPI!.toggleReminder(id, done);
      loadReminders();
    } catch (e: any) {
      showToast(e.message || 'Failed to update reminder', 'error');
    }
  }, [loadReminders, showToast]);

  const handleDeleteReminder = useCallback(async (id: string) => {
    try {
      await window.deskflowAPI!.deleteReminder(id);
      showToast('Reminder deleted', 'success');
      loadReminders();
    } catch (e: any) {
      showToast(e.message || 'Failed to delete reminder', 'error');
    }
  }, [loadReminders, showToast]);

  const digestBadge = getProviderBadge(aiProviders, aiRouting.researchDigest);
  const defaultBadge = getProviderBadge(aiProviders, aiRouting.default);

  const handleLoadThread = useCallback(async (date: string) => {
    await chat.loadThread(date);
    setChatHistoryOpen(false);
  }, [chat]);

  const handleDeleteThread = useCallback(async (date: string) => {
    await chat.deleteThread(date);
  }, [chat]);

  return (
    <>
      {bootState === 'loading' ? (
        <div className="dk-root">
          <div className="dk-wrap flex items-center justify-center min-h-[70vh]">
            <div className="flex flex-col items-center gap-4">
              <div className="w-8 h-8 border-2 border-emerald-500/40 border-t-emerald-400 rounded-full animate-spin" />
              <p className="text-sm text-zinc-500">Loading DeskFlow AI…</p>
            </div>
          </div>
        </div>
      ) : bootState === 'error' ? (
        <div className="dk-root">
          <div className="dk-wrap flex items-center justify-center min-h-[70vh]">
            <div className="flex flex-col items-center gap-4 max-w-sm text-center">
              <div className="rounded-full bg-red-500/10 p-3">
                <span className="text-xl text-red-400">!</span>
              </div>
              <p className="text-sm text-red-400">{bootError || 'Failed to initialize'}</p>
              <button
                onClick={loadBoot}
                className="rounded-lg bg-zinc-800 px-4 py-2 text-xs font-medium text-zinc-300 hover:bg-zinc-700 transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      ) : (
      <div className="dk-root">
        <div className="dk-wrap">
          <div className="dk-topbar">
            <div className="dk-brand">
              <div className="dk-logo">D</div>
              <h1>DeskFlow AI <span className="dk-sub">// command deck</span></h1>
            </div>
            <div className="dk-barR">
              <span className="dk-chip dk-mode"><span className="dk-dot" />{modeLabelMap[mode]}</span>
              <button className="dk-chip dk-prov hover:bg-zinc-800/40 transition-colors" onClick={() => setConfiguringFeature('default')}><span className="dk-dot" />{defaultBadge?.label ?? "Claude Sonnet"}</button>
              <span className="dk-chip dk-live"><span className="dk-dot" />{chat.hasProvider ? "Connected" : "Offline"}</span>
              <button
                onClick={() => setChatHistoryOpen(true)}
                title="Chat History"
                className="dk-topbar-btn"
                style={{ height: 26, padding: "0 10px" }}
              >
                <History size={12} />
                <span style={{ fontSize: 11, fontFamily: "var(--mono)" }}>History</span>
              </button>
              <button
                onClick={() => setCanvasMode(v => !v)}
                title={canvasMode ? "Switch to Deck view" : "Switch to Canvas view"}
                className="dk-topbar-btn"
                data-tutorial="ai.mode-toggle"
                style={{ height: 26, padding: "0 10px" }}
              >
                <span style={{ fontSize: 11, fontFamily: "var(--mono)" }}>
                  {canvasMode ? 'DECK' : 'CANVAS'}
                </span>
              </button>
              <button
                onClick={() => setHistoryOpen(v => !v)}
                title="Goals & Reminders"
                className="dk-topbar-btn"
                style={{ height: 26, padding: "0 10px" }}
              >
                <Bell size={12} className="text-amber-400" />
                <span style={{ fontSize: 11, fontFamily: "var(--mono)" }}>Goals</span>
                {reminders.filter(r => !r.done).length > 0 && (
                  <span style={{ marginLeft: 4, borderRadius: 999, background: "rgba(251,191,36,.15)", padding: "0 5px", fontSize: 9, color: "#fbbf24" }}>
                    {reminders.filter(r => !r.done).length}
                  </span>
                )}
              </button>
              <button
                onClick={chat.startNewThread}
                title="New Thread"
                className="dk-topbar-btn"
                style={{ height: 26, padding: "0 10px" }}
              >
                <span style={{ fontSize: 11, fontFamily: "var(--mono)" }}>+ New</span>
              </button>
              <button
                onClick={() => setShowFeatures(true)}
                title="AI Features"
                className="dk-topbar-btn"
                style={{ height: 26, padding: "0 10px", borderColor: "rgba(167,139,250,0.3)", color: "#a78bfa" }}
              >
                <Sparkles size={11} />
                <span style={{ fontSize: 11, fontFamily: "var(--mono)" }}>Features</span>
              </button>
            </div>
          </div>

          {!canvasMode ? (
          <AiPageDeck
              messages={chat.messages.map((m): import('../components/ai/chat/ChatPanel').ChatMessage => ({
                id: m.id,
                role: m.role,
                content: m.content,
                parsed: m.parsed,
                timestamp: m.timestamp ? new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : undefined,
              }))}
              streaming={chat.streaming}
              thinking={chat.thinking}
              provider={defaultBadge?.label}
              online={chat.hasProvider}
              input={chat.input}
              onInputChange={chat.setInput}
              onSend={handleSend}
              onStop={chat.stop}
              onReset={chat.reset}
              onCardAction={onCardAction}
              actionResults={actionResults}
              connectorSyncing={connectorSyncing}
              contextWarnings={contextWarnings}
              dismissError={dismissError}
              modeLabel={modeLabelMap[mode]}
              glanceMetrics={glanceMetrics}
              connectorsSlot={
                <ConnectorsPanel
                  state={connectorsState}
                  connectors={connectors}
                  errorMessage={goalsError || undefined}
                  onRetry={loadGoals}
                  onAdd={() => setShowConnectorSetup(true)}
                  onSync={async (id) => {
                    setConnectorSyncing(prev => ({ ...prev, [id]: true }));
                    try {
                      const r = await window.deskflowAPI!.connectors?.sync?.(id);
                      if (r?.success) {
                        showToast(`Synced — ${r.itemsAdded || 0} items`, 'success');
                      } else {
                        showToast(r?.error || 'Sync failed', 'error');
                      }
                      await loadConnectors();
                    } catch (e: any) {
                      showToast(e.message || 'Sync failed', 'error');
                    }
                    setConnectorSyncing(prev => { const n = { ...prev }; delete n[id]; return n; });
                  }}
                  onReply={async (connectorId: string, itemId: string, draft: string) => {
                    try {
                      const r = await (window.deskflowAPI!.connectors as any)?.sendEmail?.(connectorId, { to: '', subject: '', body: draft, inReplyTo: itemId });
                      if (r?.success) showToast('Reply sent', 'success');
                      else showToast(r?.error || 'Send failed', 'error');
                    } catch (e: any) { showToast(e.message || 'Send failed', 'error'); }
                  }}
                  onMarkRead={async (connectorId: string, itemId: string, read: boolean) => {
                    try {
                      await (window.deskflowAPI!.connectors as any)?.markRead?.(itemId, read);
                      await loadConnectors();
                    } catch (e: any) { showToast(e.message || 'Mark failed', 'error'); }
                  }}
                  onDelete={async (connectorId: string) => {
                    try {
                      const r = await (window.deskflowAPI!.connectors as any)?.remove?.(connectorId);
                      if (r?.success) { showToast('Connector deleted', 'success'); await loadConnectors(); }
                      else showToast(r?.error || 'Delete failed', 'error');
                    } catch (e: any) { showToast(e.message || 'Delete failed', 'error'); }
                  }}
                  onToast={showToast}
                  onRefresh={loadConnectors}
                  onTest={async (id) => {
                    try {
                      const r = await window.deskflowAPI!.connectors?.test?.(id);
                      await loadConnectors();
                      if (r?.success) {
                        return { success: true, message: r.message || `Connected (${r.latencyMs || '?'}ms)` };
                      }
                      return { success: false, message: r?.message || 'Test failed' };
                    } catch (e: any) {
                      return { success: false, message: e.message || 'Test failed' };
                    }
                  }}
                />
              }
              focusSlot={
                <FocusBoard
                  state={goalsDataState}
                  mode={mode}
                  goals={goals}
                  planGoals={planGoals}
                  suggestions={suggestions}
                  metrics={focusMetrics}
                  reviewSummary={review || undefined}
                  onToggleGoal={handleToggleGoal}
                  onAcceptSuggestion={handleAcceptSuggestion}
                  onDismissSuggestion={handleDismissSuggestion}
                  onSuggestGoals={handleSuggest}
                  onSaveReview={handleSaveReview}
                  errorMessage={goalsError || undefined}
                  onRetry={loadGoals}
                  onConfigure={() => setConfiguringFeature('goalAssistant')}
                  reviewError={reviewError}
                  toggleErrors={toggleErrors}
                  acceptErrors={acceptErrors}
                  onRetryReview={() => { setReviewError(null); handleSaveReview(review || ''); }}
                  onDismissReviewError={() => setReviewError(null)}
                />
              }
              planSlot={
                <PlanBoard
                  state={goalsDataState}
                  goals={longTermGoals}
                  notes={planningNotes}
                  savingNotes={savingNotes}
                  onSaveNotes={handleSaveNotes}
                  onAnalyzeDump={handleAnalyzeDump}
                  onSaveGoals={handleSaveGoals}
                  onToggleGoal={handleToggleLongTermGoal}
                  onDeleteGoal={handleDeleteLongTermGoal}
                  onUpdateGoal={handleUpdateLongTermGoal}
                  errorMessage={goalsError || undefined}
                  onRetry={loadGoals}
                />
              }
              reflectSlot={
                <ReflectFeed
                  state={goalsDataState}
                  days={reflectDays.length ? reflectDays : [{ date: today, goals, reviewSummary: review || undefined }]}
                  errorMessage={goalsError || undefined}
                  onRetry={loadGoals}
                  dayWindow={dayWindow}
                  onLoadOlder={handleLoadOlder}
                />
              }
              dailyPlannerSlot={
                <div style={{ padding: 16 }}>
                  <DailyPlannerCard date={today} />
                </div>
              }
              scheduleSlot={
                <div style={{ padding: 16 }}>
                  <WeeklyScheduleCard />
                </div>
              }
              deadlineSlot={
                <div style={{ padding: 16 }}>
                  <DeadlineTrackerCard />
                </div>
              }
               historySlot={undefined}
              memoryChips={chat.memories.slice(0, 6)}
              onNewThread={chat.startNewThread}
              connectorStatus={connectorStatus}
               expandedCardIds={expandedCardIds}
               onExpandedCardChange={(ids: Set<string>) => setExpandedCardIds(ids)}
               onOpenHistory={() => setChatHistoryOpen(true)}
               onOpenCommands={() => setCommandsOpen(true)}
               onExpandConnectors={() => {
                requestAnimationFrame(() => {
                  document.getElementById("deck-card-connectors")?.scrollIntoView({ behavior: "smooth", block: "nearest" })
                })
              }}
              listening={voice.state === 'listening'}
              onToggleVoice={voice.state === 'listening' ? voice.stop : voice.start}
              voiceSupported={voice.supported}
              autoApprove={autoApprove}
              onToggleAutoApprove={() => setAutoApprove(v => !v)}
              onAddGoal={() => {
                setExpandedCardIds(new Set(['daily-planner']))
                showToast('Add a goal using the form in Daily Planner', 'info')
              }}
              onAddSchedule={() => {
                setExpandedCardIds(new Set(['schedule']))
                showToast('Add a schedule entry using the form in Schedule', 'info')
              }}
              onAddDeadline={() => {
                setExpandedCardIds(new Set(['deadlines']))
                showToast('Add a deadline using the Deadline Tracker', 'info')
              }}
              onAddReminder={() => setHistoryOpen(true)}
              onOpenFeatures={() => setShowFeatures(true)}
              digestSlot={
                <DailyDigestBoard
                  variant="inset"
                  state={digestDataState}
                  topics={digestTopics.map(t => ({ topic: t.topic || t.title || '', summary: t.summary || '', sources: t.sources, date: t.date, confidence: t.confidence, source: t.source, stats: t.stats, tags: t.tags, mentions: t.mentions, headline: t.headline }))}
                  generating={digestState === 'loading'}
                  provider={digestBadge?.label}
                  readyToGenerate={digestTopics.length === 0}
                  errorMessage={digestReason || undefined}
                  onRefresh={() => loadDigest(true, true)}
                  onConfigure={() => setConfiguringFeature('researchDigest')}
                  onGenerate={() => loadDigest(true, true)}
                  onDismissError={() => { setDigestState('ready'); setDigestReason(null); }}
                />
              }
            />
          ) : (
          <div data-tutorial="ai.canvas" style={{ flex: 1, minHeight: 0 }}>
            <CanvasContainer
              cards={canvas.cards}
              onMoveCard={canvas.moveCard}
              onDismissCard={canvas.dismissCard}
              onArrangeCards={canvas.arrangeCards}
              onPinCard={canvas.pinCard}
              onResizeCard={canvas.resizeCard}
              onCardClick={(id) => setSelectedCardId(id)}
              saveStatus={canvas.saveStatus}
              onSend={handleSend}
              onStop={chat.stop}
              streaming={chat.streaming}
              thinking={chat.thinking}
            />
          </div>
          )}

        </div>
      </div>
      )}

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} onIntent={handlePaletteIntent} />

      <AIFeaturesModal open={showFeatures} onClose={() => setShowFeatures(false)} onTryIt={(prompt) => { chat.setInput(prompt); setShowFeatures(false); }} />
      <ConnectorSetupModal open={showConnectorSetup} onClose={() => setShowConnectorSetup(false)} onCreated={() => { setShowConnectorSetup(false); loadConnectors(); }} />

      <AiProviderSelectModal open={configuringFeature === 'researchDigest'} onClose={() => setConfiguringFeature(null)} featureKey="researchDigest" featureLabel="Research Digest" accentColor="from-cyan-500 to-blue-500" providers={aiProviders} currentRouting={aiRouting.researchDigest} onSave={(e) => handleRoutingSave('researchDigest', e)} />
      <AiProviderSelectModal open={configuringFeature === 'goalAssistant'} onClose={() => setConfiguringFeature(null)} featureKey="goalAssistant" featureLabel="Daily Plan" accentColor="from-emerald-500 to-teal-500" providers={aiProviders} currentRouting={aiRouting.goalAssistant} onSave={(e) => handleRoutingSave('goalAssistant', e)} />
      <AiProviderSelectModal open={configuringFeature === 'default'} onClose={() => setConfiguringFeature(null)} featureKey="default" featureLabel="AI Chat" accentColor="from-violet-500 to-purple-500" providers={aiProviders} currentRouting={aiRouting.default} onSave={(e) => handleRoutingSave('default', e)} />

      {/* Chat History Modal */}
      <ChatHistory
        open={chatHistoryOpen}
        onClose={() => setChatHistoryOpen(false)}
        threads={chat.threads || []}
        currentThreadDate={chat.currentThreadDate}
        onLoadThread={handleLoadThread}
        onDeleteThread={handleDeleteThread}
        onRenameThread={chat.renameThread}
        onNewThread={chat.startNewThread}
      />

      <SlashCommandManager
        open={commandsOpen}
        onClose={() => setCommandsOpen(false)}
      />

      {/* Goals & Reminders Modal */}
      <GoalsRemindersDrawer
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        goals={goals}
        longTermGoals={longTermGoals}
        events={calendarEvents}
        reminders={reminders}
        onToggleReminder={handleToggleReminder}
        onCreateReminder={handleCreateReminder}
        onDeleteReminder={handleDeleteReminder}
        onOpenGoal={(id) => {
          setHistoryOpen(false);
          setExpandedCardId("focus");
        }}
        onOpenHistory={() => {
          setHistoryOpen(false);
          setChatHistoryOpen(true);
        }}
        loading={remindersLoading}
        error={remindersError || undefined}
      />

      {/* Toast container */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2" role="status" aria-live="polite">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`flex items-center gap-2 rounded-lg px-4 py-3 text-sm shadow-lg backdrop-blur-sm transition-all ${
              t.type === 'success' ? 'border-l-[3px] border-emerald-500 bg-emerald-500/10 text-emerald-200' :
              t.type === 'error' ? 'border-l-[3px] border-red-500 bg-red-500/10 text-red-200' :
              'border-l-[3px] border-indigo-500 bg-indigo-500/10 text-indigo-200'
            }`}
            style={{ animation: 'slideIn 0.2s ease-out' }}
          >
            <span className="text-base">{t.type === 'success' ? '✓' : t.type === 'error' ? '!' : 'i'}</span>
            <span className="flex-1">{t.message}</span>
            <button
              onClick={() => dismissToast(t.id)}
              className="ml-2 text-current opacity-50 hover:opacity-100 transition-opacity"
              aria-label="Dismiss"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </>
  );
}
