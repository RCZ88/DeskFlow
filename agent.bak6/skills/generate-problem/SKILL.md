---
id: generate-problem
name: Generate Problem
category: debugging
applicable_to: [problems, external-ai]
version: 1.0.0
created: 2026-04-19
tags: [problems, prompts, external-ai]
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