# SKILL: Content Format Validator (The 30-Second Gate)

## 1. THE PROBLEM (Acknowledged)

Good ideas become bad videos not because the idea is wrong, but because the **format** is wrong.

- You have a strong insight (SVM learning framework)
- You try to film it as "explain the insight"
- It becomes 3+ minutes of context → explanation → payoff
- You iterate hooks, pacing, cuts — but the core structure is long-form trapped in a short-form container
- Result: 1.5 hours invested, multiple takes, zero usable output

**Root cause:** There is no validation gate between "I have an idea" and "I hit record."

## 2. THE CONSTRAINT (No Audience Privilege)

- No fanbase = no forgiveness for boring
- No credibility = every second must earn the viewer's attention
- No luxury of "it gets good at 0:45"
- **Rule:** If it cannot be understood in 3 seconds and valued in 8 seconds, it does not ship.

## 3. THE VALIDATOR (3 Gates — Pass/Fail)

Before recording, the idea MUST pass all three gates. If it fails any gate, do NOT film. Pivot the format or kill the idea.

### Gate 1: The Scroll-Stop Test (0:00–0:03)
- Can the hook be said in **one breath** (3–6 words)?
- Does it name a **specific pain** or **specific promise**?
- Would a stranger stop scrolling based on text alone, before seeing your face?

**Fail examples:**
- "A whole year of learning machine learning taught me this framework" → Too long. Too much setup.
- "Build it wrong first" → No context. Vague.
- "The framework no one teaches" → Abstract. No pain.

**Pass examples:**
- "3 mistakes killing your ML progress" → Number + pain + specificity.
- "Your AI is bleeding money" → Direct + financial stakes.
- "Stop copying sklearn code" → Direct command + exact behavior.

### Gate 2: The Hard-Cut Test (0:03–0:30)
- Can the entire video be told in **3 to 5 visual frames**?
- Does each frame contain **only one claim**?
- Are there **zero transitions** that require explanation? (No "So basically...", "What I mean is...", "To understand this...")

**Frame structure:**
```
Frame 1: Hook (text card or face + text overlay)
Frame 2: The Problem (visual proof — code, graph, screen recording)
Frame 3: The Mechanism (diagram, comparison, transformation)
Frame 4: The Fix (before/after, green check, working demo)
Frame 5: CTA (text card — save, follow, repo)
```

**Fail signs:**
- You find yourself saying "And another thing..." → That's a second video.
- You need to explain background before showing the proof → Format is wrong.
- The visual asset is "me talking while showing a notebook" → Not a frame. That's a lecture.

### Gate 3: The Asset-Before-Record Test
- Is the visual for Frame 2 **already created** before you turn on the camera?
- Is the visual for Frame 3 **already created**?
- If the answer is "I'll make it while editing," the video will fail.

**Rule:** You do not hit record until the visual assets are done. The visual drives the script, not the other way around.

## 4. FORMAT TAXONOMY (What Actually Works)

Not every idea fits short-form. Match the idea to the correct format BEFORE filming.

| Format | Structure | Best For | Max Length |
|---|---|---|---|
| **The Listicle** | Hook + 3 items + CTA | Mistakes, tips, steps, tools | 30–40s |
| **The Proof-First** | Hook + shocking proof + mechanism + CTA | Security flaws, bugs, leaks, hacks | 25–35s |
| **The Before/After** | Hook + broken state + fixed state + how | Refactors, optimizations, setups | 30–40s |
| **The Single Insight** | Hook + one diagram + one explanation + CTA | Math concepts, one-line tricks | 20–30s |
| **The Story** | Hook + problem + struggle + solution + CTA | Personal journey, career, lessons | 45–60s (risky) |
| **The Reaction** | Hook + original clip + your reaction + verdict | Reviews, opinions, hot takes | 30–45s |

**Banned formats (for current audience level):**
- The Framework Explanation (requires too much buy-in)
- The Tutorial (requires too much retention)
- The Series Episode (requires prior context)
- The Deep Dive (requires audience trust)

## 5. OUTPUT RULE FOR AI (Self-Correction)

When generating content support, the AI MUST:

1. **Never output bullet points as "things to say."** Bullet points force the user to write transitions, which creates length.
2. **Always output FRAMES.** Each frame = one visual + one line of dialogue (max 8 words).
3. **Never suggest "context first."** Context is death in short-form. Proof first, mechanism second, context never.
4. **Always enforce the 3-gate check explicitly.** State which gates the idea passes or fails.
5. **Never suggest a video longer than 45 seconds** unless the user explicitly requests long-form.

## 6. RETROACTIVE ANALYSIS: SVM Framework Video

**The Idea:** "Build from scratch before using libraries" → **Good idea.**

**Gate 1 (Scroll-Stop):** FAILED.
- Original hooks were abstract ("Build it wrong first") or too long ("A whole year...").
- Fix: "3 mistakes killing your ML progress" → PASSES.

**Gate 2 (Hard-Cut):** FAILED.
- The framework has 4 stages. Each stage requires explanation. That's 4 frames minimum, plus hook, plus close. Too many.
- Fix: Convert to **The Listicle** — "3 mistakes" = 3 frames, one per mistake. No stage explanations needed.

**Gate 3 (Asset-Before-Record):** FAILED.
- The 4-stage flowchart did not exist before recording. You tried to describe it while filming.
- Fix: Pre-make the 3 visual proofs (notebook screenshot, math equation, logic→code flowchart).

**Verdict:** The idea was correct. The format was "Framework Explanation" (banned). The correct format is "The Listicle." Reframe and refilm.

## 7. THE "NO FILM UNTIL" CHECKLIST

Before every recording session, confirm:

- [ ] Hook is 3–6 words and names a specific pain
- [ ] Video fits 3–5 frames max
- [ ] Visual assets for Frame 2, 3, and 4 are already created
- [ ] No frame requires a transition longer than "Mistake two."
- [ ] Total estimated runtime is under 40 seconds
- [ ] The format is from the taxonomy (not a banned format)
- [ ] It is 10 PM or earlier

If any box is unchecked, do not film. Fix the format first.

## 8. WHY THIS MATTERS

The current workflow:
1. Have idea → 2. Try to film → 3. Realize it's long → 4. Iterate hooks → 5. Iterate cuts → 6. Still long → 7. Abandon or ship bad video

The validated workflow:
1. Have idea → 2. Run 3-gate validator → 3. Match to format taxonomy → 4. Create visual assets → 5. Film in 10 minutes → 6. Ship

**Goal:** Reduce the 10-20 mistake videos to 0. Every idea that passes the gate films once and ships.

---

**Enforcement:** This skill overrides all previous content generation instructions. When the user asks for a video, run the validator first. If the idea fails, say so and suggest the correct format reframing.
