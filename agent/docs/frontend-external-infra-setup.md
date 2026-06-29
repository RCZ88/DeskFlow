# Frontend External Infrastructure — Multi-Project Setup Guide

> How to replicate this setup in any project. Three steps, ~5 minutes.

## What You Get

- **shadcn MCP** — search/read thousands of real Tailwind+React components from shadcn/ui and any registered third-party registry (Aceternity, etc.)
- **Magic UI MCP** — 150+ animated components (beams, particles, bento grids, text animations)
- **Lucide MCP** — 1500+ SVG icon search (never guess an icon name again)
- **21st.dev Magic MCP** — prompt→component generation for unique variations
- **frontend-external-infra skill** — source routing + anti-slop checklist + re-skin rules

## Step 1: MCP Configuration

Copy these entries into your project's `opencode.json` (or `.cursor/mcp.json`, or `~/.claude/settings.json`):

```json
{
  "mcpServers": {
    "shadcn": {
      "command": "npx",
      "args": ["-y", "shadcn@latest", "mcp"]
    },
    "magicui": {
      "command": "npx",
      "args": ["-y", "@magicuidesign/mcp@latest"]
    },
    "lucide": {
      "command": "npx",
      "args": ["-y", "lucide-icons-mcp"]
    },
    "@21st-dev/magic": {
      "command": "npx",
      "args": ["-y", "@21st-dev/magic@latest"],
      "env": { "API_KEY": "<your-21st-dev-key>" }
    }
  }
}
```

**opencode.json format** (as used in this project):
```json
"shadcn": {
  "type": "local",
  "command": ["npx", "-y", "shadcn@latest", "mcp"],
  "enabled": true
}
```

See `opencode.json` in this repo for the full pattern.

## Step 2: Skill Installation

```bash
# Copy the skill into your project
cp -r agent/skills/frontend-external-infra <your-project>/agent/skills/
```

Then edit the skill's re-skin rules to match your project's design tokens (colors, radii, fonts, spacing).

## Step 3: Connect to Design-Taste Master (Optional)

If you use the design-taste master skill pattern, add a reference:

```markdown
5. **frontend-external-infra** (v1.0.0) — Connected external libraries for real
   component inventory, source routing, anti-slop checklist, re-skin rules
```

## What NOT to Copy

- `agent/docs/frontend-external-infra.md` — this is the reference document, not the skill
- Any project-specific keys/secrets — use environment variables or `.env`

## Per-Project Customization

| What to customize | Where |
|---|---|
| Re-skin rules (colors, radii, fonts) | SKILL.md → "DeskFlow Re-Skin Rules" section |
| CSS token references | SKILL.md → reference your project's CSS file |
| Available registries | `components.json` in project root |
| Additional MCP servers (Unsplash, Figma, Motion.dev) | `opencode.json` |

## Adding More Sources

The `agent/docs/frontend-external-infra.md` reference doc covers:
- **Motion.dev (community MCP)** — clone `github.com/Abhishekrajpurohit/motion-dev-mcp`, `npm install && npm run build && npm run rebuild`, then configure as local MCP (`node dist/index.js`)
- **Unsplash MCP** — `npx -y unsplash-smart-mcp-server` (needs Unsplash API key)
- **Figma Dev Mode MCP** — remote MCP (needs Figma paid seat)
- **React Bits MCP** — `npx -y reactbits-dev-mcp-server`
- **Custom MCP** — build-your-own for any site with a REST API or docs

## Workspace UI Integration (Future)

This infrastructure is designed to eventually plug into the DeskFlow workspace
UI (Work → Skills subtab). When the workspace UI supports skill discovery and
MCP management, each connected source will appear as a toggleable resource
with status indicators and per-source tool documentation.
