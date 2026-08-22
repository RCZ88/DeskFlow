# CONTEXT_BUNDLE.md — Per-Page Context System

> VERBATIM source code from DeskFlow codebase. Target AI reads this FIRST.

---

## 1. assemble-context IPC Handler (src/main.ts:15375-15594)

```typescript
electron_1.ipcMain.handle('assemble-context', async (_event, data: { projectId: string; problemIds?: string[]; requestIds?: string[]; tokenBudget?: number; topic?: string; sessionId?: string }) => {
  try {
    const parts = [];
    let totalChars = 0;
    const budget = data.tokenBudget || 2000;
    const maxChars = budget * 4;

    // Block 1: Active Problems
    const problems = db.prepare('SELECT id, title, status, priority, category, description FROM workspace_problems WHERE project_id = ? ORDER BY created_at DESC').all(data.projectId) as any[];
    const requests = db.prepare('SELECT id, title, status, priority, description FROM workspace_requests WHERE project_id = ? ORDER BY created_at DESC').all(data.projectId) as any[];
    const sessions = db.prepare("SELECT id, topic, status, agent, agent_label, created_at FROM terminal_sessions WHERE project_id = ? AND status != 'cancelled' ORDER BY created_at DESC LIMIT 10").all(data.projectId) as any[];

    if (problems.length > 0) {
      const lines = ['## Active Problems\n'];
      for (const p of problems) {
        const line = `- **${p.id}**: ${p.title} (${p.status})`;
        if (totalChars + line.length > maxChars) break;
        lines.push(line);
        totalChars += line.length;
      }
      parts.push(lines.join('\n'));
    }

    // Block 2: Active Requests
    if (requests.length > 0) {
      const lines = ['## Active Requests\n'];
      for (const r of requests) {
        const line = `- **${r.id}**: ${r.title} (${r.priority})`;
        if (totalChars + line.length > maxChars) break;
        lines.push(line);
        totalChars += line.length;
      }
      parts.push(lines.join('\n'));
    }

    // Block 3: Recent Sessions
    if (sessions.length > 0) {
      const lines = ['## Recent Sessions\n'];
      for (const s of sessions) {
        const line = `- **${s.topic || 'Untitled'}** — ${s.agent_label || s.agent} (${s.status})`;
        if (totalChars + line.length > maxChars) break;
        lines.push(line);
        totalChars += line.length;
      }
      parts.push(lines.join('\n'));
    }

    // Block 4: Backup Protocol
    const backupProtocol = [
        '## Backup & Safety Protocol',
        '- A full snapshot is taken automatically before this agent session started and every 30 min.',
        '- If a change might need to be undone later: ASK the user for permission first.',
        '- NEVER run destructive git commands.',
        '- The database is READ-ONLY for you.',
    ].join('\n');
    parts.push(backupProtocol);
    totalChars += backupProtocol.length;

    // Block 5: User Context Profile
    try {
        const profile = userContextService.getProfile();
        if (profile) {
            const userLines: string[] = ['## User Context (auto-derived)'];
            if (profile.summary) {
                const line = '- Summary: ' + profile.summary;
                if (totalChars + line.length <= maxChars) { userLines.push(line); totalChars += line.length; }
            }
            const traits = Object.keys(profile.traits || {});
            if (traits.length > 0) {
                const line = '- Traits: ' + traits.map((k: string) => profile.traits[k].content).join(', ');
                if (totalChars + line.length <= maxChars) { userLines.push(line); totalChars += line.length; }
            }
            if (userLines.length > 1) parts.push(userLines.join('\n'));
        }
    } catch (_e) { /* profile injection is best-effort */ }

    // Block 6: Brain + Memory Retrieval
    try {
        let sessionTopic = '';
        if (data.sessionId) {
            try {
                const sess = db.prepare('SELECT topic FROM terminal_sessions WHERE id = ?').get(data.sessionId) as any;
                sessionTopic = (sess && sess.topic) || '';
            } catch { /* session lookup best-effort */ }
        }
        const queryTopic = (data.topic || sessionTopic || '').trim();
        if (queryTopic.length > 1) {
            const brainMd = (() => {
                try {
                    return contextFormatter.formatBrainContext(queryTopic, contextBrain.retrieve(queryTopic, ['keyword', 'graph']));
                } catch (e: any) {
                    console.warn('[assemble-context] Brain retrieval failed:', e.message);
                    return '';
                }
            })();
            const memoryMd = (() => {
                try {
                    const agentMemories = memoryStore.searchMemories(queryTopic);
                    const chatMemories = memoryRetrieval.getRelevantMemories(db, '', queryTopic, 3);
                    return contextFormatter.formatMemoryContext(agentMemories, chatMemories);
                } catch (e: any) {
                    console.warn('[assemble-context] Memory retrieval failed:', e.message);
                    return '';
                }
            })();
            const combinedMd = (brainMd + '\n' + memoryMd).trim();
            if (combinedMd.length > 0) {
                const remainingBudget = maxChars - totalChars - 200;
                if (remainingBudget > 100) {
                    const truncatedMd = contextFormatter.truncateToBudget(combinedMd, remainingBudget);
                    if (truncatedMd.length > 0) {
                        parts.push(truncatedMd);
                        totalChars += truncatedMd.length;
                    }
                }
            }
        }
    } catch (err: any) {
        console.warn('[assemble-context] Memory restoration block failed:', err.message);
    }

    // Block 7: Chat History
    if (data.sessionId) {
        try {
            const userMessages = db.prepare(
                "SELECT content, created_at FROM terminal_messages WHERE session_id = ? AND role = 'user' ORDER BY created_at ASC"
            ).all(data.sessionId) as any[];
            if (userMessages.length > 0) {
                const remainingBudget = maxChars - totalChars - 200;
                if (remainingBudget > 100) {
                    const historyLines: string[] = ['## Chat History (user instructions only)'];
                    let historyChars = historyLines[0].length;
                    for (const msg of userMessages) {
                        const excerpt = String(msg.content || '').replace(/\s+/g, ' ').slice(0, 300);
                        const line = `- ${excerpt}`;
                        if (historyChars + line.length > remainingBudget) break;
                        historyLines.push(line);
                        historyChars += line.length;
                    }
                    if (historyLines.length > 1) {
                        const historyMd = historyLines.join('\n');
                        parts.push(historyMd);
                        totalChars += historyMd.length;
                    }
                }
            }
        } catch (err: any) {
            console.warn('[assemble-context] Chat history injection failed:', err.message);
        }
    }

    // Block 8: Learner Knowledge
    try {
        const learnTables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name IN ('learn_progress','learn_nodes')").all() as any[];
        if (learnTables.length === 2) {
            const mastered = db.prepare(
                "SELECT p.node_id, p.level, p.stability, n.title FROM learn_progress p JOIN learn_nodes n ON n.id = p.node_id WHERE p.level IN ('L2','L3','L4','L5') ORDER BY p.level DESC, p.stability DESC LIMIT 15"
            ).all() as any[];
            const learning = db.prepare(
                "SELECT p.node_id, p.level, p.stability, p.last_seen, n.title FROM learn_progress p JOIN learn_nodes n ON n.id = p.node_id WHERE p.level IN ('L0','L1') AND datetime(p.last_seen) >= datetime('now', '-30 days') ORDER BY p.last_seen DESC LIMIT 10"
            ).all() as any[];
            const lines: string[] = [];
            if (mastered.length > 0) {
                lines.push('## Learner Knowledge (mastered)');
                for (const m of mastered) lines.push(`- ${m.title} (${m.level})`);
            }
            if (learning.length > 0) {
                if (lines.length > 0) lines.push('');
                lines.push('## Learner Knowledge (in progress)');
                for (const l of learning) lines.push(`- ${l.title} (${l.level})`);
            }
            if (lines.length > 0) {
                const remainingBudget = maxChars - totalChars - 200;
                if (remainingBudget > 100) {
                    let block = lines.join('\n');
                    if (block.length > remainingBudget) {
                        const capped: string[] = [];
                        let used = 0;
                        for (const line of lines) {
                            if (used + line.length > remainingBudget) break;
                            capped.push(line);
                            used += line.length;
                        }
                        block = capped.join('\n');
                    }
                    if (block.length > 0) { parts.push(block); totalChars += block.length; }
                }
            }
        }
    } catch (err: any) {
        console.warn('[assemble-context] Learner knowledge injection failed:', err.message);
    }

    const context = parts.join('\n\n---\n\n');
    return { success: true, context, tokensUsed: Math.ceil(totalChars / 4) };
  } catch (error: any) {
    return { success: false, error: error.message, context: '', tokensUsed: 0 };
  }
});
```

