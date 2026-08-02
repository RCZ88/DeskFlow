# Collaboration Request: DSL Engine Architecture

## Your Role
You are the **Specialist AI** . I am the **Project Owner** — I know the RHEO codebase; you know DSL design and parser architecture. We will iterate through structured back-and-forth to decide the best approach for a small, safe, auditable DSL engine.

## The Idea
RHEO needs a composition DSL — a small language (~30 production rules) that lets AI agents express cross-subsystem automations (e.g., "when focus streak drops below 3 and it's past 10 PM, create a recovery goal"). The DSL is **NOT compiled to JavaScript** — it compiles to an AST JSON that a runtime engine interprets. No eval, no dynamic SQL, no filesystem, no code generation.

Two approaches are on the table:

### Option A — Hand-written Recursive-Descent Parser
- Pure TypeScript, ~400-600 lines
- Zero external dependencies
- Full control over error messages tied to our schema
- Scope enforcement inline during parse
- We own every bug forever

### Option B — Parser Combinator Library
- E.g. `parsimmon`, `ohm-js`, `chevrotain`, `nearley`
- Declarative grammar, easier to read/modify
- Built-in error recovery
- Spec says "no new npm packages" — but could be vendored or inlined
- Usually 50-100 lines of grammar definition

## Current Context (In CONTEXT_BUNDLE.md)
- Full DSL grammar summary (triggers, actions, scope, expressions)
- Codebase architecture (Electron + better-sqlite3, no existing parser infra)
- 6 subsystem data sources with security levels
- Security requirements (reviewable AST, scope checking, rate limits, circuit breaker)
- Example compositions

## Context Gaps
- If you need to see specific TypeScript patterns (how domain modules work, how IPC handlers are structured), ask and I will fetch them
- If you need the exact DSL BNF grammar as specified in the design doc, ask and I will paste it
- If you need to understand the build pipeline constraints, I can elaborate

## Conversation Protocol
1. **You ask specific questions.** Format: `REQUEST: [what you need]`
2. **I fetch and respond.** Format: `CONTEXT: [file path or explanation]`
3. **We converge on a recommendation.**

## Scope
- **IN:** Which parser approach is better for a ~30-rule DSL in Electron with security constraints
- **IN:** Error handling strategy, error recovery, error message quality
- **IN:** How parse-time scope checking integrates with the parser
- **IN:** Maintenance burden estimation for both approaches
- **OUT:** Do NOT design the full grammar — it's already specified
- **OUT:** Do NOT design the runtime engine — just the parsing front-end
- **OUT:** Do NOT write implementation code — just the architectural recommendation

## Opening Question

**For a DSL with ~30 production rules, must be 100% secure (no eval, no injection), needs rich error messages tied to our schema, and runs in an Electron main process with zero existing parser infrastructure — is a hand-written recursive-descent parser or a parser combinator library the better choice?**

Consider:
1. Grammar complexity — 4 trigger types, 6 action types, 5 value types, scope declarations
2. Security — scope checker must run during/after parse; AST must be reviewable
3. Error messages — "Line 5: 'FOCUS' is not a valid scope. Did you mean 'focus'?"
4. Maintenance — which approach is easier for a new developer to understand?
5. No-new-packages constraint — can we vendored a combinator library?
