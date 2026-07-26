# 📝 Skill DSL — Dynamic UI Generation from Skill Frontmatter

## Raw Request (Verbatim)

> what i mean by languange is like java python or somtehing, bt this one, is for like generating the components for the skill input for the user. those customization from text parsing
> just generate a prompt for the missing stuff. make sure the prompt covers everything. everything from the beginning, the logic, the regex or something that can parse the yaml or something so that it can be designing the html css or something along those lines, how does it read the language and stuff
> also, dont forget the guide on using the language so that other ai can create the customization using that new language properly

---

## Context

Read `agent/docs/skill-dsl-language/CONTEXT_BUNDLE.md` first. It contains:
- Current SkillIO/SkillComponent interfaces and their limitations
- The existing `parseFrontmatterList()` function (regex-based YAML parser)
- The GeneralistDialog component (read-only badge display)
- Real SKILL.md frontmatter examples (generate-prompt, deep-research)
- Existing UI form patterns (select, input, textarea, slider, toggle, checkbox)
- IPC endpoint for getSkills
- Design tokens and color palette
- 10 documented gaps

The target: **Electron + React + TypeScript + Tailwind v4** app, dark theme (zinc palette), Lucide React icons.

---

## The Mandate

Design a complete **DSL (Domain-Specific Language)** system that lives in SKILL.md YAML frontmatter and lets skill authors declare interactive UI controls — dropdowns, text inputs, textareas, sliders, toggles, file selectors — that the app then renders as actual form components.

This is a **three-layer system**:

### Layer 1 — Language Definition (The DSL)

Extend the existing YAML frontmatter schema for `inputs` with new fields. Each input item in the frontmatter should support:

```yaml
inputs:
  - name: Depth Level
    type: enum                    # data type
    widget: select                # UI control (optional — infer from type if missing)
    choices:                      # for enum types — the options
      - surface
      - standard
      - deep
    default: standard             # initial value
    description: How deep to investigate
    required: true
    placeholder: Pick a depth…    # placeholder text
    source: user                  # who provides this
    validation: ^(surface|standard|deep)$  # optional regex validation
```

**Supported `type` values** (data types):
- `text` — single-line string
- `textarea` — multi-line string (if no widget specified)
- `enum` — one of several choices
- `boolean` — true/false
- `number` — numeric value
- `file` — file path selector
- `code` — code snippet (language specified)
- `markdown` — rich text
- `list` — array of strings
- `multienum` — multiple choices from a list

**Supported `widget` values** (UI control hints):
- (none) — auto-detect from type
- `select` — dropdown `<select>`
- `radio` — radio button group
- `switch` — toggle switch (for boolean)
- `slider` — range slider (for number)
- `textarea` — multi-line text input
- `code` — monospace code editor
- `file` — file browser button
- `checkbox` — single checkbox (for boolean)
- `tags` — tag input for lists

**New fields on SkillIO:**
- `choices?: string[]` — valid options for enum/multienum types
- `widget?: string` — explicit UI control override
- `default?: any` — default value
- `placeholder?: string` — placeholder text
- `min?: number` — minimum (for number/slider)
- `max?: number` — maximum (for number/slider)
- `step?: number` — step size (for number/slider)
- `validation?: string` — regex pattern for validation
- `validationMessage?: string` — error message on validation fail
- `group?: string` — logical group name (for grouping related inputs)

**Also define an `outputs` extension** (outputs are display-only but should still declare structure):
```yaml
outputs:
  - name: Research Report
    type: markdown
    description: Comprehensive research findings document
    preview: true   # if true, show a preview of the output inline
```

### Layer 2 — The Parser (Reading the Language)

Create a **new standalone parser module** (not modifying the existing `parseFrontmatterList()`) that:

1. **Reads raw YAML frontmatter** from `---...---` blocks
2. **Parses extended fields** — `choices`, `widget`, `default`, `placeholder`, `min`, `max`, `step`, `validation`, `validationMessage`, `group`, `preview`
3. **Coerces types correctly:**
   - `choices: [a, b, c]` → `string[]`
   - `default: 5` → `number`
   - `default: true` → `boolean`
   - `validation: ^pattern$` → `string` (regex pattern)
4. **Validates the schema** — if `type: enum` has no `choices`, emit a warning but don't crash
5. **Infers widgets** when not explicitly specified:
   - `type: enum` → `widget: select`
   - `type: boolean` → `widget: switch`
   - `type: number` + `min` + `max` → `widget: slider`
   - `type: number` + no min/max → `widget: text` (number input)
   - `type: text` → `widget: text`
   - `type: textarea` → `widget: textarea`
   - `type: code` → `widget: code`
   - `type: file` → `widget: file`
   - `type: list` → `widget: tags`
   - `type: multienum` → `widget: tags` (with suggestions from choices)
6. **Returns a structured config** object:

```typescript
interface ParsedSkillInput extends SkillIO {
  choices?: string[];
  widget?: string;
  default?: any;
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
  validation?: string;
  validationMessage?: string;
  group?: string;
}

interface ParsedSkillOutput extends SkillIO {
  preview?: boolean;
}

interface ParsedSkillConfig {
  inputs: ParsedSkillInput[];
  outputs: ParsedSkillOutput[];
  components: SkillComponent[];
}
```

