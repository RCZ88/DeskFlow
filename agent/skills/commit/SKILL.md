---
id: commit
name: Commit
category: git
applicable_to: [commits, git]
version: 1.0.0
created: 2026-04-19
tags: [git, commit, version-control]
---

# Commit Skill

## Purpose
Ensure all project changes are properly committed with complete changelog updates.

## Rules

### ALWAYS Commit ALL Files
When committing, ALWAYS use `git add -A` to stage ALL modified and untracked files. Never commit only partial files.

**CORRECT:**
```bash
git add -A
git commit -m "message"
```

**INCORRECT (NEVER DO THIS):**
```bash
git add file1.ts file2.ts
git commit -m "message"
```

## Workflow

### Before Making Code Changes
1. Commit all current changes first (backup point)
2. Use descriptive commit message

### After Making Code Changes
1. Run `git add -A` to stage ALL files
2. Update COMMITS.md with detailed changes
3. Commit with comprehensive message
4. Push to remote

## COMMITS.md Update Template

When updating COMMITS.md, include:
- Commit message
- Files modified
- Feature/fix description
- Breaking changes if any

## Example Complete Workflow

```bash
# 1. Stage ALL files
git add -A

# 2. Commit with message
git commit -m "feat: description of changes

- Change 1
- Change 2
- Change 3"

# 3. Push
git push
```

## Notes
- The `-A` flag stages ALL changes including deleted, modified, and new files
- Always update COMMITS.md for significant changes
- Use prefixes: feat:, fix:, chore:, refactor:, docs: