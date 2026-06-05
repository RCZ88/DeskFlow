# CONTEXT_BUNDLE — Free AI Integration Research

> Self-contained context for the target AI to design the solution.
> Generated: 2026-06-04

---

## 1. Raw User Request (Verbatim)

> "Here's the idea. I would like to be able to use it rather token So I would not waste them because you get free call as a relay and you get Pretty good models. They came in 2.6. It's it's now free And I would like to be able to capitalize on that and use them to my advantage and the initial idea I thought first thought is about a daily new system in the app where we can be able to like a certain topic That we're interested in and we would get daily use and daily updates about those stuff using AI to do the research and do the summarization, but that's not really Putting the AI to its full potential because it's only gathering and how does it match with the interest? I would like to be able to research and to find more Possibilities that I can use those AI's not only maybe as a coding model and open code But also maybe something else that can be way better than those maybe we can add some sort of chats in there for the agents and the application I would like you to use the Terry prom skill to research what are the Features that are that could be useful and that could utilize this nice critical thinking by the AI the crazy good AI models Like the team key to point six and other GLM models that are really good and I would like it to be included in the application"

---

## 2. Current App Architecture

DeskFlow — Electron desktop app for tracking app usage, managing AI agent workspaces, and visualizing data.

### Tech Stack
- **Frontend:** React 19, TypeScript, Tailwind CSS v4, Framer Motion
- **Backend:** Electron main process (Node.js), better-sqlite3
- **AI Integration:** node-pty terminals spawning AI coding agents (opencode, claude, aider, codex, cursor)
- **Build:** Vite + vite-plugin-electron

### Key Pages
| Route | Purpose |
|-------|---------|
| `/` | Dashboard — heatmap, orbit, weekly overview |
| `/terminal` | AI agent workspace — terminals, sessions, prompts |
| `/external` | External activity & sleep tracking |
| `/settings` | App settings, categories, tracking config |
| `/stats` | App usage statistics |
| `/productivity` | Productivity score & trends |
| `/browser` | Website tracking |
| `/ide` | IDE project management |
| `/database` | DB viewer + analytics dashboard |
| `/insights` | Sleep/activity insights |

### Current AI Integration Points
1. **Terminal System** — Spawns AI coding agents via node-pty, sends system prompts, captures responses
2. **Tracker Mind** — AI agent workspace with problem/request/checklist management
3. **Context Assembly** — 6 knowledge systems (LLM Wiki, Skills, Graphify, PARA, QMD, Automations)
4. **Cross-session sync** — File lock manager, conflict detection, context broadcast
5. **Analytics Dashboard** — AI usage stats, token tracking, session history

### IPC Communication Model
- `ipcMain.handle` / `ipcRenderer.invoke` for request-response
- `webContents.send` / `ipcRenderer.on` for events
- Preload bridge (`window.deskflowAPI`) for typed access

---

## 3. Available Free/Cheap AI Models (2026)

### DeepSeek
| Model | Context | Price | Notes |
|-------|---------|-------|-------|
| DeepSeek V4 Pro | 1M tokens | $0.435/M input, $0.870/M output | Open weights (MIT), top reasoning/agentic |
| DeepSeek V4 Flash | 1M tokens | $0.14/M input, $0.28/M output | Fast, cheap, 284B params |
| DeepSeek V3.2 | 128K tokens | $0.27/M input, $1.10/M output | Stable, production-ready |
| DeepSeek R1 | 128K tokens | $0.55/M input, $2.19/M output | Reasoning specialist |
- **Free tier:** 5M free tokens on signup, no enforced rate limits
- **API:** OpenAI-compatible, base URL `https://api.deepseek.com`
- **OpenRouter:** Also available via OpenRouter

### Zhipu AI (GLM)
| Model | Context | Price | Notes |
|-------|---------|-------|-------|
| GLM-4.7-Flash | 203K | **FREE** | Fast, simple tasks |
| GLM-4.5-Flash | - | **FREE** | Lightweight general |
| GLM-4.6V-Flash | 128K | **FREE** | Vision + tool use |
| GLM-5 | 205K | $7.2/M input (¥) | Open-source SOTA coding |
| GLM-5.1 | 203K | $10.1/M input (¥) | Latest flagship |
- **API:** OpenAI-compatible, via `z.ai` or OpenRouter
- **Coding Plan:** $30/quarter for Lite tier

### Relay Services
| Service | Models Available | Pricing | Notes |
|---------|-----------------|---------|-------|
| **OpenRouter** | 400+ models | Pay-per-token + free tiers | Unified API, fallback routing |
| **Together AI** | DeepSeek, GLM, Qwen, Llama | $0.20-3.00/M | Widest selection, serverless |
| **Groq** | Llama, Qwen, Mistral | $0.05-0.79/M | Fastest inference (LPU hardware) |
| **Fireworks AI** | DeepSeek, GLM, Kimi | $0.10-3.00/M | Tiered pricing, fast |
| **Puter.js** | DeepSeek, GLM | Free (User-Pays model) | No API keys needed |

### Key Advantages
- DeepSeek V3.2 = **24x cheaper** than GPT-5 on output
- GLM-4.7-Flash = **completely free** with 203K context
- OpenRouter = **unified billing**, 400+ models under one API key
- All models are **OpenAI-compatible** (drop-in replacement for existing code)

---

## 4. Current Data Flow & Where AI Could Integrate

```
App Tracking → SQLite DB → Dashboard/Stats/Productivity/External Pages
                             ↓
                       Terminal Page (AI agent workspace)
                             ↓
                       opencode/claude/etc agents
```

**Potential integration points for new AI features:**
1. **Dashboard** — AI summaries, daily briefs, anomaly detection
2. **External Page** — AI chat about tracked activities, pattern recognition
3. **Terminal Page** — Additional AI agents beyond coding (research, analysis)
4. **Settings** — AI configuration panel for model selection
5. **New page** — Dedicated AI assistant/chat interface
6. **Background services** — Automated research, daily digests, trend analysis

---

## 5. Design Tokens & UI Patterns

- **Color scheme:** Zinc/gray dark theme (`bg-zinc-900`, `bg-zinc-800/50`)
- **Components:** GlassCard, PageShell, SectionHeader, LoadingState, EmptyState
- **Icons:** Lucide React
- **Animations:** Framer Motion
- **Charts:** Chart.js + react-chartjs-2

### UI Component Patterns
```tsx
// Page structure
<PageShell>
  <SectionHeader icon={Icon} title="..." />
  <GlassCard>
    {/* content */}
  </GlassCard>
</PageShell>
```

---

## 6. Current AI Agent Configuration

- **Default agent:** opencode (can be changed to claude, aider, codex, cursor)
- **Model:** Configured per-session in NewSessionDialog
- **System prompt:** 4-level merge (default + general + project + session additions)
- **Context assembly:** 6 toggleable knowledge systems with token budgets
- **API calls:** All go through local terminal PTY (no direct API integration in app)

---

## 7. Known Constraints

1. **Electron renderer has NO Node access** — all API calls must go through IPC preload bridge
2. **IPC model** is request-response (invoke/handle) + events (send/on)
3. **AI API keys** would need secure storage (Electron safeStorage or encrypted config)
4. **New IPC handlers** require: preload.ts bridge + main.ts handler + type declarations
5. **No existing direct API integration** — all AI interactions currently go through terminal PTY
