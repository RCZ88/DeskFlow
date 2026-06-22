# 🤖 Qwen Code Configuration

**Purpose:** Qwen-specific behavior, configuration, and best practices for DeskFlow.

**Version:** 1.2 (Updated for New Qwen CLI + Task-Specific Prompts)

---

## 🚨 CRITICAL: New Qwen CLI Instructions

### Qwen Version Notice
- **Current Version:** 0.1.4 (old, ~1 year)
- **Latest Version:** 0.2.6
- **Recommendation:** Consider upgrading for better features and performance

### Task-Specific Prompt Structure

For EVERY new task, use a DIFFERENT prompt based on task type:

---

### 1. 📚 Deep Research Agent (FIRST Priority for Research)

**When:** Researching technologies, analyzing codebases, architecture decisions

**Use:** `skills/deep-research-prompt.md`

**Prompt Template:**
```markdown
# Deep Research: [Topic]

## Context
[Why this research is needed]

## Research Questions
1. [Primary question]
2. [Secondary question]

## Scope
- **Include:** [What to cover]
- **Exclude:** [What to skip]
- **Depth:** [Shallow/Medium/Deep]

## Expected Deliverables
- [ ] Research report
- [ ] Comparison table
- [ ] Code examples
- [ ] Recommendations

## References
- Use: skills/deep-research-prompt.md
- Use: agent/context.md
- Use: agent/glossary.md
```

---

### 2. 💻 Implementation Agent (For Coding)

**When:** Adding features, fixing bugs, refactoring

**Use:** This file + `agent/patterns.md`

**Prompt Template:**
```markdown
# Implementation: [Task Name]

## Type
- [ ] Feature
- [ ] Bug Fix
- [ ] Refactoring

## Current State
[What exists now]

## Desired State
[What we want]

## Requirements
- [Requirement 1]
- [Requirement 2]

## Constraints
- Follow: agent/patterns.md
- Respect: agent/constraints.md
- Update: agent/state.md after completion

## Testing
- [ ] Build succeeds
- [ ] No console errors
- [ ] Feature works as expected
```

---

### 3. 🐛 Debug Agent (For Issues)

**When:** Investigating errors, fixing crashes

**Use:** `agent/debugging.md`

**Prompt Template:**
```markdown
# Debug: [Issue Description]

## Error
[Exact error message]

## When It Happens
[Steps to reproduce]

## Investigation
- [ ] Check agent/debugging.md
- [ ] Check agent/state.md for known issues
- [ ] Reproduce consistently
- [ ] Identify root cause

## Fix Plan
1. [Step 1]
2. [Step 2]

## Verification
- [ ] Error no longer occurs
- [ ] No regressions
- [ ] agent/state.md updated
```

---

### 4. 📝 Documentation Agent (For Docs)

**When:** Updating docs, creating guides

**Use:** This file + `agent/README.md`

**Prompt Template:**
```markdown
# Documentation: [Doc Name]

## Purpose
[Why this doc is needed]

## Audience
[Who will read this]

## Structure
1. [Section 1]
2. [Section 2]

## References
- Use: agent/README.md for structure
- Use: agent/glossary.md for terms
- Link to: Related docs
```

---

## 🎯 Agent Selection Priority

### Order of Preference:
1. **Deep Research Agent** - ALWAYS first for research
2. **Implementation Agent** - For coding tasks
3. **Debug Agent** - For fixing issues
4. **Documentation Agent** - For docs

### Quick Decision Tree:
```
Is this research? → Deep Research Agent (skills/deep-research-prompt.md)
Is this coding? → Implementation Agent (this file + patterns.md)
Is this debugging? → Debug Agent (debugging.md)
Is this documentation? → Documentation Agent (this file)
```

---

## 🎯 Qwen Behavior Rules

### General Behavior
- **Be concise** - Fewer than 3 lines of text per response when possible
- **Be direct** - Get straight to the action or answer
- **No chitchat** - Avoid conversational filler
- **English only** - Respond in English unless asked otherwise
- **Preserve artifacts** - Don't translate code, paths, or quoted text

