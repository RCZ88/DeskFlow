# Graphify Concerns

## Issue 1: Windows PowerShell vs Unix Bash Syntax Mismatch

**Problem:** The graphify skill uses Unix bash syntax that doesn't work in Windows PowerShell.

**Evidence:**
- Skill uses `$(cat .graphify_python)` for command substitution
- Skill uses `&&` for command chaining
- Windows PowerShell doesn't support these

**Example from skill:**
```bash
$(cat .graphify_python) -c "import graphify" 2>/dev/null || python -m pip install graphifyy -q
```

**What works on Windows:**
```bash
python -c "import graphify"
```

---

## Issue 2: CLI Entry Point Missing

**Problem:** The graphify skill expects to be run as `graphify <command>` but there's no main CLI entry point.

**What the skill expects:**
```bash
python -m graphify .  # Should run full pipeline
```

**What actually happens:**
```
error: unknown command '.'
```

The graphify package only has subcommands like `install`, `query`, `benchmark` - it doesn't have a default command to run the full pipeline.

---

## Issue 3: Skill Documentation vs Actual Implementation

**Problem:** The skill documentation describes a full pipeline that doesn't exist in the current graphify version.

**Documentation says:**
- Step 1-9 with extraction, clustering, visualization
- `graphify detect`, `graphify extract`, etc.

**Actual commands available:**
- `install`, `query`, `save-result`, `benchmark`
- `hook install/uninstall/status`
- Platform integrations (claude, cursor, opencode, etc.)

**Missing commands:**
- No `graphify detect` 
- No `graphify extract`
- No `graphify build`
- No `graphify cluster`

---

## Issue 4: Skill Installation Incomplete

**Problem:** The skill tries to use graphify as if it's a full extraction pipeline, but it's actually just a wrapper for platform integrations.

**What graphify actually does:**
- Helps install hooks and integrations for Claude/Cursor/etc.
- Provides query/benchmark commands for existing graphs
- Doesn't actually perform extraction/clustering itself

---

## Potential Solutions

### Option A: Use graphify as library
Import graphify modules directly in Python instead of using CLI:
```python
from graphify.detect import detect
from graphify.extract import extract
from graphify.build import build_from_json
```

### Option B: Check version
Verify what version of graphify is installed and if it supports the full pipeline.

### Option C: Manual pipeline
Run the extraction steps manually using Python API since the CLI doesn't support it.

---

## Verification Steps Taken

1. ✅ `python -c "import graphify"` - Works
2. ✅ Detection works via Python API
3. ❌ CLI `python -m graphify .` - Fails (no default command)
4. ✅ graph.json exists in graphify-out/
5. ✅ GRAPH_REPORT.md exists in graphify-out/

---

## Recommendation

The existing graph has already been built and has outputs. The issue was that the skill's automated pipeline could not run on Windows due to:

1. Bash syntax incompatibility
2. Missing CLI entry point for full pipeline

**SOLUTION IMPLEMENTED:**

Created `agent/docs/graphify/graphify-pipeline.py` - a Windows-compatible wrapper that uses Python API directly instead of CLI.

To update the graph:
```bash
python agent/docs/graphify/graphify-pipeline.py
```

This script:
- Uses Python API (`from graphify.detect import detect`, etc.)
- Works on Windows PowerShell
- Generates graph.json, GRAPH_REPORT.md, graph.html