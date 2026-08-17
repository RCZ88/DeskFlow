/**
 * UserContextService — Unified context management system (Auto-Context Engine)
 * 
 * Aggregates user data from all sources into a living, read-derived profile.
 * - Signal ingestion (explicit + regex-extracted)
 * - Confidence scoring (source weight × explicitness × recency decay × occurrence boost)
 * - Conflict resolution / supersession (explicit beats inferred)
 * - Profile projection (traits, habits, preferences, interests, communication style,
 *   activity patterns, growth markers, memory highlights, summary)
 */

let dbRef: any = null;

export function setContextDb(db: any) { dbRef = db; }

export interface UserProfile {
  id: string
  traits: Record<string, any>
  habits: Record<string, any>
  preferences: Record<string, any>
  goalsPattern: Record<string, any>
  activityPattern: Record<string, any>
  growthMarkers: Array<{ date: string; label: string; source: string; type: string }>
  communicationStyle: Record<string, any>
  interests: Record<string, any>
  memoryHighlights: Array<{ content: string; source: string; importance: number }>
  summary: string
  contextVersion: number
  lastUpdatedAt: number
  createdAt: number
}

export interface ContextSignal {
  id: string
  signalType: string
  content: string
  source: string
  sourceRef?: string
  category?: string
  confidence: number
  firstSeenAt: number
  lastSeenAt: number
  occurrenceCount: number
  supersededBy?: string
  active: number
}

const DEFAULT_PROFILE: UserProfile = {
  id: 'main',
  traits: {},
  habits: {},
  preferences: {},
  goalsPattern: {},
  activityPattern: {},
  growthMarkers: [],
  communicationStyle: {},
  interests: {},
  memoryHighlights: [],
  summary: '',
  contextVersion: 1,
  lastUpdatedAt: Date.now(),
  createdAt: Date.now(),
};

// ═══ Source weights (spec §8.2) ═══
const SOURCE_WEIGHTS: Record<string, number> = {
  correction: 1.0,
  explicit_statement: 0.9,
  milestone: 0.85,
  reflection: 0.75,
  memory: 0.7,
  goal: 0.65,
  llm_extraction: 0.55,
  regex_extraction: 0.4,
  app_usage: 0.35,
  chat: 0.4,
  manual: 0.8,
};

// ═══ Signal type half-lives in days (spec §8.3) ═══
const HALF_LIVES: Record<string, number> = {
  correction: 365,
  preference: 180,
  communication: 180,
  habit: 60,
  interest: 90,
  mood_pattern: 30,
  milestone: Infinity,
  goal_pattern: 90,
  trait: 120,
  rule: 365,
};

function rowToProfile(row: any): UserProfile {
  return {
    id: row.id,
    traits: JSON.parse(row.traits || '{}'),
    habits: JSON.parse(row.habits || '{}'),
    preferences: JSON.parse(row.preferences || '{}'),
    goalsPattern: JSON.parse(row.goals_pattern || '{}'),
    activityPattern: JSON.parse(row.activity_pattern || '{}'),
    growthMarkers: JSON.parse(row.growth_markers || '[]'),
    communicationStyle: JSON.parse(row.communication_style || '{}'),
    interests: JSON.parse(row.interests || '{}'),
    memoryHighlights: JSON.parse(row.memory_highlights || '[]'),
    summary: row.summary || '',
    contextVersion: row.context_version || 1,
    lastUpdatedAt: row.last_updated_at || Date.now(),
    createdAt: row.created_at || Date.now(),
  };
}

function rowToSignal(row: any): ContextSignal {
  return {
    id: row.id,
    signalType: row.signal_type,
    content: row.content,
    source: row.source,
    sourceRef: row.source_ref || undefined,
    category: row.category || undefined,
    confidence: row.confidence || 0.5,
    firstSeenAt: row.first_seen_at || Date.now(),
    lastSeenAt: row.last_seen_at || Date.now(),
    occurrenceCount: row.occurrence_count || 1,
    supersededBy: row.superseded_by || undefined,
    active: row.active ?? 1,
  };
}

