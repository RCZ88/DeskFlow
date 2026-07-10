# Context Bundle: AI Model Pricing Research & Update Feature

## 1. Current Implementation
The app currently uses a hardcoded pricing table and a simple linear calculation for AI usage costs.

### `src/main.ts` - Pricing Data
```typescript
const MODEL_PRICING: Record<string, { input: number; output: number; cacheRead: number; cacheWrite: number }> = {
    'claude-opus-4': { input: 15, output: 75, cacheRead: 1.5, cacheWrite: 18.75 },
    'claude-sonnet-4-5': { input: 3, output: 15, cacheRead: 0.3, cacheWrite: 3.75 },
    'claude-sonnet-4': { input: 3, output: 15, cacheRead: 0.3, cacheWrite: 3.75 },
    'claude-haiku-3-5': { input: 0.8, output: 4, cacheRead: 0.08, cacheWrite: 1 },
    'claude-haiku-3': { input: 0.8, output: 4, cacheRead: 0.08, cacheWrite: 1 },
    'gpt-5': { input: 5, output: 15, cacheRead: 0.125, cacheWrite: 0.55 },
    'gpt-4o': { input: 2.5, output: 10, cacheRead: 0.525, cacheWrite: 10.5 },
    'o3': { input: 10, output: 40, cacheRead: 0, cacheWrite: 0 },
    'gemini-2-5-pro': { input: 1.25, output: 5, cacheRead: 0.16, cacheWrite: 5 },
    'gemini-2-5-flash': { input: 0.075, output: 0.3, cacheRead: 0.01, cacheWrite: 0.15 },
    'default': { input: 2, output: 10, cacheRead: 0.2, cacheWrite: 2 },
};
```

### `src/main.ts` - Cost Calculation
```typescript
function calculateCost(session: ParsedSession): number {
    const pricing = getModelPricing(session.model);
    let cost = 0;
    cost += (session.inputTokens / 1_000_000) * pricing.input;
    cost += (session.outputTokens / 1_000_000) * pricing.output;
    if (session.cacheReadTokens) cost += (session.cacheReadTokens / 1_000_000) * pricing.cacheRead;
    if (session.cacheWriteTokens) cost += (session.cacheWriteTokens / 1_000_000) * pricing.cacheWrite;
    return Math.round(cost * 10000) / 10000;
}
```

## 2. Data Layer
- **Table**: `ai_usage`
- **Columns**: `input_tokens`, `output_tokens`, `cache_write_tokens`, `cache_read_tokens`, `cost_usd`, `model`.
- **Flow**: Log files -> `syncAllAIAgents` -> `calculateCost` -> `INSERT INTO ai_usage`.

## 3. IPC Infrastructure
Currently, there is no IPC for updating model pricing. The pricing is a hardcoded constant in `main.ts`.

## 4. Design Tokens & Style
- **Theme**: Dark mode, glass effects.
- **Colors**: `--bg-primary`, `--accent-primary`.
- **Fonts**: Geist, JetBrains Mono.
- **UI Pattern**: Card-based, using shadcn-like components.
