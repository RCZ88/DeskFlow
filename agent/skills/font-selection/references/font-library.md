# Font Pairing Library

Every entry below is a real, tested pairing — not a name picked because it "sounds modern."
Each has a stated reason the two faces work together (contrast type, x-height match, weight
range, purpose) and a stated reason NOT to use it. Match the brief's mood tags to a pairing;
don't invent a pairing from font names alone.

**Generic tells to avoid by default** (per the frontend-design skill's calibration section):
Inter / Poppins / Montserrat / Roboto / Open Sans used as the *heading* face, and the
"warm-cream background + high-contrast serif + terracotta accent" combo. These aren't banned —
sometimes they're correct — but using them requires a reason, not default momentum.

---

### 1. `technical-precision`
- **Mood tags:** technical, developer tool, SaaS, dashboard, AI/ML product
- **Heading:** Space Grotesk, 500–700
- **Body:** IBM Plex Sans, 400–500
- **Mono:** JetBrains Mono
- **Why they work:** Space Grotesk's squared terminals and slightly irregular proportions read
  as engineered/precise without tipping into playful. IBM Plex Sans is hinted for long-form UI
  reading at small sizes. Both have full weight ranges so the type scale doesn't run out at
  the extremes.
- **Avoid if:** the brief wants warmth over precision, or the UI is already dark + neon (Space
  Grotesk can read cold there — use `expressive-grotesque` instead).
- **Fits:** dev dashboards, agent/terminal tools, technical docs.

### 2. `engineered-system`
- **Mood tags:** enterprise, technical, trustworthy, documentation, multi-language
- **Heading:** IBM Plex Sans, 600–700
- **Body:** IBM Plex Sans, 400
- **Mono:** IBM Plex Mono
- **Why they work:** one coherent superfamily across sans/serif/mono/scripts — heading and body
  never fight. Hierarchy comes from weight and size, not a second family. Safer if the product
  will need Cyrillic/Thai/CJK later.
- **Avoid if:** the brief wants a distinctive display personality — this pairing is deliberately quiet.

### 3. `quiet-editorial`
- **Mood tags:** editorial, blog, long-form, premium, calm
- **Heading:** Newsreader, 500 (italic for emphasis)
- **Body:** Source Serif 4, 400
- **Why they work:** Newsreader is drawn for on-screen reading at display sizes; Source Serif 4
  is optically tuned for body copy so paragraphs don't feel heavy at 16–18px. Two related but
  distinct serifs avoid the monotony of one serif doing every job.
- **Avoid if:** this is literally the "cream background + high-contrast serif" pattern flagged
  as an overused AI tell — only use it as a deliberate, justified choice, and don't also reach
  for warm-cream + terracotta on top of it.

### 4. `expressive-grotesque`
- **Mood tags:** playful, consumer, youthful, distinctive
- **Heading:** Bricolage Grotesque, 600–800 (display optical size)
- **Body:** Hanken Grotesk, 400–500
- **Why they work:** Bricolage's display cut has irregular, hand-adjusted letterforms that read
  as designed, not templated. Hanken Grotesk is neutral enough to disappear at body size and
  let the heading carry the personality.
- **Avoid if:** the brief is serious/enterprise/financial.

### 5. `elegant-restraint`
- **Mood tags:** premium, luxury, fashion, minimal-with-personality
- **Heading:** Instrument Serif, 400 (lean on the italic as an accent style)
- **Body:** Work Sans, 400
- **Why they work:** a serif/sans pairing in the same quiet register, instead of "loud display
  serif + safe sans." Instrument Serif's italic is unusually elegant and works as an accent,
  not a whole heading system — reads intentional rather than default-elegant.
- **Avoid if:** you need many heading weights/sizes — this is a single-purpose display face
  with a narrow weight range.

### 6. `structured-data`
- **Mood tags:** dashboard, data-dense, fintech, analytics, tables and numbers
- **Heading:** Archivo, 600–700
- **Body:** Public Sans, 400
- **Mono:** Spline Sans Mono (numerals, timestamps, IDs)
- **Why they work:** Archivo has strong tabular figures and holds up small in dense UI; Public
  Sans (built for US government digital services) is stress-tested for legibility in
  data-heavy interfaces. The mono face keeps numeric columns aligned.
- **Avoid if:** the brief wants warmth over legibility-first design.

### 7. `experimental-signal`
- **Mood tags:** experimental, brutalist, creative tool, bold statement, portfolio
- **Heading:** Unbounded, 700–900 (or Syne, 700, for a more variable feel)
- **Body:** Work Sans or Archivo, 400
- **Why they work:** the boldness is spent in exactly one place — per the "spend your boldness
  in one place" principle, this face should appear only in the hero headline or the one
  signature element, never at body size.
- **Avoid if:** you're tempted to use it throughout the page instead of as a single accent —
  that's the fastest way to look amateurish, not bold.

### 8. `warm-approachable`
- **Mood tags:** friendly, education, consumer app, onboarding-heavy
- **Heading:** Schibsted Grotesk, 600
- **Body:** Plus Jakarta Sans, 400
- **Why they work:** both have generous x-heights and open apertures that read approachable
  without being cutesy. Schibsted Grotesk's slightly rounded terminals soften the geometry
  just enough for education/consumer contexts.
- **Avoid if:** the brief needs a technical or serious tone.

### 9. `precise-mono-forward`
- **Mood tags:** terminal, code-first product, CLI tool, developer-facing
- **Heading:** JetBrains Mono, 600–700 (used for headings too, not just code)
- **Body:** Inter, 400 — the one place Inter earns its keep, since it disappears next to a
  mono-led identity
- **Mono:** JetBrains Mono
- **Why they work:** for products where the terminal/code IS the brand, leaning into mono for
  headings is a deliberate, coherent choice — the opposite of mono-only-in-code-blocks plus a
  generic sans everywhere else.
- **Avoid if:** you need long paragraphs at heading weight in mono — fatiguing past a few words.

### 10. `classic-authority`
- **Mood tags:** legal, finance, institutional, formal report
- **Heading:** Libre Caslon Text, 700 (or Source Serif 4, 700)
- **Body:** Source Serif 4, 400 (or Public Sans, 400, for screen-first legibility)
- **Why they work:** Caslon-derived faces carry institutional authority without reaching for
  Times New Roman. Pairing with a screen-optimized body face (rather than serif-on-serif) keeps
  long paragraphs readable on screen.
- **Avoid if:** the brief is for a startup/consumer product — this reads too formal/dated there.

---

## Selection rule

1. Pull 2–4 mood tags out of the brief (technical? playful? premium? data-dense? terminal-led?).
2. Shortlist every pairing whose tags overlap. If nothing overlaps, don't force-fit — say so and
   propose a new pairing using the same "why they work / avoid if" structure, then add it here.
3. Never shortlist only the safest option. Include at least one pairing with real character
   alongside the safe one, so the visual check in SKILL.md has something to actually compare.
4. Two pairings should never both use a font from the same "generic tells" list above.