export function getProfile(): UserProfile {
  if (!dbRef) return { ...DEFAULT_PROFILE };
  const row = dbRef.prepare('SELECT * FROM user_context_profile WHERE id = ?').get('main');
  return row ? rowToProfile(row) : { ...DEFAULT_PROFILE };
}

export function updateProfile(patch: Partial<Omit<UserProfile, 'id' | 'createdAt'>>): void {
  if (!dbRef) return;
  const existing = getProfile();
  const merged = {
    traits: JSON.stringify({ ...existing.traits, ...patch.traits }),
    habits: JSON.stringify({ ...existing.habits, ...patch.habits }),
    preferences: JSON.stringify({ ...existing.preferences, ...patch.preferences }),
    goals_pattern: JSON.stringify({ ...existing.goalsPattern, ...patch.goalsPattern }),
    activity_pattern: JSON.stringify({ ...existing.activityPattern, ...patch.activityPattern }),
    growth_markers: JSON.stringify(patch.growthMarkers || existing.growthMarkers),
    communication_style: JSON.stringify({ ...existing.communicationStyle, ...patch.communicationStyle }),
    interests: JSON.stringify({ ...existing.interests, ...patch.interests }),
    memory_highlights: JSON.stringify(patch.memoryHighlights || existing.memoryHighlights),
    summary: patch.summary ?? existing.summary,
    context_version: (existing.contextVersion || 0) + 1,
    last_updated_at: Date.now(),
  };

  const existingRow = dbRef.prepare('SELECT id FROM user_context_profile WHERE id = ?').get('main');
  if (existingRow) {
    dbRef.prepare(`
      UPDATE user_context_profile SET traits=?, habits=?, preferences=?, goals_pattern=?,
      activity_pattern=?, growth_markers=?, communication_style=?, interests=?,
      memory_highlights=?, summary=?, context_version=?, last_updated_at=? WHERE id=?
    `).run(merged.traits, merged.habits, merged.preferences, merged.goals_pattern,
      merged.activity_pattern, merged.growth_markers, merged.communication_style,
      merged.interests, merged.memory_highlights, merged.summary,
      merged.context_version, merged.last_updated_at, 'main');
  } else {
    dbRef.prepare(`
      INSERT INTO user_context_profile (id, traits, habits, preferences, goals_pattern,
      activity_pattern, growth_markers, communication_style, interests, memory_highlights,
      summary, context_version, last_updated_at, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `).run('main', merged.traits, merged.habits, merged.preferences, merged.goals_pattern,
      merged.activity_pattern, merged.growth_markers, merged.communication_style,
      merged.interests, merged.memory_highlights, merged.summary,
      merged.context_version, merged.last_updated_at, Date.now());
  }
}

// ═══ Confidence scoring (spec §8) ═══

export function computeConfidence(signalType: string, source: string, ageInDays: number, occurrenceCount: number): number {
  const sourceWeight = SOURCE_WEIGHTS[source] ?? 0.4;
  const halfLife = HALF_LIVES[signalType] ?? 90;
  const recencyDecay = halfLife === Infinity ? 1 : Math.exp(-ageInDays / halfLife);
  const occurrenceBoost = 1 + Math.log(Math.max(1, occurrenceCount));
  return Math.min(1.0, sourceWeight * recencyDecay * occurrenceBoost);
}

// ═══ Signal ingestion (spec §9 conflict resolution) ═══

