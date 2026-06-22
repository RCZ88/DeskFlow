# PROMPT — Free AI Model Integration Feature Research

**Target AI:** DeepSeek V4 / GLM-5-class model (any capable reasoning model)
**Detail Level:** 8/10
**Creativity:** 40/100

---

## Raw Request

> "Here's the idea. I would like to be able to use it rather token So I would not waste them because you get free call as a relay and you get Pretty good models. They came in 2.6. It's it's now free And I would like to be able to capitalize on that and use them to my advantage and the initial idea I thought first thought is about a daily new system in the app where we can be able to like a certain topic That we're interested in and we would get daily use and daily updates about those stuff using AI to do the research and do the summarization, but that's not really Putting the AI to its full potential because it's only gathering and how does it match with the interest? I would like to be able to research and to find more Possibilities that I can use those AI's not only maybe as a coding model and open code But also maybe something else that can be way better than those maybe we can add some sort of chats in there for the agents and the application"

---

## Context

You have access to `CONTEXT_BUNDLE.md` which contains:

1. **The full app architecture** — DeskFlow, an Electron + React app tracker with AI agent terminal workspace
2. **Available free AI models** — DeepSeek V4/V3.2 (5M free tokens, $0.27/M input), GLM-4.7-Flash (completely free, 203K context), and relay services like OpenRouter, Together AI, Puter.js
3. **Current AI integration points** — terminal PTY agents, but NO direct API integration in the app itself
4. **Data flow** — how app tracking data moves from SQLite → pages
5. **Design patterns** — UI components, color scheme, IPC communication model
6. **Technical constraints** — Electron IPC model, no Node in renderer, etc.

Read `CONTEXT_BUNDLE.md` first — it replaces codebase access. All the context you need is in that file.

---

## The Mandate

Design a comprehensive feature exploration and specification for integrating **direct free/cheap AI model API calls** into the DeskFlow app tracker. This is NOT about using AI coding agents via terminal PTY (already exists). This is about adding **new AI-powered features** directly in the app UI using DeepSeek V4, GLM-4.7-Flash, or other models accessed via OpenRouter or direct API.

### What to Design

#### Part 1: Feature Brainstorm (Primary Output)

Generate a **categorized list of 10-15 features** that leverage free/cheap AI models in the app. For each feature, specify:

1. **Name** — Short, descriptive
2. **What it does** — 1-2 sentence description
3. **Which AI model(s)** it would use and why
4. **Which page(s)** it would live on
5. **Data it needs** — what tracking data it consumes
6. **Value proposition** — why the user would care
7. **Feasibility** — Easy / Medium / Hard (based on existing infrastructure)

**Categories to consider:**
- **Analysis & Insights** — AI-powered pattern recognition on tracking data
- **Daily/Weekly AI Briefings** — Personalized summaries of tracked activity
- **Interactive AI Assistant** — Chat with your tracking data
- **Automation & Suggestions** — AI that suggests changes based on your habits
- **Cross-model orchestration** — Use cheap models for simple tasks, expensive ones for complex

#### Part 2: Top 3 Features — Deep Dive

For the **3 most impactful features**, provide:

1. **User flow** — Step by step: what the user sees, clicks, and experiences
2. **Technical architecture** — IPC channels needed, data flow diagram, component tree
3. **API integration** — How the AI model is called (direct API vs OpenRouter relay), prompt structure, error handling
4. **UI mockup** — Text-based layout description with component hierarchy
5. **Integration with existing systems** — How it connects to tracking DB, terminal page, settings
6. **Implementation effort** — Estimated files to modify/create, complexity

#### Part 3: API Integration Architecture

Design the **shared infrastructure** needed for all AI features:

1. **IPC layer** — Generic `call-ai-model` IPC handler design (or per-feature handlers)
2. **Model configuration** — How users configure which model/provider to use (Settings page)
3. **API key management** — Secure storage approach (Electron safeStorage or encrypted config)
4. **Cost management** — Token tracking, usage limits, free tier awareness
5. **Fallback strategy** — What happens when DeepSeek is down or GLM rate-limited
6. **Response streaming** — How to stream AI responses to the UI

---

## Constraints

1. **No Node access in renderer** — All AI API calls must go through Electron IPC
2. **Must integrate with existing UI patterns** — GlassCard, PageShell, dark zinc theme
3. **Must respect existing IPC model** — invoke/handle for requests, send/on for events
4. **Must work offline gracefully** — AI features are value-add, not core tracking
5. **Must be cost-conscious** — Leverage free tiers (DeepSeek 5M free tokens, GLM-4.7-Flash free forever)
6. **User controls model choice** — Settings page for selecting provider/model per feature
7. **No breaking existing features** — All new code is additive

---

## Output Format

Return your response as a structured markdown document:

```markdown
# Free AI Integration — Feature Specification

## Part 1: Feature Catalog (10-15 features)

### Category X: [Name]
#### Feature N: [Name]
- **Model:** [which AI model]
- **Page:** [where it lives]
- **Data:** [what it needs]
- **Value:** [why it matters]
- **Feasibility:** [Easy/Medium/Hard]

...

## Part 2: Top 3 Deep Dives

### Feature A: [Name]
- **User Flow:** ...
- **Architecture:** ...
- **API Integration:** ...
- **UI Layout:** ...
- **Integration:** ...
- **Effort:** ...

...

## Part 3: Shared Infrastructure
- **IPC Design:** ...
- **Model Config:** ...
- **Key Storage:** ...
- **Cost Mgmt:** ...
- **Fallbacks:** ...
- **Streaming:** ...
```

---

## What NOT to Do

- **Do NOT** suggest using the terminal PTY agents for these features (they're for coding, not app-integrated AI)
- **Do NOT** design features that require always-on internet (tracking works offline)
- **Do NOT** suggest rebuilding existing features with AI (AI should add new value, not replace working UI)
- **Do NOT** give "Option A / B / C" — pick the best approach and commit to it
- **Do NOT** assume the user wants to pay — prioritize free-tier models (GLM-4.7-Flash, DeepSeek free credits)
