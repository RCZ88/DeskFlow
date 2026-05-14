---
id: reflect
name: Agent Reflect
category: meta
applicable_to: [self-improvement, reflection]
version: 3.0.0
created: 2026-04-19
tags: [reflection, self-improvement, learning]
---

# Reflect - Universal Agent Self-Improvement Skill

Transform any AI assistant into a continuously improving partner. Every correction becomes a permanent improvement that persists across all future sessions.

## Quick Reference

| Command | Action |
|---------|--------|
| `/reflect` | Analyze conversation for learnings |
| `/reflect on` | Enable auto-reflection |
| `/reflect off` | Disable auto-reflection |
| `/reflect status` | Show state and metrics |
| `/reflect review` | Review pending learnings |
| `/reflect config` | Configure agent-specific settings |

## When to Use

- After completing complex tasks
- When user explicitly corrects behavior ("never do X", "always Y")
- At session boundaries or before context compaction
- When successful patterns are worth preserving
- After discovering non-obvious solutions or workarounds
- After making mistakes that caused regressions

## Workflow

### Step 1: Scan Conversation for Signals

Analyze the conversation for correction signals and learning opportunities.

**Signal Confidence Levels:**

| Confidence | Triggers | Examples |
|------------|----------|----------|
| **HIGH** | Explicit corrections | "never", "always", "wrong", "stop", "the rule is" |
| **MEDIUM** | Approved approaches | "perfect", "exactly", "that's right", accepted output |
| **LOW** | Observations | Patterns that worked but not explicitly validated |

See [signal_patterns.md](signal_patterns.md) for full detection rules.

### Step 2: Detect Agent Platform

Automatically detect which AI platform is in use:

| Platform | Config File | Agent Definition |
|----------|-------------|------------------|
| Claude Code | `CLAUDE.md` | `~/.claude/` |
| Cursor | `.cursorrules`, `.cursor/rules/` | Project rules |
| Copilot | `.github/copilot-instructions.md` | Workspace instructions |
| OpenCode | `AGENTS.md`, `opencode.md` | Agent definitions |
| Generic CLI | Any markdown config | Configurable |

Run detection to identify the platform:
1. Check for known config file patterns
2. Look for platform-specific directories
3. Default to generic if undetected

### Step 3: Classify & Match to Target Files

Map each signal to the appropriate target based on detected platform:

| Category | Target Files |
|----------|--------------|
| Code Style | Linter configs, style guides, agent code rules |
| Architecture | Architecture docs, agent system prompts |
| Process | Workflow configs, agent instructions |
| Domain | Project docs, domain-specific agent rules |
| Tools | Tool configs, agent tool preferences |
| New Skill | Create new skill file |

See [agent_mappings.md](agent_mappings.md) for platform-specific mapping rules.

### Step 3: Check for Skill-Worthy Signals

Some learnings should become new skills rather than agent updates:

**Skill-Worthy Criteria:**
- Non-obvious debugging (>10 min investigation)
- Misleading error (root cause different from message)
- Workaround discovered through experimentation
- Configuration insight (differs from documented)
- Reusable pattern (helps in similar situations)

**Also check for "Never do X" patterns:**
- Any HIGH confidence signal with "never" MUST be added to AGENTS.md "Never" section
- Any HIGH confidence signal with "always" MUST be added to AGENTS.md "Always" section
- Mistakes that caused data loss or regressions MUST be documented in debugging.md

**Quality Gates (must pass all):**
- [ ] Reusable: Will help with future tasks
- [ ] Non-trivial: Requires discovery, not just docs
- [ ] Specific: Can describe exact trigger conditions
- [ ] Verified: Solution actually worked
- [ ] No duplication: Doesn't exist already

### Step 5: Generate Proposals

Present findings in structured format:

```markdown
# Reflection Analysis

## Session Context
- **Date**: [timestamp]
- **Messages Analyzed**: [count]
- **Detected Platform**: [platform name]

## Signals Detected

| # | Signal | Confidence | Source Quote | Category |
|---|--------|------------|--------------|----------|
| 1 | [learning] | HIGH | "[exact words]" | Code Style |

## Proposed Changes

### Change 1: Update [config file]
**Target**: `[file path]`
**Platform**: [detected platform]
**Section**: [section name]
**Confidence**: HIGH

```diff
+ New rule from learning
```

### Change 2: Update AGENTS.md (Mandatory for HIGH signals)
**Target**: `agent/AGENTS.md`
**Section**: Common Mistakes to Avoid → ❌ Never / ✅ Always
**Confidence**: HIGH

```diff
+ **Run [specific operation] without [safety check]**
```

## Review Prompt
Apply these changes? (Y/N/modify/1,2,3)
```

### Step 6: Apply with User Approval

