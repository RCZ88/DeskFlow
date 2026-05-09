

```yaml
---
name: generate-prompt
description: Generates context-rich prompts that task the receiving AI with providing a definitive, high-fidelity engineering and design solution. 
allowed-tools: Read, Write, Glob, Grep, question
prerequisites: Read agent/state.md and relevant planning docs
notes: |
  - MUST update state.md BEFORE creating any prompt.
  - The prompt must demand a single, optimal solution—NOT a list of choices (A/B/C).
  - The receiving AI should provide high-fidelity specifications (logic, math, visuals).
```

# 📝 Generate Prompt for High-Fidelity Solutions

## Core Philosophy

**Request a design. Not a menu.**

The prompt you generate should equip the receiving AI with context and then task it with acting as the **Lead Designer and Engineer**. It should not provide "Options A, B, and C" for the user to pick from. Instead, it should demand a single, comprehensive, and well-reasoned solution that includes data-processing logic, visual specifications, and interaction design.

## MANDATORY: Before Creating Any Prompt

**STEP 0 — Update state.md first:**
1. Read current `state.md`.
2. Add entry: what problem is being solved, mark **IN PROGRESS**.
3. Then proceed.

## What to Gather

1. **Project context:** `agent/state.md`, `agent/context.md`, relevant `PLANNING.md`.
2. **Current implementation:** affected files, what exists, what's broken.
3. **Design system:** colors, components, patterns in use.
4. **Data layer:** How data is currently stored vs. how it needs to be processed.

## What the Generated Prompt Should Include

- **Problem statement:** What's wrong and why it matters to the user (e.g., "The data feels unprocessed and poorly showcased").
- **Engineering Task:** Specifically ask the AI to design the **Data Processing Pipeline** (e.g., aggregation math, smoothing logic, caching strategies).
- **Design Task:** Specifically ask for **High-Fidelity Visual Specs** (e.g., exact hex codes, pixel-level spacing, chart types, animation curves).
- **UX Task:** Specifically ask for the **Interaction Flow** (e.g., what happens on click, hover, and empty states).
- **Constraints:** Hard limits only (e.g., must work with existing API, must stay in this file).

## What the Generated Prompt Should NOT Include

- **Multiple options (Option A / B / C):** Do not ask the user to choose; ask the AI to design the *best* version.
- **Ambiguous outcomes:** Do not say "design something better"; say "design the technical and visual specifications for X."
- **Prescribed component structure:** Let the AI decide the architecture of the code.

## Output Format

Prompt should feel like a high-level technical brief:
- **Context:** The "Why" and the "Where."
- **The Mandate:** "Design a comprehensive solution for..."
- **Requirement Checklist:** Data processing, visual specs, and UX flow.

## Example Flow

1. **User:** "the charts on external page are bad."
2. **You:** [Update `state.md`]
3. **You:** [Read codebase and planning docs]
4. **You:** [Write prompt demanding a high-fidelity design → save to `agent/docs/.../prompt.md`]
5. **You:** "I have created a prompt that tasks the AI with designing a complete data-processing and visual overhaul for the charts. Send it to the AI to get the full design."
```

---

### Key Changes Made:
* **Removed the "Menu" approach:** Explicitly forbids generating Options A, B, and C.
* **Mandated Technical Logic:** Added a requirement to ask for the "Data Processing Pipeline" and the "math" behind the display.
* **High-Fidelity Visuals:** Changed the focus from "don't include pixel specs" to "ask the AI to *provide* pixel specs".
* **Lead Role:** Instructions now state the receiving AI must act as a **Lead Designer and Engineer**, owning the entire solution from logic to pixels.