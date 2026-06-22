# Agent Mappings Reference

Maps learning categories to target configuration files for different AI agent platforms.

## Supported Platforms

| Platform | Config Files | Agent Definition Location |
|----------|--------------|-------------------------|
| Claude Code | `CLAUDE.md` | `~/.claude/` |
| Cursor | `.cursorrules`, `.cursor/rules/*.md` | Project-level |
| Copilot | `.github/copilot-instructions.md` | Repository-level |
| OpenCode | `AGENTS.md`, `opencode.md` | Project-level |
| Generic | Any `.md` config file | User-defined |

## Platform Detection

### Detection Order

```javascript
const PLATFORM_CONFIGS = {
  'claude-code': {
    priority: 1,
    files: ['CLAUDE.md'],
    dirs: ['~/.claude/'],
    marker: 'claude'
  },
  'cursor': {
    priority: 2,
    files: ['.cursorrules', '.cursor/rules'],
    dirs: ['.cursor/'],
    marker: 'cursor'
  },
  'copilot': {
    priority: 3,
    files: ['.github/copilot-instructions.md'],
    dirs: ['.github/'],
    marker: 'github'
  },
  'opencode': {
    priority: 4,
    files: ['AGENTS.md', 'opencode.md'],
    dirs: [],
    marker: 'agent'
  },
  'generic': {
    priority: 99,
    files: [],
    dirs: [],
    marker: null
  }
};
```

### Detection Logic

```
1. Check for CLAUDE.md or ~/.claude/ → Claude Code
2. Check for .cursorrules or .cursor/ → Cursor
3. Check for .github/copilot-instructions.md → Copilot
4. Check for AGENTS.md or opencode.md → OpenCode
5. Default to Generic mode
```

## Platform-Specific Mappings

### Claude Code

| Category | Target File | Section |
|----------|-------------|---------|
| Code Style | `CLAUDE.md` | `## Code Style`, `## Style Guidelines` |
| Architecture | `CLAUDE.md` | `## Architecture`, `## Design Patterns` |
| Process | `CLAUDE.md` | `## Workflow`, `## Process` |
| Domain | `CLAUDE.md` | `## Domain`, `## Business Rules` |
| Tools | `CLAUDE.md` | `## Tools`, `## CLI Preferences` |
| Security | `CLAUDE.md` | `## Security`, `## Security Heuristics` |

**Path Patterns:**
```
~/.claude/CLAUDE.md
~/.claude/agents/{name}.md
.claude/CLAUDE.md
.claude/agents/{name}.md
```

### Cursor

| Category | Target File | Section |
|----------|-------------|---------|
| Code Style | `.cursorrules` | Rule-based format |
| Architecture | `.cursor/rules/architecture.md` | Rule-based format |
| Process | `.cursorrules` | Workflow rules |
| Domain | `.cursor/rules/domain.md` | Project rules |
| Tools | `.cursorrules` | Tool rules |

**Path Patterns:**
```
.cursorrules
.cursor/rules/{category}.md
.cursorignore
```

**Format Example:**
```markdown
# Project Rules

## Tech Stack
- TypeScript
- React
- Tailwind CSS

## Code Style
- Use const over let
- Prefer functional components
```

### GitHub Copilot

| Category | Target File | Section |
|----------|-------------|---------|
| Code Style | `.github/copilot-instructions.md` | Inline |
| Architecture | `.github/copilot-instructions.md` | Inline |
| Process | `.github/copilot-instructions.md` | Inline |
| Domain | `.github/copilot-instructions.md` | Inline |

**Path Patterns:**
```
.github/copilot-instructions.md
```

**Format Example:**
```markdown
# Copilot Instructions

## Project Overview
This is a React TypeScript application...

## Code Style
- Use TypeScript strict mode
- Prefer const assertions
```

### OpenCode

| Category | Target File | Section |
|----------|-------------|---------|
| Code Style | `AGENTS.md` | `## Code Style`, `### Style` |
| Architecture | `AGENTS.md` | `## Architecture`, `### System Design` |
| Process | `AGENTS.md` | `## Workflow`, `### Process` |
| Domain | `AGENTS.md` | `## Domain`, `### Business Logic` |
| Tools | `AGENTS.md` | `## Tools`, `### Commands` |

**Path Patterns:**
```
AGENTS.md
opencode.md
agent/{name}.md
```

**Format Example:**
```markdown
# Agent Instructions

## Code Style
- Follow existing project conventions
- Use meaningful variable names

## Process
- Always run tests before committing
```

