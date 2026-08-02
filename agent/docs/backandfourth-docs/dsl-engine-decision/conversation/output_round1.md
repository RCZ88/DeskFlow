## Round 02 — Specialist Recommendation

I have enough context to converge.

Based on the grammar size, the Electron main-process constraint, the need for multi-error collection, the AI auto-fix loop, and the security model, my final recommendation is:

> **Use a hand-written recursive-descent parser, but treat it as only the syntax layer.**  
> The real intelligence should live in a separate **semantic validation pipeline**: manifest resolution, scope checking, type checking, limit enforcement, risk classification, and diagnostic generation.

I would **not** adopt a parser combinator library for this DSL, even now that vendoring is allowed.

The reason is not that combinators are bad. It is that the hard part of this system is not parsing syntax. The hard part is producing **secure, schema-aware, machine-readable diagnostics** that can be shown to a user and fed back into an AI auto-fix loop.

That part cannot be meaningfully outsourced to a parser library.

---

# Final Recommendation

## Recommended Approach

### Option A+ — Hand-written Lexer + Recursive-Descent Parser + Semantic Binder

Use a deliberately boring, fully owned parsing front-end:

```txt
DSL source
  ↓
Pre-parse limits
  ↓
Lexer
  ↓
Token stream
  ↓
Recursive-descent parser
  ↓
Raw syntax AST
  ↓
AST normalizer
  ↓
Semantic binder
  ↓
Limit checker
  ↓
Risk classifier
  ↓
Validation report
```

The parser should be responsible only for syntax.

The semantic binder should be responsible for meaning, scope, safety, and manifest validation.

This gives you the best fit for:

- ~40 production rules
- main-process-only execution
- no partial parsing requirement
- collect-all-errors UX
- AI auto-fix loop
- reviewable AST JSON
- strict scope enforcement
- finance/destructive review classification
- no eval / no injection / no dynamic SQL
- long-term maintainability inside an Electron codebase

---

# Why Not a Parser Combinator Library?

Even with vendoring allowed, I would still avoid it here.

## The dominant work is semantic, not syntactic

Your DSL is small enough that the syntax layer is manageable.

The expensive work is:

- resolving `goals` vs `goal` vs `goals.reviews`
- resolving `goals.abandon_goal` vs `goals.abandon`
- checking whether `READ finance.summary` was declared
- checking whether `WRITE goals` allows `goals.create_goal`
- validating action parameter names and types
- detecting finance-sensitive actions
- detecting destructive actions
- producing did-you-mean diagnostics
- producing a validation report the AI can use to auto-fix
- enforcing AST limits
- classifying risk

A parser combinator does very little of that for you.

---

## The AI auto-fix loop changes the requirements

This requirement is decisive:

> Validate → collect all errors → AI receives errors + source → AI fixes → re-validate → repeat.

That means your validation system must produce excellent structured diagnostics.

You need:

- stable error codes
- line/column positions
- end positions
- hints
- expected values
- actual values
- candidate suggestions
- phase identification
- recoverability flags
- machine-readable categorization

That is a compiler-diagnostics problem, not a parser-library problem.

Hand-written parsing gives you direct control over this.

---

## Error recovery is easier to own for a small DSL

A small DSL with strong synchronization boundaries is a good candidate for hand-written recovery.

Your grammar has excellent recovery boundaries:

```txt
COMPOSITION
SCOPE
RULE
TRIGGER
READ
IF
THEN
ELSE
FOREACH
DO
END
```

That means the parser can recover at block boundaries and still produce a partial AST with many diagnostics.

Most combinator libraries are optimized for either:

- success-path parsing
- single-error failure
- limited recovery
- CST/AST transformation after successful parse

They are usually less pleasant when you need:

- many syntax errors
- partial AST
- stable diagnostic codes
- schema-aware hints
- AI-consumable reports

---

## Vendoring removes the dependency objection, but not the maintenance burden

If you vendor a library, you still own:

- auditing it
- freezing it
- patching it
- understanding its internals
- adapting its error model
- transforming its output into your AST
- maintaining compatibility with your diagnostics
- explaining it to future developers

For a 40-rule DSL, that is not a good trade.

You would take on library ownership without eliminating the semantic work.

---

# If a Library Were Forced, Which One?

If the project later decides it wants a library anyway, my recommendation would be:

## Chevrotain