---

## 2. Preload Bridges (src/preload.ts:855-858, 909-910)

```typescript
// Line 855-858: Context change listener
onContextChanged: (callback: (data: { type: string; action: string; entity?: any }) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, data: any) => callback(data);
    ipcRenderer.on('context-changed', handler);
    return () => { ipcRenderer.removeListener('context-changed', handler); };
},

// Line 909-910: assemble-context bridge
assembleContext: (data: { projectId: string; problemIds?: string[]; requestIds?: string[]; tokenBudget?: number; topic?: string; sessionId?: string }) =>
    ipcRenderer.invoke('assemble-context', data),
```

---

## 3. ContextBrain retrieve() (src/main/ai/contextBrain.ts:274-327)

```typescript
export interface RetrievalResult {
  facts: Fact[]
  episodes: Episode[]
  entities: Entity[]
  strategy: string
}

export function retrieve(query: string, strategies: string[] = ['keyword', 'graph']): RetrievalResult {
  const result: RetrievalResult = { facts: [], episodes: [], entities: [], strategy: strategies.join('+') }

  // Keyword search
  if (strategies.includes('keyword')) {
    const keywordResults = keywordSearch(query, 10)
    for (const r of keywordResults) {
      if (r.type === 'fact' && r.id) {
        const fact = dbRef?.prepare('SELECT * FROM context_facts WHERE id = ?').get(r.id)
        if (fact) result.facts.push(rowToFact(fact))
      }
      if (r.type === 'entity' && r.id) {
        const entity = getEntity(r.id)
        if (entity) result.entities.push(entity)
      }
      if (r.type === 'episode' && r.id) {
        const ep = dbRef?.prepare('SELECT * FROM context_episodes WHERE id = ?').get(r.id)
        if (ep) result.episodes.push({ id: ep.id, source: ep.source, content: ep.content, occurredAt: ep.occurred_at, ingestedAt: ep.ingested_at })
      }
    }
  }

  // Graph traversal from found entities
  if (strategies.includes('graph') && result.entities.length > 0) {
    for (const entity of result.entities.slice(0, 3)) {
      const { entities: related, facts: relFacts } = traverseFromEntity(entity.id, 1)
      for (const e of related) {
        if (!result.entities.find(re => re.id === e.id)) result.entities.push(e)
      }
      for (const f of relFacts) {
        if (!result.facts.find(rf => rf.id === f.id)) result.facts.push(f)
      }
    }
  }

  // Recency weighting
  result.facts.sort((a, b) => {
    const aRecent = a.validTo ? 0 : 1
    const bRecent = b.validTo ? 0 : 1
    if (aRecent !== bRecent) return bRecent - aRecent
    return b.confidence - a.confidence
  })

  return result
}
```

