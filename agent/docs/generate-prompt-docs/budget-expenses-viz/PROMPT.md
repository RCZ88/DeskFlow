# PROMPT — Budget & Expenses Data Visualization

## Raw Request

"i think the subscription intelligence can also be replaced with something that includes the fixed cost and expenses stuff. i need you to use the generate prompt skill to create somethign new from the new feature of budget and expenses. basically, add something of a data processing visualization representation for the added features that we got. make sure to use all of the frontend skills and generating the best ui and ux."

"also the spending by category with the weird rainbow colors is a bad ui design. it doesnt look serious, it doesnt look cool. also it doesnt show the text properly of what category it is. the legend text doesnt show the category properly"

"the liquidity waterfall is still not showing up properly"

## Context Bundle

Read `CONTEXT_BUNDLE.md` in this directory for full code context, schemas, and current state.

## Design Skills (MANDATORY)

### 1. Human-Centric UX
- Clarity: primary action obvious in <1s
- Progressive Disclosure: hide complexity
- Visual Hierarchy: one focal point per view
- Complete State Coverage: Empty/Loading/Error/Populated
- Feedback: hover/focus/active/disabled, 150-300ms transitions
- Forgiveness: 44px targets, inline validation

### 2. Impeccable Design
- Typography: Geist + JetBrains Mono, modular scale
- Color: 3 accent max, 4.5:1 contrast, HSL for dark themes
- Spatial: 8px grid, density zones
- Motion: ease-out for feedback, 200-300ms
- Interaction: every element needs hover/focus/active/disabled
- Responsive: mobile-first, 4 breakpoints

## Mandate

Design a COMPREHENSIVE Budget & Expenses data visualization system.

### Task 1: Budget & Expenses Dashboard Card
Replace the Subscription Intelligence radar chart with a comprehensive card showing:
- **Monthly Cash Flow Bar Chart**: Income vs Expenses side by side
- **Net Cash Flow Indicator**: Surplus/Deficit with color coding
- **Budget Progress Bars**: Each budget with utilization percentage
- **Upcoming Due Dates**: List of next 5 upcoming fixed expenses
- **Spending by Category**: Professional doughnut chart (NOT rainbow colors)

### Task 2: Spending Category Chart Redesign
Fix the current chart:
- Use professional dark-theme colors (indigo, violet, purple, fuchsia, pink palette)
- NOT rainbow (red, orange, yellow, green, blue)
- Legend must show category names clearly with amounts
- Legend text must be readable (not truncated)
- Chart should have center total display

### Task 3: Liquidity Waterfall Fix
The IPC handler returns wallet liquidity tiers, not income/expense data:
```json
{
  "tiers": [
    { "name": "Immediate", "amount": 830000, "color": "#10b981", "percentage": 3.7 },
    { "name": "Same Day", "amount": 3194588, "color": "#3b82f6", "percentage": 14.25 },
    { "name": "1-3 Days", "amount": 0, "color": "#f59e0b", "percentage": 0 },
    { "name": "Locked", "amount": 3967577, "color": "#8b5cf6", "percentage": 17.7 }
  ],
  "totalNetWorth": 22411192,
  "liquidityScore": 17.96
}
```
Design a horizontal bar chart showing how quickly money can be accessed.

### Task 4: Data Processing Pipeline
Design the aggregation logic for:
- Fixed income by frequency (monthly → annual)
- Fixed expenses by frequency
- Net cash flow calculation
- Budget utilization (spent / limit × 100)
- Upcoming payments (next 5 due dates)

## Design Specifications

### Chart Colors (Professional Dark Theme)
```
Primary palette: #6366f1, #8b5cf6, #a855f7, #d946ef, #ec4899
Secondary: #f43f5e, #f97316, #eab308, #84cc16, #22c55e
FT (amber shades): #f59e0b, #d97706, #b45309
```

### Card Structure
```
┌─────────────────────────────────────────────────┐
│ 💰 Budget & Expenses Overview          [month]  │
├─────────────────────────────────────────────────┤
│ ┌──────────┐ ┌──────────┐ ┌──────────┐         │
│ │ Income   │ │ Expenses │ │ Net Flow │         │
│ │ Rp12M    │ │ Rp8M     │ │ +Rp4M    │         │
│ └──────────┘ └──────────┘ └──────────┘         │
├─────────────────────────────────────────────────┤
│ Cash Flow Chart        │ Spending by Category   │
│ [Income vs Expenses    │ [Professional doughnut │
│  bar chart]            │  with legend]          │
├─────────────────────────────────────────────────┤
│ Budget Progress         │ Upcoming Due Dates    │
│ [Progress bars]         │ [List of next 5]      │
└─────────────────────────────────────────────────┘
```

### Empty State
```
┌─────────────────────────────────────────────────┐
│           [Icon 48px]                           │
│      No budget data yet                         │
│   Add income and expenses to see analysis       │
│        [Add Income] [Add Expense]               │
└─────────────────────────────────────────────────┘
```

## Constraints
- Must work with existing IPC handlers
- Must handle encrypted fields
- Must preserve number masking
- Must stay within existing file structure
- All animations must respect prefers-reduced-motion
- Components must NOT have their own background — parent grid handles it
