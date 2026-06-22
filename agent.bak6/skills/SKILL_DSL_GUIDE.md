# Skill DSL Language Guide

The Skill DSL is a YAML frontmatter-based language that lets skill authors declare interactive UI controls — dropdowns, text inputs, textareas, sliders, toggles, file selectors, tags — that the app renders as dynamic form components.

---

## Quick Start

Add `inputs` to your SKILL.md frontmatter with `type` and optionally `widget`, `choices`, `default`:

```yaml
---
id: my-skill
name: My Skill
category: development
inputs:
  - name: Framework
    type: enum
    choices: [react, vue, svelte]
    default: react
    required: true
  - name: Max Lines
    type: number
    min: 10
    max: 500
    step: 10
    default: 100
---
```

---

## Type → Widget Mapping

When `widget` is not set, the system infers it from `type`:

| `type` | Auto `widget` | Override with |
|--------|---------------|---------------|
| `enum` | `select` | `widget: radio` |
| `multienum` | `tags` | `widget: checkbox` |
| `boolean` | `switch` | `widget: checkbox` |
| `number` (with min/max) | `slider` | `widget: text` |
| `number` (no min/max) | `text` | `widget: slider` |
| `text` | `text` | — |
| `textarea` | `textarea` | — |
| `code` | `code` | — |
| `file` | `file` | — |
| `markdown` | `textarea` | — |
| `list` | `tags` | — |

---

## All Fields Reference

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `name` | string | ✅ | — | Display label for the input |
| `type` | string | ✅ | `text` | Data type: text, textarea, enum, boolean, number, file, code, markdown, list, multienum |
| `widget` | string | ❌ | inferred | UI control: select, radio, switch, slider, text, textarea, code, file, checkbox, tags |
| `choices` | string[] | for enum/multienum | — | Selectable options |
| `default` | any | ❌ | — | Initial value |
| `description` | string | ❌ | — | Help text shown below the control |
| `required` | boolean | ❌ | false | Shows `*` indicator and validates presence |
| `placeholder` | string | ❌ | — | Placeholder text for empty inputs |
| `source` | string | ❌ | — | Who provides this: user, system, agent |
| `min` | number | ❌ | — | Minimum value (number/slider) |
| `max` | number | ❌ | — | Maximum value (number/slider) |
| `step` | number | ❌ | 1 | Step increment (number/slider) |
| `validation` | string | ❌ | — | Regex pattern for validation |
| `validationMessage` | string | ❌ | — | Error message when validation fails |
| `group` | string | ❌ | — | Group name for visual grouping |
| `language` | string | ❌ | — | Language hint for type: code |

---

## Output Fields

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `name` | string | ✅ | — | Output label |
| `type` | string | ✅ | `text` | Data type of the output |
| `description` | string | ❌ | — | What the output contains |
| `preview` | boolean | ❌ | false | Whether to show inline preview |

---

## Complete Example

```yaml
---
id: deep-research
name: Deep Research
category: research
inputs:
  - name: Research Topic
    type: text
    required: true
    placeholder: Enter topic or question...
    group: Query

  - name: Depth Level
    type: enum
    choices:
      - surface
      - standard
      - deep
    default: standard
    description: How thorough the investigation should be
    group: Query

  - name: Max Sources
    type: number
    min: 3
    max: 50
    step: 1
    default: 10
    group: Parameters

  - name: Include Code Examples
    type: boolean
    default: false
    group: Parameters

  - name: Research Domains
    type: multienum
    choices: [academic, technical, news, social, documentation]
    default: [technical, documentation]
    group: Scope

  - name: System Prompt Additions
    type: textarea
    placeholder: Extra instructions for the researcher...
    group: Advanced

  - name: Excluded Terms
    type: list
    placeholder: Add term...
    group: Scope

outputs:
  - name: Research Report
    type: markdown
    description: Comprehensive research findings
    preview: true
  - name: Source List
    type: list
    description: All referenced sources with URLs
  - name: Key Findings
    type: list
    description: Bullet-point summary of discoveries
---
```

---

## Migration Guide

Existing SKILL.md files work without changes — all new fields are optional. To upgrade:

**1. Replace description-embedded choices** with explicit `choices` array:
```yaml
# BEFORE:
- name: Depth Level
  type: enum
  description: How deep to investigate (surface, standard, deep)

# AFTER:
- name: Depth Level
  type: enum
  choices: [surface, standard, deep]
  default: standard
  description: How deep to investigate
```

**2. Add `widget` overrides** only when you want non-default UI:
```yaml
- name: Style
  type: enum
  choices: [minimal, standard, detailed]
  widget: radio   # override default select
```

**3. Add `group`** to organize related inputs visually.

**4. Add `validation`** for custom rules:
```yaml
- name: API Key
  type: text
  validation: ^sk-[a-zA-Z0-9]{32,}$
  validationMessage: Must be a valid API key starting with sk-
```

---

## YAML List Syntax

Use either inline or indented format for choices:

```yaml
# Inline:
choices: [surface, standard, deep]

# Indented:
choices:
  - surface
  - standard
  - deep
```

Both are valid. The parser handles both formats.
