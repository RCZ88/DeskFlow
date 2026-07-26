# Research: IDE Integration & Extension Detection

## Context
Understanding how to detect and track IDE extensions, installed tools, and configuration across major development environments. This is foundational for the "IDE Projects" feature in App Tracker.

## Research Objectives

### 1. VS Code

**Storage Locations (by OS)**

| OS | Extensions Directory | User Data Directory |
|----|---------------------|---------------------|
| Windows | `%USERPROFILE%\.vscode\extensions` | `%APPDATA%\Code\User\` |
| macOS | `~/.vscode/.extensions` | `~/Library/Application Support/Code/User/` |
| Linux | `~/.vscode/extensions` | `~/.config/Code/User/` |

**Key Files to Investigate:**
- `extensions.json` - Extension manifest/installation info
- `state.vscdb` - SQLite database storing extension enabled/disabled state
- `workspaceStorage/` - Per-workspace state and extensions

**Questions to Answer:**
- What programmatic access does VS Code Extension API provide?
- Can we query installed extensions without elevated permissions?
- What telemetry settings exist and where are they stored?
- How does VS Code track workspace-specific extensions?

### 2. Cursor IDE

**Storage Locations:**
- Global: `~/Library/Application Support/Cursor/User/globalStorage/state.vscdb`
- Workspace: `~/Library/Application Support/Cursor/User/workspaceStorage/{uuid}/state.vscdb`

**Known Data Structures:**
- `ItemTable` key-value pairs:
  - `aiService.generations`
  - `aiService.prompts`
- `cursorDiskKV` table - composer metadata

**Config Files:**
- Global: `~/.cursor/cli-config.json`
- Project: `/.cursor/cli.json`

**Questions to Answer:**
- What SQLite tables contain AI usage data?
- How does Cursor Admin API work for team usage tracking?
- What analytics data is available via API vs local parsing?

### 3. JetBrains IDEs

**Storage Locations:**
- Config: `~/.JetBrains/<product>/config/`
- Plugins: Platform-specific plugin directories
- Marketplace: `marketplace.jetbrains.com` API

**Questions to Answer:**
- How to detect installed plugins programmatically?
- What data is accessible via JetBrains Platform API?
- Are there telemetry endpoints we can query?

### 4. Cross-Platform Detection

**Windows:**
- Registry keys for IDE installations
- `%APPDATA%` and `%LOCALAPPDATA%` locations

**macOS:**
- `~/Library/Application Support/`
- `~/Library/Preferences/`
- LaunchServices database

**Linux:**
- XDG directories: `~/.config`, `~/.local/share`
- Desktop file parsing

## Deliverables

1. Complete file paths for each IDE's extension/storage locations
2. SQLite schema documentation (if applicable)
3. What data is accessible vs requires elevated permissions
4. Authentication/permission requirements per platform
5. API endpoints for programmatic access

## Success Criteria

- [ ] Know exact storage paths for VS Code, Cursor, and JetBrains
- [ ] Understand SQLite schema for Cursor state.vscdb
- [ ] Know what extension data is programmatically accessible
- [ ] Understand telemetry opt-out mechanisms
- [ ] Cross-platform detection strategy documented