Chevrotain would be the only library I would seriously consider for this use case.

It has:

- real token vocabulary
- CST output
- error recovery support
- position tracking
- decent performance
- explicit grammar rules

But I would still treat it as a second-best option for this project.

### Why Chevrotain is still not my first choice

Because you would still need:

- token definitions
- CST-to-AST visitor
- diagnostic adapter
- semantic binder
- scope checker
- limit checker
- risk classifier
- AI auto-fix report formatter

Chevrotain would reduce some syntax-rule boilerplate, but it would add:

- library concepts
- CST transformation
- recovery configuration
- vendored code maintenance
- debugging through library internals

For this DSL, that is not worth it.

---

## Libraries I would avoid for this DSL

### Parsimmon

Elegant, but weak for multi-error recovery and rich positional diagnostics unless you build a lot yourself.

### Nearley

Too ambiguity-tolerant and generator-oriented for a strict secure DSL where deterministic diagnostics matter.

### Ohm-js

Very readable grammar separation, but introduces a separate grammar artifact and runtime model. It is attractive, but still does not solve the semantic/diagnostic problem.

---

# Recommended Parser Architecture

## 1. Pre-parse Guard

Before lexing, enforce cheap denial-of-service limits.

Check:

- source is a string
- source length <= 12,000 characters
- no NUL bytes or illegal control characters
- maximum initial token budget
- maximum line count sanity bound
- CRLF normalization strategy

Important because the codebase uses CRLF:

> The lexer must treat `\r\n` as a single line break and report line/column numbers consistently.

This is a common source of subtle diagnostic bugs.

---

## 2. Lexer

The lexer should be simple and deterministic.

### Responsibilities

- convert source into tokens
- track line/column
- track start/end offsets
- recognize keywords
- recognize qualified identifiers
- recognize literals
- reject invalid characters
- detect unterminated strings
- detect malformed durations
- detect malformed numbers
- produce lexer diagnostics
- continue after invalid tokens when possible

### Token categories

You likely need:

- keywords
- identifiers
- dotted identifiers
- strings
- numbers
- durations
- operators
- punctuation
- invalid tokens
- EOF

### Keyword policy

Recommend:

- keywords are uppercase and case-sensitive
- identifiers are case-sensitive
- built-in functions are uppercase
- dataset/action names are lowercase/dotted
- scope names are lowercase/dotted

This makes did-you-mean easier and avoids accidental keyword collisions.

Example:

```txt
COMPOSITION, SCOPE, RULE, TRIGGER, READ, IF, THEN, FOREACH
```

are keywords.

```txt
goals, finance.summary, goals.create_goal
```

are qualified identifiers.

---

## 3. Parser

The parser should be a recursive-descent parser with a small Pratt-style expression parser.

### Parser responsibilities

- enforce grammatical structure
- build a raw syntax AST
- attach source locations
- collect multiple syntax errors
- recover at block boundaries
- enforce structural limits
- produce partial AST when possible

### Parser non-responsibilities

The parser should not resolve:

- whether a scope exists
- whether a dataset exists
- whether an action exists
- whether a field exists
- whether a parameter is required
- whether finance is locked
- whether an action requires review
- whether a type is compatible

Those are semantic concerns.

This separation is critical.

---

## 4. Expression Parsing

Use a precedence-climbing or Pratt-style expression parser.

Your expression grammar is regular enough that this is the cleanest approach.

Expression concerns:

- OR / AND / NOT
- comparison operators
- additive/multiplicative operators
- unary minus
- parentheses
- literals
- function calls
- field access
- `IS NULL` / `IS NOT NULL`
- maximum expression depth
- maximum node count

The expression parser should be isolated so it can be tested independently.

This is one of the areas where hand-written parsing remains very manageable.

---

## 5. Error Recovery Strategy

This needs to be designed intentionally.

### Recovery model

Use panic-mode recovery with synchronization tokens.

When an unexpected token is encountered:

1. record a diagnostic
2. create an error node if useful
3. skip tokens until a safe synchronization point
4. continue parsing
5. mark the containing block as partially invalid

### Synchronization tokens

Good sync points:

```txt
COMPOSITION
SCOPE
RULE
TRIGGER
READ
IF
THEN
ELSE
FOREACH
DO
END
```

### Recovery examples

If a `READ` statement is malformed, recover at the next:

```txt
READ
IF
TRIGGER
RULE
END
```

