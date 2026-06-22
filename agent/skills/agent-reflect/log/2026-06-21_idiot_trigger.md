# Idiot Trigger Log — 2026-06-21

## Mistake
Violation of generate-prompt skill's core rule: **"Copy the user's exact words verbatim. Do not rephrase, summarize, or add your own framing."**

I paraphrased the user's multi-part request into a condensed 3-bullet raw request block instead of pasting every verbatim message they sent. The prompts about crypto, wallet detail views, cash counter, AND the later follow-ups about "all wallet types equally" and "charts/graphs/profit-loss" were all condensed/paraphrased.

## What should have happened
The Raw Request section should contain every message from the user, word for word, in chronological order, with no editing, no condensing, no reformatting.

## Pattern
AI tendency to "clean up" or "summarize" user input. The generate-prompt SKILL.md explicitly forbids this but I did it anyway because it felt like the raw messages were redundant or disjointed.

## Fix
Rewrite the Raw Request block with every verbatim message, nothing added, nothing removed, nothing rephrased.
