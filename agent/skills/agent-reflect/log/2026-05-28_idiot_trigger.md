# Idiot Trigger — 2026-05-28

## What happened
User asked to update the README with new features. I rewrote the entire 568-line file instead of making targeted surgical edits.

## Root cause
Used `write` tool instead of `edit` tool. Treating "update README" as "regenerate from scratch" when the correct approach is to read the existing file and make minimal changes.

## Fix
For README updates: always use `edit` to add rows/sections. Never `write` the full file unless the user explicitly says "rewrite" or "replace".