**On `Y` (approve):**
1. Apply each change using Edit tool
2. If "never do X" signal detected: MUST update AGENTS.md "Never" section
3. Commit with descriptive message (if using git)
4. Update metrics

**On `N` (reject):**
1. Discard proposed changes
2. Log rejection for analysis

**On `modify`:**
1. Present each change individually
2. Allow editing before applying

**On selective (e.g., `1,3`):**
1. Apply only specified changes
2. Commit partial updates

## State Management

State is stored in `~/.agent-reflect/` (configurable via `REFLECT_STATE_DIR`):

```yaml
# reflect-state.yaml
auto_reflect: false
last_reflection: "2026-01-26T10:30:00Z"
pending_reviews: []
detected_platform: auto
platform_config:
  claude_code:
    enabled: true
    config_paths:
      - "~/.claude/"
      - "CLAUDE.md"
  cursor:
    enabled: true
    config_paths:
      - ".cursorrules"
      - ".cursor/rules/"
  copilot:
    enabled: true
    config_paths:
      - ".github/copilot-instructions.md"
  opencode:
    enabled: true
    config_paths:
      - "AGENTS.md"
      - "opencode.md"
  generic:
    enabled: true
    config_paths: []
```

### Metrics Tracking

```yaml
# reflect-metrics.yaml
total_sessions_analyzed: 42
total_signals_detected: 156
total_changes_accepted: 89
acceptance_rate: 78%
confidence_breakdown:
  high: 45
  medium: 32
  low: 12
platform_breakdown:
  claude_code: 30
  cursor: 8
  copilot: 4
skills_created: 5
```

## Platform Detection Logic

### Detection Order

1. **Claude Code**: Check for `CLAUDE.md` or `~/.claude/` directory
2. **Cursor**: Check for `.cursorrules` file or `.cursor/rules/` directory
3. **Copilot**: Check for `.github/copilot-instructions.md`
4. **OpenCode**: Check for `AGENTS.md` or `opencode.md`
5. **Generic**: No specific markers found, use fallback

### Manual Override

User can specify platform manually:
```
/reflect config --platform cursor
```

## Safety Guardrails

### Human-in-the-Loop
- NEVER apply changes without explicit user approval
- Always show full diff before applying
- Allow selective application

### Incremental Updates
- ONLY add to existing sections
- NEVER delete or rewrite existing rules
- Preserve original structure

### Conflict Detection
- Check if proposed rule contradicts existing
- Warn user if conflict detected
- Suggest resolution strategy

### Backup Before Changes
- Create backup of original file before modification
- Store backups in `~/.agent-reflect/backups/`
- Allow rollback via `/reflect rollback <timestamp>`

## Output Locations

**Project-level (versioned with repo):**
- `.agent-reflect/YYYY-MM-DD_HH-MM-SS.md` - Full reflection
- `.agent-reflect/skills/{name}/` - New skills

**Global (user-level):**
- `~/.agent-reflect/learnings.yaml` - Learning log
- `~/.agent-reflect/reflect-metrics.yaml` - Aggregate metrics
- `~/.agent-reflect/backups/` - File backups

## Examples

### Example 1: Code Style Correction (Claude Code)

**User says**: "Never use `var` in TypeScript, always use `const` or `let`"

**Signal detected**:
- Confidence: HIGH (explicit "never" + "always")
- Category: Code Style
- Platform: Claude Code
- Target: `CLAUDE.md` or project linter config

**Proposed change**:
```diff
## Style Guidelines
+ * Use `const` or `let` instead of `var` in TypeScript
```

### Example 2: Cursor Rule

**User says**: "Use this folder structure for React projects"

**Signal detected**:
- Confidence: MEDIUM (explicit instruction)
- Category: Architecture
- Platform: Cursor
- Target: `.cursorrules`

**Proposed change**:
```diff
## Project Structure
+ * Organize React projects with feature-based folder structure
```

### Example 3: New Skill from Debugging

**Context**: Spent 30 minutes debugging a React hydration mismatch

**Signal detected**:
- Confidence: HIGH (non-trivial debugging)
- Category: New Skill
- Quality gates: All passed

**Proposed skill**: `react-hydration-fix/SKILL.md`

### Example 4: OpenCode Configuration

**User says**: "When working in this repo, always run lint before commit"

**Signal detected**:
- Confidence: HIGH (explicit "always")
- Category: Process
- Platform: OpenCode (detected `AGENTS.md`)
- Target: `AGENTS.md`

## Troubleshooting

**No signals detected:**
- Session may not have had corrections
- Check if using natural language corrections

**Platform not detected:**
- Run `/reflect config` to see detection status
- Manually specify platform with `/reflect config --platform <name>`

**Conflict warning:**
- Review the existing rule cited
- Decide if new rule should override
- Can modify before applying

**Config file not found:**
- Check file path spelling
- Platform may need initialization
- Use `/reflect init --platform <name>` to create template
