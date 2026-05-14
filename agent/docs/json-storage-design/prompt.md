# Design: JSON Storage for Problems & Requests

## Context

ProblemsService and RequestsService currently parse markdown files (PROBLEMS.md, REQUESTS.md) using regex patterns. This is fragile — trailing whitespace, field name variations, and format mismatches cause silent parse failures. The descriptions field has never worked correctly.

The tracker-mind-setup handler already exports `problems.json` and `requests.json` from the DB, but the services ignore them.

## Problem Statement

Markdown parsing is brittle. A single space or format variant breaks the parser silently. REQUESTS.md description field has been empty since inception. PROBLEMS.md parsing requires 4 different regex patterns to handle format drift. Both need to be replaced with a machine-parseable format.

## Mandate

Design a comprehensive solution that replaces markdown parsing with JSON as the source of truth for Problems and Requests data.

### Engineering Requirements

1. **Data Storage:**
   - `problems.json` — JSON array of Problem objects, source of truth
   - `requests.json` — JSON array of Request objects, source of truth
   - PROBLEMS.md and REQUESTS.md are generated FROM JSON (human-readable export only)

2. **Schema:**
   - Problem: `{ id, title, status, priority, category, terminal_id, skill_used, user_notes, fix_description, files[], created_at, updated_at }`
   - Request: `{ id, title, description, status, priority, category, linked_problems[], created_at, updated_at }`

3. **Migration:**
   - If JSON file exists → read it
   - If JSON doesn't exist but markdown does → parse markdown once, write JSON, use JSON going forward
   - If neither exists → create empty JSON + markdown

4. **Write Sync:**
   - Every mutation (create, update, delete) writes JSON first
   - Then regenerates markdown from JSON data
   - Markdown is always a reflection of JSON, never the inverse

### Constraints

- Must work with existing IPC handlers and preload API — no frontend changes
- Must keep the existing Problem/Request interface shapes
- Must handle the case where DB-backed JSON export exists with different schema (DB has integer IDs, service uses string IDs like "116.1")
- Migration must be silent and automatic — no user interaction
- Build must pass with `npm run build`
