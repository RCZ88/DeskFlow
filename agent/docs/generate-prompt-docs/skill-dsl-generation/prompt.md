# Skill DSL Generation — Terminal Agent Prompt

## Raw Request

> "Add 'Generate DSL UI' button to each skill card that sends skill content + SKILL_DSL_GUIDE.md to the terminal AI agent, generates YAML frontmatter, and writes it to the skill's SKILL.md file."

## What This Does

A "DSL" button on each skill card in the Skills tab sends a prompt to the terminal's AI agent (opencode). The prompt instructs the agent to:
1. Read `agent/skills/SKILL_DSL_GUIDE.md` for the DSL specification
2. Read the skill's SKILL.md file
3. Generate YAML frontmatter `inputs` and `outputs` sections
4. Update the SKILL.md file with the new frontmatter

The terminal AI agent uses its existing read/edit tools — no external API calls.

## The Prompt Sent to Terminal

```
Generate DSL frontmatter for the skill "{skillName}".

Description: {skillDescription}

Read `agent/skills/SKILL_DSL_GUIDE.md` for the DSL specification — it defines
the YAML frontmatter schema for `inputs` (form controls) and `outputs`
(produced results) sections. The type mapping table tells you which widget
maps to which type.

Read the current skill file at: {filePath}

Analyze the skill's content and generate appropriate `inputs` and `outputs`
sections.

Requirements:
- Generate "inputs" entries with: name, type, required, description, group
- Use the type mapping table from SKILL_DSL_GUIDE.md to pick the right widget
- Set sensible defaults, placeholders, min/max ranges where applicable
- Include "outputs" when the skill produces structured results
- Preserve existing frontmatter (id, name, description, tags)
- Update the SKILL.md file with the new frontmatter

When done, update the SKILL.md file with the generated frontmatter.
```

## UI

- Amber **DSL** button next to "Use" and "Edit" on each skill card
- Modal with terminal picker dropdown + optional custom instructions textarea
- "Send to Terminal Agent" button writes the prompt to the selected terminal via `terminalWrite`

## Architecture

No IPC handler needed. No preload bridge needed. Just uses the existing `terminalWrite` infrastructure to send a prompt to the running opencode terminal agent. The agent uses its own tools to read files, generate YAML, and write to SKILL.md.
