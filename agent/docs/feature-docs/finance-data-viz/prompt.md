# PROMPT.md — Finance Data Visualization Brainstorm

## Raw Request
"i think we can make good visualization from like the data of the wallet types. like a part chart that shows how much is liquid and how much is not. and like a pie chart that shows the different wallets or other types of chart like the bar chart or something that is interesting. and like idk, based on the features that we have, what are the interesting data processing (i prefer something more complicated) that we can add to improve the user experience, something that is cool, but also maybe add something that is actually like really useful. i want you to generate prompt to ask another ai what are the stuff to add on the finance page in terms of the data, or maybe other features to improve the page"

---

## Context Reference
Read `CONTEXT_BUNDLE.md` (same directory) for complete database schema, TypeScript interfaces, existing chart components, IPC endpoints, and design tokens.

---

## Your Role

You are the **Lead Data Visualization Architect**. Analyze the existing finance module and propose what visualizations, data processing features, and interactive elements should be added to the finance page.

**Do NOT ask me to choose between options.** Design the BEST solution based on the data available.

---

## What Exists Already

The finance page currently has:
- **Net Worth Line Chart** — tracks net worth over time from transactions
- **Spending Category Doughnut** — breakdown by category with Follow Through toggle
- **Income/Expense Bar Chart** — last 6 months stacked bars
- **Crypto Portfolio** — line chart for price history, doughnut for multi-asset allocation
- **Quick Stats** — income, expense, net flow cards
- **Subscription tracking** — renewal dates, cost, status

The data available includes:
- 8 wallet types (bank, debit_card, credit_card, crypto, cash, physical, ewallet, other)
- Transactions with categories, tags, follow-through status, transfer pairs
- Subscriptions with billing cycles and renewal dates
- Crypto prices from CoinGecko (10K+ coins, live + historical)
- Denomination tracking for physical/cash wallets
- Follow-through person tracking with repayment status
- Transfer fees per wallet

---

## What I Need From You

Propose 6-10 data visualizations or data processing features that would genuinely improve the finance page. For each one:

1. **What it shows** — the insight or decision it helps with
2. **Data sources** — which tables/fields it reads
3. **Computation** — what makes it non-trivial (formulas, algorithms, cross-referencing)
4. **Visual type** — what kind of chart or display (don't just say "chart" — specify type)
5. **Why it's useful** — what financial question it answers

**Focus on:**
- Things that are hard to see from raw numbers
- Cross-referencing data across different tables
- Time-based patterns and trends
- Actionable insights (not just pretty charts)

**Avoid:**
- Simple "show total X" displays (already exist)
- Charts that don't connect to real financial decisions
- Anything requiring external data not already in the database

---

## Constraints

- Must work with existing SQLite schema (can add new columns/tables via migration)
- Must use Chart.js (react-chartjs-2) — already in the project
- Dark theme with glass morphism (design tokens in CONTEXT_BUNDLE.md)
- Calculations in main process (IPC handlers), not renderer
- Must handle empty states (new user with 0 transactions)
