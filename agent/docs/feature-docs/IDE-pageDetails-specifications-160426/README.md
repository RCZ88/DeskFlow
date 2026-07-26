# IDE Projects Feature - Documentation

## Overview

This directory contains the design documentation for the IDE Projects feature.

## Files

| File | Description |
|------|-------------|
| `ide-projects-design.md` | Complete technical design document |

## Design Document Contents

The `ide-projects-design.md` includes:

1. **Architecture Overview** - System components and data flow
2. **Data Model** - TypeScript interfaces and SQLite schema
3. **Data Collection Strategies** - How to detect IDEs, tools, AI usage, git metrics
4. **API Specifications** - Internal endpoints and external integrations
5. **UI/UX Design** - Dashboard layout and component specifications
6. **Implementation Roadmap** - 5-phase plan from foundation to polish
7. **Privacy & Security** - Supabase CLI model compliance
8. **Technical Stack** - Recommendations for implementation

## Research Sources

Research findings are located in:
- `../../agent/docs/6-research-prompt-IDEtracker-15042026/RESULT.md`

## Quick Summary

| Area | Approach |
|------|----------|
| IDEs | VS Code CLI + Cursor SQLite + JetBrains Toolbox |
| AI Tracking | Cursor API (Enterprise) + Claude Code JSONL parse |
| Git Metrics | GitHub REST API + simple-git library |
| Tool Detection | PATH scan + package manager queries |
| Privacy | Anonymous UUID, opt-in, local-first |
| Storage | SQLite (local), optional cloud sync |

## Next Steps

1. Review the design document
2. Decide on implementation priority (which phases first)
3. Start Phase 1 implementation (Foundation)