If an action call has malformed arguments, recover at:

```txt
comma
closing parenthesis
THEN
ELSE
END
DO
```

If a `FOREACH` body is malformed, recover at:

```txt
END
```

If a trigger is malformed, recover at:

```txt
READ
IF
RULE
END
```

### Partial AST policy

The parser should produce a partial AST when possible, but every invalid node should be explicitly marked.

Do not silently invent missing nodes.

If a node is synthetic or recovered, mark it as:

- invalid
- recovered
- missing
- placeholder

This matters for the AI auto-fix loop. The AI should know what was genuinely present versus what the parser guessed.

---

# Diagnostic Design

This is the most important part of the front-end.

## Diagnostic fields

Every diagnostic should contain:

- severity
- phase
- code
- message
- hint
- start line
- start column
- end line
- end column
- start offset
- end offset
- actual value
- expected values
- suggestions
- recoverable flag
- related node type
- related identifier

### Severity levels

Use:

- error
- warning
- info

### Phases

Use:

- preparse
- lexer
- parser
- semantic
- limits
- risk

### Example diagnostic codes

Lexer:

```txt
LEX_UNEXPECTED_CHARACTER
LEX_UNTERMINATED_STRING
LEX_INVALID_DURATION
LEX_INVALID_NUMBER
LEX_SOURCE_TOO_LONG
```

Parser:

```txt
SYN_EXPECTED_KEYWORD
SYN_EXPECTED_STRING
SYN_EXPECTED_IDENTIFIER
SYN_EXPECTED_EXPRESSION
SYN_UNEXPECTED_TOKEN
SYN_MISSING_END
SYN_INVALID_TRIGGER_KIND
SYN_INVALID_AGGREGATE
SYN_FOREACH_TOO_DEEP
```

Semantic:

```txt
SEM_UNKNOWN_SCOPE
SEM_UNKNOWN_DATASET
SEM_UNKNOWN_ACTION
SEM_UNKNOWN_FIELD
SEM_UNKNOWN_TRIGGER
SEM_UNKNOWN_FUNCTION
SEM_MISSING_REQUIRED_PARAM
SEM_UNKNOWN_PARAM
SEM_TYPE_MISMATCH
SEM_SCOPE_NOT_DECLARED
SEM_DUPLICATE_READ_ALIAS
SEM_FOREACH_VARIABLE_SHADOWING
SEM_EVENT_SCOPE_MISSING
SEM_ACTION_SCOPE_MISSING
SEM_FINANCE_REVIEW_REQUIRED
SEM_DESTRUCTIVE_REVIEW_REQUIRED
```

Limits:

```txt
LIM_TOO_MANY_RULES
LIM_TOO_MANY_READS
LIM_TOO_MANY_ACTIONS
LIM_TOO_MANY_FOREACH_ITERATIONS_DECLARED
LIM_AST_TOO_LARGE
LIM_EXPRESSION_TOO_DEEP
```

Risk:

```txt
RISK_FINANCE_WRITE
RISK_DESTRUCTIVE_ACTION
RISK_BROAD_SCOPE
RISK_UNUSED_READ
RISK_HIGH_FREQUENCY_TRIGGER
```

---

# Error Message Quality

The diagnostics should be good enough for both humans and AI.

## Human-facing examples

### Unknown scope

```txt
Line 3, column 13: 'FOCUS' is not a valid scope.
Did you mean 'focus'?
```

### Unknown dataset

```txt
Line 7, column 18: Unknown dataset 'goal'.
Did you mean 'goals'?
```

### Unknown action

```txt
Line 12, column 5: Unknown action 'goals.abandon'.
Did you mean 'goals.abandon_goal'?
```

### Missing scope

```txt
Line 12, column 5: Action 'goals.create_goal' requires WRITE scope 'goals'.
Add 'WRITE goals' to the SCOPE declaration.
```

### Missing required parameter

```txt
Line 14, column 5: Action 'goals.create_goal' is missing required parameter 'title'.
```

### Type mismatch

```txt
Line 9, column 34: Cannot compare datetime with string.
Left side is datetime, right side is string.
```

### FOREACH too deep

```txt
Line 18, column 3: FOREACH depth is 3, but the maximum allowed depth is 2.
```

---

## AI-facing diagnostic shape

The AI auto-fix loop should receive structured diagnostics, not only formatted strings.

