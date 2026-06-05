/**
 * Context Maintenance Tab — Main Container Component
 * 
 * Displays AI memory status, active contexts, recent chat history, compaction info,
 * and provides controls for context search and settings.
 * 
 * Location: src/components/ContextMaintenanceTab.tsx
 */

import React, { useState, useEffect } from 'react';
import { AlertCircle, RefreshCw, Settings } from 'lucide-react';
import { GlassCard } from './GlassCard';
import { LoadingState } from './LoadingState';

import type {
  ContextMaintenanceTabProps,
  ContextMaintenanceConfig,
  AssembledContext,
  ContextMetadata,
  RAGMessage,
} from '@/types/context';

// Sub-components
import { MemoryStatusCard } from './context-ui/MemoryStatusCard';
import { ActiveContextsList } from './context-ui/ActiveContextsList';
import { RecentChatHistory } from './context-ui/RecentChatHistory';
import { CompactionsPanel } from './context-ui/CompactionsPanel';
import { ContextSearchBar } from './context-ui/ContextSearchBar';
import { SettingsPanel } from './context-ui/SettingsPanel';

// ──────────────────────────────────────────────────────────────
// Default Configuration
// ──────────────────────────────────────────────────────────────

const DEFAULT_CONFIG: ContextMaintenanceConfig = {
  autoCompactionEnabled: true,
  includeRAGInPrompt: true,
  compactionTrigger: {
    messageCount: 100,
    interval: 'monthly',
  },
  ragSearchMode: ['semantic', 'fulltext'],
  tokenBudgets: {
    projectContext: 6000,
    sessionContext: 8000,
  },
};

// ──────────────────────────────────────────────────────────────
// Context Maintenance Tab Component
// ──────────────────────────────────────────────────────────────

