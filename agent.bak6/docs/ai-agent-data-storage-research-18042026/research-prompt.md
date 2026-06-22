# Research Prompt: AI Coding Agent Data Storage Investigation

**Purpose:** Research how AI coding assistants store their data, chat sessions, and token usage information.

---

## Primary Research Questions

### 1. Data Storage Locations
- Where does each AI agent store its data files?
- What is the directory structure?
- Are there environment variables that point to these locations?

### 2. Chat Session Files
- What file formats are used for chat history? (JSON, JSONL, SQLite, etc.)
- Where are these files located?
- How is the data structured?

### 3. Token/Usage Tracking
- How does each agent track token usage?
- Are there separate files for usage statistics?
- What fields are available (input tokens, output tokens, model, cost, etc.)?

### 4. File Access Methods
- How to read the files (permissions, file formats)?
- Are there any encryption or authentication requirements?

---

## AI Agents to Research

| Agent | Key Questions |
|-------|--------------|
| **Claude Code** | Where is `~/.claude/projects/`? What files contain chat history? How to parse token usage? |
| **Cursor** | Where is `%APPDATA%\Cursor\`? What's in globalStorage? How to read chat.db or similar? |
| **OpenCode** | Where is `~/.local/share/opencode/`? What SQLite tables exist? |
| **Gemini CLI (Google)** | Where is `~/.gemini/history/`? What is the file format? |
| **Codex CLI (OpenAI)** | Where is `~/.codex/sessions/`? How to extract usage data? |
| **Qwen CLI (Alibaba)** | Where is `~/.qwen/projects/`? What files contain chat data? |
| **Aider** | Where is `~/.aider\` or `~/.obo\`? What analytics files exist? |
| **Windsurf (Codeium)** | Where is the data stored? Any usage tracking files? |
| **GitHub Copilot** | Any local data or only cloud-based? |

---

## Research Format

For each agent, document:

```markdown
## [Agent Name]

### Storage Location
- Primary data directory:
- Environment variables:
- Common installation paths (Windows/Mac/Linux):

### File Structure
- Key files and their purposes:
- File formats (JSON, SQLite, etc.):

### Chat Sessions
- File(s) containing chat history:
- How to parse/read them:
- Sample data structure:

### Token/Usage Data
- File(s) containing usage:
- Fields available:
- How to calculate costs:

### Access Notes
- Any permissions needed:
- Special considerations:
```

---

## Deliverables

1. **Storage Location Map** - Quick reference table of all agents and where their data is stored
2. **File Format Documentation** - How to read each type of file
3. **Parsing Examples** - Code snippets or commands to extract data
4. **Known Limitations** - Any agents that don't provide local access

---

## Testing Commands to Try

Once locations are found, verify by:
- Checking if directory exists: `ls -la ~/<path>` or `dir <path>`
- Listing files in directories
- Reading sample files (if accessible)
- Checking file sizes and dates

---

**Note:** Focus on local data storage only. Cloud-only agents (like GitHub Copilot without local caching) may not have extractable local data.

---

*Generated: 2026-04-18*