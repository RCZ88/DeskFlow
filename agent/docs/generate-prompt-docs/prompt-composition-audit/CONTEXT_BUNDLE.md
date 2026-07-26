# CONTEXT_BUNDLE.md — Prompt Composition Infrastructure

> Self-contained source-of-truth for DeskFlow's 3-layer system prompt composition system.
> Target AI: Architect AI (Notion AI). Purpose: evaluate, find gaps, produce exact fixes.

## Architecture Overview

DeskFlow composes system prompts in **3 layers** before sending to AI agents running in terminals:

1. **Default (cyan)** — `DEFAULT_SYSTEM_PROMPT` from `src/lib/defaults.ts`
2. **General (blue)** — `preferences.systemPrompts.generalAdditions` (app-wide, single string)
3. **Project (purple)** — `preferences.systemPrompts[projectId]` (per-project, single string)

These layers are assembled in the **renderer** (TerminalPage.tsx) via a `useMemo`, displayed/toggled in the **InstructionPanel** modal, and sent to the agent terminal via `agentSend`.

Additionally, a **per-agent-type** prompt storage exists (`preferences.systemPrompts.claude`, `preferences.systemPrompts.opencode`, `preferences.systemPrompts.custom`) which works as an OR-switch (agent type A gets A's prompt, not stacked).

The server-side **ContextAssemblyService** separately assembles project context, RAG results, compaction summaries, and active problems/requests — this is a different system from the 3-layer prompt composition. It's injected during compose as part of the init content.

---

## 1. DEFAULT_SYSTEM_PROMPT — Two Locations (Must Stay in Sync)

### Location A: `src/lib/defaults.ts` (lines 11-97)
This is the **build-time template** used by the Electron renderer at runtime.

```typescript
export const DEFAULT_SYSTEM_PROMPT = `# DeskFlow AI Agent — System Prompt (v3)

## 0. Who you are
You are a coding agent (opencode / claude / aider / codex) running **inside the DeskFlow Terminal Workspace**.
... [84 lines total]

## 8. Cycle report format
\`\`\`
CYCLE: <n>
...
\`\`\`
Then the \`## Session Metadata\` + \`## Actions\` blocks (§3). This format is mandatory; do not improvise a different one.`;
```

### Location B: `agent/DEFAULT_SYSTEM_PROMPT.md` (87 lines)
This is loaded into the **opencode AI's own context** via `opencode.json` instructions array. It must contain the exact same content as `src/lib/defaults.ts`'s `DEFAULT_SYSTEM_PROMPT`.

```json
{
  "instructions": [
    "AGENTS.md",
    "agent/DEFAULT_SYSTEM_PROMPT.md",
    "agent/dictionary.md",
    "MEMORY.md",
    "agent/state.md"
  ]
}
```

**There is NO sync guard.** If they diverge, the opencode AI gets different instructions than what terminal agents receive.

---

## 2. Preferences Storage for System Prompts

All system prompts are stored in a single `systemPrompts` JSON preference object, persisted by the main process.

### Schema shape:

```typescript
// preferences.systemPrompts
{
  claude: string,           // Per-agent-type: agent-specific additions
  opencode: string,
  custom: string,
  generalAdditions: string, // App-wide, applies to ALL projects
  [projectId: string]: string // Per-project: applies to ONE project
}
```

### Loading (SettingsPage.tsx, lines 1091-1101):
```typescript
useEffect(() => {
  const loadPrompts = async () => {
    if (window.deskflowAPI?.getPreferences) {
      const prefs = await window.deskflowAPI.getPreferences();
      if (prefs?.systemPrompts) {
        setSystemPrompts({ claude: '', opencode: '', custom: '', ...prefs.systemPrompts });
      }
    }
  };
  loadPrompts();
}, []);
```

### Saving (SettingsPage.tsx, lines 1103-1109):
```typescript
const handleSaveSystemPrompt = async (agent: string, content: string) => {
  const updated = { ...systemPrompts, [agent]: content };
  setSystemPrompts(updated);
  if (window.deskflowAPI?.setPreference) {
    await window.deskflowAPI.setPreference('systemPrompts', updated);
  }
};
```

---

## 3. Layer Assembly in TerminalPage (lines 1005-1017)

This `useMemo` creates the 3-layer array for display in the InstructionPanel and for inclusion in the compose prompt:

```typescript
const systemPromptLayers = useMemo(() => {
  const layers: Array<{ label: string; content: string; color: string }> = [];
  layers.push({ label: 'Default', content: DEFAULT_SYSTEM_PROMPT || '', color: 'text-cyan-400' });
  const generalAdditions = preferences?.systemPrompts?.generalAdditions || '';
  if (generalAdditions.trim()) {
    layers.push({ label: 'General', content: generalAdditions, color: 'text-blue-400' });
  }
  const projectPrompt = preferences?.systemPrompts?.[selectedProject || ''] || '';
  if (projectPrompt.trim()) {
    layers.push({ label: 'Project', content: projectPrompt, color: 'text-purple-400' });
  }
  return layers;
}, [preferences, selectedProject]);
```

**Key observations:**
- `generalAdditions` is read from `preferences.systemPrompts.generalAdditions` — but there is **NO UI control** in Settings to edit this specific key.
- The per-agent-type prompts (`claude`, `opencode`, `custom`) are NOT included in these layers — they are handled separately as a system prompt replacement in `initializeTerminal`.
- The `generalAdditions` layer is only shown if it has non-empty content. If it's empty, the layer disappears entirely.
- The layers are passed to InstructionPanel via `systemPromptLayers` prop.

**Where `generalAdditions` gets set**: There is no Settings UI for it. Looking at SettingsPage.tsx lines 1067-1109, only `claude`, `opencode`, `custom` keys are shown. The `generalAdditions` key would need to be set programmatically or via the API directly.

---

## 4. InstructionPanel Rendering (src/components/InstructionPanel.tsx)

### Props (line 45-59):
```typescript
interface SystemPromptLayer {
  label: string;
  content: string;
  color: string;
}

interface InstructionPanelProps {
  problems: Problem[];
  requests: Request[];
  onSend: (config: InstructionConfig) => void;
  onClose: () => void;
  isSending?: boolean;
  projectPath?: string;
  defaultSkills?: string[];
  sessionId?: string;
  activeTerminalId?: string | null;
  isAgentReady?: boolean;
  systemPromptLayers?: SystemPromptLayer[];
  onComposeSkillsChange?: (skills: string[]) => void;
}
```

### State (lines 94-108):
```typescript
const [selectedProblems, setSelectedProblems] = useState<string[]>([]);
const [selectedRequests, setSelectedRequests] = useState<string[]>([]);
const [selectedSkills, setSelectedSkills] = useState<string[]>(defaultSkills || []);
const [customInstruction, setCustomInstruction] = useState('');
const [selectedAgentFiles, setSelectedAgentFiles] = useState<string[]>([]);
const [systemPromptIncluded, setSystemPromptIncluded] = useState(true);
const [layerToggles, setLayerToggles] = useState<Record<number, boolean>>({});
```

### generatePrompt() function (lines 193-274):
```typescript
const generatePrompt = (): string => {
  const parts: string[] = [];

  // System prompt layers (togglable individually)
  if (systemPromptIncluded && systemPromptLayers && systemPromptLayers.length > 0) {
    const includedContent = systemPromptLayers
      .map((layer, i) => {
        const toggled = layerToggles[i];
        if (toggled === false) return '';
        return layer.content?.trim() || '';
      })
      .filter(c => c.length > 0)
      .join('\n\n---\n\n');
    if (includedContent) {
      parts.push(includedContent);
    }
  }

  // Skills (with DSL parameter values)
  for (const skillId of selectedSkills) {
    const skill = skills.find(s => s.id === skillId);
    if (skill) {
      parts.push(`## Skill: ${skill.name}\n...`);
      if (skill.content) parts.push(`${skill.content}\n`);
    }
  }

  // Skill Configuration (DSL values)
  // Problems to Address
  // Requests to Implement
  // Agent Files
  // Custom Instructions (## Instructions)

  return parts.join('\n---\n\n');
};
```

### Layer display in UI (lines 314-388):
System prompt layers rendered as collapsible sections with:
- Each layer showing its color-coded label (cyan/blue/purple)
- Individual toggle per layer
- Character count
- First 300 chars preview
- Master "Include" toggle
- When master toggle is off, shows "System prompt will not be sent to terminal"

### Send handler (lines 648-670):
```typescript
onSend({
  problems: selectedProblems,
  requests: selectedRequests,
  skills: selectedSkills,
  instruction: customInstruction,
  prompt: generatePrompt(),   // The composed prompt
  systemPromptIncluded: systemPromptIncluded,
});
```

---

## 5. initializeTerminal — New Session Path (lines 756-884)

This path is used when creating a **new terminal session** via "New Agent" dialog. Note: it does NOT use the 3-layer composition — it uses a different prompt resolution strategy.

```typescript
const initializeTerminal = useCallback(async (terminalId, agent, resumeId?, initContent?, systemPrompt?, projectPath?) => {
  // ... verify agent, wait for terminal ready, write banner, launch agent ...

  // ═══ WRITE SYSTEM PROMPT + INIT CONTENT ═══
  const parts: string[] = [];
  if (systemPrompt) {
    parts.push(systemPrompt);  // Explicit systemPrompt passed in
  } else {
    const prefs = await window.deskflowAPI?.getPreferences?.();
    const prompts = prefs?.systemPrompts || {};
    const prompt = prompts[agent] || prompts['claude'] || '';  // Per-agent-type prompt
    if (prompt) parts.push(prompt);
  }
  if (initContent) {
    parts.push(initContent);  // The init content (INITIALIZE.md + state + problems)
  }
  if (thoughtProcessEnabled) {
    parts.push(`## Thought Process\n\n...`);
  }
  if (parts.length > 0 && window.deskflowAPI?.agentSend) {
    const combined = parts.join('\n\n');
    await window.deskflowAPI.agentSend(terminalId, combined, agent);
  }
}, [thoughtProcessEnabled, showError]);
```

**Key observations:**
- This path reads `prompts[agent]` — the per-agent-type addition string (e.g., `systemPrompts.claude`).
- It does NOT use `systemPromptLayers` (no 3-layer composition).
- It does NOT include `generalAdditions` or `projectPrompt`.
- The selected agent type determines which prompt is used (e.g., `claude`, `opencode`).
- The `systemPrompt` parameter passed in from NewSessionDialog overrides everything.

---

## 6. handleInstructionPanelSend — Compose Path (lines 1020-1146)

This path is used when the user clicks "Send to Terminal" from the InstructionPanel. The config.prompt is the pre-composed string from `generatePrompt()`.

```typescript
const handleInstructionPanelSend = useCallback(async (config) => {
  // ... resolve target terminal, build topic, save session ...

  // ═══ SEND PROMPT ═══
  const sendResult = await window.deskflowAPI?.agentSend?.(
    resolvedTargetId,
    config.prompt,                     // Already composed by InstructionPanel
    config.agent || existingSession?.agent || 'claude'
  );

  // ═══ UPDATE BINDING ═══
  await window.deskflowAPI?.updateTerminalBinding({
    terminalId: resolvedTargetId,
    updates: {
      active_problem_id: config.problems[0] || null,
      session_context: JSON.stringify({
        problems: config.problems,
        requests: config.requests,
        skills: config.skills,
        systemPromptIncluded: config.systemPromptIncluded,
      }),
    },
  });
}, [...]);  // 12 deps
```

---

## 7. Settings UI — System Prompts Tab (SettingsPage.tsx, lines 2819-2882)

```typescript
{activeTab === 'prompts' && (
  <div data-section="settings.prompts" className="space-y-4">
    <GlassCard>
      {/* Default prompt preview (collapsible) */}
      <details>
        <summary>Default Prompt (always prepended)</summary>
        <pre>{DEFAULT_SYSTEM_PROMPT}</pre>
      </details>

      {/* Per-agent-type additions */}
      {['claude', 'opencode', 'custom'].map(agent => {
        const additions = systemPrompts[agent] || '';
        return (
          <div key={agent}>
            <label>{agent === 'custom' ? 'Custom AI' : agent}</label>
            <textarea
              value={additions}
              onChange={(e) => setSystemPrompts(prev => ({ ...prev, [agent]: e.target.value }))}
              onBlur={() => handleSaveSystemPrompt(agent, systemPrompts[agent])}
              placeholder="Add instructions that will be appended to the default prompt..."
            />
            {/* Merged prompt preview (collapsible) */}
            <details>
              <summary>Preview merged prompt</summary>
              <pre>{merged}</pre>
            </details>
          </div>
        );
      })}
    </GlassCard>
  </div>
)}
```

**Key observations:**
- No UI for `generalAdditions` key
- No UI for per-project system prompts
- Per-agent-type textarea implies these are "additions" that get appended to Default, but the label says "General prompts apply to all projects" — ambiguous wording
- The `merged` variable on line 2842 is always `DEFAULT_SYSTEM_PROMPT + additions` — there is no conditional
- No Settings UI for `projectPrompt` keys

---

## 8. ContextAssemblyService (Server-Side, src/services/ContextAssemblyService.ts, 366 lines)

This is a **separate system** from the 3-layer prompt composition. It runs in the main process and assembles context for agent prompts:

```typescript
public async assembleContext(config: ContextAssemblyConfig): Promise<ContextAssemblyResult> {
  // 1. Load Project Contexts (enabled systems: skills, graphify, wiki, PARA, QMD, automations)
  // 2. Query Recent Messages from RAG
  // 3. Include Recent Decisions (from state.md)
  // 4. Include Active Problems and Requests
  // 5. Include Compaction Summaries (last 3 months)
  // 6. Assemble Final Context (respects token budget)
}
```

Token budget: 7K total (core 1.5K, design 0.8K, codebase 2.4K, project state 0.6K, context maintenance 1.3K).

**This service is NOT wired into the InstructionPanel compose flow.** It's used for the `/sync` command and for general context assembly. The InstructionPanel only uses the 3-layer system prompt + skills + problems + requests + instruction text.

---

## 9. InstructionPanel Passed from TerminalPage

The layers and handler are wired in TerminalPage (grep for `InstructionPanel` usage):

```typescript
// TerminalPage passes systemPromptLayers to InstructionPanel:
<InstructionPanel
  systemPromptLayers={systemPromptLayers}
  onSend={handleInstructionPanelSend}
  ...
/>
```

The `systemPromptLayers` props are passed from the `useMemo` at line 1005.

---

## 10. opencode.json — Agent Context Loading

```json
{
  "instructions": [
    "AGENTS.md",
    "agent/DEFAULT_SYSTEM_PROMPT.md",
    "agent/dictionary.md",
    "MEMORY.md",
    "agent/state.md"
  ]
}
```

Note: This loads `DEFAULT_SYSTEM_PROMPT.md` into the opencode AI's context, but does NOT load generalAdditions, projectPrompt, or any other application preferences.

---

## Summary of All Prompt Storage Locations

| Key | Type | Set via | Read by | Scope |
|-----|------|---------|---------|-------|
| `src/lib/defaults.ts` DEFAULT_SYSTEM_PROMPT | Build-time template | Code change | All paths (runtime import) | App-wide |
| `agent/DEFAULT_SYSTEM_PROMPT.md` | Markdown file | Code change | opencode.json (opencode context) | opencode AI only |
| `prefs.systemPrompts.generalAdditions` | Single string | Must be set via API | systemPromptLayers useMemo | App-wide |
| `prefs.systemPrompts[projectId]` | Per-project string | Must be set via API | systemPromptLayers useMemo | Per-project |
| `prefs.systemPrompts.claude` | Agent-type string | Settings → Prompts UI | initializeTerminal | Per-agent-type |
| `prefs.systemPrompts.opencode` | Agent-type string | Settings → Prompts UI | initializeTerminal | Per-agent-type |
| `prefs.systemPrompts.custom` | Agent-type string | Settings → Prompts UI | initializeTerminal | Per-agent-type |

---

## Known Gaps / Issues to Evaluate

1. **No sync guard** between `src/lib/defaults.ts` and `agent/DEFAULT_SYSTEM_PROMPT.md`
2. **`generalAdditions` has no Settings UI** — exists in preference schema and read by layer composer, but users can't set it
3. **`projectPrompt` has no Settings UI** — exists in preference schema and read by layer composer, but users can't set it
4. **Two disjoint prompt paths**: `initializeTerminal` (new session, uses per-agent-type prompts) vs `generatePrompt` (InstructionPanel, uses 3 layers). The 3-layer system is not used in the new-session path.
5. **Per-agent-type vs general ambiguity**: Settings label says "General prompts apply to all projects" but the input is per-agent-type (claude/opencode/custom), not truly general
6. **`generalAdditions` vs per-agent-type overlap**: If a user sets both `generalAdditions` and `systemPrompts.claude`, the `initializeTerminal` path only uses the latter — the app-wide generalAdditions are ignored during session creation
7. **No per-project prompt UI**: Project-specific prompts require API calls
8. **No conflict resolution strategy**: If Default says "do X", General says "never do X", and Project says "do Y sometimes" — there's no priority/override system
