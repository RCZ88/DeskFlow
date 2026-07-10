# Diagnosis: "Node ... is missing its \"::: grounding\" block" (even though you wrote one)

## TL;DR
This is **not** a stale/out-of-date compiler. It's a real bug in `parseLessonMarkdown.ts` that I reproduced, root-caused, and fixed. It only shows up on nodes where **an earlier `:::` block in the same node is missing its closing `:::` line** — most often a `::: callout` or `::: quiz` right before the grounding block.

---

## The mechanism (confirmed by reproduction)

The compiler finds directive blocks with two regexes:
- opening: a line that looks like `::: something`
- closing: a bare line that is just `:::`

It tracks nesting with a `depth` counter so that a `::: layer` can legally contain other `:::` blocks inside it. The bug: **if you forget the closing `:::` on some block, the parser doesn't know that** — it just keeps reading lines into that block's content, and depth *never comes back down to 0*. Since your `::: grounding ... :::` block also starts with `::: word`, the parser sees it as **another block nested inside the broken one**, not as its own top-level grounding block. So:

- Your grounding text is physically in the file.
- The compiler never registers it as *the node's* grounding, because it got swallowed as content of the earlier unclosed block.
- You get the misleading error "missing its grounding block" — pointing at the *symptom*, not the *cause*.

I reproduced this exactly and got your identical error text/line number from this minimal input:

```
# The Memory Hierarchy
@mastery L2

The memory hierarchy explains why caches exist.

::: callout info
A cache miss can be ~100x slower than a hit.

::: grounding
includes: memory hierarchy scope
know: cache misses are slow [s1]
source: s1 | Title | https://example.com
:::
```

→ `Line 17: Node "The Memory Hierarchy" is missing its "::: grounding" block (required).`

Notice: the `::: callout info` block above never got its own closing `:::` before the grounding block starts. That's the whole bug.

## The fix I applied
I patched `parseBlocks()` in `src/services/learn/parseLessonMarkdown.ts` so that if a `:::` block never finds its matching closing line, the compiler now throws **immediately, at the real location**, instead of silently swallowing everything after it:

```
Unclosed "::: callout" block: never found its matching ":::" closing line.
Add a bare ":::" line right after this block's content.
(An unclosed block silently swallows everything after it in the node,
including a later "::: grounding" block.)
```

I verified the fix two ways:
1. Re-ran the exact repro above → now correctly reports `Unclosed "::: callout" block` at the real opening line, instead of the misleading grounding error.
2. Re-ran the full compiler acceptance test (`src/__lmd_verify.ts`, 13 nodes / every block type) → still **29/29 passing**, so nothing else broke.

From now on, this whole bug class will point you straight at the actual broken block instead of a confusing downstream symptom.

---

## What to do about your *current* lesson right now
Go to **"The Memory Hierarchy"** node in your `.lmd` source and look for any `:::` block **before** the `::: grounding` block — most likely a `::: callout`, `::: quiz`, or `::: layer` — that is missing its closing `:::` line. Add the missing bare `:::` on its own line right after that block's content, and the grounding block right after it will be picked up correctly.

Quick way to sanity-check any node: every opening `::: word` line must have exactly one matching bare `:::` line closing it, in order. If you count them, opens and closes should match 1:1 within the node.

## Grounding block syntax reference (for when it really is just missing)
If the block truly isn't there at all, here's the required shape:

```
::: grounding
includes: One sentence on what this node covers.
excludes: thing out of scope; another thing
know: A factual claim the learner must understand. [src1]
know: Another claim (defaults to the first source if no [id] given).
source: src1 | Human-readable title | https://canonical-url
misconception: common wrong belief | the correction
:::
```
Required at minimum: one `know:` line, one `includes:` line, and one `source:` line. `excludes:` and `misconception:` are optional.

## One more thing worth knowing
The **"Master Prompt"** in your North Star page (the one that outputs the 9-section lesson: Big Picture → First-principles → ... → Going deeper) is a *different, older* teaching-style prompt — it never asks the model to write `.lmd` syntax at all (no frontmatter, no `@mastery`, no `::: grounding`). If content generated from that prompt is ever pasted into the `.lmd` importer, you'd get frontmatter/heading errors, not just a grounding error. Since your error is specifically and only about grounding on one node, that's not what happened here — this was the unclosed-block bug above. But flagging it in case you ever cross the two workflows: use the **`.lmd` author prompt** from `LYCEUM_LESSON_FORGE.md` / `BUILD-PACKET-v2-lyceum.md` when your target is the importer, and the North Star "Master Prompt" only for plain-chat tutoring.
