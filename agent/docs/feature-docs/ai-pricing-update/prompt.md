## Raw Request
"a feature that integrates ai to research up the price per 1 mil tokens for exampel to be applied and to update the price context point."

## Problem Statement
The current AI model pricing in DeskFlow is hardcoded in `src/main.ts`. This makes it difficult to keep the cost calculations accurate as providers frequently change their pricing. There is currently no mechanism to research current prices or update them without a code change and rebuild.

## Context Reference
The source of truth for the current codebase structure, data shapes, and architecture is `agent/docs/ai-pricing-update/CONTEXT_BUNDLE.md`. Read this first.

## The Mandate
Design a comprehensive solution for an **AI Model Pricing Research & Update** system. This system should allow the app to fetch the latest pricing for supported AI models, present these changes to the user for verification, and apply them to the system's pricing context.

### 1. Engineering Task: Data Processing & Research Pipeline
Design the technical pipeline for pricing research:
- **Research Strategy**: Specify how the AI will research current prices (e.g., using a specialized research agent, web scraping, or API calls to provider pricing pages).
- **Price Extraction**: Define the logic to parse and normalize "Price per 1M tokens" for input, output, cache-read, and cache-write.
- **Storage Evolution**: Propose a change from the hardcoded `MODEL_PRICING` constant to a persistent store (e.g., a new `model_pricing` SQLite table or a `pricing.json` config file in userData) to allow runtime updates without rebuilds.
- **Update Logic**: Design the process for merging researched prices with existing values, including a "Proposed" vs "Active" state.

### 2. Design Task: High-Fidelity Visual Specs
Design a dedicated "Pricing Management" interface (likely a new subtab in Settings or a modal within the AI tools page).
- **Price Comparison View**: A high-fidelity table or grid comparing `Current Price` vs `Researched Price`.
- **Visual Cues**: Use clear indicators for price increases (red) or decreases (green).
- **Batch Actions**: A "Research All" button and a "Apply All Changes" action.
- **Model Selection**: Ability to trigger research for specific models individually.
- **Specs**: Provide exact pixel-level spacing, hex codes based on DeskFlow tokens, and chart types if any (e.g., a small trend sparkline for a model's price over time).

### 3. UX Task: Interaction Flow
Describe the end-to-end user journey:
- **Trigger**: User navigates to Pricing Management -> Clicks "Research Latest Prices".
- **Processing**: A loading state (with a progress indicator per model) while the AI researches.
- **Review**: The system presents the found prices. The user can manually override any researched value if it looks incorrect.
- **Application**: User clicks "Apply Updates" -> System updates the persistent store -> System triggers a refresh of all cost calculations in the `ai_usage` table.
- **Feedback**: A success toast confirming the number of models updated and the date of the last sync.

## Constraints
- Must integrate with the existing `calculateCost` logic in `src/main.ts`.
- Must not require a full app rebuild to update prices.
- Must be dark-mode only and follow the DeskFlow glass-card aesthetic.

## Frontend Design Requirements

### A. Available Design Skills
The implementation must apply these skills:
1. **Frontend Design** — DeskFlow-specific component patterns, tokens, spacing, typography, glass cards.
2. **Human-Centric UX** — empty/loading/error states, progressive disclosure, visual hierarchy, feedback.
3. **Impeccable** — 7 design dimensions, 27 anti-patterns.
4. **Motion — Bring the UI Alive** — Liveliness Levels (L1/L2/L3), motion taxonomy.
5. **UI UX Pro Max** — industry-specific design rules for dev tools and financial data.
6. **Design Taste System** — master aggregator, anti-repetition rules.
7. **frontend-external-infra** — source routing, re-skin rules, anti-slop checklist.

### B. Component Inventory
Use the following components from MCP servers:
| Component | Source | Use for |
|-----------|--------|---------|
| table | shadcn | Comparing current vs researched prices |
| button | shadcn | Triggering research and applying updates |
| dialog | shadcn | Confirmation of pricing updates |
| badge | shadcn | Status of research (e.g., "Updated", "Changed", "Stable") |
| input | shadcn | Manual price overrides |
| spinner | shadcn | Loading state during AI research |
| sonner | shadcn | Success/Error toast notifications |
| Bot | Lucide | Research action icon |
| RefreshCw | Lucide | Sync/Research icon |
| Check | Lucide | Apply/Confirm icon |

### C. Anti-Slop Checklist
1. Re-skin all components to DeskFlow tokens (colors $\rightarrow$ `--bg-primary`, `--accent-primary`, etc.).
2. Max `rounded-xl`, `p-5` padding.
3. Dark mode only.
4. Geist + JetBrains Mono fonts.
5. Glass layer (`bg-zinc-900/80 backdrop-blur-xl`).

## Output Format
Provide a comprehensive technical and visual specification in a `RESULT.md` file. Divide the solution into:
- **Phase 1: Data Layer & Backend** (DB schema, IPC handlers, Research Service).
- **Phase 2: Research Pipeline** (AI agent prompt for price fetching, normalization logic).
- **Phase 3: UI/UX implementation** (Visual specs, Interaction flow, Component mapping).
- **Phase 4: Verification & Migration** (How to migrate from hardcoded constants to the new store).