---

## 4. Episode Writers (src/main/ai/episodeWriters.ts — FULL FILE)

```typescript
import * as brain from './contextBrain'

const EXTRACTION_SOURCES = new Set(['goals', 'life_phase', 'deadlines', 'connector', 'manual', 'external_ai', 'voice_note', 'reflection', 'learn'])

function logAndQueue(source: string, content: string, sourceRef?: string, metadata?: Record<string, any>): string {
  const epId = brain.logEpisode(source, content, sourceRef, metadata)
  if (epId && EXTRACTION_SOURCES.has(source) && content.length >= 40) {
    brain.createExtractionJob(epId)
  }
  return epId
}

export function writeGoalEpisode(goal: any, action: 'created' | 'completed' | 'updated' | 'deleted') {
  const content = `Goal ${action}: "${goal.title}" (${goal.category || 'general'}) — status: ${goal.status || 'pending'}${goal.description ? ` — ${goal.description}` : ''}`
  const epId = logAndQueue('goals', content, goal.id, { goalId: goal.id, action, category: goal.category })
  const entityId = brain.upsertEntity('goal', goal.title, [goal.category].filter(Boolean))
  brain.addFact(entityId, 'has_status', goal.status || 'pending', epId)
  if (goal.category) brain.addFact(entityId, 'in_category', goal.category, epId)
  if (action === 'completed') brain.addFact(entityId, 'completed_at', new Date().toISOString(), epId)
}

export function writeFinanceEpisode(type: 'transaction' | 'budget' | 'wallet' | 'subscription', data: any, action: string) {
  let content = ''
  switch (type) {
    case 'transaction': content = `Transaction: ${data.description || data.category} — ${data.amount} ${data.currency || 'IDR'} (${data.type || 'expense'})`; break
    case 'budget': content = `Budget ${action}: ${data.category} — limit ${data.limit_amount} / spent ${data.spent_amount}`; break
    case 'wallet': content = `Wallet ${action}: ${data.name} — balance ${data.balance} ${data.currency || 'IDR'}`; break
    case 'subscription': content = `Subscription ${action}: ${data.name} — ${data.price} ${data.currency || 'IDR'}/${data.billing_cycle || 'monthly'}`; break
  }
  const epId = brain.logEpisode('finance', content, data.id, { type, action })
  if (type === 'wallet') {
    const entityId = brain.upsertEntity('tool', data.name, ['wallet', 'finance'])
    brain.addFact(entityId, 'has_balance', `${data.balance} ${data.currency || 'IDR'}`, epId)
  }
}

export function writeDeadlineEpisode(deadline: any, action: 'created' | 'updated' | 'completed') {
  const content = `Deadline ${action}: "${deadline.title}" — due ${deadline.due_date}${deadline.course ? ` (${deadline.course})` : ''}`
  const epId = logAndQueue('deadlines', content, deadline.id)
  const entityId = brain.upsertEntity('deadline', deadline.title, [deadline.course].filter(Boolean))
  brain.addFact(entityId, 'due_date', deadline.due_date, epId)
  if (deadline.course) brain.addFact(entityId, 'in_course', deadline.course, epId)
}

export function writeTerminalEpisode(session: any, message: string, role: 'user' | 'agent') {
  const content = `[Terminal ${role}] ${message.slice(0, 500)}`
  const epId = brain.logEpisode('terminal', content, session.id, { sessionId: session.id, agentType: session.agent_type, topic: session.topic })
  if (role === 'agent' && session.topic) {
    const entityId = brain.upsertEntity('project', session.topic, [])
    brain.addFact(entityId, 'discussed_in', 'terminal session', epId)
  }
}

export function writeLifePhaseEpisode(phase: any, action: 'created' | 'updated' | 'reflected') {
  const content = `Life phase ${action}: "${phase.title}" (${phase.category || 'general'}) — ${phase.start_year}/${phase.start_month} to ${phase.end_year || 'ongoing'}/${phase.end_month || '?'}`
  const epId = logAndQueue('life_phase', content, phase.id)
  const entityId = brain.upsertEntity('concept', phase.title, [phase.category].filter(Boolean))
  if (phase.reflection) brain.addFact(entityId, 'has_reflection', phase.reflection.slice(0, 200), epId)
}

export function writeLearnEpisode(node: { id: string; title: string; lesson_id?: string; mastery_target?: string }, level: string, previousLevel?: string, stability?: number) {
  const direction = previousLevel && previousLevel !== level ? ` (was ${previousLevel})` : '';
  const content = `Learner mastery "${node.title}" → ${level}${direction}${stability ? ` — stability ${Math.round(stability)} days` : ''}`;
  const epId = logAndQueue('learn', content, node.id, { nodeId: node.id, lessonId: node.lesson_id || null, level, previousLevel: previousLevel || null, stability: stability || 0 });
  const entityId = brain.upsertEntity('concept', node.title, []);
  if (entityId) {
    brain.addFact(entityId, 'has_mastery_level', level, epId);
    if (['L2', 'L3', 'L4', 'L5'].includes(level)) brain.addFact(entityId, 'mastered_at', new Date().toISOString(), epId);
  }
}
```