For each diagnostic, include:

- code
- severity
- message
- hint
- location
- actual
- expected
- suggestions
- phase

This allows the AI to reason more reliably than if it only receives human prose.

---

# Semantic Binder Design

The semantic binder is where the DSL becomes secure.

## It should resolve five namespaces

### 1. Scopes

Declared scopes:

```txt
READ goals
READ finance.summary
WRITE goals
WRITE system
```

The binder checks:

- scope exists
- scope is known domain or dataset
- scope is not duplicated
- scope is not overly broad if policy forbids broad scopes

---

### 2. Datasets

Used in:

```txt
READ alias FROM qualifiedName
```

The binder checks:

- dataset exists in manifest registry
- dataset is readable
- declared READ scope covers dataset
- fields in WHERE/ORDER BY exist
- aggregate fields are aggregatable
- limit is within dataset max limit
- finance dataset access is allowed by policy

---

### 3. Triggers

Used in:

```txt
TRIGGER ON qualifiedName
```

The binder checks:

- trigger exists
- trigger payload fields exist
- event filter expression is valid
- trigger source scope is declared
- trigger is not disabled by policy

Recommendation:

> Event triggers should require READ scope for the event domain.

Example:

```dsl
TRIGGER ON finance.transaction.created
```

should require:

```txt
READ finance
```

or a narrower manifest-defined event scope.

---

### 4. Actions

Used in:

```txt
goals.create_goal(...)
system.notify(...)
```

The binder checks:

- action exists
- action is callable in compositions
- WRITE scope is declared
- required parameters are present
- unknown parameters are rejected
- parameter types are compatible
- enums are respected
- string lengths are within limits
- numeric min/max are respected
- finance-sensitive actions are flagged
- destructive actions are flagged
- review requirement is computed

---

### 5. Local aliases

Introduced by:

```txt
READ goal FROM goals
FOREACH project IN stale
```

The binder checks:

- no duplicate READ aliases in the same rule
- FOREACH variable does not illegally shadow a READ alias
- field access resolves against alias type
- arrays are only used where arrays are allowed
- object field access is valid

Recommendation:

> Forbid alias shadowing entirely.

It simplifies diagnostics and avoids confusing compositions.

---

# Scope Checking Model

Scope checking should be manifest-driven.

## Read scope

A READ statement should require a READ scope matching the dataset.

Examples:

```txt
READ goal FROM goals
requires READ goals

READ summary FROM finance.summary
requires READ finance.summary or READ finance

READ screen FROM system.foreground
requires READ system.foreground or READ system
```

The manifest registry should define whether domain-level scope is sufficient or dataset-level scope is required.

Recommendation:

- allow domain-level scope for convenience
- allow dataset-level scope for precision
- store both declared and resolved scopes in validation output

---

## Write scope

An action should require a WRITE scope matching the action domain.

Examples:

```txt
goals.create_goal(...)
requires WRITE goals

system.notify(...)
requires WRITE system

finance.create_transaction(...)
requires WRITE finance
```

Finance writes should also automatically set:

```txt
requiresReview = true
riskLevel = high
```

Destructive actions should set:

```txt
destructive = true
```

Depending on settings, destructive actions may also require review.

---

## Declared vs actual scope

The validation report should contain:

- declared scopes
- actual read scopes
- actual write scopes
- missing scopes
- unused scopes
- elevated-risk scopes

This is useful for UI display and AI auto-fix.

Example:

```txt
Declared:
  READ goals
  WRITE system

Actual:
  READ goals
  READ finance.summary
  WRITE goals

Missing:
  READ finance.summary
  WRITE goals
```

The AI can then insert the missing scope declaration mechanically.

---

# Type Checking Strategy

Keep the type system small and practical.

## Recommended primitive types

```txt
null
boolean
number
string
date
datetime
duration
object
array
any
```

## Type rules

### Literals

```txt
123          number
"abc"        string
6h           duration
TRUE         boolean
NULL         null
```

### Comparisons

Allow:

- number compared with number
- string compared with string
- date compared with date
- datetime compared with datetime
- null checks via `IS NULL` / `IS NOT NULL`

Disallow or warn on:

- number compared with string
- datetime compared with plain string unless string is a known datetime literal/function result
- boolean used in numeric comparison
- object compared with primitive

### String concatenation

Your examples use:

```txt
"Revive " + project.name
```

