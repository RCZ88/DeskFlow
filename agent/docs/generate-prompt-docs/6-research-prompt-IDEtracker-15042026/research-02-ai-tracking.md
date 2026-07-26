# Research: AI Coding Assistant Token & Usage Tracking

## Context
Tracking AI coding assistant usage including token consumption, interaction counts, and code attribution. Critical for the "vibe coding" aspect of IDE Projects feature.

## Research Objectives

### 1. GitHub Copilot

**API Endpoints (as of 2026):**
- Note: Older Copilot Metrics API was deprecated April 2, 2026
- New: Copilot Usage Metrics API

**Available Data:**
| Access Level | Data Available |
|-------------|----------------|
| Enterprise | Aggregated metrics, user-level data |
| Organization | Daily usage, language/editor breakdowns |
| User | Individual usage data (enterprise access required) |

**Metrics Available:**
- Daily active users (DAU), weekly active users (WAU)
- Code completion engagements, acceptance rates
- Language and editor breakdowns
- CLI vs IDE usage
- User-initiated interaction counts

**What's NOT Available:**
- Per-request token counts
- Individual prompt/response content
- Granular cost breakdown

**Questions to Answer:**
- What is the exact authentication flow for Copilot API?
- How does the new Usage Metrics API differ from deprecated metrics?
- Rate limits and data lag expectations?

### 2. Cursor AI

**Token Data Available:**
- `inputTokens`, `outputTokens`
- `cacheWriteTokens`, `cacheReadTokens`
- `totalCents` (cost in dollars)

**API Tiers:**

| Plan | API Access | Features |
|------|------------|----------|
| Free/Pro | Basic usage | Token billing |
| Team | Admin API | Daily usage, member data |
| Enterprise | Analytics API | Per-user breakdown, AI Code Tracking |

**Admin API Endpoints:**
- `/teams/daily-usage-data` - Daily aggregated usage
- `/teams/filtered-usage-events` - Detailed per-request events
- `/teams/spend` - Total spending data
- `/teams/members` - Team member information

**Analytics API (Enterprise):**
- `/analytics/team/agent-edits` - AI-suggested edit metrics
- `/analytics/team/dau` - Daily active users
- `/analytics/team/conversation-insights` - Conversation patterns
- `/analytics/team/model-usage` - Model breakdown

**AI Code Tracking API (Enterprise - Alpha):**
- `/analytics/ai-code/commits` - Per-commit AI vs non-AI line attribution
- `/analytics/ai-code/changes` - Granular change tracking
- Fields: `tabLinesAdded`, `composerLinesAdded`, `nonAiLinesAdded`

**Questions to Answer:**
- What is the rate limit for Cursor API?
- How does AI Code Tracking handle privacy (file names)?
- Is there a way to track usage without Enterprise plan?

### 3. Claude Code (Anthropic)

**Local Data Location:**
- `~/.claude/projects/*/.jsonl` - Session transcripts

**JSONL Format:**
```json
{"type":"message","role":"user","content":[{"type":"text","text":"..."}]}
{"type":"message","role":"assistant","content":[...],"usage":{"input_tokens":..., "output_tokens":...}}
```

**Built-in Commands:**
- `/cost` - Session token usage (human-readable)
- `/stats` - All-time token totals
- `/usage` - Plan quota status

**Limitations:**
- No structured JSON output for usage data
- No programmatic API for usage aggregation
- Active feature request (#33978) for usage tracking

**Questions to Answer:**
- How to parse JSONL transcripts for token usage?
- Is there any API workaround for Claude Code subscriptions?
- Can we reliably extract usage from transcript files?

### 4. Other AI Tools

Investigate:
- Continue.dev
- Cody (Sourcegraph)
- Codeium
- Amazon CodeWhisperer
- Tabnine

**Questions to Answer:**
- Do any of these have standard logging formats?
- Any cross-tool standardization efforts?
- Which tools have the highest usage in vibe coding workflows?

### 5. Token Estimation & Cost Calculation

**Estimation Formulas:**
- General: ~4 characters ≈ 1 token (English text)
- Code: Varies by language (Python ~2.5 chars/token, JavaScript ~3 chars/token)
- API responses include actual counts when available

**Cost Estimation:**
| Model | Input Cost | Output Cost |
|-------|-----------|-------------|
| GPT-4o | ~$5/1M tokens | ~$15/1M tokens |
| Claude 3.5 Sonnet | ~$3/1M tokens | ~$15/1M tokens |
| Cursor Models | Varies by model | Varies by model |

## Deliverables

1. Complete API documentation links for each tool
2. Authentication requirements and flows
3. Data formats and schemas
4. Rate limits and access restrictions
5. Local data parsing strategies (for tools without APIs)

## Success Criteria

- [ ] Know Copilot Usage Metrics API endpoints and auth
- [ ] Understand Cursor Admin/Analytics API capabilities
- [ ] Have parsing strategy for Claude Code JSONL transcripts
- [ ] Token estimation formula documented
- [ ] Cost calculation approach defined