---

## 5. contextFormatter.ts (FULL FILE — 116 lines)

```typescript
export function formatBrainContext(topic: string, result: any): string {
  const lines: string[] = [];
  lines.push(`## Memory — ${topic} (from Context Brain)`);
  const facts = (result?.facts || []).slice(0, 8);
  if (facts.length > 0) {
    lines.push('### Facts');
    for (const f of facts) {
      const confidence = typeof f.confidence === 'number' ? f.confidence.toFixed(2) : '?';
      const objectValue = f.objectLiteral ?? f.objectId ?? '?';
      lines.push(`- ${f.subjectId} ${f.predicate} ${objectValue} (confidence: ${confidence})`);
    }
  }
  const entities = (result?.entities || []).slice(0, 6);
  if (entities.length > 0) {
    lines.push('### Related entities');
    for (const e of entities) {
      const aliases = e.aliases?.length ? ` (aliases: ${e.aliases.join(', ')})` : '';
      lines.push(`- ${e.type}: ${e.name}${aliases}`);
    }
  }
  const episodes = (result?.episodes || []).slice(0, 5);
  if (episodes.length > 0) {
    lines.push('### Relevant episodes');
    for (const ep of episodes) {
      const excerpt = String(ep.content || '').replace(/\s+/g, ' ').slice(0, 200);
      lines.push(`- [${ep.source}] ${excerpt}... (${ep.occurredAt || ''})`);
    }
  }
  return lines.join('\n');
}