export const ContextMaintenanceTab: React.FC<ContextMaintenanceTabProps> = ({
  projectId,
  projectPath,
  sessionId,
}) => {
  // ──────────────────────────────────────────────────────────────
  // State Management
  // ──────────────────────────────────────────────────────────────

  const [activeSection, setActiveSection] = useState<
    'overview' | 'contexts' | 'history' | 'compactions' | 'search' | 'settings'
  >('overview');

  const [config, setConfig] = useState<ContextMaintenanceConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Memory stats
  const [projectContextUsage, setProjectContextUsage] = useState({ tokens: 0, max: 12000 });
  const [sessionContextUsage, setSessionContextUsage] = useState({ tokens: 0, max: 8000 });
  const [ragIndexStats, setRagIndexStats] = useState({
    totalMessages: 0,
    lastUpdated: new Date(),
  });

// Data
const [contexts, setContexts] = useState<ContextMetadata[]>([]);
const [recentMessages, setRecentMessages] = useState<RAGMessage[]>([]);
const [compactions, setCompactions] = useState<any[]>([]);
const [searchResults, setSearchResults] = useState<any[]>([]);

  // ──────────────────────────────────────────────────────────────
  // Effects
  // ──────────────────────────────────────────────────────────────

  /**
   * Initialize tab - load context data
   */
  useEffect(() => {
    loadContextData();
  }, [projectId, sessionId]);

  /**
   * Reload data when section changes
   */
  useEffect(() => {
    if (activeSection === 'contexts') {
      loadContexts();
    } else if (activeSection === 'history') {
      loadRecentMessages();
    }
  }, [activeSection]);

  // ──────────────────────────────────────────────────────────────
  // Data Loading Methods
  // ──────────────────────────────────────────────────────────────

  const loadContextData = async () => {
    setLoading(true);
    setError(null);

    try {
      const dapi = (window as any).deskflowAPI;

      // Load RAG stats
      if (dapi?.getRAGStats) {
        const ragResult = await dapi.getRAGStats(projectPath);
        if (ragResult?.success) {
          setRagIndexStats({
            totalMessages: ragResult.data.totalMessages || 0,
            lastUpdated: ragResult.data.lastUpdated ? new Date(ragResult.data.lastUpdated) : new Date(),
          });
        }
      }

      // Load contexts from project context service
      if (dapi?.getContextSystems) {
        const systemsResult = await dapi.getContextSystems(projectPath);
        if (systemsResult?.success && Array.isArray(systemsResult.data)) {
          setContexts(systemsResult.data.map((s: any, i: number) => ({
            id: s.id || `sys-${i}`,
            projectId: projectId || '',
            name: s.name || s.id,
            category: 'other' as const,
            type: 'other' as const,
            source: '',
            tokens: 0,
            description: `${s.itemCount || 0} ${s.itemLabel || 'items'}`,
            enabled: true,
            lastUpdated: new Date(),
            createdAt: new Date(),
          })));
        }
      }

      // Load session summaries for recent messages
      if (dapi?.getSessionSummaries) {
        const summariesResult = await dapi.getSessionSummaries({ limit: 5 });
        if (summariesResult?.success && Array.isArray(summariesResult.data)) {
          setRecentMessages(summariesResult.data.map((s: any, i: number) => ({
            id: s.sessionId || `sum-${i}`,
            sessionId: s.sessionId || '',
            timestamp: new Date(s.lastMessageAt || Date.now()),
            role: 'assistant' as const,
            content: s.summary || s.topic || '',
            tokens: 0,
            createdAt: new Date(s.lastMessageAt || Date.now()),
          })));
        }
      }

      // Try to load from existing session data
      if (sessionId && dapi?.getSessionMessages) {
        const msgResult = await dapi.getSessionMessages(sessionId);
        if (msgResult?.success && Array.isArray(msgResult.data)) {
          const msgs = msgResult.data.slice(-5).map((m: any, i: number) => ({
            id: `msg-${i}`,
            sessionId,
            timestamp: new Date(m.created_at || Date.now()),
            role: (m.role || 'user') as 'user' | 'assistant' | 'system',
            content: (m.content || '').substring(0, 300),
            tokens: 0,
            createdAt: new Date(m.created_at || Date.now()),
          }));
          setRecentMessages(prev => msgs.length > 0 ? msgs : prev);
        }
      }

      // Load config from localStorage
      const savedConfig = localStorage.getItem('contextMaintenanceConfig');
      if (savedConfig) {
        try { setConfig(JSON.parse(savedConfig)); } catch {}
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load context data');
    } finally {
      setLoading(false);
    }
  };

  const loadContexts = async () => {
    try {
      // TODO: Call ProjectContextService.getEnabledContexts()
      // setContexts(result);
    } catch (err) {
      console.error('Failed to load contexts:', err);
    }
  };

  const loadRecentMessages = async () => {
    try {
      // TODO: Call RAGService.queryMessages({ sessionId, limit: 5 })
      // setRecentMessages(result);
    } catch (err) {
      console.error('Failed to load recent messages:', err);
    }
  };

  // ──────────────────────────────────────────────────────────────
  // Event Handlers
  // ──────────────────────────────────────────────────────────────

  const handleRefresh = async () => {
    await loadContextData();
  };

  const handleConfigSave = (newConfig: ContextMaintenanceConfig) => {
    setConfig(newConfig);
    // TODO: Save to localStorage and backend
    localStorage.setItem('contextMaintenanceConfig', JSON.stringify(newConfig));
  };

  const handleToggleContext = async (contextId: string, enabled: boolean) => {
    try {
      // TODO: Call ProjectContextService.toggleContext()
      // TODO: Reload context data
      await loadContexts();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle context');
    }
  };

  // ──────────────────────────────────────────────────────────────
  // Render Methods
  // ──────────────────────────────────────────────────────────────

  const renderHeader = () => (
    <div className="flex items-center justify-between px-2 py-2 border-b border-zinc-800/70">
      <h2 className="text-xs font-semibold text-white tracking-wide">Context Maintenance</h2>
      <button
        onClick={handleRefresh}
        disabled={loading}
        className="p-1 hover:bg-zinc-700/50 rounded transition-colors disabled:opacity-50"
        title="Refresh context data"
      >
        <RefreshCw size={14} className={`text-zinc-500 ${loading ? 'animate-spin' : ''}`} />
      </button>
    </div>
  );

  const renderTabs = () => (
    <div className="px-2 py-2 border-b border-zinc-800/70">
      <div className="flex gap-1 overflow-x-auto">
        {[
          { id: 'overview', label: 'Overview' },
          { id: 'contexts', label: 'Contexts' },
          { id: 'history', label: 'History' },
          { id: 'compactions', label: 'Compactions' },
          { id: 'search', label: 'Search' },
          { id: 'settings', label: 'Settings' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveSection(tab.id as any)}
            className={`px-2.5 py-1 text-[10px] font-medium whitespace-nowrap rounded-md transition-colors ${
              activeSection === tab.id
                ? 'bg-violet-500/20 text-violet-300'
                : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );

  const renderErrorAlert = () => {
    if (!error) return null;

    return (
      <div className="mx-2 mt-2 p-2 rounded bg-red-900/40 border border-red-700/50 flex gap-2 items-start">
        <AlertCircle size={14} className="text-red-500 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-[10px] text-red-200">{error}</p>
        </div>
      </div>
    );
  };

  const renderContent = () => {
    if (loading) {
      return <LoadingState variant="spinner" className="py-8" />;
    }

    switch (activeSection) {
      case 'overview':
        return renderOverview();
      case 'contexts':
        return renderContextsSection();
      case 'history':
        return renderHistorySection();
      case 'compactions':
        return renderCompactionsSection();
      case 'search':
        return renderSearchSection();
      case 'settings':
        return renderSettingsSection();
      default:
        return null;
    }
  };

  const renderOverview = () => (
    <div className="p-2 space-y-2">
      <MemoryStatusCard
        projectContextUsage={projectContextUsage}
        sessionContextUsage={sessionContextUsage}
        ragIndexStats={ragIndexStats}
      />
      <div className="grid grid-cols-2 gap-2">
        <GlassCard className="p-2">
          <p className="text-[10px] text-zinc-500 mb-0.5">Enabled Contexts</p>
          <p className="text-sm font-semibold text-violet-400">{contexts.length}</p>
        </GlassCard>
        <GlassCard className="p-2">
          <p className="text-[10px] text-zinc-500 mb-0.5">Recent Messages</p>
          <p className="text-sm font-semibold text-indigo-400">{recentMessages.length}</p>
        </GlassCard>
      </div>
    </div>
  );

  const renderContextsSection = () => (
    <div className="p-2">
      <p className="text-[10px] text-zinc-500 mb-2">Active project contexts available to this session</p>
      <ActiveContextsList
        contexts={contexts}
        onToggle={handleToggleContext}
        onEdit={(id) => console.log('Edit context:', id)}
        onRefresh={async (id) => { console.log('Refresh context:', id); }}
      />
    </div>
  );

  const renderHistorySection = () => (
    <div className="p-2">
      <p className="text-[10px] text-zinc-500 mb-2">Last 5 messages from this session</p>
      <RecentChatHistory
        messages={recentMessages}
        limit={5}
        onSelectMessage={(id) => console.log('Select message:', id)}
        onDelete={async (id) => { console.log('Delete message:', id); }}
      />
    </div>
  );

  const renderCompactionsSection = () => (
    <div className="p-2">
      <p className="text-[10px] text-zinc-500 mb-2">Monthly message compaction summaries</p>
      <CompactionsPanel
        compactions={compactions}
        onExpandSummary={(id) => console.log('Expand summary:', id)}
        onDownload={(id) => console.log('Download:', id)}
      />
    </div>
  );

  const renderSearchSection = () => (
    <div className="p-2">
      <p className="text-[10px] text-zinc-500 mb-2">Search context history (semantic + full-text)</p>
      <ContextSearchBar
        onSemanticSearch={async (query) => { console.log('Semantic search:', query); return []; }}
        onFullTextSearch={async (query) => { console.log('Full-text search:', query); return []; }}
        onSelectResult={(result) => console.log('Select result:', result)}
      />
    </div>
  );

  const renderSettingsSection = () => (
    <div className="p-2">
      <p className="text-[10px] text-zinc-500 mb-2">Context maintenance settings</p>
      <SettingsPanel
        config={config}
        onSave={async (newConfig) => {
          handleConfigSave(newConfig);
        }}
      />
    </div>
  );

  // ──────────────────────────────────────────────────────────────
  // Main Render
  // ──────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full">
      {renderHeader()}
      {renderTabs()}
      {renderErrorAlert()}
      <div className="flex-1 overflow-y-auto">{renderContent()}</div>
    </div>
  );
};

export default ContextMaintenanceTab;
