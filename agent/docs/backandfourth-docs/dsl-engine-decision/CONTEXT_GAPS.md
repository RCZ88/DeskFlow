# Context Gap Analysis — DSL Engine Decision

| Context Needed | Status | Location | How to Obtain |
|----------------|--------|----------|---------------|
| Full DSL BNF grammar (exact production rules) | ⚠️ Partial | RESULT_QWEN3.8.md | Agent can paste specific sections |
| Existing IPC handler security patterns | ❌ Missing | src/main.ts | Agent must fetch on request |
| Domain module pattern (TypeScript class example) | ✅ Have | agent pattern docs | Already in CONTEXT_BUNDLE concept |
| Build pipeline constraints for .ts compilation | ✅ Have | CONTEXT_BUNDLE | Already covered |
| Security requirements (scope check, rate limit) | ✅ Have | CONTEXT_BUNDLE | Already covered |
| Error handling conventions in existing code | ❌ Missing | Various | Agent can fetch on request |
| Example of a working domain module (focusManager) | ❌ Missing | src/domains/focus/ | Agent can fetch on request |

**Gaps to flag in initial prompt:**
- "We do not yet have the exact error handling patterns. If you need them, ask and I will fetch them."
- "The full BNF grammar is available on request — I have it but kept the summary compact."
