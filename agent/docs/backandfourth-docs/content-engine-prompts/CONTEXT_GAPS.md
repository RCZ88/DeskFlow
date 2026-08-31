# Context Gaps — Content Engine Prompts

| Context Needed | Status | Location | How to Obtain |
|----------------|--------|----------|---------------|
| Example JSON outputs for each prompt | ❌ Missing | N/A | Agent must provide sample "good" vs "bad" output for each prompt |
| Backend prompt assembly code (index.ts) | ⚠️ Partial | src/services/contentEngine/index.ts | Include relevant sections showing how template variables are replaced |
| UI component shapes (what JSON they expect) | ⚠️ Partial | src/features/content-engine/components/ | Include TypeScript interfaces for ScriptFrame, HookStack, etc. |
| Real video analytics data | ❌ Missing | N/A | Agent must provide sample analytics text that would be pasted into PROMPT_ANALYTICS_IMPORT |
| Real creator reflections | ❌ Missing | N/A | Agent must provide sample reflection text that would be fed into PROMPT_HUMAN_REFLECTION |
| Existing framework rules | ❌ Missing | content_frameworks table | Agent must query DB for existing rules to include in PROMPT_FRAMEWORK_UPDATE context |
| Duration field mapping | ⚠️ Partial | scoringSchemes.ts | The duration field in scoring schemes (30-60, 60-120, 90-180) must map to PROMPT_SCRIPT_FRAMES {{duration}} |
| The duplicate block at line 294-301 | ✅ Fixed | prompts.ts | Already removed — was dead code not part of any export |
