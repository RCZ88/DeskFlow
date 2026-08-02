# Round 01 — Project Owner Response to Specialist REQUESTs

**Date:** 2026-07-30
**Specialist Asked For:** 8 REQUEST items (grammar, partial parsing, process location, test setup, package constraint, complex examples, error UX, AI validation flow)

---

## CONTEXT: REQUEST 1 — Full BNF Grammar

The spec defines ~40 production rules. Exact BNF from RESULT_QWEN3.8.md (lines 316–551):

```bnf
program           = compositionHeader description? scopeDecl settingsDecl? rule+
compositionHeader = "COMPOSITION" STRING
scopeDecl         = "SCOPE" scopeItem ("," scopeItem)*
scopeItem         = ("READ" | "WRITE") qualifiedName
rule              = "RULE" STRING trigger readStmt* ifStmt "END"
trigger           = "TRIGGER" (eventTrigger | intervalTrigger | atTrigger | manualTrigger)
eventTrigger      = "ON" qualifiedName ("IF" expr)?
intervalTrigger   = "EVERY" DURATION
atTrigger         = "AT" STRING
manualTrigger     = "MANUAL"
readStmt          = "READ" IDENT "FROM" qualifiedName ("AGGREGATE" aggregate)? ("WHERE" expr)? ("ORDER" "BY" IDENT direction)? ("LIMIT" NUMBER)?
aggregate         = "COUNT" "(" (IDENT | "*") ")" | "SUM"/"AVG"/"MIN"/"MAX" "(" IDENT ")"
ifStmt            = "IF" expr "THEN" actionStmt+ ("ELSE" actionStmt*)?
actionStmt        = actionCall | setStateStmt | foreachStmt | logStmt
actionCall        = qualifiedName "(" argList? ")"
foreachStmt       = "FOREACH" IDENT "IN" expr "DO" actionStmt+ "END"
expr              = orExpr (standard precedence: OR/AND/NOT/comparison/additive/multiplicative/primary)
literal           = NUMBER | STRING | DURATION | "TRUE" | "FALSE" | "NULL"
funcName          = NOW | TODAY | TODAY_AT | DATE | DATETIME | DATE_ADD | DATE_DIFF | DAYS_AGO | COALESCE | UPPER | LOWER | LENGTH | ABS | ROUND | STATE | IIF
```

27 keywords, 10 comparison operators, 19 built-in functions. ~40 production rules.

### Composition Limits

| Limit | Default |
|---|---|---|
| Max rules per composition | 5 |
| Max READ statements per rule | 20 |
| Max actions per execution | 20 |
| Max FOREACH depth | 2 |
| Max total FOREACH iterations | 500 |
| Max source length | 12,000 chars |
| Max AST nodes | 1,200 |
| Max execution time | 2,000 ms |
| Max event filter depth | 20 nodes |

---

## CONTEXT: REQUEST 2 — Partial Parsing for Editor Assistance

**No.** The DSL editor is a plain `<textarea>` with monospace styling and a "Validate" button — full IPC round-trip validation on demand. The Guided Builder writes DSL internally (form-based: trigger dropdown, condition builder, action builder) and the DSL tab always shows the canonical generated source. No incremental parsing, no autocomplete, no live linting, no intellisense anywhere in the spec.

---

## CONTEXT: REQUEST 3 — Where Parsing Runs

**Electron main process only** inside `CompositionEngine`:

```
renderer textarea → IPC compositions:validate → main process
  → CompositionEngine.validateSource(source)
    → Lexer → Parser → ScopeChecker → ValidationResult
  → return to renderer
```

Phase 9 optionally adds Node `worker_threads` for offloading heavy validation — worker gets NO DB access, input is `{ source, manifests }`. Renderer never parses.

---

## CONTEXT: REQUEST 4 — Test Setup

**Vitest configured but NOT installed.** `vitest.config.ts` exists with `{ environment: 'jsdom', globals: true, include: ['src/**/*.{test,spec}.{ts,tsx}'] }` but vitest is absent from `package.json` devDependencies and `node_modules`. No snapshot tests, no golden-file tests, no `__snapshots__/` directories, no `toMatchSnapshot()` calls. 4 test files exist in `src/__tests__/` and `src/services/ai/`. No `"test"` script in package.json. Tests must be enabled by installing vitest first.

---

## CONTEXT: REQUEST 5 — No New npm Packages Constraint

**✅ RESOLVED BY USER.**