export function formatMemoryContext(agentMemories: any[], chatMemories: any[]): string {
  const items: string[] = [];
  for (const m of (agentMemories || []).slice(0, 3)) {
    const date = m.createdAt ? new Date(m.createdAt).toISOString().slice(0, 10) : '';
    const excerpt = String(m.content || '').replace(/\s+/g, ' ').slice(0, 200);
    items.push(`- ${excerpt}... (${date})`);
  }
  for (const m of (chatMemories || []).slice(0, 3)) {
    const date = m.created_at ? String(m.created_at).slice(0, 10) : '';
    const excerpt = String(m.content || '').replace(/\s+/g, ' ').slice(0, 200);
    items.push(`- ${excerpt}... (${date})`);
  }
  if (items.length === 0) return '';
  return ['## Memory — saved notes', ...items].join('\n');
}

export function truncateToBudget(markdownString: string, maxChars: number): string {
  if (markdownString.length <= maxChars) return markdownString;
  const sections = splitSections(markdownString);
  const facts = sections.filter(s => s.header.includes('Facts'));
  const entities = sections.filter(s => s.header.includes('entities'));
  const episodes = sections.filter(s => s.header.includes('episodes'));
  const notes = sections.filter(s => s.header.includes('saved notes'));
  let output = '';
  let currentLength = 0;
  for (const block of [...facts, ...entities]) {
    output += block.raw + '\n';
    currentLength += block.raw.length;
  }
  episodes.sort((a, b) => b.raw.length - a.raw.length);
  for (const ep of episodes) {
    if (currentLength + ep.raw.length < maxChars - 200) {
      output += ep.raw + '\n';
      currentLength += ep.raw.length;
    } else {
      const allowedChars = maxChars - currentLength - 100;
      if (allowedChars > 50) {
        output += ep.raw.substring(0, allowedChars) + '... [TRUNCATED]\n';
      }
      break;
    }
  }
  for (const note of notes) {
    if (currentLength + note.raw.length < maxChars) {
      output += note.raw + '\n';
      currentLength += note.raw.length;
    }
  }
  if (output.length > maxChars) {
    output = output.substring(0, Math.max(0, maxChars - 3)) + '...';
  }
  return output.trim();
}