export function addSignal(
  signalType: string,
  content: string,
  source: string,
  confidence: number = 0.5,
  opts: { sourceRef?: string; category?: string; supersedes?: string } = {}
): void {
  if (!dbRef) return;
  const id = `ctx_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const now = Date.now();

  // Dedup: same type + same normalized content (first 80 chars)
  const existing = dbRef.prepare(
    'SELECT * FROM user_context_signals WHERE signal_type = ? AND content LIKE ? AND superseded_by IS NULL'
  ).get(signalType, content.slice(0, 80) + '%');

  if (existing) {
    const ageDays = (now - (existing.first_seen_at || now)) / 86400000;
    const recalc = computeConfidence(signalType, source, ageDays, (existing.occurrence_count || 0) + 1);
    const newConfidence = Math.max(existing.confidence || 0.5, recalc, confidence);
    dbRef.prepare(`
      UPDATE user_context_signals SET occurrence_count = occurrence_count + 1,
      confidence = ?, last_seen_at = ?, source = CASE WHEN ? = 1 THEN source ELSE ? END WHERE id = ?
    `).run(Math.min(1.0, newConfidence), now, confidence > (existing.confidence || 0) ? 1 : 0, source, existing.id);
  } else {
    // Conflict resolution: explicit supersedes inferred with same type+subject
    if (opts.supersedes) {
      dbRef.prepare('UPDATE user_context_signals SET active = 0, superseded_by = ? WHERE id = ?')
        .run(id, opts.supersedes);
    }
    dbRef.prepare(`
      INSERT INTO user_context_signals (id, signal_type, content, source, source_ref, category, confidence, first_seen_at, last_seen_at, occurrence_count, active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1)
    `).run(id, signalType, content, source, opts.sourceRef || null, opts.category || null,
      Math.min(1.0, Math.max(confidence, computeConfidence(signalType, source, 0, 1))), now, now);
  }
}

export function getSignals(signalType?: string, source?: string, limit: number = 50, includeSuperseded: boolean = false): ContextSignal[] {
  if (!dbRef) return [];
  let query = 'SELECT * FROM user_context_signals WHERE 1=1';
  const params: any[] = [];
  if (!includeSuperseded) query += ' AND superseded_by IS NULL';
  if (signalType) { query += ' AND signal_type = ?'; params.push(signalType); }
  if (source) { query += ' AND source = ?'; params.push(source); }
  query += ' ORDER BY confidence DESC, last_seen_at DESC LIMIT ?';
  params.push(limit);
  return dbRef.prepare(query).all(...params).map(rowToSignal);
}

export function setSignalConfidence(signalId: string, confidence: number): void {
  if (!dbRef) return;
  dbRef.prepare('UPDATE user_context_signals SET confidence = ? WHERE id = ?')
    .run(Math.min(1, Math.max(0, confidence)), signalId);
}

// ═══ Regex heuristic extraction (spec §7.4) — from episode text ═══

const PREFERENCE_RE = /(?:i|user)\s+(?:prefer|like|want|love|hate|dislike|always use|never use|prefers)\s+(.+)/i;
const CORRECTION_RE = /(?:don't|do not|stop|avoid|never|please don't)\s+(.+)/i;
const FOCUS_RE = /(?:i am|i'm|currently|right now)\s+(?:working on|focused on|building|implementing)\s+(.+)/i;
const GOAL_RE = /(?:my goal|milestone|finished|completed|achieved)\s+(.+)/i;
const TONE_RE = /(?:be|keep it|answer|respond)\s+(?:concise|brief|short|detailed|thorough|direct|casual|formal)/i;

export function extractSignalsFromText(text: string, source: string): Array<{ signalType: string; content: string; confidence: number }> {
  const signals: Array<{ signalType: string; content: string; confidence: number }> = [];
  const lower = text.toLowerCase();

  const m1 = PREFERENCE_RE.exec(lower);
  if (m1) signals.push({ signalType: 'preference', content: `User prefers ${m1[1].trim().slice(0, 120)}`, confidence: 0.42 });

  const m2 = CORRECTION_RE.exec(lower);
  if (m2) signals.push({ signalType: 'correction', content: `User asked to avoid: ${m2[1].trim().slice(0, 120)}`, confidence: 0.55 });

  const m3 = FOCUS_RE.exec(lower);
  if (m3) signals.push({ signalType: 'interest', content: `Current focus: ${m3[1].trim().slice(0, 120)}`, confidence: 0.4 });

  const m4 = GOAL_RE.exec(lower);
  if (m4) signals.push({ signalType: 'goal_pattern', content: `Goal/milestone: ${m4[1].trim().slice(0, 120)}`, confidence: 0.45 });

  const m5 = TONE_RE.exec(lower);
  if (m5) signals.push({ signalType: 'communication', content: `Prefers ${m5[1].toLowerCase()} responses`, confidence: 0.5 });

  // Keyword interest detection
  const keywords = text.match(/\b(AI|LLM|context|graph|MCP|SQLite|Electron|React|TypeScript|design|finance|tracking|terminal|automation)\b/gi) || [];
  const counted = new Map<string, number>();
  for (const kw of keywords) counted.set(kw.toLowerCase(), (counted.get(kw.toLowerCase()) || 0) + 1);
  for (const [kw, count] of counted) {
    if (count >= 2) signals.push({ signalType: 'interest', content: `Engages with ${kw} topics`, confidence: 0.3 });
  }

  return signals;
}

// ═══ Profile projection ═══

export function rebuildProfile(): void {
  if (!dbRef) return;

  // 1. Gather active signals
  const signals = dbRef.prepare(
    'SELECT * FROM user_context_signals WHERE superseded_by IS NULL ORDER BY confidence DESC'
  ).all().map(rowToSignal);

  const traits: Record<string, any> = {};
  const habits: Record<string, any> = {};
  const preferences: Record<string, any> = {};
  const interests: Record<string, any> = {};
  const communicationStyle: Record<string, any> = {};
  const rules: Record<string, any> = {};

  for (const s of signals) {
    const bucket = s.signalType === 'trait' ? traits
      : s.signalType === 'habit' ? habits
      : s.signalType === 'preference' ? preferences
      : s.signalType === 'interest' ? interests
      : s.signalType === 'communication' ? communicationStyle
      : s.signalType === 'rule' ? rules
      : null;
    if (bucket) {
      const key = s.content.slice(0, 40).toLowerCase().replace(/[^a-z0-9]/g, '_');
      bucket[key] = { content: s.content, confidence: s.confidence, occurrences: s.occurrenceCount, source: s.source };
    }
  }

  // 2. Growth markers from life phases + goals
  const growthMarkers: Array<{ date: string; label: string; source: string; type: string }> = [];
  try {
    const phases = dbRef.prepare('SELECT id, title, start_year, start_month, category FROM life_phases ORDER BY start_year, start_month').all();
    for (const p of phases) {
      growthMarkers.push({
        date: `${p.start_year}-${String(p.start_month).padStart(2, '0')}`,
        label: p.title,
        source: 'life_phase',
        type: p.category || 'general',
      });
    }
  } catch { /* no life_phases table */ }

  try {
    const goals = dbRef.prepare("SELECT title, category, completed_at FROM goals WHERE status = 'done' AND completed_at IS NOT NULL ORDER BY completed_at DESC LIMIT 20").all();
    for (const g of goals) {
      growthMarkers.push({
        date: g.completed_at,
        label: `Completed: ${g.title}`,
        source: 'goal',
        type: g.category || 'general',
      });
    }
  } catch { /* no goals table */ }

  // 3. Activity pattern from app usage logs (hour-by-day grid)
  const activityPattern: Record<string, any> = {};
  try {
    const hasLogs = dbRef.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='logs'").get();
    if (hasLogs) {
      const grid: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
      const rows = dbRef.prepare(`
        SELECT CAST(strftime('%w', started_at) AS INTEGER) AS day, CAST(strftime('%H', started_at) AS INTEGER) AS hour, COUNT(*) as c
        FROM logs WHERE started_at IS NOT NULL GROUP BY day, hour
      `).all();
      for (const r of rows) grid[r.day][r.hour] = r.c;
      const max = Math.max(1, ...grid.flat());
      activityPattern.hour_by_day_grid = grid.map(row => row.map(v => Math.round((v / max) * 5)));
      // Primary work window
      const hourTotals = Array(24).fill(0);
      for (const r of rows) hourTotals[r.hour] += r.c;
      const sorted = hourTotals.map((v, h) => ({ v, h })).sort((a, b) => b.v - a.v);
      if (sorted[0].v > 0) {
        activityPattern.primary_work_window = `${String(sorted[0].h).padStart(2, '0')}:00`;
        const second = sorted[1] && sorted[1].v > 0 ? sorted[1].h : -1;
        if (second >= 0) activityPattern.secondary_work_window = `${String(second).padStart(2, '0')}:00`;
        activityPattern.focus_pattern = sorted[0].h >= 20 || sorted[0].h <= 4 ? 'late-night deep work' : 'daytime focus';
      }
    }
  } catch { /* no logs table */ }

  // 4. Memory highlights from agent_memories + ai_chat_memories + high-confidence signals
  const memoryHighlights: Array<{ content: string; source: string; importance: number }> = [];
  try {
    const mems = dbRef.prepare('SELECT content, importance FROM agent_memories ORDER BY importance DESC LIMIT 5').all();
    for (const m of mems) memoryHighlights.push({ content: m.content.slice(0, 200), source: 'agent_memory', importance: m.importance || 0.5 });
  } catch { /* no agent_memories */ }
  try {
    const chatMems = dbRef.prepare('SELECT content FROM ai_chat_memories ORDER BY created_at DESC LIMIT 5').all();
    for (const m of chatMems) memoryHighlights.push({ content: m.content.slice(0, 200), source: 'ai_chat', importance: 0.5 });
  } catch { /* no ai_chat_memories */ }
  for (const s of signals) {
    if ((s.signalType === 'correction' || s.signalType === 'rule') && s.confidence > 0.6) {
      memoryHighlights.push({ content: s.content, source: 'signal', importance: s.confidence });
    }
  }

  // 5. Generate summary
  const summary = generateSummary({ traits, interests, communicationStyle, habits: activityPattern, growthMarkers });

  updateProfile({ traits, habits, preferences, interests, communicationStyle, growthMarkers, activityPattern, memoryHighlights, summary });
}

function generateSummary(ctx: { traits: any; interests: any; communicationStyle: any; habits: any; growthMarkers: any[] }): string {
  const parts: string[] = [];
  const traitVals = Object.values(ctx.traits || {}).map((t: any) => t.content).slice(0, 3);
  if (traitVals.length) parts.push(`The user is ${traitVals.join(', ').toLowerCase()}.`);
  const intVals = Object.values(ctx.interests || {}).map((i: any) => i.content).slice(0, 3);
  if (intVals.length) parts.push(`Actively engaged with ${intVals.join('; ').toLowerCase()}.`);
  const commVals = Object.values(ctx.communicationStyle || {}).map((c: any) => c.content).slice(0, 3);
  if (commVals.length) parts.push(`Communication: ${commVals.join('; ').toLowerCase()}.`);
  if (ctx.habits?.primary_work_window) parts.push(`Most active around ${ctx.habits.primary_work_window}.`);
  if (ctx.growthMarkers?.length) parts.push(`${ctx.growthMarkers.length} growth milestones recorded.`);
  return parts.length ? parts.join(' ') : 'Profile is being generated from DeskFlow activity.';
}

// ═══ Memory highlights IPC support ═══

export function getMemoryHighlights(): Array<{ content: string; source: string; importance: number }> {
  return getProfile().memoryHighlights || [];
}

// ═══ Debug status ═══

export function getContextDebug(): any {
  if (!dbRef) return { profileVersion: 1, signalCount: 0, sources: [] };
  const signalCount = dbRef.prepare('SELECT COUNT(*) as c FROM user_context_signals').get().c;
  const profile = getProfile();
  return {
    profileVersion: profile.contextVersion,
    signalCount,
    sources: ['context_episodes', 'context_entities', 'context_facts', 'user_context_signals', 'agent_memories', 'ai_chat_memories', 'life_phases', 'goals', 'logs'],
    lastUpdatedAt: profile.lastUpdatedAt,
    summary: profile.summary,
  };
}