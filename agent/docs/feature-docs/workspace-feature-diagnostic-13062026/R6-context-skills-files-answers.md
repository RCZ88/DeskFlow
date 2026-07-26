# Diagnostic Q&A — Round 6: Context assembly + Skills tab + Files tab
Answer each with exact file paths + line ranges. Quote real code, not summaries.

## Context assembly (the init/system-prompt source)
1. **assembleContext / buildInitContent — where defined, and exactly which files/dirs does it read? Show the read calls + how missing files are handled.**
   - `assembleContext` is defined in `src/services/ContextService.ts:128-216`.
   - `buildInitContent` has been **removed** in favor of `assembleContext` (as noted in `agent/PROBLEMS.md:44`).
   - It reads:
     - `agent/RULES_COMPACT.md` (via `readRulesCompact` line 116).
     - `agent/state.md` (via `readFileUncapped` line 150).
     - `agent/patterns.md` (line 157).
     - `agent/problems.json` (line 166).
     - `agent/*.md` for LLM Wiki (via `buildLLMWikiContext` line 218).
     - `agent/skills/*/SKILL.md` (via `buildSkillIndex` line 258).
     - `graphify-out/graph.json` and `GRAPH_REPORT.md` (via `buildGraphifyContext`).
     - `CZVault/` (via `buildParaContext`).
     - `agent/templates/*.qmd` (via `buildQMDContext`).
   - Missing files are handled by `readFile` returning `''` (line 39) or `listDir` returning `[]` (line 48). No exceptions are thrown.

2. **What does it return when the agent/ tree was NOT scaffolded or dirs are empty — empty string, partial, or throw? Where is the output injected into the launch?**
   - It returns a **partial string** containing only the successfully read layers. If everything is missing, it returns an empty string or just the layer headers.
   - The output is injected into the launch in `src/pages/TerminalPage.tsx:3808-3960`.
   - Specifically, `initContent` is built from `INITIALIZE.md` and context (lines 3833-3850) and then written to the terminal via `window.deskflowAPI?.terminalWrite` (line 3911).

3. **ContextService / ContextConfig / ContextSidebar (the Context tab) — what does the tab display, what IPC populates it, and can the user edit/save context that feeds assembly?**
   - `ContextSidebar` (src/components/ContextSidebar.tsx) displays system counts, token totals, and configuration toggles.
   - It is populated by `getPreferences` and `setPreference` IPCs (lines 191-229).
   - Yes, users can edit/save the config; it is persisted via `window.deskflowAPI.setPreference` and then passed into `assembleContext` by `NewSessionDialog.tsx:618-640`.

## Skills tab
4. **SkillsService — where does it read skills from? Given R1 found those 18 dirs are created EMPTY (no SKILL.md), what does the Skills tab show, and does loading throw or silently render empty?**
   - `SkillsService` reads from `${projectPath}/agent/skills/*/SKILL.md` (`src/services/SkillsService.ts:70-85`).
   - If `SKILL.md` is missing, it skips the directory. If the entire `skills/` dir is empty, it returns `[]`.
   - The Skills tab (`src/pages/TerminalPage.tsx:4721-5522`) silently renders an empty state: `"No project skills. Add from Browse or create one."` (line 5173). It does NOT throw.

5. **How are skills injected into a send (skills.md, per-skill SKILL.md, or a selected-skill picker)? Where does the selected skill get concatenated into the prompt?**
   - Skills are injected in two ways:
     - **Manual Use:** Via `handleUse` in `TerminalPage.tsx:4941-4960`, concatenating: ```const fullPrompt = `[Skill: ${runningSkill.name}]\n${runningSkill.content}${configSection}${userSection}`;```
     - **Compose Picker:** Selected skill IDs are stored in `composeSkills` state (line 3247) and recorded in `session_context` (line 930), but NOT concatenated into the prompt in the `agentSend` path (`src/pages/TerminalPage.tsx:833-963`).

## Files tab
6. **The Files tab — what lists files? Which IPC, and what root path does it use?**
   - `FilesTab` is an inline component in `src/pages/TerminalPage.tsx:5524-5700`.
   - It lists files using `window.deskflowAPI.readAgentFiles(projectPath)` (line 5556).
   - It uses the `projectPath` prop (real project path), falling back to `project?.path`.

7. **Open/edit/save file actions — which IPC channels, and do writes go to the real project path? Any guard if no project is selected?**
   - The Files tab is **read-only**; it only has `readAgentFile` (line 5584).
   - General project writes use `write-project-file` (`src/main.ts:16213`).
   - Writes go to the real project path using `path.join(projectPath, relativePath)`.
   - Guard: `if (!projectPath) return { success: false, error: 'No project path provided' };` (main.ts:16214).

## Data flow & known issues
8. **touched_files / file-lock system — how are edits detected and recorded, and how does this feed back into /sync?**
   - Edits are detected in agent output using a regex in `src/main.ts:7640-7678`.
   - Locks are managed in `src/main.ts:7585-7629` via `fileLocks` map.
   - It records into the `touched_files` table, which is then compiled into a sync summary for `/sync` (`src/main.ts:16562-16660`).

9. **Does context assembly re-read on every send (perf) or cache? Where?**
   - It **re-reads on every call**. There is no caching mechanism in `src/services/ContextService.ts`.

10. **Any PROBLEMS.md / state.md entries about empty context, skills not loading, the Files tab being blank, or context not reaching the agent? Console errors?**
    - `agent/PROBLEMS.md:44` - Duplicate assembly path fix.
    - `agent/PROBLEMS.md:239-244` - FilesTab project selector bug.
    - `agent/state.md:353` - 18 empty skill directories.
    - Console error in `TerminalPage.tsx:4765`: `"[SkillsTab] Failed to load skills"`.
    - Console error in `TerminalPage.tsx:5546`: `"[FilesTab] Failed to load"`.