### Tool Usage
- **Parallel calls** - Use multiple tool calls concurrently when independent
- **Read before write** - Always read a file before editing it
- **Exact text match** - Ensure old_string matches exactly (including whitespace)
- **Minimal edits** - Change only what's necessary
- **Verify changes** - Check file after editing to confirm

### Code Generation
- **Match existing style** - Follow the style of surrounding code
- **TypeScript first** - Use TypeScript features appropriately
- **React conventions** - Follow React + R3F patterns
- **Error handling** - Always handle errors, especially for Electron APIs

---

## 📁 Project-Specific Qwen Rules

### DeskFlow Project
- **Always check** `agent/state.md` before starting work
- **Always update** `agent/state.md` after completing changes
- **Update other markdown files** when the change affects them (see `agent/agents.md` → Documentation Update Rules)
- **Follow patterns** from `agent/patterns.md`
- **Respect constraints** from `agent/constraints.md`

### Mandatory Documentation After Every Change:
1. **`state.md`** — ALWAYS update with what changed, which files, why, and result
2. **`context.md`** — If architecture, tech stack, or project structure changed
3. **`patterns.md`** — If a new reusable code pattern was introduced
4. **`constraints.md`** — If new limitations or rules were discovered
5. **`prompts.md`** — If new prompt templates were created
6. **Verify build** — Run `npm run build` before considering work complete

### Electron + Three.js + React
- **Electron main/preload** - Use CommonJS (`dist-electron/*.cjs`)
- **React renderer** - Use ES modules, TypeScript
- **Three.js** - Use `@react-three/fiber` declarative patterns
- **Textures** - Use procedural canvas textures, not files

### Common Qwen Mistakes to Avoid
- **Don't reformat** unrelated code
- **Don't add comments** unless explaining complex logic
- **Don't change imports** without verifying they exist
- **Don't assume state** - always read current files
- **Don't skip testing** - verify builds succeed
- **Don't skip updating state.md** — this is a mandatory step after every change
- **Don't forget other markdown files** — update context.md, patterns.md, etc. when applicable

---

## 🔧 Qwen-Specific Workflows

### Fixing a Bug
```
1. Read agent/state.md
2. Read relevant source files
3. Identify root cause
4. Plan the fix
5. Make minimal change
6. Rebuild and test
7. Update agent/state.md (REQUIRED)
8. Update other docs if applicable
```

### Adding a Feature
```
1. Read agent/state.md
2. Read agent/patterns.md
3. Plan implementation
4. Implement incrementally
5. Test each step
6. Update agent/state.md (REQUIRED)
7. Update context.md if architecture changed
8. Update patterns.md if new pattern introduced
```

### Refactoring
```
1. Read agent/state.md
2. Understand current code
3. Plan refactor
4. Make small reversible changes
5. Test after each change
6. Update agent/state.md (REQUIRED)
7. Update patterns.md if improved
```

---

## ⚠️ Qwen-Specific Constraints

### Tool Limits
- **Read files** - Use `read_file` for specific files, `grep_search` for patterns
- **Edit carefully** - Use exact old_string with proper context
- **Build verification** - Always rebuild after code changes
- **No assumptions** - Read actual files, don't assume content

### Response Format
- **Code blocks** - Use proper TypeScript/TSX syntax
- **File paths** - Use full paths when referencing files
- **Commands** - Use `run_shell_command` for terminal operations
- **Status updates** - Keep them brief and actionable

---

## 📚 Quick Reference

| Situation | What to Do |
|-----------|-----------|
| Starting new task | Read agent/state.md first |
| Unsure about code | Read the actual file, don't guess |
| Making edits | Read file → Plan → Edit → Verify → **Update state.md** |
| After completion | **Update agent/state.md** + other relevant docs |
| Build errors | Read error → Fix → Rebuild |
| Runtime errors | Check console → Identify → Fix → **Update state.md** |
| New IPC endpoint | Add to state.md Reference section |
| New DB table | Add to state.md Data Schema section |

---

## 🔄 Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-04-04 | Initial creation |
| 1.1 | 2026-04-05 | Added mandatory documentation rules, updated workflows with doc steps |

---

**Last Updated:** 2026-04-05
**Maintained By:** AI Development Team
