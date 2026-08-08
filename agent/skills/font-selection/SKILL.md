---
name: font-selection
description: Use whenever choosing fonts/typography for a UI, landing page, document, or brand — not just when the user says "fonts." Trigger on any frontend-design, mockup, or branding task where a typeface decision is being made. Solves the specific failure where an LLM picks a font by name-association (whatever co-occurred most in training data — Inter, Poppins, Montserrat) instead of by actual visual fit, because the model has no way to *see* a font from its name alone. Grounds the choice in a curated, tested pairing library, then closes the loop by rendering real candidates with the project's actual copy and colors so the fit gets checked visually — by the model if it has screenshot/vision tools, by the human otherwise — instead of committed to blind.
license: Complete terms in LICENSE.txt
---

# Font Selection

## The problem this solves

An LLM choosing a font is choosing a *name*, not a *look*. It has no direct perception of
x-height, contrast, weight distribution, or how a face sits next to a specific color and a
specific layout — it only has text co-occurrence, which is why the same handful of fonts
(Inter, Poppins, Montserrat) show up on almost everything an LLM designs, regardless of brief.
That's not a taste problem, it's a grounding problem, and it doesn't get fixed by "trying
harder" to pick a good font. It gets fixed by not relying on the guess in the first place.

This skill has three layers, used in order:

1. **A curated library narrows the guess.** `references/font-library.md` has real, tested
   pairings tagged by mood, each with a stated reason it works and a stated reason not to use
   it. Match the brief to tags — don't invent a pairing from font names alone.
2. **A render-and-look loop checks the guess.** `scripts/build_preview.py` renders 2–4
   shortlisted candidates with the project's *actual* headline, body copy, button, and colors
   into one HTML file — never generic lorem ipsum swatches. If the current environment has a
   way to screenshot and view that render (computer-use `view` on a screenshot, a browser tool),
   use it and self-critique before committing. This is the step most setups skip, and it's the
   one that actually closes the loop between "picked a name" and "looks right."
3. **The human gets final say when it's worth their attention**, not on every decision. Surface
   the same rendered HTML as the confirmation step for anything public-facing or brand-defining.
   For low-stakes internal UI, it's fine to pick the best-fitting library candidate and move on
   — reserve the human's attention for calls where a bad pick actually costs something.

Skipping straight to step 3 every time isn't the fix either — it just moves the same
ungrounded guess one level up (now you're generating three ungrounded guesses instead of one)
and doesn't scale across a portfolio of projects. Step 1 is what makes step 2 and 3 worth doing.

## Workflow

### 1. Extract mood tags from the brief

Pull 2–4 concrete tags out of the brief or the project's existing context: is it technical?
playful? premium? data-dense? terminal/code-led? consumer-facing or internal tooling? If the
brief doesn't say, infer from what the product actually does (check memory / prior project
context if available) rather than defaulting to the safest possible read.

### 2. Shortlist from the library — don't invent from scratch

Open `references/font-library.md`. Pick every pairing whose tags overlap. If genuinely nothing
fits, propose a new pairing using the same "why they work / avoid if" format the library uses,
and add it back to the file for next time — don't just reach for a name that sounds right.

Rules while shortlisting:
- Include at least one pairing with real character alongside the safe option — a shortlist of
  three safe options isn't a real choice.
- Never shortlist two pairings that both lean on a "generic tell" face (see the library's top
  section) for the heading role.
- Cap the shortlist at 3–4. More than that isn't a comparison, it's a wall of options nobody
  will actually evaluate.

### 3. Render it with real content

Build a small JSON config with the project's *actual* headline, subhead, one real paragraph of
body copy, the real button label, and the real background/text/accent colors (pull these from
the existing design tokens if the project has them). Do not use lorem ipsum — the whole point is
checking fit against real content, and placeholder copy hides mismatches real copy would expose.

```bash
python3 scripts/build_preview.py --config candidates.json --out preview.html
```

See the docstring in `build_preview.py` for the exact config shape.

### 4. Check the render before committing

- **If a screenshot/vision path is available** (computer-use screenshot + `view`, a browser
  tool, or any way to actually see the rendered HTML): render it, look at it, and eliminate
  candidates that fail on legibility at body size, personality mismatch with the brief, weak
  hierarchy/contrast, or a clash with the existing palette. Don't rubber-stamp the first
  candidate — the reason for this step is to catch what step 1 and 2 can't, so actually apply
  the checklist before picking.
- **If no visual path is available in the current environment:** don't guess blind. Hand the
  rendered HTML to the user (as an artifact, a file, or however this environment surfaces files)
  and let them pick. This is the honest fallback, not a last resort to avoid — an ungrounded
  guess is worse than asking.

### 5. Ship the implementation, not just the decision

Once a pairing is chosen, output the concrete drop-in: the Google Fonts `<link>` or `@import`,
and CSS custom properties for the font tokens (e.g. `--font-heading`, `--font-body`,
`--font-mono`) so the choice becomes code immediately rather than sitting as a description.

## Notes for recurring projects

If this fires repeatedly for the same project, keep the chosen tokens consistent rather than
re-deriving them each time — check whatever the project already has (CSS variables, a theme
file, prior artifacts) before running the full workflow again. This skill is for making *and
re-checking* a typography decision, not for silently overriding one that already shipped.
