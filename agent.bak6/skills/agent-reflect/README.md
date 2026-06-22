# Reflect - Universal Agent Self-Improvement Skill

> "Correct once, never again."

Transform any AI assistant into a continuously improving partner. The Reflect skill analyzes conversations for corrections and successful patterns, permanently encoding learnings into agent definitions.

## Features

- **Platform Agnostic**: Works with Claude Code, Cursor, Copilot, OpenCode, and generic agents
- **Signal Detection**: Automatically identifies corrections with confidence levels (HIGH/MEDIUM/LOW)
- **Category Classification**: Routes learnings to appropriate config files
- **Skill Generation**: Creates new skills from non-trivial debugging discoveries
- **Metrics Tracking**: Quantifies improvement with acceptance rates and statistics
- **Human-in-the-Loop**: All changes require explicit approval
- **Git Integration**: Full version control with easy rollback (when available)

## Installation

### For OpenCode

Place the `agent-reflect` folder in your skills directory:
```
{workspace}/agent/skills/agent-reflect/
```

### Manual Installation

Copy the `agent-reflect/` folder to your skills directory:
- OpenCode: `agent/skills/agent-reflect/`
- Claude Code: `~/.claude/skills/agent-reflect/`
- Cursor: `.cursor/skills/agent-reflect/`

## Usage

### Basic Reflection

Just say "reflect" to trigger analysis:

```
User: reflect
Agent: [Analyzes conversation, presents learnings for approval]
```

### Toggle Auto-Reflection

```
User: reflect on
Agent: Auto-reflection enabled. Will analyze before context compaction.

User: reflect off
Agent: Auto-reflection disabled.
```

### Check Status

```
User: reflect status
Agent:
  Sessions analyzed: 42
  Signals detected: 156
  Changes accepted: 89 (78%)
  Skills created: 5
  Platform: Claude Code (detected)
```

### Review Pending

```
User: reflect review
Agent: [Shows low-confidence learnings awaiting validation]
```

### Platform Configuration

```
User: reflect config
Agent: [Shows current platform detection status and configuration]

User: reflect config --platform cursor
Agent: Platform set to Cursor. Will use .cursorrules for updates.
```

## Supported Platforms

| Platform | Config File | Detection |
|----------|-------------|-----------|
| Claude Code | `CLAUDE.md` | Auto-detected |
| Cursor | `.cursorrules` | Auto-detected |
| Copilot | `.github/copilot-instructions.md` | Auto-detected |
| OpenCode | `AGENTS.md` | Auto-detected |
| Generic | Any markdown config | Fallback |

## How It Works

1. **Detect**: Identifies which AI platform is in use
2. **Scan**: Analyzes conversation for correction signals
3. **Classify**: Maps signals to categories and target files
4. **Propose**: Generates diffs for config updates or new skills
5. **Review**: Presents changes for user approval
6. **Apply**: Commits approved changes with descriptive messages

## Signal Detection

| Confidence | Triggers | Examples |
|------------|----------|----------|
| **HIGH** | Explicit corrections | "never", "always", "wrong", "stop" |
| **MEDIUM** | Approved approaches | "perfect", "exactly", "that's right" |
| **LOW** | Observations | Patterns that worked, not validated |

## Configuration

State directory (customizable via environment):

```bash
export REFLECT_STATE_DIR=/path/to/state
```

Default locations:
- `~/.agent-reflect/` (portable)
- `agent/.agent-reflect/` (project-level)

## Files

- `SKILL.md` - Main skill implementation
- `skill.json` - Skill metadata
- `signal_patterns.md` - Detection patterns reference
- `agent_mappings.md` - Platform mapping rules
- `_meta.json` - Package metadata

## License

MIT

## Author

Universal