Recommendation:

- allow `+` for numbers
- allow `+` for strings
- if either operand is statically string, treat result as string
- numbers may be coerced to string in concatenation contexts
- objects/arrays should not be concatenated directly

This keeps the DSL ergonomic without becoming loose.

### Arrays

Arrays should be allowed in:

- truthiness checks
- FOREACH iteration
- `.length` if you choose to support it

Arrays should not allow:

- arbitrary indexing
- slicing
- mutation
- field access except explicitly supported metadata

---

# AST Design Principles

The AST must be reviewable and serializable.

## Requirements

The AST should be:

- plain JSON
- cycle-free
- class-free
- deterministic
- stable across versions
- small enough to store in SQLite
- readable by humans
- consumable by the runtime interpreter
- consumable by the UI review screen

## Recommended AST metadata

Every stored AST should include:

- `astVersion`
- `dslVersion`
- `sourceHash`
- `scopes`
- `datasets`
- `triggers`
- `actions`
- `riskLevel`
- `requiresReview`
- `limits`
- `warnings`

The raw source should also be stored separately.

Do not store only the AST. Store:

```txt
source + ast + validation report summary
```

This preserves auditability.

---

# AI Auto-Fix Loop Architecture

This should be a validation orchestrator, not part of the parser.

## Recommended loop

```txt
User asks AI
  ↓
Provider returns DSL
  ↓
Validate DSL
  ↓
If clean:
  show suggestion
If errors:
  send source + diagnostics + grammar + manifests to AI
  ↓
AI returns corrected DSL
  ↓
Validate again
  ↓
Repeat until clean or unrecoverable
```

## Recommended guardrails

Use strict limits:

- max auto-fix cycles: 3
- max diagnostics sent per cycle: 25
- max source length unchanged: 12,000 chars
- stop if source is unchanged
- stop if diagnostic hash repeats
- stop if error count increases significantly
- stop if new high-risk scopes appear unexpectedly
- never auto-activate finance/destructive compositions
- never auto-accept AI output without user review
- never include sensitive user data in fix prompts unless explicitly required by the user

## Diagnostic minimization

Do not send the entire manifest universe to the AI on every fix cycle.

Send:

- the current source
- the diagnostics
- the relevant manifest fragments
- the composition limits
- the DSL grammar summary

This reduces hallucination and keeps prompts smaller.

---

# Maintenance Burden Estimate

## Hand-written Option A+

### Estimated size

Rough estimate:

| Module | Estimated size |
|---|---:|
| Lexer | 200–350 lines |
| Token definitions | 100–200 lines |
| Parser | 700–1,200 lines |
| Expression parser | 200–400 lines |
| AST normalizer | 150–300 lines |
| Semantic binder | 700–1,400 lines |
| Limit checker | 100–250 lines |
| Diagnostic utilities | 150–300 lines |
| Tests | 600–1,500+ lines |

Total:

```txt
Approximately 2,000–4,500 lines including tests.
```

The syntax parser alone may be 800–1,600 lines once recovery and diagnostics are done properly.

This is larger than the optimistic 400–600 line estimate, but still bounded.

### Long-term maintenance

Good, if structured well.

Pros:

- no dependency churn
- easy to debug
- easy to attach schema-aware errors
- easy to evolve with manifests
- easy to audit for security
- easy to run in main process or worker

Cons:

- you own all parser bugs
- recovery logic must be disciplined
- semantic binder will grow as manifests grow

---

## Library Option B

### Estimated size

If using Chevrotain or similar:

| Module | Estimated size |
|---|---:|
| Vendored library | large |
| Token vocabulary | 150–300 lines |
| Grammar rules | 300–700 lines |
| CST-to-AST visitor | 400–900 lines |
| Diagnostic adapter | 300–700 lines |
| Semantic binder | 700–1,400 lines |
| Limit checker | 100–250 lines |
| Tests | 600–1,500+ lines |

The semantic work remains roughly the same.

The library reduces some syntax work but adds transformation and adaptation work.

### Long-term maintenance

Worse for this project.

Cons:

- vendored library ownership
- library upgrade friction
- CST/AST mismatch
- debugging through library internals
- new developers must learn both DSL and parser library
- error recovery model constrained by library design

---

# New Developer Maintainability

You asked which approach is easier for a new developer to understand.

For this DSL, I believe:

> A well-structured hand-written parser is easier to understand than a parser-library pipeline.

Why?

Because the hand-written version can be made extremely explicit:

```txt
lexer.ts
tokens.ts
parser.ts
expressions.ts
ast.ts
diagnostics.ts
semantic-binder.ts
scope-checker.ts
limit-checker.ts
risk-classifier.ts
validate.ts
```

A new developer can follow the flow directly.

With a library, they must understand:

- the library’s token model
- the library’s rule API
- the library’s error model
- the library’s CST shape
- the visitor pattern
- the adapter layer
- your semantic layer anyway

For a small DSL, library abstractions often add more conceptual overhead than they remove.

---

# Security Recommendation

The parser is part of the security boundary, but not the whole boundary.

## Parser-level security

Enforce:

- max source length
- max token count
- max AST nodes
- max expression depth
- max FOREACH depth
- no invalid control characters
- no unbounded recursion
- no syntactic escape hatches

## Semantic-level security

Enforce:

- manifest-only datasets
- manifest-only actions
- manifest-only fields
- manifest-only triggers
- declared scopes
- parameter schemas
- finance review flags
- destructive review flags
- locked-subsystem restrictions
- risk classification

## Runtime-level security

This is outside the parsing front-end, but the parser should supply the metadata the runtime needs:

- resolved scopes
- resolved datasets
- resolved actions
- trigger subscriptions
- risk level
- review requirement
- estimated action count
- loop bounds where statically known

The runtime can then enforce:

- rate limits
- kill switch
- execution timeout
- audit logging
- review queue
- circuit breaker

---

# Testing Strategy

You mentioned Vitest is configured but not installed.

## Recommendation

Install Vitest as a dev dependency and enable the existing config.

This is worth it because the DSL front-end is highly testable and security-critical.

If you want to avoid adding even dev dependencies, use Node’s built-in test runner instead. But given the existing `vitest.config.ts`, Vitest is the cleaner path.

## Test categories

### Lexer tests

- keywords
- identifiers
- dotted identifiers
- strings
- numbers
- durations
- operators
- CRLF line counting
- unterminated strings
- invalid characters
- max source length

### Parser tests

- valid composition snapshots
- missing END recovery
- malformed trigger recovery
- malformed READ recovery
- malformed action arguments
- nested FOREACH limits
- expression precedence
- function call parsing
- NULL checks
- multiple error collection

### Semantic tests

- unknown scope
- unknown dataset
- unknown action
- unknown trigger
- missing WRITE scope
- missing READ scope
- duplicate alias
- illegal shadowing
- missing required parameter
- unknown parameter
- type mismatch
- finance review flag
- destructive review flag
- dataset field validation
- aggregate field validation

### Golden tests

Create directories:

```txt
src/services/compositions/__tests__/fixtures/valid/
src/services/compositions/__tests__/fixtures/invalid/
src/services/compositions/__tests__/fixtures/semantic/
```

Each fixture should have:

```txt
example.dsl
expected-validation.json
expected-ast.json
```

This gives you strong regression protection.

### AI auto-fix tests

Create fixtures where:

- source has one syntax error
- source has multiple syntax errors
- source has semantic scope errors
- source has unknown action errors
- source has finance review warnings
- source is unrecoverable

Assert:

- diagnostics are stable
- error codes are correct
- hints are useful
- AI fix payload contains only allowed information

---

# Recommended Module Boundaries

Even though we are not writing implementation code, the module split matters architecturally.

## Suggested modules

### `dsl/preparse`

Checks source size and basic sanity.

### `dsl/lexer`

Produces tokens and lexer diagnostics.

### `dsl/tokens`

Defines token types and keyword tables.

### `dsl/parser`

Produces raw syntax AST.

### `dsl/expressions`

Handles expression precedence.

### `dsl/ast-normalizer`

Converts raw AST into canonical JSON AST.

### `dsl/semantic/binder`

Resolves identifiers against manifests.

### `dsl/semantic/scopes`

Checks declared vs actual scopes.

### `dsl/semantic/types`

Performs lightweight type checking.

### `dsl/semantic/limits`

Enforces composition limits.

### `dsl/semantic/risk`

Classifies finance/destructive/broad-scope risk.

### `dsl/diagnostics`

Diagnostic creation, formatting, deduplication, hashing.

### `dsl/validate`

Orchestrates the full validation pipeline.

