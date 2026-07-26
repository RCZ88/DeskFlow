# AI Agent Data Parser Fix — Diagnostic & Fix Prompt

## Raw Request

> most parsers show nothing (no data)
> only opencode gemini codex show anything
> why are claude code, kilocode, qwen, cursor, aider, copilot showing nothing? where is their data?
> I want a prompt that has ALL this information so I can send it to another AI to analyze and tell us how to fix the parsers

## Problem Statement

DeskFlow's AI Agent sync system has 8 registered parser plugins. Only 3 (OpenCode, Gemini CLI, Codex CLI) successfully detect and parse data. The remaining 5 (Claude Code, Qwen CLI, KiloCode, Cursor AI, Aider) show "nothing" — no sessions detected, even though their underlying data directories exist on disk. GitHub Copilot has no parser at all.

The user needs each parser analyzed against the actual on-disk data format, with clear root-cause identification and a specific code fix for each. The user is frustrated because the parsers were built from public documentation / assumptions, not from the actual data files on their machine.

## Context

All research data is in `agent/docs/ai-parsers-training/CONTEXT_BUNDLE.md`. Read it first. It contains:
- The exact parser code for each plugin (line numbers from `src/main.ts`)
- The actual data format found on disk for each tool
- Exact JSONL structures, SQLite schemas, and directory layouts
- The sync pipeline architecture (detect → parseDir → parse → save)
- Cache invalidation logic that may cause skips

## The Mandate

**Analyze ALL 8 parser plugins plus the missing Copilot plugin. For each, determine:**
1. **Root cause** — Why does it show no data? Is it detection, file format mismatch, permission, or cache?
2. **Exact code fix** — What specific lines in `src/main.ts` need to change, and to what?
3. **If no data exists** — State clearly that the tool isn't installed / has no data on this machine

### Data Processing Analysis (Engineering Task)

For each parser, trace the data pipeline:

1. **Detection** (`plugin.detect()`):
   - Does the expected directory/file exist at the expected path?
   - If not, what's the correct path?
   - ❗ Cache issue: After the first run, `getDirDataSignature()` caches the result. If the first run found 0 files (broken detection) and saved that state, subsequent runs skip the plugin entirely. Is this happening?

2. **File discovery** (`plugin.parseDir()`):
   - Does the walker find the right files with the right extensions?
   - Does it handle both files and subdirectories correctly?
   - Does `RELEVANT_EXTS` include the correct extensions?

3. **File parsing** (`plugin.parse()`):
   - What structure does the parser expect?
   - What structure does the actual data have?
   - Where does the mismatch occur — field name, nesting level, type check?

4. **Token extraction**:
   - Where are the token counts stored in the actual data?
   - Does the parser look in the right place with the right field names?

### Fix Specification (Design Task)

For each broken parser, specify the exact code fix:

- **Lines to change**: Exact line numbers in `src/main.ts`
- **Field name mapping**: Old field → Actual field
- **Nesting fix**: How the access path needs to change
- **Edge cases**: What happens when a field is missing, null, or zero
- **Session grouping**: How to correctly group lines into sessions
- **Model extraction**: Where the model name lives in the data

### Constraints

1. Must work with Node.js better-sqlite3 for SQLite plugins
2. Must handle locked files (KiloCode EACCES) gracefully
3. Must not break existing working parsers (OpenCode, Codex, Gemini)
4. Must handle zero-token entries (Claude Code synthetic model)
5. Must not produce NaN or Infinity for token counts
6. Must use the existing `PARSED_SESSION` interface — no new fields
7. Must yield every 10 files to prevent UI freeze (already implemented in some parsers)
8. Must handle file encoding: UTF-8 with BOM, mixed line endings, binary corruptions

## Response Format

Return your analysis as a structured markdown document:

```markdown
## Parser: [name]

### Current Status
- detect(): ✅/❌ — [why]
- parseDir(): ✅/❌ — [why]
- parse(): ✅/❌ — [why]

### Root Cause
[2-3 sentences explaining the exact mismatch]

### Actual Data Format
```json
[Example of actual JSONL/JSON structure]
```

### Parser Expectation
```json
[What the parser code expects]
```

### Fix
- **File**: `src/main.ts`, line[s] X-Y
- **Change**: [exact code change description]
- **Before**: [current code snippet]
- **After**: [fixed code snippet]
- **Edge cases**: [what to watch for]
```

Repeat for each parser. End with a summary table.

## Summary Table

| Plugin | detect() | Has Data? | Root Cause | Fix Complexity |
|--------|----------|-----------|------------|----------------|
| Claude Code | ✅ | ✅ | ... | ... |
| Qwen | ✅ | ✅ | ... | ... |
| KiloCode | ✅ | ✅ | ... | ... |
| Cursor | ? | ? | ... | ... |
| Aider | ❌ | ❌ | ... | ... |
| Gemini | ✅ | ? | ... | ... |
| GitHub Copilot | N/A | N/A | ... | ... |
