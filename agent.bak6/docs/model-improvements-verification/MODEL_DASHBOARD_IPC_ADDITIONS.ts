// ═══════════════════════════════════════════════════════════════════════════════
// MODEL IMPROVEMENT DASHBOARD — IPC ADDITIONS
// Add these to src/main.ts near line 6094 (save-terminal-session handler area)
// ═══════════════════════════════════════════════════════════════════════════════

// ── 1. Runtime variables (add near top of main.ts, after const RULES_REINJECT_THRESHOLD) ──

let runtimeReinjectThreshold: number | null = null; // null = use const fallback
let modelDebugMode = false;
let globalReinjectionCount = 0;      // incremented in maybeReinjectRules()
let globalActionsAttempted = 0;      // incremented in parseAndExecuteActions()
let globalActionsFailed = 0;         // incremented in parseAndExecuteActions()

// Update maybeReinjectRules() to use runtimeReinjectThreshold:
//   const threshold = runtimeReinjectThreshold ?? RULES_REINJECT_THRESHOLD;
//   if (count % threshold === 0) { maybeReinjectRules(terminalId); }
// And inside maybeReinjectRules(), add: globalReinjectionCount++;

// Update parseAndExecuteActions() to increment:
//   globalActionsAttempted++;
//   if (actionFailed) globalActionsFailed++;


// ── 2. New IPC Handlers (add near line 6094) ──────────────────────────────────

ipcMain.handle('get-model-improvement-stats', async (_event, { terminalId } = {}) => {
  try {
    // terminalMessageCounts is the existing Map<string, number>
    const messageCounts: Record<string, number> = {};
    for (const [id, count] of terminalMessageCounts.entries()) {
      if (!terminalId || id === terminalId) {
        messageCounts[id] = count;
      }
    }
    return {
      messageCounts,
      reinjectionCount: globalReinjectionCount,
      threshold: runtimeReinjectThreshold ?? RULES_REINJECT_THRESHOLD,
      actionsAttempted: globalActionsAttempted,
      actionsFailed: globalActionsFailed,
    };
  } catch (err) {
    console.error('[get-model-improvement-stats] error:', err);
    return null;
  }
});

ipcMain.handle('set-reinject-threshold', async (_event, { threshold }: { threshold: number }) => {
  try {
    if (typeof threshold !== 'number' || threshold < 1 || threshold > 100) {
      return { success: false, error: 'threshold must be 1–100' };
    }
    runtimeReinjectThreshold = threshold;
    if (modelDebugMode) {
      console.log(`[ModelDebug] Re-injection threshold set to ${threshold}`);
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: String(err) };
  }
});

ipcMain.handle('set-model-debug', async (_event, { enabled }: { enabled: boolean }) => {
  try {
    modelDebugMode = Boolean(enabled);
    console.log(`[ModelDebug] Debug mode ${modelDebugMode ? 'enabled' : 'disabled'}`);
    return { success: true };
  } catch (err) {
    return { success: false, error: String(err) };
  }
});

ipcMain.handle('read-actions-error-log', async (_event) => {
  try {
    // Find the active project's agent dir. Use first terminal's cwd as base.
    const firstTerminal = terminalManager.terminals.values().next().value;
    if (!firstTerminal?.cwd) {
      return { entries: [], exists: false };
    }
    const logPath = path_1.default.join(firstTerminal.cwd, 'agent', 'actions_error.log');
    if (!fs_1.default.existsSync(logPath)) {
      return { entries: [], exists: false };
    }
    const content = fs_1.default.readFileSync(logPath, 'utf-8');
    const lines = content.trim().split('\n').filter(Boolean);
    // Return last 10 non-empty lines
    const entries = lines.slice(-10);
    return { entries, exists: true };
  } catch (err) {
    console.error('[read-actions-error-log] error:', err);
    return { entries: [], exists: false };
  }
});


// ═══════════════════════════════════════════════════════════════════════════════
// PRELOAD ADDITIONS — src/preload.ts
// Add these inside the contextBridge.exposeInMainWorld('deskflowAPI', { ... }) object
// ═══════════════════════════════════════════════════════════════════════════════

/*
  getModelImprovementStats: (opts?: { terminalId?: string }) =>
    ipcRenderer.invoke('get-model-improvement-stats', opts ?? {}),

  setReinjectThreshold: (payload: { threshold: number }) =>
    ipcRenderer.invoke('set-reinject-threshold', payload),

  setModelDebug: (payload: { enabled: boolean }) =>
    ipcRenderer.invoke('set-model-debug', payload),

  readActionsErrorLog: () =>
    ipcRenderer.invoke('read-actions-error-log'),
*/


// ═══════════════════════════════════════════════════════════════════════════════
// USAGE IN TerminalPage.tsx or Context Maintenance Tab
// ═══════════════════════════════════════════════════════════════════════════════

/*
  import ModelImprovementDashboard from '../components/ModelImprovementDashboard';

  // Inside the sidebar section or as a new tab:
  <ModelImprovementDashboard projectPath={selectedProject?.path} />
*/