This structure keeps the parser from becoming a monolith.

---

# What the Parser Should Return

The validation result should be rich enough for UI, storage, and AI auto-fix.

It should include:

- ok flag
- diagnostics
- warnings
- raw AST if syntactically valid
- normalized AST if semantically valid
- declared scopes
- resolved scopes
- datasets used
- triggers used
- actions used
- functions used
- requiresReview flag
- riskLevel
- human-readable summary
- machine-readable summary
- source hash
- dslVersion
- astVersion

This becomes the single source of truth for:

- editor validation panel
- AI suggestion modal
- composition storage
- review queue
- audit log

---

# What the AI Suggestion Service Should Receive

The AI suggestion service should not receive raw internal objects directly.

It should receive a sanitized validation package:

- source
- diagnostics
- declared scopes
- missing scopes
- unknown identifiers
- candidate suggestions
- relevant manifest fragments
- composition limits
- DSL grammar summary

It should not receive:

- finance balances
- transaction rows
- user file paths
- terminal output
- decrypted finance fields
- runtime execution state
- sensitive localStorage snapshots

The parser validation package should be designed so it can be safely passed to the provider.

---

# Open Design Decisions

These are not blocking, but you should decide them before implementation.

## 1. Comments

The current grammar does not show comment support.

Decision needed:

- no comments
- line comments with `#`
- line comments with `//`
- block comments

Recommendation:

If humans will edit DSL directly, add line comments now. It is cheap and useful.

But if the grammar is locked, leave comments out and reject them with a clear diagnostic.

---

## 2. AST versioning

Recommendation:

Store both:

```txt
dslVersion
astVersion
```

Start with:

```txt
dslVersion: 1
astVersion: 1
```

This makes future migrations much easier.

---

## 3. Maximum AI auto-fix cycles

Recommendation:

```txt
max cycles: 3
```

More than that usually indicates either:

- bad provider output
- incomplete prompt
- manifest mismatch
- unrecoverable user intent

---

## 4. Whether validation should return tokens

For debugging, it can be useful to return tokens in development mode.

Recommendation:

- do not store tokens
- do not return tokens to renderer by default
- optionally include tokens in internal debug builds

---

## 5. Whether warnings block activation

Recommendation:

- errors block activation
- warnings do not block activation
- finance/destructive warnings may force `pending_review`
- high-risk warnings should be shown prominently

---

# Final Decision

## For this DSL, in this codebase, with these constraints:

### Choose hand-written recursive descent.

Specifically:

```txt
Hand-written lexer
+ recursive-descent parser
+ Pratt expression parser
+ manifest-driven semantic binder
+ structured diagnostics
+ AI-consumable validation report
```

Do not choose a parser combinator library unless the grammar is expected to grow significantly or the team already has strong Chevrotain experience.

---

# Why This Is the Right Call

The deciding factors are:

1. **Grammar size is small enough.**
   - ~40 production rules is manageable by hand.

2. **Partial parsing is not required.**
   - No autocomplete or live linting means no need for incremental parser infrastructure.

3. **Main-process-only execution favors simplicity.**
   - A hand-written parser can be synchronous, pure, and easy to move to a worker later.

4. **Multi-error collection is required.**
   - Hand-written recovery gives direct control.

5. **AI auto-fix requires structured diagnostics.**
   - This is the strongest argument for owning the full validation pipeline.

6. **Security is semantic.**
   - Scope checking, manifest validation, and review classification must be custom anyway.

7. **Vendoring a library does not remove the hard work.**
   - It only adds library maintenance and adaptation cost.

8. **AST reviewability is mandatory.**
   - A hand-written parser can emit exactly the JSON AST you want.

---

# Recommendation Summary

```txt
Recommended: Option A+
Hand-written recursive-descent parser with separate semantic validation pipeline.

Reject: Parser combinator library as default.
Fallback: Chevrotain only if grammar complexity grows or team strongly prefers it.

Primary reason:
The hard problem is not parsing syntax.
The hard problem is secure, schema-aware, multi-error diagnostics for humans and AI.
```

No blocking REQUESTs remain. If you want, the next round can focus on one of these three implementation-detail decisions:

REQUEST: Confirm whether DSL comments should be supported.

REQUEST: Confirm maximum AI auto-fix cycles and stop conditions.

REQUEST: Confirm whether validation results should store full AST in DB or only source + validation summary.