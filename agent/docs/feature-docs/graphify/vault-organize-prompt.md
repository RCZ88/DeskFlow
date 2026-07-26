# File Organization Task - Obsidian Vault Cleanup

## Context

You are helping organize an Obsidian vault that has become messy. There is a folder with files that need to be sorted properly.

## Background - Graphify

**Graphify** is a knowledge graph tool that extracts relationships from code/projects. It categorizes files into different types with tags:

- **#graphify/EXTRACTED** - Files that were extracted from actual code (from this project)
- **#graphify/document** - Document files (markdown, txt)
- **#graphify/image** - Image files (png, jpg, excalidraw)
- **#community/Community_None** - Files not part of any detected community

The canonical graph for the App Tracker project lives in:
- `C:\Users\cleme\Documents\CZVault\00_Projects\AppTracker\Graph\`

A local copy also exists at:
- `C:\Users\cleme\Documents\CZVault\00_Projects\AppTracker\Graph\graph.json`

The graph outputs are:
- `graph.json` - raw graph data with node metadata
- `GRAPH_REPORT.md` - analysis report
- `graph.html` - interactive visualization

The graph was rebuilt using a Windows-compatible wrapper at:
- `agent/docs/graphify/graphify-pipeline.py`

## The Problem

The vault folder `C:\Users\cleme\Documents\CZVault\00_Projects\AppTracker\Graph\` contains many files that are not related to the App Tracker project - they were accidentally mixed in. You need to identify which files belong to App Tracker (based on graphify tags) and move the rest.

## Your Task

**Step 1:** Read the graph.json file in the Graph folder to understand which source files were extracted

**Step 2:** Check which files have these tags:
- `#graphify/EXTRACTED` - These are from the App Tracker codebase (should stay)
- `#graphify/document` - These are documentation files from this project (should stay)
- `#graphify/image` - These are images/screenshots from this project (should stay)
- `#community/Community_None` - These may or may not belong - check source_file in graph.json

**Step 3:** The App Tracker project source files are from this directory:
`C:\Users\cleme\Documents\COMPUTAH_SAYENCE\App Tracker\`

Any file in the Graph folder that was NOT extracted from that directory should be moved out.

**Step 4:** Look at the actual file list in `C:\Users\cleme\Documents\CZVault\00_Projects\AppTracker\Graph\` and determine which are unrelated by checking if they match the App Tracker project scope.

**Step 5:** Move unrelated files to appropriate existing folders:

### Existing Folders (use these first):
- `C:\Users\cleme\Documents\CZVault\00_Projects\Other\` - Misc files
- `C:\Users\cleme\Documents\CZVault\Neural Network Learn\` - Neural network/machine learning
- `C:\Users\cleme\Documents\CZVault\CS Studies\` - Computer science study materials
- `C:\Users\cleme\Documents\CZVault\Excalidraw\` - Drawings/diagrams
- `C:\Users\cleme\Documents\CZVault\AI_Research\` - AI research papers
- `C:\Users\cleme\Documents\CZVault\Templates\` - Prompt/templates
- `C:\Users\cleme\Documents\CZVault\NeuroQuant\` - NeuroQuant project

### Already Moved (don't move again):
- Neural Network Learn: NeuralNetwork.excalidraw, ffnn_formula_master_sheet, Loss Calc Matrix
- CS Studies: SVM RF README, A1 Variables, A2 Variables, 4 Phase Convex, 4 Phase Learning Curve, Paper 1 Prep, Paper 3 Prep, Markdown format fixer
- Excalidraw: 8 Drawing files + 9 pasted images
- AI_Research: BM IA EVALUATION, Grok Research Result, deep-research-report, Upgrade Prompt Engineering AGENT, PROMPT-ENGINEER, Prompts Library
- Templates: TO DO PROMPTS, FILE-INDEX-TEMPLATE, SESSION-HANDOFF-TEMPLATE, POST-TASK-UPDATER

**Step 6:** If a file doesn't fit any existing folder, create a new folder in the vault with a descriptive name (e.g., "Music", "Personal", "OtherProject")

## Important Notes

1. **Check if file already exists** in destination before moving - some duplicates may already be there from previous attempts. Use `-Force` if needed or rename.
2. **Move, don't delete** - no files should be deleted
3. **Prioritize existing folders** - create new folder only if no existing folder fits
4. **After moving**, verify the file count in Graph folder decreases

## Key Insight

Files tagged with `#graphify/EXTRACTED` or `#graphify/document` with source_file pointing to `C:\Users\cleme\Documents\COMPUTAH_SAYENCE\App Tracker\` are the ones that belong in Graph - they are the actual App Tracker project notes.

Everything else (papers, drawings from other projects, study notes, etc.) should be moved out.

## Verify

After completing, report:
- How many files moved
- Which files moved where (summarize by category)
- Final file count in Graph folder