### Generic

| Category | Detection Strategy |
|----------|-------------------|
| Code Style | Look for `.editorconfig`, linter configs |
| Architecture | Look for `ARCHITECTURE.md`, `docs/` |
| Process | Look for `CONTRIBUTING.md`, workflow docs |
| Domain | Look for `docs/domain/`, `SPEC.md` |
| Tools | Look for `.tool-versions`, env configs |

**Fallback Strategy:**
1. Check for common config files
2. Ask user to specify target file
3. Create new config if needed

## Category to Agent Mapping

### Code Style

| Learning Type | Primary Target | Fallback |
|--------------|----------------|----------|
| Naming conventions | Linter config | Agent instructions |
| Formatting rules | `.editorconfig` | Agent instructions |
| TypeScript/JavaScript | `tsconfig.json` | Agent instructions |
| Python style | `pyproject.toml` | Agent instructions |
| General style | Agent instructions | Project docs |

### Architecture

| Learning Type | Primary Target | Fallback |
|--------------|----------------|----------|
| Design patterns | Architecture doc | Agent instructions |
| API design | API docs | Agent instructions |
| Database patterns | Schema docs | Agent instructions |
| System structure | Architecture doc | Agent instructions |

### Process

| Learning Type | Primary Target | Fallback |
|--------------|----------------|----------|
| Git workflow | `CONTRIBUTING.md` | Agent instructions |
| CI/CD | CI config files | Agent instructions |
| Code review | Review guidelines | Agent instructions |
| Testing | Test docs | Agent instructions |

### Security

| Learning Type | Primary Target | Fallback |
|--------------|----------------|----------|
| Input validation | Security doc | Agent instructions |
| Authentication | Security doc | Agent instructions |
| General security | Security doc | Agent instructions |

## Section Identification

When adding a learning to a config file, identify the correct section:

### Pattern Matching for Sections

```regex
## Code Style
## Style
## Guidelines
## Patterns
## Rules
## Best Practices
## Heuristics
# Project Rules
# Code Standards
```

### Section Priority

1. Most specific matching section (e.g., "Security" for security rules)
2. Generic "Guidelines" or "Rules" section
3. Create new section if none match

### Addition Format

Always add as a bullet point under the appropriate section:

```markdown
## Code Style

* Existing rule 1
* Existing rule 2
* **NEW** [Learning description with context]
```

Use bold or `NEW` prefix for newly added rules.

## Conflict Detection

Before adding a new rule, check for conflicts:

### Contradiction Patterns

```regex
# Opposite directives
"never use X" vs "always use X"
"prefer Y" vs "avoid Y"
"use Z" vs "don't use Z"

# Conflicting versions
"use library v1" vs "use library v2"
"Node 18" vs "Node 20"
```

### Resolution Strategy

1. **Newer wins**: If the new learning contradicts an old rule, flag for review
2. **Higher confidence wins**: HIGH > MEDIUM > LOW
3. **More specific wins**: "Never use var in TypeScript" > "Avoid var"
4. **User decision**: When equal, ask user to resolve

## File Paths by Platform

### Claude Code
```
~/.claude/CLAUDE.md
~/.claude/agents/{name}.md
{project}/.claude/CLAUDE.md
{project}/.claude/agents/{name}.md
```

### Cursor
```
{project}/.cursorrules
{project}/.cursor/rules/{name}.md
```

### Copilot
```
{project}/.github/copilot-instructions.md
```

### OpenCode
```
{project}/AGENTS.md
{project}/opencode.md
{project}/agent/{name}.md
```

## Skill Creation vs Agent Update

Decide whether to create a new skill or update agent instructions:

| Criteria | Create Skill | Update Agent |
|----------|--------------|--------------|
| One-off solution to specific error | Yes | No |
| General preference | No | Yes |
| Debugging workaround | Yes | No |
| Code style rule | No | Yes |
| Configuration trick | Yes | Sometimes |
| Process preference | No | Yes |
| Complex multi-step process | Yes | No |

## Skill File Structure

When creating a new skill:

```
{skill-name}/
├── SKILL.md          # Main skill definition
├── README.md         # Documentation
└── metadata.json     # Skill metadata
```

### SKILL.md Template

```markdown
# {Skill Name}

## Problem
[What problem does this skill solve?]

## Triggers
- [When should this skill be invoked?]

## Actions
1. [Step 1]
2. [Step 2]
3. [Step n]

## Examples
[Real-world examples of when skill was used]

## Edge Cases
[What variations or exceptions exist?]
```
