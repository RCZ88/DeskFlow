# IDE Projects Feature - Research Documentation

This directory contains research prompts for the IDE Projects feature of App Tracker.

## Overview

The IDE Projects feature will track:
1. Installed IDEs, extensions, and developer tools
2. AI coding assistant usage (tokens, costs, interactions)
3. Git/version control metrics (commits, code churn, DORA)
4. Developer productivity insights

## Research Files

| File | Focus | Priority |
|------|-------|----------|
| `research-01-ide-integration.md` | VS Code, Cursor, JetBrains detection | High |
| `research-02-ai-tracking.md` | Copilot, Cursor AI, Claude Code | High |
| `research-03-git-metrics.md` | GitHub API, DORA metrics | High |
| `research-04-telemetry-standards.md` | OTel, DORA, SPACE frameworks | Medium |
| `research-05-tool-detection.md` | Package managers, PATH scanning | Medium |
| `research-06-ui-ux-patterns.md` | Dashboard design patterns | Low |

## Research Workflow

### Step 1: Execute Research Prompts
Run each research prompt through web search and code search to gather information:

```bash
# Example research execution
websearch "VS Code extension API programmatic access"
codesearch "Cursor AI token tracking API"
```

### Step 2: Compile Findings
Document findings in a `findings/` subdirectory with:
- API endpoints and authentication requirements
- Data formats and schemas
- Technical approaches
- Privacy considerations

### Step 3: Gap Analysis
After research, identify:
- What data is accessible vs requires workarounds
- Priority ordering for implementation
- Risks and mitigation strategies

## Key Questions

After all research is complete, we should be able to answer:

1. **IDE Integration**: How do we detect VS Code, Cursor, and JetBrains extensions?
2. **AI Tracking**: Which AI tools have APIs vs require local parsing?
3. **Git Metrics**: What's available via GitHub API vs local git?
4. **Standards**: What telemetry framework should we follow?
5. **Tool Detection**: How do we comprehensively detect installed tools?
6. **UI/UX**: What dashboard patterns work best?

## Deliverable

A complete `ide-projects-design.md` document with:
- Technical architecture
- Data models
- API specifications
- UI wireframes
- Implementation roadmap
