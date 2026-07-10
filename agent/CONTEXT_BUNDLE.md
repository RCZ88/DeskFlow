# CONTEXT_BUNDLE.md for AI Price Research & Update Feature Design

## 1. Current State of AI Model Pricing

**Source:** `src/main.ts`

-   **Hardcoded Pricing:** Defined in `ROUTING_MODEL_PRICING` constant.
    ```typescript
    const ROUTING_MODEL_PRICING: Record<string, { inputPerM: number; outputPerM: number }> = {
      'anthropic/claude-3.5-haiku': { inputPerM: 0.80, outputPerM: 4.00 },
      'anthropic/claude-3-haiku': { inputPerM: 0.25, outputPerM: 1.25 },
      'google/gemini-2.0-flash-001': { inputPerM: 0.10, outputPerM: 0.40 },
      'openai/gpt-4o-mini': { inputPerM: 0.15, outputPerM: 0.60 },
    };
    ```
-   **Cost Calculation:** `computeRoutingCost(inputTokens, outputTokens, model)` function.
    -   Falls back to `'anthropic/claude-3.5-haiku'` pricing if the specific `model` is not found.

## 2. Inspiration: Existing Financial Asset Pricing System (Crypto)

**Source:** `src/main.ts` (lines 22115-22245)

This system provides a robust blueprint for fetching, caching, and updating prices from external APIs.

-   **`cryptoCache` Object:** Manages state (last fetch, in-flight, retry-after, backoff, tracked IDs, timer).
-   **`refreshCryptoPrices()` Function:**
    -   Fetches data from `https://api.coingecko.com/api/v3/simple/price`.
    -   Handles `HTTP 429 (Too Many Requests)` with exponential backoff (`retry-after` header, `backoffMs`).
    -   Stores data in `finance_crypto_prices` SQLite table using `INSERT OR REPLACE`.
-   **`scheduleCryptoRefresh()` Function:** Sets up a `setTimeout` for periodic background refreshing of prices.
-   **`finance:fetch-crypto-prices` IPC Handler:**
    -   Registers `coinIds` for background refresh.
    -   Fetches current prices from CoinGecko or serves cached data if rate-limited or API fails.
    -   Uses `finance_crypto_prices` and `finance_crypto_history` SQLite tables for persistence.
-   **Key Learnings:**
    -   External API integration (CoinGecko).
    -   Robust error handling (rate limiting, backoff).
    -   Data caching in SQLite.
    -   Background refresh scheduling.
    -   IPC communication for fetching and status.

## 3. AI Cost Display in UI

**Source:** `src/pages/IDEProjectsPage.tsx`

-   **Data Source:** `overview?.aiUsage?.byTool` and `workspaceAnalytics?.aiUsage?.byTool` contain `tokens`, `tokensIn`, `tokensOut`, `cost`, `sessions`, `messageCount` per AI agent.
-   **`AIAgent` Interface:** Used to structure AI agent data for display.
-   **Cost Visualization:**
    -   `CostValue` component displays formatted cost (e.g., `$1.23`, `$4.5K`).
    -   `formatCurrency` function handles abbreviation and decimal precision.
    -   `StatCard` components display "Usage vs Daily Limit" for tokens (not directly for cost), using `AGENT_LIMITS` and `estimatedTotal`, `totalLimit`, `available` calculations.

## 4. Feature Requirements for AI Price Research & Update

The goal is to transition from hardcoded AI model pricing to a dynamic, auto-updating system, similar to the existing crypto pricing.

**Key areas to address in the design:**

-   **Data Sources:** Identify reliable external APIs for AI model pricing (e.g., provider APIs, third-party aggregators).
-   **Backend Integration:**
    -   New IPC handlers for fetching and updating AI model prices.
    -   SQLite schema for storing AI model pricing (similar to `finance_crypto_prices`).
    -   Background refresh mechanism with rate limiting and exponential backoff (adapt `cryptoCache` and related functions).
    -   Fallback mechanisms for API failures or missing data.
-   **UI Integration:**
    -   How will the updated prices be displayed in `IDEProjectsPage.tsx`?
    -   Consider a "Last Updated" timestamp for AI prices.
    -   Potentially, a "Price Source" indicator.
    -   Mechanism for users to manually trigger a price refresh or configure update frequency (e.g., in Settings).
    -   Handle display of costs when prices are unavailable or stale.
-   **Configuration:**
    -   Allow users to select preferred price sources if multiple are available.
    -   Option to disable auto-updates and revert to manual/hardcoded prices.
    -   Alerts for significant price changes or update failures.