Vendored/audited parser library is acceptable. No strict zero-new-packages policy. The constraint was a convention, not a hard rule — the user explicitly approved adding a small vendored dependency.

---

## CONTEXT: REQUEST 6 — Complex Example Compositions

### (a) Sleep Judge — Most feature-rich (2 READs, COALESCE, date comparison, IF/ELSE, named action)

```dsl
COMPOSITION "Sleep by 22:00 judge"
SCOPE READ goals, READ system.foreground, WRITE goals

RULE "auto-fail"
  TRIGGER AT "22:15"
  READ goal FROM goals WHERE title CONTAINS "sleep" AND status = "active" LIMIT 1
  READ screen FROM system.foreground LIMIT 1
  IF goal AND COALESCE(screen.last_active_at, "1970-01-01") >= TODAY_AT("22:00")
  THEN
    goals.abandon_goal(goal_id = goal.id, note = "Auto-failed: screen activity after 22:00")
  ELSE
    LOG("No fail evidence")
END
```

### (b) Stale Project Reminder — FOREACH loop over IDE dataset

```dsl
COMPOSITION "Stale project reminder"
SCOPE READ ide.projects, WRITE goals

RULE "stale-projects"
  TRIGGER EVERY 6h
  READ stale FROM ide.projects WHERE status = "active" AND last_active < DAYS_AGO(3) LIMIT 20
  FOREACH project IN stale DO
    goals.create_goal(title = "Revive " + project.name, description = "No IDE activity for 3 days.", category = "ide", tier = "one_time")
  END
```

### (c) Budget Over Alert — FOREACH + string concat + finance→system cross-domain

```dsl
COMPOSITION "Budget over alert"
SCOPE READ finance.budget_status, WRITE system

RULE "over-budget"
  TRIGGER EVERY 15m
  READ overBudgets FROM finance.budget_status WHERE status = "over" LIMIT 10
  FOREACH budget IN overBudgets DO
    system.notify(title = "Budget exceeded", body = budget.name + " is over budget by " + ABS(budget.remaining))
  END
```

### (d) Low Runway Spending Goal — Finance + Goals, NULL check

```dsl
COMPOSITION "Low runway spending goal"
SCOPE READ finance.summary, READ goals, WRITE goals

RULE "low-runway"
  TRIGGER EVERY 1h
  READ summary FROM finance.summary LIMIT 1
  READ existing FROM goals WHERE title = "Reduce spending" AND status = "active" LIMIT 1
  IF summary.runway_months < 3 AND existing IS NULL
  THEN goals.create_goal(title = "Reduce spending", description = "...", category = "finance", tier = "one_time")
  ELSE LOG("No action required")
END
```

### (e) TypeScript Mastery Milestone — Learning + Goals, simple conditional

```dsl
COMPOSITION "TypeScript mastery milestone"
SCOPE READ learning.mastery, READ goals, WRITE goals

RULE "mastery-milestone"
  TRIGGER EVERY 30m
  READ mastery FROM learning.mastery WHERE curriculum_id = 1 LIMIT 1
  READ existing FROM goals WHERE title = "Complete TypeScript curriculum" AND status = "active" LIMIT 1
  IF mastery.mastery_score >= 80 AND existing IS NULL
  THEN goals.create_goal(...)
END
```

---

## CONTEXT: REQUEST 7 — Error UX: Stop at First vs Collect Multiple

**✅ RESOLVED BY USER.**

Collect ALL errors. Then the AI suggestion service should auto-fix them cyclically: validate → errors found → AI receives errors + source → AI fixes → re-validate → repeat until clean or unrecoverable. The user does NOT want to fix one error at a time manually.

---

## CONTEXT: REQUEST 8 — AI-Generated DSL Validation Flow

**Batch validation after full suggestion received.** Flow:

1. User clicks "Ask AI" on composition page
2. IPC `compositions:suggest` called
3. Provider prompt includes DSL grammar + manifest summary + composition limits + safety rules
4. Provider returns JSON: `{ title, description, source: "DSL string", explanation, riskLevel }`
5. `CompositionEngine.validateSource(source)` runs full lex/parse/scope check
6. All errors/warnings shown in AI Suggestion Modal
7. User chooses: Reject / Edit (opens DSL editor) / Accept

No streaming, no per-token validation. AI prompt explicitly includes the grammar so output should be structurally valid on arrival. Finance/destructive suggestions always start as `pending_review`.
