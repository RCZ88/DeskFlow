# AI Agent Tracking - Design Decisions Document

> Documenting all architectural and UX decisions for the generalized AI agent tracking system.
> Last updated: 2026-04-16

---

## Table of Contents

1. [Core Architecture](#1-core-architecture)
2. [Agent Detection Strategy](#2-agent-detection-strategy)
3. [Data Collection Mode](#3-data-collection-mode)
4. [Normalization Schema](#4-normalization-schema)
5. [Cost Calculation](#5-cost-calculation)
6. [Privacy & Data Handling](#6-privacy--data-handling)
7. [Data Retention](#7-data-retention)
8. [UI/UX Decisions](#8-uiux-decisions)
9. [Error Handling](#9-error-handling)
10. [Future Considerations](#10-future-considerations)

---

## 1. Core Architecture

### Decision: Plugin-Based Registry System

Each AI agent is handled by a dedicated "detector/parser" plugin:

```typescript
interface AIAgentPlugin {
  id: string;                    // 'claude-code', 'opencode'
  name: string;                  // Display name
  icon: string;                  // Emoji or icon name
  color: string;                 // UI accent color

  // Detection
  detect(): Promise<boolean>;    // Is agent installed?
  isActive(): Promise<boolean>;  // Has recent usage?

  // Data Collection
  getStoragePaths(): string[];   // Where data is stored
  parse(sessionPath: string): ParsedSession;

  // Configuration
  isEnabled: boolean;            // User toggle
  settings: Record<string, any>;  // Agent-specific config
}
```

### Storage Paths by Agent

| Agent | Primary Path | Secondary Path |
|-------|--------------|----------------|
| Claude Code | `~/.claude/projects/*/*.jsonl` | `~/.claude/settings.json` |
| OpenCode | `~/.local/share/opencode/opencode.db` | `~/.config/opencode/` |
| Gemini CLI | `~/.gemini/history/*.jsonl` | `~/.gemini/settings.json` |
| Codex CLI | `~/.codex/sessions/*/*.jsonl` | `~/.codex/state_*.sqlite` |
| Qwen CLI | `~/.qwen/projects/*/history/*.jsonl` | `~/.qwen/settings.json` |
| Aider | Project-local `.aider.chat.history.md` | `~/.oobo/aider-analytics.jsonl` |
| Cline/Roo | `~/.cline/data/` | VSCode globalStorage |
| Continue | `~/.continue/sessions/*.json` | `~/.continue/config.yaml` |
| Copilot CLI | `~/.copilot/token-tracker/token-tracker.db` | `~/.copilot/session-state/` |

---

## 2. Agent Detection Strategy

### Decision: Auto-Detect + Smart Filtering + Manual Override

1. **SCAN** (On App Start / Manual Sync)
   - Check all known storage paths
   - Path exists → Mark as "installed"
   - Path missing → Skip

2. **ACTIVE CHECK** (7-day window)
   - For installed agents, check for sessions
   - Has session in 7 days → "Active"
   - No recent session → "Inactive"

3. **UI FILTER** (Default: Active Only)
   - "All" → Show everything
   - "Active" → Last 7 days (DEFAULT)
   - "Custom" → User picks

4. **USER OVERRIDE**
   - Hide detected agents
   - Add undetected agents (manual path)
   - Force-show any agent

### "Active" Definition
An agent is considered **active** if:
1. Has at least one session file created in the last **7 days**
2. Or has a process still running (for real-time detection)

### Detection Priority
1. Claude Code
2. Cursor
3. OpenCode
4. GitHub Copilot CLI
5. VS Code extensions (Cline, Continue)
6. Gemini CLI
7. Codex CLI
8. Qwen CLI
9. Aider

---

## 3. Data Collection Mode

### Decision: Hybrid Approach - File Watcher + Periodic Sync

**Real-Time File Watcher:**
- Technology: `chokidar` (cross-platform file watching)
- Scope: Only watched folders (not entire home directory)
- Debounce: 2-second debounce to batch rapid file changes
- Persistence: Watch state saved on app close, restored on reopen

**Periodic Full Sync:**
- Frequency: Every **5 minutes** when app is running
- Trigger: App start, manual sync button, tab focus
- Purpose: Catch any missed events, verify consistency

### Sync States
- Idle (no changes detected)
- Watching (file watcher active)
- Syncing... (scan in progress)
- Synced (last sync: 2 min ago)
- Error (permission denied, parse failed)
- Paused (user disabled this agent)

---

## 4. Normalization Schema

```typescript
interface AISession {
  id: string;
  agentId: string;               // 'claude-code', 'opencode', etc.
  sessionId: string;
  projectId?: string;
  projectPath?: string;

  // Timestamps
  startedAt: Date;
  endedAt?: Date;
  durationMs?: number;

  // Token counts (normalized)
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens?: number;
  cacheWriteTokens?: number;
  reasoningTokens?: number;

  // Calculated
  totalTokens: number;
  costUsd?: number;

  // Context
  model?: string;
  provider?: string;

  // Metadata
  syncedAt: Date;
  fileModifiedAt: Date;
}
```

### Field Mapping by Agent

| Standard Field | Claude Code | OpenCode | Gemini | Codex | Qwen | Aider | Cline | Continue | Copilot |
|----------------|-------------|----------|--------|-------|------|-------|-------|----------|---------|
| `inputTokens` | input_tokens | input_tokens | input_token_count | input_tokens | tokens_in | prompt_tokens | tokensIn | - | input |
| `outputTokens` | output_tokens | output_tokens | output_token_count | output_tokens | tokens_out | completion_tokens | tokensOut | - | output |
| `cacheReadTokens` | cache_read_input_tokens | cached_tokens | - | cached_token_count | - | - | cacheReadTokens | - | cache_read |
| `cacheWriteTokens` | cache_creation_tokens | - | - | - | - | - | cacheWriteTokens | - | cache_write |
| `reasoningTokens` | thinking_tokens | - | - | reasoning_token_count | - | - | - | - | - |
| `model` | model | model | model_version | model | model | model | model | model | - |
| `startedAt` | timestamp | created_at | timestamp | timestamp | timestamp | timestamp | timestamp | timestamp | timestamp |

---

## 5. Cost Calculation

### Decision: Configurable Pricing with Sensible Defaults

```typescript
const DEFAULT_PRICING: Record<string, { input: number; output: number; cacheRead: number; cacheWrite: number }> = {
  // Anthropic
  'claude-opus-4': { input: 15, output: 75, cacheRead: 1.5, cacheWrite: 18.75 },
  'claude-sonnet-4': { input: 3, output: 15, cacheRead: 0.3, cacheWrite: 3.75 },
  'claude-haiku-3': { input: 0.8, output: 4, cacheRead: 0.08, cacheWrite: 1 },

  // OpenAI
  'gpt-5': { input: 5, output: 15, cacheRead: 0.125, cacheWrite: 0.55 },
  'gpt-4o': { input: 2.5, output: 10, cacheRead: 0.525, cacheWrite: 10.5 },
  'o3': { input: 10, output: 40, cacheRead: 0, cacheWrite: 0 },

  // Google
  'gemini-2-5-pro': { input: 1.25, output: 5, cacheRead: 0.16, cacheWrite: 5 },
  'gemini-2-5-flash': { input: 0.075, output: 0.3, cacheRead: 0.01, cacheWrite: 0.15 },

  // Default fallback
  'default': { input: 2, output: 10, cacheRead: 0.2, cacheWrite: 2 },
};
```

### Cost Display Modes
| Mode | Display |
|------|---------|
| `official` | Based on API list prices |
| `actual` | User-entered custom rates |
| `subscription` | Amortized monthly cost |
| `tokens-only` | No cost shown |

---

## 6. Privacy & Data Handling

### WHAT WE COLLECT (Minimal)
- Token counts (numbers only)
- Timestamps (no actual conversation content)
- Model identifiers (e.g., 'claude-sonnet-4')
- Session duration
- Project path (hashed, not stored)

### WHAT WE NEVER COLLECT
- Actual code or conversation content
- File paths (only used for detection, then hashed)
- API keys or authentication tokens
- Personal information
- Network requests or API calls

### Per-Agent Privacy Controls
| Setting | Default | Description |
|---------|---------|-------------|
| `enabled` | `true` | Track this agent's usage |
| `storeRawData` | `false` | Store raw session JSON (for debugging) |
| `shareDiagnostics` | `false` | Send anonymous crash reports |
| `syncInterval` | `5min` | How often to sync (1min, 5min, 15min, manual) |

---

## 7. Data Retention

### Decision: 30-Day Rolling Window + Archive Option

| Tier | Data | Retention | Purpose |
|------|------|-----------|---------|
| 1 | Session Data (Raw) | 7 days | Detailed analysis, debugging |
| 2 | Daily Aggregates | 30 days | Trends, charts, reporting |
| 3 | Monthly Summaries | 12 months | Long-term trends, yearly reports |
| 4 | Archive (Optional) | Unlimited | Historical analysis, tax/compliance |

### Cleanup Schedule
- **Every night at 3 AM**: Clean up expired session data
- **Every Monday at 4 AM**: Roll up to monthly summaries
- **Manual**: User can trigger cleanup anytime

---

## 8. UI/UX Decisions

### Decision: Agent-Centric View with Aggregate Summary

**Key UI Elements:**
1. Summary Bar showing total tokens, cost, active agents, last sync time
2. Agent Cards Grid with status indicators and quick stats
3. Detailed View with charts (Line for trends, Doughnut for distribution)
4. Per-agent settings accessible via card click

### Agent Card Design
```
┌─────────────────────────────────┐
│ [Icon]  Claude Code       ●    │  ← Status indicator
│         $24.50 / 30 days       │  ← Cost summary
│         1.2M tokens            │  ← Token summary
│         [Active] [Details ▶]   │  ← Actions
└─────────────────────────────────┘
```

**Status Indicators:**
- ● Green: Active (session in last 24h)
- ● Yellow: Recent (session in last 7 days)
- ○ Gray: Idle (no recent sessions)
- ○ Red: Error (detection/parsing failed)

### Chart Choices
| Chart Type | Use Case |
|------------|----------|
| Line chart | Token trends over time |
| Bar chart | Daily/weekly totals |
| Doughnut | Model/agent distribution |
| Heatmap | Activity by hour/day |

---

## 9. Error Handling

### Error Types & Responses
| Error Type | User Message | Action |
|------------|--------------|--------|
| Path not found | "Agent not installed" | Gray out |
| Permission denied | "Can't access files" | Show setup |
| Parse error | "Corrupted data" | Skip file |
| Rate limit (API) | "Sync paused" | Retry later |
| Network error | "Offline mode" | Use cache |
| Unknown format | "New version?" | Log debug |

### Retry Strategy
| Error Type | Retry | Max Retries | Backoff |
|------------|-------|-------------|---------|
| Network | Yes | 3 | 5s, 30s, 5min |
| Rate Limit | Yes | 5 | 1min, 5min, 15min |
| Parse Error | Skip file | 0 | N/A |
| Permission | Yes | 2 | 1min, 5min |

---

## 10. Future Considerations

### Phase 2 Enhancements (Post-MVP)
- [ ] Multi-provider support (same agent using different API keys)
- [ ] Budget alerts (notify when approaching limits)
- [ ] Team features (share anonymized aggregate stats)
- [ ] CI/CD integration (track AI usage in pipelines)
- [ ] Custom plugins (user-created parsers)

### Out of Scope (Known Limitations)
- [ ] Code interception (would require proxy)
- [ ] Cross-agent correlation (linking same task across agents)
- [ ] Real-time streaming (live token counting)

---

## Summary of Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Architecture | Plugin-based registry | Extensibility, maintainability |
| Detection | Auto-detect + smart filtering | Zero-config, no clutter |
| Active threshold | 7 days | Balance between relevance and noise |
| Collection mode | Hybrid (watcher + periodic) | Best UX with reliability |
| Sync interval | 5 minutes | Balance between freshness and battery |
| Normalization | Unified schema with optional fields | Flexibility for varied agents |
| Cost calculation | Configurable pricing | Different user scenarios |
| Cost defaults | Official API pricing | Fair baseline estimate |
| Privacy | Maximum transparency + control | User trust is paramount |
| Data retention | 30-day rolling + archive | Storage efficiency + long-term needs |
| Error handling | Graceful degradation | Don't break app for non-critical errors |

---

## Revision History

| Date | Version | Changes |
|------|---------|---------|
| 2026-04-16 | 1.0 | Initial design document |

---

*This document is the source of truth for all implementation decisions. If implementation contradicts this document, the document should be updated first.*