function splitSections(markdownString: string): Array<{ header: string; raw: string }> {
  const sections: Array<{ header: string; raw: string }> = [];
  let currentHeader = '';
  let currentBody: string[] = [];
  for (const line of markdownString.split('\n')) {
    if (line.startsWith('### ')) {
      if (currentHeader) sections.push({ header: currentHeader, raw: [currentHeader, ...currentBody].join('\n') });
      currentHeader = line;
      currentBody = [];
    } else {
      currentBody.push(line);
    }
  }
  if (currentHeader) sections.push({ header: currentHeader, raw: [currentHeader, ...currentBody].join('\n') });
  return sections;
}
```

---

## 6. DB Schema (src/main.ts:3071-3123)

```sql
CREATE TABLE IF NOT EXISTS context_episodes (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL,
  source_ref TEXT,
  content TEXT NOT NULL,
  occurred_at TEXT NOT NULL,
  ingested_at TEXT NOT NULL,
  metadata TEXT
);
CREATE INDEX IF NOT EXISTS idx_episodes_source ON context_episodes(source);
CREATE INDEX IF NOT EXISTS idx_episodes_occurred ON context_episodes(occurred_at);

CREATE TABLE IF NOT EXISTS context_entities (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  name TEXT NOT NULL,
  aliases TEXT DEFAULT '[]',
  first_seen TEXT NOT NULL,
  last_seen TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_entities_type ON context_entities(type);
CREATE INDEX IF NOT EXISTS idx_entities_name ON context_entities(name);

CREATE TABLE IF NOT EXISTS context_facts (
  id TEXT PRIMARY KEY,
  subject_id TEXT NOT NULL,
  predicate TEXT NOT NULL,
  object_id TEXT,
  object_literal TEXT,
  valid_from TEXT NOT NULL,
  valid_to TEXT,
  source_episode_id TEXT NOT NULL,
  confidence REAL DEFAULT 1.0
);
CREATE INDEX IF NOT EXISTS idx_facts_subject ON context_facts(subject_id);
CREATE INDEX IF NOT EXISTS idx_facts_predicate ON context_facts(predicate);
CREATE INDEX IF NOT EXISTS idx_facts_valid ON context_facts(valid_from, valid_to);

CREATE TABLE IF NOT EXISTS context_embeddings (
  ref_id TEXT PRIMARY KEY,
  ref_type TEXT NOT NULL,
  embedding BLOB
);
CREATE INDEX IF NOT EXISTS idx_embeddings_type ON context_embeddings(ref_type);
```

---

## 7. App.tsx Page Detection (lines 74-90, 414-418)

```typescript
// Sidebar navigation registry
const DEFAULT_SIDEBAR_ITEMS = [
  { icon: Home, label: 'Dashboard', path: '/' },
  { icon: Activity, label: 'Activity', path: '/activity' },
  { icon: Brain, label: 'AI Assistant', path: '/ai' },
  { icon: Sparkles, label: 'Feature Studio', path: '/studio' },
  { icon: GraduationCap, label: 'Learn', path: '/learn' },
  { icon: FileText, label: 'Resume', path: '/resume' },
  { icon: Code2, label: 'IDE Projects', path: '/ide' },
  { icon: Clock4, label: 'External', path: '/external' },
  { icon: Wallet, label: 'Finance', path: '/finance' },
  { icon: BarChart3, label: 'Insights', path: '/reports' },
  { icon: Database, label: 'Database', path: '/database' },
  { icon: HeartHandshake, label: 'Life', path: '/life' },
  { icon: Settings, label: 'Settings', path: '/settings' },
  { icon: BookOpen, label: 'Guide', path: '/guide' },
];

// Current page detection
useEffect(() => {
  const page = location.pathname === '/' ? 'dashboard'
    : location.pathname.replace('/', '') || 'dashboard';
  document.documentElement.setAttribute('data-page', page);
}, [location.pathname]);
```

---

## 8. TerminalPage Context Listener (lines 893-913)

```typescript
// Context sync listener — refresh + notify other terminals
useEffect(() => {
  if (!window.deskflowAPI?.onContextChanged) return;
  const unsub = window.deskflowAPI.onContextChanged((data) => {
    if (data.source && data.source !== activeTerminalId && (data.type === 'problems' || data.type === 'requests')) {
      if (data.action === 'broadcast') {
        loadAllProblems?.();
        loadAllRequests?.();
        if (crossSessionSyncEnabled && window.deskflowAPI?.terminalWrite) {
          const typeLabel = data.type === 'problems' ? 'problem' : 'request';
          const actionLabel = data.action === 'created' ? 'created' : data.action === 'updated' ? 'updated' : 'modified';
          const title = data.entity?.title ? ` "${data.entity.title}"` : '';
          const msg = `[System: ${data.source} ${actionLabel} ${typeLabel}${title}. Run /sync for full context.]`;
          window.deskflowAPI.terminalWrite(activeTerminalId, msg + '\r\n');
        }
      }
    }
  });
  return unsub;
}, [activeTerminalId, crossSessionSyncEnabled]);
```

---

## 9. TerminalPage Session Creation — Context Assembly (lines 4166-4184)

```typescript
// BRAIN + MEMORY CONTEXT ASSEMBLY
if (!config.resumeId && selectedProject && sessionName.length > 1) {
  try {
    const assembled = await (window.deskflowAPI as any).assembleContext?.({
      projectId: selectedProject,
      sessionId: config.id,
      topic: sessionName,
      problemIds: config.problemIds,
      requestIds: config.requestIds,
      tokenBudget: 2000,
    });
    if (assembled && typeof assembled === 'string' && assembled.trim()) {
      initContent += `\n\n${assembled}`;
    }
  } catch (e) {
    console.warn('[NewSession] Context assembly failed (non-fatal):', e);
  }
}
```

---

## 10. TerminalPage Quick Instruction — Context Assembly (lines 1457-1469)

```typescript
// Brain + memory context assembly
let assembledContextSnippet = '';
if (selectedProject && topic.length > 1) {
  try {
    const assembled = await (window.deskflowAPI as any).assembleContext?.({
      projectId: selectedProject,
      sessionId: sessionPayload.id,
      topic,
      tokenBudget: 2000,
    });
    if (assembled && typeof assembled === 'string' && assembled.trim()) {
      assembledContextSnippet = `\r\n${assembled}\r\n`;
    }
  } catch (e) {
    console.warn('[InstructionSend] Context assembly failed:', e);
  }
}
```

---

## 11. context-changed Event Emission Points (main.ts — 23 locations)

Key emission points:
- Problem CRUD: lines 12490, 15178, 15187, 24169, 24190, 24216, 24231
- Request CRUD: lines 24801, 24822, 24837
- Bug reports: lines 13346, 13424, 13500
- Checklist: lines 15202, 15230
- Actions batch: line 15098
- Finance: lines 25021, 25074, 25090
- Context: line 27742

All use: `mainWindow.webContents.send('context-changed', { type, action, entity })`

---

## 12. PageContextPanel.tsx (src/components/PageContextPanel.tsx — read-only viewer)

Reads `PAGE_CONTEXT.md` from `agent/` directory via `readAgentFileContent` IPC.
Parses sections: identity, component-tree, ipc-endpoints, data-flow, connections, conventions, pitfalls.
NOT injected into agents — purely a documentation viewer in workspace Context sidebar.

---

## 13. ContextSidebar.tsx (src/components/ContextSidebar.tsx — config UI)

Config persisted to localStorage key `workspace-context-config`.
Has sections: Systems (7 toggles with token budgets), Design, Model, Paths, Terminal, Defaults.
Currently does NOT include page context toggle.
WorkspaceConfig type: `{ systems: Record<string, SystemConfig | DesignSkillsConfig>; behaviors: { summarization: boolean; deep_memory: boolean } }`

---

## 14. Known Gaps (what does NOT exist yet)

1. **No page context registry** — no mapping of page routes to data sources
2. **No page-specific IPC handlers** — assemble-context has no page parameter
3. **No page change detection** — App.tsx sets data-page attr but never notifies the terminal
4. **No page context episode writer** — page navigation is not logged to ContextBrain
5. **ContextSidebar has no page context toggle** — config doesn't include page context
6. **PAGE_CONTEXT.md is never injected** — read-only viewer only
7. **assemble-context ignores ContextConfig** — hardcodes its own blocks
8. **context-changed doesn't re-inject** — notifies terminal but doesn't re-run assembly
