import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Search, Table2, Download, Database, Clock, ArrowLeft, ArrowRight, Network, ChevronRight } from 'lucide-react';
import { VoiceInputWrapper } from '@/components/VoiceInputWrapper';
import { PageShell } from '../components/PageShell';
import { GlassCard } from '../components/GlassCard';
import { SectionHeader } from '../components/SectionHeader';
import { LoadingState } from '../components/LoadingState';
import { EmptyState } from '../components/EmptyState';

const TABLE_CATEGORIES: Record<string, { label: string; color: string }> = {
  core:       { label: 'Core Tracking',   color: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' },
  stats:      { label: 'Aggregated',      color: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30' },
  ide:        { label: 'IDE / Projects',  color: 'bg-violet-500/15 text-violet-300 border-violet-500/30' },
  ai:         { label: 'AI Usage',        color: 'bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/30' },
  ai_chat:    { label: 'AI Chat',         color: 'bg-pink-500/15 text-pink-300 border-pink-500/30' },
  context:    { label: 'Context Brain',   color: 'bg-amber-500/15 text-amber-300 border-amber-500/30' },
  workspace:  { label: 'Terminal',        color: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30' },
  finance:    { label: 'Finance',         color: 'bg-lime-500/15 text-lime-300 border-lime-500/30' },
  learn:      { label: 'Learn (Lyceum)',  color: 'bg-orange-500/15 text-orange-300 border-orange-500/30' },
  content:    { label: 'Content Engine',  color: 'bg-rose-500/15 text-rose-300 border-rose-500/30' },
  focus:      { label: 'Focus',           color: 'bg-teal-500/15 text-teal-300 border-teal-500/30' },
  external:   { label: 'External',        color: 'bg-sky-500/15 text-sky-300 border-sky-500/30' },
  conductor:  { label: 'Conductor',       color: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30' },
  composition:{ label: 'Compositions',    color: 'bg-purple-500/15 text-purple-300 border-purple-500/30' },
  other:      { label: 'Other',           color: 'bg-zinc-500/15 text-zinc-300 border-zinc-500/30' },
};

const TCM: Record<string, string> = {
  logs:'core',sessions:'core',daily_stats:'core',browser_sessions:'core',productivity_sessions:'core',daily_aggregates:'core',
  stats_hourly:'stats',stats_daily:'stats',daily_rollup:'stats',app_totals:'stats',
  projects:'ide',ides:'ide',extensions:'ide',tools:'ide',project_line_stats:'ide',project_tools:'ide',code_activity:'ide',commits:'ide',ai_attribution:'ide',dora_metrics:'ide',
  ai_usage:'ai',ai_briefs:'ai',ai_interests:'ai',ai_feature_usage:'ai',ai_debug_events:'ai',
  ai_chat_messages:'ai_chat',ai_chat_threads:'ai_chat',ai_chat_memories:'ai_chat',ai_context_captures:'ai_chat',ai_context_groups:'ai_chat',ai_memory_context:'ai_chat',
  context_entities:'context',context_facts:'context',context_episodes:'context',context_embeddings:'context',context_extraction_jobs:'context',user_context_profile:'context',user_context_signals:'context',context_backfill_meta:'context',agent_memories:'context',
  terminal_sessions:'workspace',terminal_messages:'workspace',terminal_layouts:'workspace',terminal_presets:'workspace',terminal_bindings:'workspace',session_parsed_items:'workspace',workspace_state:'workspace',workspace_problems:'workspace',workspace_requests:'workspace',agent_prompts:'workspace',bug_reports:'workspace',touched_files:'workspace',
  finance_accounts:'finance',finance_wallets:'finance',finance_categories:'finance',finance_transactions:'finance',finance_settings:'finance',finance_crypto_prices:'finance',finance_crypto_history:'finance',finance_subscriptions:'finance',finance_transfer_routes:'finance',finance_daily_summaries:'finance',finance_wallet_snapshots:'finance',crypto_asset_history:'finance',finance_ft_persons:'finance',finance_fixed_expenses:'finance',finance_fixed_expense_payments:'finance',finance_budgets:'finance',finance_monthly_recaps:'finance',audit_log:'finance',
  learn_lessons:'learn',learn_nodes:'learn',learn_node_prereqs:'learn',learn_sources:'learn',learn_chunks:'learn',learn_progress:'learn',learn_evidence:'learn',learn_tutor_cache:'learn',learn_media_cache:'learn',learn_profile:'learn',learn_notes:'learn',learn_actions:'learn',learn_conversations:'learn',learn_decks:'learn',learn_cards:'learn',learn_card_reviews:'learn',learn_viz_state:'learn',learn_sessions:'learn',learn_intents:'learn',learn_goals:'learn',learn_streaks:'learn',learn_achievements:'learn',learn_lesson_stats:'learn',learn_timer_queue:'learn',learn_velocity:'learn',learn_branches:'learn',learn_permissions:'learn',
  content_ideas:'content',content_episodes:'content',themes:'content',content_frameworks:'content',content_videos:'content',content_lessons:'content',video_reflections:'content',video_characteristics:'content',process_timeline:'content',score_calibrations:'content',scoring_schemes:'content',content_takes:'content',take_segments:'content',take_evaluations:'content',presentations:'content',presentation_slides:'content',
  deep_focus_sessions:'focus',deep_focus_events:'focus',focus_groups:'focus',focus_group_usage:'focus',focus_goal_config:'focus',
  external_activities:'external',external_sessions:'external',external_settings:'external',activity_log:'external',schedule_entries:'external',deadlines:'external',schedule_templates:'external',
  conductor_missions:'conductor',conductor_nodes:'conductor',conductor_messages:'conductor',conductor_escalations:'conductor',conductor_configs:'conductor',conductor_metrics:'conductor',conductor_templates:'conductor',conductor_budgets:'conductor',conductor_sessions:'conductor',
  composition_rules:'composition',composition_versions:'composition',composition_schedules:'composition',composition_conditions:'composition',composition_actions:'composition',composition_tag_links:'composition',composition_execution_log:'composition',composition_event_outbox:'composition',composition_execution_status:'composition',composition_settings:'composition',
  category_overrides:'other',domain_category_overrides:'other',goals:'other',goal_reviews:'other',life_phases:'other',life_timeline_meta:'other',notes:'other',routing_costs:'other',manual_time_assignments:'other',browser_profiles:'other',schema_migrations:'other',
};

const ARCH_GROUPS = [
  { id:'core',     label:'Core Tracking',     color:'#10b981', tables:['logs','sessions','daily_stats','browser_sessions','productivity_sessions'] },
  { id:'stats',    label:'Aggregated Stats',  color:'#06b6d4', tables:['stats_hourly','stats_daily','daily_rollup','app_totals'] },
  { id:'ide',      label:'IDE / Projects',    color:'#8b5cf6', tables:['projects','ides','extensions','tools','code_activity','commits','ai_attribution','dora_metrics'] },
  { id:'ai',       label:'AI Usage & Chat',   color:'#d946ef', tables:['ai_usage','ai_chat_messages','ai_chat_threads','ai_context_captures'] },
  { id:'context',  label:'Context Brain',     color:'#f59e0b', tables:['context_entities','context_facts','context_episodes','user_context_profile','agent_memories'] },
  { id:'workspace',label:'Terminal',          color:'#6366f1', tables:['terminal_sessions','terminal_messages','workspace_state','workspace_problems','workspace_requests'] },
  { id:'finance',  label:'Finance',           color:'#84cc16', tables:['finance_accounts','finance_wallets','finance_transactions','finance_categories','finance_subscriptions'] },
  { id:'learn',    label:'Learn (Lyceum)',    color:'#f97316', tables:['learn_lessons','learn_nodes','learn_progress','learn_cards','learn_streaks'] },
  { id:'content',  label:'Content Engine',    color:'#f43f5e', tables:['content_ideas','content_episodes','themes','content_lessons','content_videos'] },
  { id:'focus',    label:'Focus',             color:'#14b8a6', tables:['deep_focus_sessions','focus_groups','focus_group_usage'] },
  { id:'external', label:'External',          color:'#0ea5e9', tables:['external_activities','external_sessions','schedule_entries','deadlines'] },
  { id:'conductor',label:'Conductor',         color:'#eab308', tables:['conductor_missions','conductor_nodes','conductor_messages'] },
];

const ARCH_FKS: [string, string][] = [
  ['logs','sessions'],['terminal_messages','terminal_sessions'],['workspace_problems','workspace_requests'],
  ['projects','ides'],['code_activity','projects'],['ai_attribution','ai_usage'],
  ['ai_chat_messages','ai_chat_threads'],['ai_chat_memories','ai_chat_threads'],['ai_context_captures','ai_context_groups'],
  ['context_facts','context_entities'],['context_facts','context_episodes'],['context_embeddings','context_entities'],
  ['finance_wallets','finance_accounts'],['finance_transactions','finance_wallets'],['finance_transactions','finance_categories'],
  ['finance_subscriptions','finance_wallets'],['learn_nodes','learn_lessons'],['learn_progress','learn_nodes'],
  ['learn_card_reviews','learn_cards'],['learn_cards','learn_decks'],['content_episodes','content_ideas'],
  ['content_videos','content_episodes'],['content_lessons','content_videos'],['take_segments','content_takes'],
  ['deep_focus_events','deep_focus_sessions'],['focus_group_usage','deep_focus_sessions'],['focus_group_usage','focus_groups'],
  ['conductor_nodes','conductor_missions'],['conductor_messages','conductor_missions'],
];

export default function DatabasePage() {
  const [activeTab, setActiveTab] = useState<'browse'|'architecture'|'changes'>('browse');
  const [tables, setTables] = useState<string[]>([]);
  const [tableCounts, setTableCounts] = useState<Record<string, number>>({});
  const [selectedTable, setSelectedTable] = useState('');
  const [tableSchema, setTableSchema] = useState<any[]>([]);
  const [tableData, setTableData] = useState<any[]>([]);
  const [tableSearch, setTableSearch] = useState('');
  const [tableLoading, setTableLoading] = useState(false);
  const [tableDataPage, setTableDataPage] = useState(0);
  const [totalRows, setTotalRows] = useState(0);
  const [recentChanges, setRecentChanges] = useState<any[]>([]);
  const [changesLoading, setChangesLoading] = useState(false);
  const PAGE_SIZE = 50;
  const api = (window as any).deskflowAPI;

  const fetchTables = useCallback(async () => {
    if (!api?.getDatabaseTables) return;
    try {
      const res = await api.getDatabaseTables();
      if (res?.tables) {
        setTables(res.tables);
        const counts: Record<string, number> = {};
        for (const t of res.tables) {
          try { const c = await api.getTableDataCount(t); counts[t] = c?.total ?? 0; }
          catch { counts[t] = 0; }
        }
        setTableCounts(counts);
      }
    } catch {}
  }, [api]);

  useEffect(() => { fetchTables(); }, [fetchTables]);

  const fetchTableSchema = useCallback(async (name: string) => {
    if (!api?.getTableSchema) return;
    try { const s = await api.getTableSchema(name); setTableSchema(Array.isArray(s) ? s : []); }
    catch { setTableSchema([]); }
  }, [api]);

  const fetchTableData = useCallback(async (name: string, page = 0) => {
    if (!api?.getTableData) return;
    setTableLoading(true);
    try {
      const offset = page * PAGE_SIZE;
      const [data, count] = await Promise.all([api.getTableData(name, PAGE_SIZE + 1, offset), api.getTableDataCount(name)]);
      setTableData(Array.isArray(data) ? data : []);
      setTotalRows(count?.total ?? 0);
      setTableDataPage(page);
    } catch { setTableData([]); setTotalRows(0); }
    finally { setTableLoading(false); }
  }, [api]);

  const fetchRecentChanges = useCallback(async (name: string) => {
    if (!api?.getTableChanges) return;
    setChangesLoading(true);
    try { const r = await api.getTableChanges(name, 25); setRecentChanges(r?.changes ?? []); }
    catch { setRecentChanges([]); }
    finally { setChangesLoading(false); }
  }, [api]);

  useEffect(() => {
    if (!selectedTable) return;
    if (activeTab === 'browse') { fetchTableSchema(selectedTable); fetchTableData(selectedTable); }
    if (activeTab === 'changes') fetchRecentChanges(selectedTable);
  }, [selectedTable, activeTab, fetchTableSchema, fetchTableData, fetchRecentChanges]);

  const filteredTables = useMemo(() => {
    if (!tableSearch) return tables;
    const q = tableSearch.toLowerCase();
    return tables.filter(t => t.toLowerCase().includes(q));
  }, [tables, tableSearch]);

  const tablesByCategory = useMemo(() => {
    const g: Record<string, string[]> = {};
    for (const t of filteredTables) { const c = TCM[t] || 'other'; (g[c] ??= []).push(t); }
    return g;
  }, [filteredTables]);

  const hasNextPage = tableData.length > PAGE_SIZE;
  const displayRows = hasNextPage ? tableData.slice(0, PAGE_SIZE) : tableData;

  const exportCSV = useCallback(() => {
    if (!selectedTable || !displayRows.length) return;
    const cols = Object.keys(displayRows[0]);
    const csv = [cols.join(','), ...displayRows.map(r => cols.map(c => {
      const v = String(r[c] ?? '');
      return v.includes(',') || v.includes('"') ? `"${v.replace(/"/g, '""')}"` : v;
    }).join(','))].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `${selectedTable}.csv`; a.click();
  }, [selectedTable, displayRows]);

  const tabs = [
    { id: 'browse' as const, label: 'Browse', icon: Table2 },
    { id: 'architecture' as const, label: 'Architecture', icon: Network },
    { id: 'changes' as const, label: 'Recent Changes', icon: Clock },
  ];

  return (
    <PageShell page="database" variant="sticky-header">
      <SectionHeader title="Database" icon={<Database className="w-5 h-5" />} />
      <div className="flex items-center gap-1 px-5 pt-2">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all duration-150 ${
              activeTab === tab.id ? 'bg-purple-500/15 text-purple-300 border border-purple-500/30'
              : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/40 border border-transparent'
            }`}>
            <tab.icon className="w-3.5 h-3.5" /> {tab.label}
          </button>
        ))}
        <span className="ml-auto text-[10px] text-zinc-600">{tables.length} tables</span>
      </div>
      <div className="flex gap-4 flex-1 min-h-0 p-5">
        {activeTab === 'browse' && (
          <BrowseTab tablesByCategory={tablesByCategory} tableSearch={tableSearch} setTableSearch={setTableSearch}
            selectedTable={selectedTable} setSelectedTable={setSelectedTable} tableCounts={tableCounts}
            tableSchema={tableSchema} tableData={displayRows} tableLoading={tableLoading}
            totalRows={totalRows} tableDataPage={tableDataPage} hasNextPage={hasNextPage}
            fetchTableData={fetchTableData} exportCSV={exportCSV} fetchRecentChanges={fetchRecentChanges}
            setActiveTab={setActiveTab} PAGE_SIZE={PAGE_SIZE} />
        )}
        {activeTab === 'architecture' && (
          <GlassCard className="flex-1 p-4 overflow-auto h-full min-h-0">
            <ArchitectureView tables={tables} tableCounts={tableCounts}
              onSelectTable={(t) => { setSelectedTable(t); setActiveTab('browse'); }} />
          </GlassCard>
        )}
        {activeTab === 'changes' && (
          <GlassCard className="flex-1 p-4 overflow-auto h-full min-h-0">
            <ChangesView tablesByCategory={tablesByCategory} tableSearch={tableSearch} setTableSearch={setTableSearch}
              selectedTable={selectedTable} onSelectTable={setSelectedTable} tableCounts={tableCounts}
              recentChanges={recentChanges} changesLoading={changesLoading} onFetchChanges={fetchRecentChanges} />
          </GlassCard>
        )}
      </div>
    </PageShell>
  );
}


function BrowseTab({ tablesByCategory, tableSearch, setTableSearch, selectedTable, setSelectedTable, tableCounts, tableSchema, tableData, tableLoading, totalRows, tableDataPage, hasNextPage, fetchTableData, exportCSV, fetchRecentChanges, setActiveTab, PAGE_SIZE }: any) {
  return (
    <>
      <GlassCard className="w-64 flex-shrink-0 p-3 h-full min-h-0 flex flex-col">
        <div className="relative mb-2">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
          <VoiceInputWrapper>
            <input type="text" placeholder="Filter tables..." value={tableSearch}
              onChange={e => setTableSearch(e.target.value)}
              className="w-full bg-zinc-800/50 border border-zinc-700/50 rounded-lg pl-8 pr-3 py-1.5 text-xs text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600" />
          </VoiceInputWrapper>
        </div>
        <div className="space-y-0.5 overflow-y-auto min-h-0 flex-1">
          {Object.entries(tablesByCategory).map(([cat, tbls]: [string, string[]]) => (
            <div key={cat}>
              <div className="flex items-center gap-1.5 px-2 pt-2 pb-0.5">
                <span className={`text-[9px] font-semibold uppercase tracking-wider ${TABLE_CATEGORIES[cat]?.color ?? TABLE_CATEGORIES.other.color}`}>
                  {TABLE_CATEGORIES[cat]?.label ?? cat}
                </span>
                <span className="text-[9px] text-zinc-600">({tbls.length})</span>
              </div>
              {tbls.map(table => (
                <button key={table} onClick={() => setSelectedTable(table)}
                  className={`w-full text-left px-2.5 py-1 rounded-lg text-xs transition-colors ${
                    selectedTable === table ? 'bg-purple-500/15 text-purple-300' : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'
                  }`}>
                  <span className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 truncate">
                      <Table2 className="w-3 h-3 flex-shrink-0 opacity-50" />
                      <span className="truncate">{table}</span>
                    </span>
                    {tableCounts[table] !== undefined && (
                      <span className="text-[9px] text-zinc-600 ml-1 flex-shrink-0">{tableCounts[table]}</span>
                    )}
                  </span>
                </button>
              ))}
            </div>
          ))}
        </div>
      </GlassCard>
      <GlassCard className="flex-1 p-4 overflow-auto h-full min-h-0">
        {selectedTable ? (
          <>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-semibold text-white">{selectedTable}</h2>
                <p className="text-[10px] text-zinc-500 mt-0.5">
                  {tableSchema.length} columns Â· {totalRows.toLocaleString()} rows
                  {totalRows > PAGE_SIZE && ` Â· page ${tableDataPage + 1} of ${Math.ceil(totalRows / PAGE_SIZE)}`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => { fetchRecentChanges(selectedTable); setActiveTab('changes'); }}
                  className="px-2.5 py-1 rounded-lg bg-zinc-800/60 border border-zinc-700/50 text-xs text-zinc-400 hover:text-white hover:border-zinc-600 transition-colors flex items-center gap-1.5">
                  <Clock className="w-3 h-3" /> Changes
                </button>
                <button onClick={exportCSV} disabled={!tableData.length}
                  className="px-2.5 py-1 rounded-lg bg-zinc-800/60 border border-zinc-700/50 text-xs text-zinc-400 hover:text-white hover:border-zinc-600 transition-colors disabled:opacity-30 flex items-center gap-1.5">
                  <Download className="w-3 h-3" /> Export CSV
                </button>
              </div>
            </div>
            {tableSchema.length > 0 && (
              <div className="mb-4 overflow-x-auto">
                <div className="flex gap-1.5 flex-wrap">
                  {tableSchema.map((col: any, i: number) => (
                    <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-zinc-800/50 border border-zinc-700/30 text-[10px]">
                      <span className="text-zinc-300 font-mono">{col.name || col.column_name}</span>
                      <span className="text-zinc-600">{col.type || col.data_type}</span>
                      {col.pk === 1 && <span className="text-amber-500/60 text-[8px]">PK</span>}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {tableLoading ? <LoadingState /> : tableData.length > 0 ? (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-zinc-800/60">
                        {Object.keys(tableData[0]).map(col => (
                          <th key={col} className="text-left text-zinc-500 font-medium py-2 pr-4 whitespace-nowrap">{col}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {tableData.map((row, i) => (
                        <tr key={i} className="border-b border-zinc-800/30 hover:bg-zinc-800/20">
                          {Object.entries(row).map(([col, val], j) => (
                            <td key={j} className="py-1.5 pr-4 text-zinc-400 max-w-[200px] truncate">
                              {val === null ? <span className="text-zinc-700 italic">null</span> :
                               typeof val === 'string' && val.length > 80 ? val.slice(0, 80) + '\u2026' : String(val)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-zinc-800/40">
                  <button onClick={() => fetchTableData(selectedTable, tableDataPage - 1)} disabled={tableDataPage === 0}
                    className="px-3 py-1 rounded-lg bg-zinc-800/50 border border-zinc-700/50 text-xs text-zinc-400 hover:text-white disabled:opacity-30 transition-colors flex items-center gap-1">
                    <ArrowLeft className="w-3 h-3" /> Previous
                  </button>
                  <span className="text-xs text-zinc-500">
                    {tableDataPage * PAGE_SIZE + 1}â€“{Math.min((tableDataPage + 1) * PAGE_SIZE, totalRows)} of {totalRows.toLocaleString()}
                  </span>
                  <button onClick={() => fetchTableData(selectedTable, tableDataPage + 1)} disabled={!hasNextPage}
                    className="px-3 py-1 rounded-lg bg-zinc-800/50 border border-zinc-700/50 text-xs text-zinc-400 hover:text-white disabled:opacity-30 transition-colors flex items-center gap-1">
                    Next <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </>
            ) : <EmptyState icon={<Database className="w-12 h-12" />} title="No data" description="This table is empty" />}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-zinc-600">
            <Database className="w-10 h-10 mb-2 opacity-20" />
            <p className="text-xs">Select a table to browse</p>
          </div>
        )}
      </GlassCard>
    </>
  );
}


function ArchitectureView({ tables, tableCounts, onSelectTable }: {
  tables: string[]; tableCounts: Record<string, number>; onSelectTable: (t: string) => void;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoveredTable, setHoveredTable] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const GW = 220, GH = 28, RW = 18, PAD = 20, GX = 30, GY = 25;

  const groups = useMemo(() => {
    const cols = 4;
    return ARCH_GROUPS.map((g, i) => ({
      ...g,
      x: (i % cols) * (GW + GX),
      y: Math.floor(i / cols) * (220 + GY),
      h: GH + g.tables.length * RW + PAD,
    }));
  }, []);

  const center = (name: string) => {
    for (const g of groups) {
      const idx = g.tables.indexOf(name);
      if (idx !== -1) return { x: g.x + GW / 2, y: g.y + GH + idx * RW + RW / 2 };
    }
    return null;
  };

  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setZoom(z => Math.min(2, Math.max(0.3, z + (e.deltaY > 0 ? -0.1 : 0.1))));
  }, []);

  const onDown = useCallback((e: React.MouseEvent) => {
    setDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
  }, [pan]);

  const onMove = useCallback((e: React.MouseEvent) => {
    if (!dragging) return;
    setPan({ x: dragStart.current.panX + (e.clientX - dragStart.current.x), y: dragStart.current.panY + (e.clientY - dragStart.current.y) });
  }, [dragging]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Network className="w-4 h-4 text-purple-400" /> Database Architecture
          </h3>
          <p className="text-[10px] text-zinc-500 mt-0.5">
            {tables.length} tables Â· {ARCH_GROUPS.length} domains Â· {ARCH_FKS.length} relationships Â· scroll to zoom, drag to pan
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setZoom(z => Math.min(2, z + 0.2))} className="px-2 py-1 rounded bg-zinc-800/60 border border-zinc-700/50 text-xs text-zinc-400 hover:text-white">+</button>
          <span className="text-[10px] text-zinc-600 w-10 text-center">{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom(z => Math.max(0.3, z - 0.2))} className="px-2 py-1 rounded bg-zinc-800/60 border border-zinc-700/50 text-xs text-zinc-400 hover:text-white">-</button>
          <button onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }} className="px-2 py-1 rounded bg-zinc-800/60 border border-zinc-700/50 text-[10px] text-zinc-500 hover:text-white">Reset</button>
        </div>
      </div>
      <div className="flex-1 overflow-hidden rounded-xl border border-zinc-800/40 bg-[#0a0a0c] relative" style={{ cursor: dragging ? 'grabbing' : 'grab' }}>
        <svg ref={svgRef} width="100%" height="100%" onWheel={onWheel} onMouseDown={onDown} onMouseMove={onMove} onMouseUp={() => setDragging(false)} onMouseLeave={() => setDragging(false)}>
          <g transform={`translate(${pan.x},${pan.y}) scale(${zoom})`}>
            {ARCH_FKS.map(([from, to], i) => {
              const a = center(from), b = center(to);
              if (!a || !b) return null;
              const hl = hoveredTable === from || hoveredTable === to;
              return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={hl ? '#a78bfa' : '#27272a'} strokeWidth={hl ? 2 : 1} strokeDasharray={hl ? undefined : '4 3'} opacity={hl ? 0.9 : 0.4} />;
            })}
            {groups.map(g => (
              <g key={g.id}>
                <rect x={g.x} y={g.y} width={GW} height={g.h} rx={8} fill="#18181b" fillOpacity={0.8} stroke={g.color} strokeWidth={1} strokeOpacity={0.3} />
                <rect x={g.x} y={g.y} width={GW} height={GH} rx={8} fill={g.color} fillOpacity={0.12} />
                <text x={g.x + 10} y={g.y + 18} fill={g.color} fontSize={11} fontWeight={600}>{g.label}</text>
                <text x={g.x + GW - 8} y={g.y + 18} fill="#52525b" fontSize={9} textAnchor="end">{g.tables.length}</text>
                {g.tables.map((t, ti) => {
                  const ty = g.y + GH + ti * RW;
                  const hl = hoveredTable === t;
                  const cnt = tableCounts[t] ?? 0;
                  return (
                    <g key={t} onMouseEnter={() => setHoveredTable(t)} onMouseLeave={() => setHoveredTable(null)} onClick={() => onSelectTable(t)} style={{ cursor: 'pointer' }}>
                      <rect x={g.x + 4} y={ty} width={GW - 8} height={RW - 2} rx={3} fill={hl ? g.color : 'transparent'} fillOpacity={hl ? 0.15 : 0} />
                      <text x={g.x + 10} y={ty + 12} fill={hl ? '#fafafa' : '#a1a1aa'} fontSize={10} fontFamily="monospace">{t}</text>
                      {cnt > 0 && <text x={g.x + GW - 10} y={ty + 12} fill="#52525b" fontSize={8} textAnchor="end">{cnt.toLocaleString()}</text>}
                    </g>
                  );
                })}
              </g>
            ))}
          </g>
        </svg>
      </div>
      <div className="flex flex-wrap gap-2 mt-3">
        {ARCH_GROUPS.map(g => (
          <div key={g.id} className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: g.color + '40', border: `1px solid ${g.color}60` }} />
            <span className="text-[10px] text-zinc-500">{g.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ChangesView({ tablesByCategory, tableSearch, setTableSearch, selectedTable, onSelectTable, tableCounts, recentChanges, changesLoading, onFetchChanges }: any) {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const fmtTime = (val: any) => { if (!val) return null; try { const d = new Date(val); return isNaN(d.getTime()) ? String(val) : d.toLocaleString(); } catch { return String(val); } };
  const timeKey = (r: any) => r.updated_at || r.created_at || r.started_at || r.ended_at || r.ts || r.last_seen_at;

  return (
    <div className="flex gap-4 h-full min-h-0">
      <div className="w-56 flex-shrink-0 flex flex-col min-h-0">
        <div className="relative mb-2">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
          <input type="text" placeholder="Filter..." value={tableSearch} onChange={e => setTableSearch(e.target.value)}
            className="w-full bg-zinc-800/50 border border-zinc-700/50 rounded-lg pl-8 pr-3 py-1.5 text-xs text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600" />
        </div>
        <div className="space-y-0.5 overflow-y-auto min-h-0 flex-1">
          {Object.entries(tablesByCategory).map(([cat, tbls]: [string, string[]]) => (
            <div key={cat}>
              <div className="px-2 pt-2 pb-0.5">
                <span className={`text-[9px] font-semibold uppercase tracking-wider ${TABLE_CATEGORIES[cat]?.color ?? TABLE_CATEGORIES.other.color}`}>
                  {TABLE_CATEGORIES[cat]?.label ?? cat}
                </span>
              </div>
              {tbls.map(t => (
                <button key={t} onClick={() => onSelectTable(t)}
                  className={`w-full text-left px-2.5 py-1 rounded-lg text-xs transition-colors ${
                    selectedTable === t ? 'bg-purple-500/15 text-purple-300' : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'
                  }`}>
                  <span className="flex items-center justify-between">
                    <span className="truncate">{t}</span>
                    {tableCounts[t] !== undefined && <span className="text-[9px] text-zinc-600">{tableCounts[t]}</span>}
                  </span>
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-auto min-h-0">
        {selectedTable ? (
          changesLoading ? <LoadingState /> : recentChanges.length > 0 ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-white">{selectedTable} â€” Recent Changes</h3>
                <span className="text-[10px] text-zinc-500">{recentChanges.length} most recent rows</span>
              </div>
              {recentChanges.map((row: any, i: number) => {
                const ts = timeKey(row);
                const isExpanded = expandedIdx === i;
                const previewCols = Object.keys(row).slice(0, 4);
                return (
                  <div key={i} className="rounded-lg border border-zinc-800/40 bg-zinc-900/30 overflow-hidden">
                    <button onClick={() => setExpandedIdx(isExpanded ? null : i)}
                      className="w-full text-left px-3 py-2 flex items-center justify-between hover:bg-zinc-800/20 transition-colors">
                      <div className="flex items-center gap-3">
                        <span className="text-[9px] text-zinc-600 w-5 text-right">#{i + 1}</span>
                        <div className="flex gap-3">
                          {previewCols.map(c => (
                            <span key={c} className="text-[10px]">
                              <span className="text-zinc-600">{c}:</span>{' '}
                              <span className="text-zinc-300 font-mono max-w-[120px] inline-block truncate align-bottom">
                                {row[c] === null ? 'null' : String(row[c])}
                              </span>
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {ts && <span className="text-[9px] text-zinc-600">{fmtTime(ts)}</span>}
                        <ChevronRight className={`w-3 h-3 text-zinc-600 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                      </div>
                    </button>
                    {isExpanded && (
                      <div className="px-3 pb-3 border-t border-zinc-800/30 pt-2">
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                          {Object.entries(row).map(([k, v]) => (
                            <div key={k} className="flex gap-2 text-[10px]">
                              <span className="text-zinc-600 font-mono flex-shrink-0">{k}</span>
                              <span className="text-zinc-300 font-mono break-all">
                                {v === null ? <span className="text-zinc-700 italic">null</span> : typeof v === 'string' && v.length > 120 ? v.slice(0, 120) + '\u2026' : String(v)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState icon={<Clock className="w-12 h-12" />} title="No recent changes" description="No timestamped data found for this table" />
          )
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-zinc-600">
            <Clock className="w-10 h-10 mb-2 opacity-20" />
            <p className="text-xs">Select a table to view recent changes</p>
          </div>
        )}
      </div>
    </div>
  );
}
