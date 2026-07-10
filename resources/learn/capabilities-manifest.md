# ⚠️ DEPRECATED — DO NOT USE

> This file described block syntax that does NOT match the actual
> `.lmd` compiler (`src/services/learn/parseLessonMarkdown.ts`).
>
> **Incorrect descriptions in this file:**
> - Quiz mcq shown as `options:` / `answer_key:` key-value format — parser reads `- [ ]` checkboxes
> - Flow shown as CSV comma format — parser reads `- from -> to : value` arrow syntax
> - Table shown as `columns: Name, Role` CSV — parser reads `- [Title | field]` then JSON rows
> - Finchart shown as YAML `type: area` — parser reads JSON only
> - Layer shown as YAML `reveal_at: L3` — parser reads `::: layer L3 deeper` positional args
> - Video/widget shown as usable — parser has no handler for these
> - Overall format described as `:::` directives — correct, but every inner syntax above is wrong
>
> **Replacement:** Use `resources/learn/author-guide.md` (v3, grammar-verified).