Integration point: the parser should be called from `SkillsService.loadSkillFromFile()` after the existing `parseFrontmatterList()` call, enhancing the basic SkillIO with parsed DSL fields.

### Layer 3 — The Dynamic Form Renderer (Generating UI)

Design a React component `SkillDynamicForm` that:

1. **Accepts `ParsedSkillInput[]` as config prop**
2. **Renders a form** with one control per input, switching by `widget` or inferred type:

| `widget` value | React Component | Source example |
|---|---|---|
| `select` | `<select>` with `<option>` per choice | IssuesWorkspace filter dropdown |
| `radio` | Radio button group | — |
| `switch` | Toggle button | ContextSidebar system toggles |
| `slider` | `<input type="range">` + value label | NewSessionDialog variance knob |
| `text` | `<input type="text">` | IssuesWorkspace instruction input |
| `textarea` | `<textarea>` | IssuesWorkspace notes textarea |
| `code` | `<textarea className="font-mono text-[11px]">` | — |
| `file` | Button + file path display | — |
| `checkbox` | `<input type="checkbox">` | InstructionPanel layer toggle |
| `tags` | Tag input (input + chips) | — |

3. **Handles form state:**
   - Initializes from `default` values
   - Collects values as `Record<string, any>` (input name → value)
   - Provides `onChange(config: Record<string, any>)` callback
   - Validates on blur using `validation` regex
   - Shows `validationMessage` on failure
   - Required fields show a subtle `*` indicator

4. **Renders groups:**
   - If inputs have `group` set, render them under group headers
   - Group headers use `text-[10px] font-medium text-zinc-500 uppercase tracking-wider`

5. **Visual design — exactly match existing patterns:**
   - Labels: `text-[10px] font-medium text-zinc-400` above each control
   - Selects: `bg-zinc-800/80 border border-zinc-700/50 rounded-lg` etc.
   - Inputs: `bg-zinc-950 border border-zinc-700/50 rounded-lg`
   - Spacing: `gap-2` between items, `mb-3` between groups
   - Background: `bg-zinc-900/40 backdrop-blur-sm rounded-xl p-3` for the form card

### Language Guide (For Other AI Agents)

Design a **reference document** (output as a section in RESULT.md) that teaches skill authors how to write the DSL:

```markdown
## Skill DSL Reference

### Quick Start
Add `inputs` to your SKILL.md frontmatter:
\`\`\`yaml
inputs:
  - name: My Input
    type: enum
    choices: [option1, option2, option3]
    required: true
\`\`\`

### Type → Widget Mapping
| type | auto widget | override with |
|------|-------------|---------------|
| enum | select | widget: radio |
| boolean | switch | widget: checkbox |
| number (with min/max) | slider | widget: text |
| ... | ... | ... |

### All Fields Reference
| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| name | string | yes | — | Display label |
| type | enum | yes | — | Data type |
| widget | enum | no | inferred | UI control type |
| choices | string[] | for enum | — | Selectable options |
| default | any | no | — | Initial value |
| ... | ... | ... | ... | ... |

### Examples
\`\`\`yaml
# A skill with all control types
inputs:
  - name: Style
    type: enum
    choices: [minimal, standard, detailed]
    default: standard
    widget: radio
    group: Output Preferences
  - name: Max Tokens
    type: number
    min: 100
    max: 8000
    step: 100
    default: 2000
    group: Output Preferences
\`\`\`
```

---

## Output Format

Produce a `RESULT.md` with these sections:

### 1. Language Specification
- Extended SkillIO interface with all new fields
- Widget inference table
- All valid type/widget combinations
- Output specification extensions

### 2. Parser Module
- File path: `src/services/SkillDSLParser.ts` (new file)
- Full TypeScript implementation
- Integration with existing `SkillsService.loadSkillFromFile()`
- Error handling for malformed frontmatter
- Backward compatibility with existing skills that have no DSL fields

### 3. Dynamic Form Renderer
- File path: `src/components/SkillDynamicForm.tsx` (new file)
- Full component implementation with ALL widget types
- Form state management (useState)
- Validation logic
- Group rendering
- Styling matching existing design tokens

### 4. Integration Points
- How SkillDynamicForm plugs into GeneralistDialog (replace badge view with form on "Configure" click)
- How it plugs into InstructionPanel (skill input collection before prompt generation)
- Props interface for each integration point

### 5. Language Guide
- Complete reference document for skill authors
- Quick start, type mappings, field reference table, examples
- Migration guide for existing SKILL.md files (adding DSL fields is optional)

### 6. Backend Audit Table
| Feature | File | Status |
|---------|------|--------|
| Extended SkillIO | SkillsService.ts | Modify existing |
| Parser | SkillDSLParser.ts | New file |
| DynamicForm | SkillDynamicForm.tsx | New file |
| getSkills IPC | preload.ts:287 | Already exists (unmodified) |
| ... | ... | ... |

Every section must include exact TypeScript code, Tailwind classes, and file paths. The CONTEXT_BUNDLE.md is the source of truth for existing patterns.
