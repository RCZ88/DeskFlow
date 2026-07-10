# Design Prompt: AI Model Price Research & Update Feature

## Raw Request

(Request compiled from cross-session context: User needs a feature to automatically research and update AI model pricing, moving away from hardcoded values. This should be similar in robustness to the existing crypto pricing system.)

## Problem Statement

The current AI model pricing is hardcoded within `src/main.ts`, leading to outdated cost calculations and requiring manual updates. This design aims to replace hardcoded values with a dynamic, auto-updating system that fetches and caches current AI model prices from external sources. The solution should be resilient to API failures and integrate seamlessly into the existing AI usage tracking and display in the `IDEProjectsPage`.

## Context Bundle

Refer to `agent/docs/ai-price-update/CONTEXT_BUNDLE.md` for a comprehensive overview of:
- Current hardcoded AI model pricing structure.
- Existing `finance_crypto_prices` IPC handlers, caching (`cryptoCache`), and background refresh mechanisms as a blueprint.
- UI components in `IDEProjectsPage.tsx` currently displaying AI costs.

## Mandate: Lead Designer and Engineer

Design a comprehensive solution for the "AI Model Price Research & Update" feature. Act as the Lead Designer and Engineer, providing both the technical specifications for the data processing pipeline and high-fidelity visual specifications for the user interface, along with interaction design.

### Requirement Checklist:

1.  **Data Processing Pipeline:**
    *   **External API Integration:** Identify and propose a strategy for integrating with external APIs to fetch AI model pricing data. Consider different providers and their rate limits/terms.
    *   **Data Model:** Define the SQLite schema for storing AI model pricing. This should include model ID, provider, input/output costs per million tokens, last updated timestamp, and any other relevant metadata.
    *   **Caching Strategy:** Adapt the existing `cryptoCache` mechanism (from `src/main.ts`) for AI model pricing. Include details on how to manage in-memory cache, persistence to SQLite, and cache invalidation policies.
    *   **Background Refresh:** Specify how to implement a background refresh mechanism for AI model prices, including frequency, rate limiting, and exponential backoff for API failures.
    *   **Error Handling:** Detail how to gracefully handle API errors, rate limits, and network outages, falling back to cached data when necessary.
    *   **Fallback Mechanism:** Define how the system will behave if no current price data is available (e.g., use a default, show a warning).

2.  **High-Fidelity Visual Specifications:**
    *   **`IDEProjectsPage` Integration:** Design how updated AI model prices will be displayed in the "AI Tools" subpage of `IDEProjectsPage.tsx`. This includes:
        *   Adding a "Last Updated" timestamp for the pricing data.
        *   Optionally, a "Price Source" indicator (e.g., from which API the price was fetched).
        *   Updating the display of `totalCost` and `cost` per agent to reflect dynamic pricing.
        *   Consider adding a visual indicator for stale or unavailable pricing data.
    *   **Settings UI:** Design a new section within the `SettingsPage` (under an appropriate tab, e.g., "AI" or "Providers") where users can:
        *   View the current pricing source and last update time.
        *   Manually trigger a price refresh.
        *   Configure auto-update frequency (e.g., daily, weekly, never).
        *   Select preferred price sources (if multiple are identified).
        *   Option to revert to manual/hardcoded pricing.
    *   **Visual Style:** Adhere to DeskFlow's existing design system (e.g., use `GlassCard`, `SectionHeader`, existing color palettes, `rounded-xl` for corners, `p-4` for padding, Geist/JetBrains Mono fonts).

3.  **Interaction Flow:**
    *   **Manual Refresh:** Describe the user flow for manually triggering a price update (e.g., a button click, visual feedback for loading/success/failure).
    *   **Configuration Changes:** How do users save and apply changes to price update frequency or source preferences?
    *   **Error Feedback:** How are users notified of API errors or failures to update pricing data (e.g., toasts, inline warnings)?
    *   **Stale Data Indicators:** How is the user informed when the displayed prices might be outdated or are using fallback values?

## Constraints:

-   The solution must integrate with the existing Electron backend and SQLite database.
-   Prioritize user experience by ensuring minimal disruption during price updates and clear feedback on data freshness.
-   Re-use existing UI components and design patterns as much as possible.
-   The solution should be robust to network failures and API changes from external providers.

