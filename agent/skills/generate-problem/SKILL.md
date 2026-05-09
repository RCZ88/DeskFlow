```yaml
---
name: generate-problem
description: Generates prompts for external AI (Claude Code, Qwen, GPT) with option to remember context check. Creates prompts that fit the project structure without redesign.
allowed-tools: Read, Write, Glob, Grep
prerequisites: Read agent/state.md first
notes: |
  - Generates prompts for external AI tools (Claude Code, Qwen, Cursor, etc.)
  - Always asks user if this is a new chat or existing chat
  - Reminds user to attach project context (state.md) for existing chats
  - Option to not remind again (stores preference)
  - Code line counter shows estimated changes
---

# 📝 Generate Problem for External AI

## What This Skill Does

1. **Gather context** - Read state.md to understand current project status
2. **Ask clarification** - Determine if new chat or existing chat
3. **Generate prompt** - Create prompt that fits existing codebase
4. **Show estimate** - Display expected lines of code changes
5. **Store preference** - Remember "don't remind me" if user chooses

## When to Activate

Activate when user says:
- "generate a prompt for..."
- "create a prompt for..."
- "write a prompt for..."
- "make a prompt for external AI"
- "generate problem"
- "create bug report for..."
- Any task involving generating a prompt for external AI

## Input Needed

The user should provide:
1. **What they want** - Feature or bug description
2. **Target chat** - New chat or existing chat?
3. **Files involved** - Which files should be modified
4. **Context level** - Full context or minimal?

## Output Generated

- Prompt suitable for external AI
- Code line estimate (ranges)
- Reminder about context (for existing chats)
- Optional: Code patterns from similar features

## ⚠️ IMPORTANT: Context Reminder

**For EXISTING chats (project history):**
The AI won't have fresh context of what's implemented. You MUST remind the user to:
- Attach `agent/state.md` to the chat
- Or reference specific existing code patterns

**For NEW chats:**
Full project context should be available via graphify, but user should still verify.

## Preference Storage

If user says "don't remind me again":
- Store in `agent/skills/generate-problem/.preferences`
- Skip reminder on future uses