# 📝 Design Prompt: Database Page Table Name Search

## Raw Request
> "I would like to be able to debug it properly right but since the table is just like there's so many tables with the random names it's very hard to search the table that you would like to find so I would like you to implement a search bar on the for the searching of a table not exactly the contain the inside of the table not the content of the table but like just the name of the table"

## Problem Statement
The Database page (`/database`) lists all SQLite tables. There are many tables with cryptic/random names, making it hard to find the one you need. Currently there's a search field but it searches TABLE CONTENT, not table names. The user wants a search bar that filters the TABLE LIST by NAME only.

## Engineering Task
**Data Processing Pipeline:**
1. The `tables` state array already contains `TableInfo` objects with `name` fields.
2. Add a filter state that filters the table list by name only (case-insensitive substring match).
3. The existing `searchQuery` is used for CONTENT search — create a separate filter for TABLE NAMES (or reuse the same input with dual filtering).

## High-Fidelity Visual Specs
- Add a search input above the table list panel (above the list, not above the data table).
- Use a `Search` icon from lucide-react.
- Placeholder: "Search tables..." or "Filter by name..."
- Filter is case-insensitive substring match on `table.name`.
- Clear button (X) to reset the filter.
- The search should be visually distinct from the data content search (which searches table content).
- Match existing Database page styling (glass cards, zinc-400 text, rounded inputs).
- Results update immediately as user types.

## Interaction Flow
- User types in table-name search → table list filters by name in real-time
- User clears → all tables visible again
- Selected table persists through filter changes (if it's still in the filtered list)
- If selected table is filtered out, show the first available table

## Constraints
- Must NOT change the existing content search (which searches data inside the selected table)
- Must integrate cleanly with existing `tables` state and `selectedTable` logic
- Build must pass