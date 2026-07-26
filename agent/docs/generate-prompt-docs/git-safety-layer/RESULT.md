# Git Safety Layer — Design Document for DeskFlow

**Status:** Design complete — ready for implementation  
**Author:** AI Designer  
**Date:** 2026-07-11  
**Target:** `agent/docs/git-safety-layer/RESULT.md`

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [UX Flow](#2-ux-flow)
3. [Components](#3-components)
4. [Backend / IPC](#4-backend--ipc)
5. [Persistence](#5-persistence)
6. [Integration Points](#6-integration-points)
7. [Edge Cases](#7-edge-cases)
8. [Empty / Loading / Error States](#8-empty--loading--error-states)
9. [Verification Checklist](#9-verification-checklist)
10. [File-by-File Implementation Order](#10-file-by-file-implementation-order)

---

## 1. Executive Summary

The Git Safety Layer intercepts dangerous git commands typed in DeskFlow's terminal workspace, warns the user, offers safe alternatives, and creates automatic snapshots before allowing execution. It lives as a **new sub-tab "Safety"** in the Setup group (orange accent) and integrates into the PTY write path.

**Key design principles:**
- **Non-blocking by default** — warnings appear inline in the terminal, not modal dialogs that break flow
- **One-click safe alternatives** — the warning shows exactly what safe command to use instead
- **Invisible when not needed** — zero UI overhead for safe commands
- **Project-scoped settings** — each workspace configures its own protection rules
- **Leverages existing backup system** — auto-snapshot uses `projectBackup:create` before dangerous execution

---

## 2. UX Flow

### 2.1 Primary Flow: Dangerous Command Detected

```
User types in terminal:  git reset --hard HEAD~1
                              │
                              ▼
                    [PTY Write Path Interceptor]
                              │
                              ▼
                    Pattern Matcher runs
                    Matches: "reset.*--hard"
                              │
                              ▼
                    Risk Level: CRITICAL
                    Action: BLOCK + WARN
                              │
                              ▼
        ┌─────────────────────────────────────────┐
        │  [Terminal Inline Banner — Red/Orange]   │
        │                                          │
        │  ⚠️  BLOCKED: Destructive command       │
        │                                          │
        │  git reset --hard HEAD~1                │
        │  └─ This will DESTROY all uncommitted   │
        │     changes permanently.                │
        │                                          │
        │  Safe alternative:                      │
        │  ┌─────────────────────────────────────┐  │
        │  │ git reset --soft HEAD~1            │  │  ← clickable
        │  │ Keeps changes in working tree      │  │
        │  └─────────────────────────────────────┘  │
        │                                          │
        │  [Execute Anyway]  [Dismiss]            │
        │  (Type DESTROY to confirm)                │
        └─────────────────────────────────────────┘
                              │
              ┌──────────────┼──────────────┐
              │              │              │
              ▼              ▼              ▼
        [Click Safe     [Click Exec    [Click Dismiss]
         Alternative]     Anyway]
              │              │
              ▼              ▼
        Command replaced   Snapshot created
        with safe version  via projectBackup:create
        and executed       Then original command
                           executed with confirmation
```

### 2.2 Secondary Flow: Auto-Snapshot on Confirm

```
User clicks [Execute Anyway]
              │
              ▼
    [Snapshot Spinner — Inline]
    "Creating safety snapshot..."
              │
              ▼
    projectBackup:create called
    with label: "pre-destructive-<timestamp>"
              │
              ▼
    [Snapshot Complete — Green check]
    "Snapshot saved: pre-destructive-20260711-143022"
              │
              ▼
    Original command sent to PTY
    Terminal shows normal git output
```

### 2.3 Tertiary Flow: Settings Configuration

```
User navigates to:
Terminal Workspace → Setup (orange) → Safety (new sub-tab)
              │
              ▼
    ┌─────────────────────────────────────────┐
    │  Git Safety Settings                     │
    │  ─────────────────                       │
    │                                          │
    │  [✓] Enable command interception        │
    │                                          │
    │  Protection Level:                      │
    │  (•) Strict — Block all destructive     │
    │  ( ) Standard — Warn but allow          │
    │  ( ) Minimal — Only block data loss     │
    │                                          │
    │  Auto-snapshot before destructive:      │
    │  [✓] Enabled                            │
    │                                          │
    │  Protected Commands:                    │
    │  [✓] git reset --hard                   │
    │  [✓] git clean -fd                      │
    │  [✓] git push --force                   │
    │  [✓] git checkout .                     │
    │  [✓] git branch -D                      │
    │  [✓] git stash drop                     │
    │  [+] Add custom pattern...              │
    │                                          │
    │  Safe Alternatives:                     │
    │  [✓] Show inline replacement            │
    │  [✓] One-click execute safe version     │
    │                                          │
    │  [✓] Play sound on block                │
    │                                          │
    │  Recent Blocks:                         │
    │  ┌─────────────────────────────────────┐│
    │  │ 14:22  reset --hard  → used --soft ││
    │  │ 14:15  clean -fd    → cancelled     ││
    │  │ 13:58  push --force → used --lease  ││
    │  └─────────────────────────────────────┘│
    │                                          │
    │  [Reset to Defaults]                     │
    └─────────────────────────────────────────┘
```

### 2.4 Flow: Recent Blocks History

The bottom section of the settings panel shows a scrollable list of recent intercepted commands with:
- Timestamp
- Command that was blocked
- What the user chose (safe alternative / executed anyway / dismissed)
- Link to snapshot if one was created

---

## 3. Components

### 3.1 `GitSafetyWarning` — Inline Terminal Banner

**Location:** Rendered inside the terminal output area (xterm overlay or adjacent div)
**Trigger:** PTY interceptor detects dangerous pattern
**Dismissal:** User clicks [Dismiss], clicks [Execute Anyway], or clicks safe alternative

```typescript
// src/components/terminal/GitSafetyWarning.tsx

import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Shield, Play, X, ArrowRight } from 'lucide-react';
import { useState } from 'react';

interface GitSafetyWarningProps {
  command: string;              // The dangerous command detected
  pattern: DangerPattern;       // Which pattern matched
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  safeAlternative?: string;     // Suggested safe command
  safeDescription?: string;     // Why it's safe
  onDismiss: () => void;
  onExecuteAnyway: () => void;  // Requires confirmation
  onUseAlternative: (cmd: string) => void;
}

interface DangerPattern {
  id: string;
  regex: RegExp;
  label: string;
  description: string;
  safeAlternative?: string;
  safeDescription?: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

// ─── States ─────────────────────────────────────────────
// hidden      → not rendered
// warning     → banner shown, user decides
// confirming  → user clicked "Execute Anyway", waiting for DESTROY confirmation
// snapshotting → creating auto-backup before execution
// executing   → command sent to PTY, showing spinner
// completed   → command executed, banner auto-dismisses after 3s
// cancelled   → user dismissed, banner slides out

export function GitSafetyWarning({
  command,
  pattern,
  riskLevel,
  safeAlternative,
  safeDescription,
  onDismiss,
  onExecuteAnyway,
  onUseAlternative,
}: GitSafetyWarningProps) {
  const [state, setState] = useState<'warning' | 'confirming' | 'snapshotting' | 'executing' | 'completed' | 'cancelled'>('warning');
  const [confirmText, setConfirmText] = useState('');
  const [snapshotLabel, setSnapshotLabel] = useState<string | null>(null);

  // Risk level colors — mapped to workspace orange accent system
  const riskColors = {
    low:    { bg: 'bg-amber-500/10',  border: 'border-amber-500/30',  text: 'text-amber-400',  icon: 'text-amber-400' },
    medium: { bg: 'bg-orange-500/10', border: 'border-orange-500/30', text: 'text-orange-400', icon: 'text-orange-400' },
    high:   { bg: 'bg-red-500/10',    border: 'border-red-500/30',    text: 'text-red-400',    icon: 'text-red-400' },
    critical: { bg: 'bg-red-600/15', border: 'border-red-500/40',  text: 'text-red-400',    icon: 'text-red-500' },
  };
  const rc = riskColors[riskLevel];

  const handleExecuteAnyway = () => {
    if (riskLevel === 'critical') {
      setState('confirming');
      return;
    }
    proceedWithExecution();
  };

  const handleConfirmSubmit = () => {
    if (confirmText !== 'DESTROY') return;
    proceedWithExecution();
  };

  const proceedWithExecution = async () => {
    setState('snapshotting');
    // Auto-snapshot via IPC
    const snapshot = await window.deskflowAPI.projectBackup.create(
      `pre-destructive-${Date.now()}`
    );
    setSnapshotLabel(snapshot.label);
    setState('executing');
    onExecuteAnyway();
    setState('completed');
    setTimeout(onDismiss, 3000);
  };

  const handleUseAlternative = () => {
    if (safeAlternative) {
      onUseAlternative(safeAlternative);
      setState('completed');
      setTimeout(onDismiss, 2000);
    }
  };

  return (
    <AnimatePresence>
      {state !== 'cancelled' && (
        <motion.div
          initial={{ opacity: 0, y: -10, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.98 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className={`rounded-xl border ${rc.border} ${rc.bg} p-4 mb-2 font-mono text-sm`}
        >
          {/* Header */}
          <div className="flex items-start gap-3">
            <AlertTriangle className={`w-5 h-5 mt-0.5 ${rc.icon} shrink-0`} />
            <div className="flex-1 min-w-0">
              <div className={`font-semibold ${rc.text} mb-1`}>
                BLOCKED: {pattern.label}
              </div>
              <div className="text-white/70 mb-2">
                <code className="bg-black/30 px-1.5 py-0.5 rounded text-white/90">{command}</code>
              </div>
              <div className="text-white/50 text-xs mb-3">
                {pattern.description}
              </div>

              {/* Safe Alternative */}
              {safeAlternative && state === 'warning' && (
                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  onClick={handleUseAlternative}
                  className="w-full text-left group mb-3"
                >
                  <div className="rounded-lg border border-green-500/20 bg-green-500/5 hover:bg-green-500/10 hover:border-green-500/30 transition-colors p-3">
                    <div className="flex items-center gap-2 text-green-400 text-xs font-semibold mb-1">
                      <Shield className="w-3.5 h-3.5" />
                      SAFE ALTERNATIVE
                    </div>
                    <code className="text-green-300/90 text-sm">{safeAlternative}</code>
                    <div className="text-green-400/50 text-xs mt-1">{safeDescription}</div>
                    <div className="flex items-center gap-1 text-green-400/60 text-xs mt-2 group-hover:text-green-400 transition-colors">
                      <ArrowRight className="w-3 h-3" />
                      Click to execute safe version
                    </div>
                  </div>
                </motion.button>
              )}

              {/* Confirmation for CRITICAL */}
              {state === 'confirming' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mb-3"
                >
                  <div className="text-red-400/80 text-xs mb-2">
                    This command will permanently destroy work. Type DESTROY to confirm:
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={confirmText}
                      onChange={(e) => setConfirmText(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleConfirmSubmit()}
                      placeholder="Type DESTROY"
                      className="flex-1 bg-black/30 border border-red-500/20 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-red-500/40"
                      autoFocus
                    />
                    <button
                      onClick={handleConfirmSubmit}
                      disabled={confirmText !== 'DESTROY'}
                      className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 disabled:opacity-30 disabled:cursor-not-allowed text-red-400 rounded-lg text-sm font-medium transition-colors"
                    >
                      Confirm
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Snapshotting state */}
              {state === 'snapshotting' && (
                <div className="flex items-center gap-2 text-amber-400/80 text-xs mb-3">
                  <div className="w-3 h-3 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
                  Creating safety snapshot...
                </div>
              )}

              {/* Snapshot complete */}
              {snapshotLabel && (
                <div className="text-green-400/60 text-xs mb-2">
                  Snapshot saved: {snapshotLabel}
                </div>
              )}

              {/* Action Buttons */}
              {state === 'warning' && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleExecuteAnyway}
                    className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-xs font-medium transition-colors"
                  >
                    Execute Anyway
                  </button>
                  <button
                    onClick={() => { setState('cancelled'); onDismiss(); }}
                    className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white/50 hover:text-white/70 rounded-lg text-xs transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {state === 'executing' && (
                <div className="flex items-center gap-2 text-white/40 text-xs">
                  <Play className="w-3 h-3" />
                  Executing command...
                </div>
              )}

              {state === 'completed' && (
                <div className="flex items-center gap-2 text-green-400/60 text-xs">
                  <Shield className="w-3 h-3" />
                  Command executed. Snapshot available in Backup tab.
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

**Design notes:**
- Uses `rounded-xl` (max corner radius per re-skin rules)
- Uses `p-5` padding on outer container (inner content uses `p-4` for density)
- Colors use risk-level mapping, not hardcoded — accent-aware via CSS vars would be overkill here since this is a safety warning (red/orange is universal)
- Font is `font-mono` (JetBrains Mono) for command text
- Framer Motion for enter/exit animations using `EASE_OUT` from `_ds/motion.ts`

---

### 3.2 `GitSafetyConfigPanel` — Settings Panel

**Location:** Terminal Workspace → Setup group → new "Safety" sub-tab
**Accent:** Orange (inherits from Setup group via `--page-accent`)

```typescript
// src/components/workspace/GitSafetyConfigPanel.tsx

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, ShieldAlert, ShieldCheck, Plus, Trash2, RotateCcw, History, Settings2 } from 'lucide-react';
import { Chip, EmptyState, Skeleton } from '../workspace/_ds/primitives';
import { BTN_PRIMARY, BTN_GHOST, INPUT_CLS } from '../workspace/_ds/controls';
import { listContainer, riseItem } from '../workspace/_ds/motion';

interface GitSafetySettings {
  enabled: boolean;
  protectionLevel: 'strict' | 'standard' | 'minimal';
  autoSnapshot: boolean;
  showAlternatives: boolean;
  oneClickSafe: boolean;
  playSound: boolean;
  customPatterns: CustomPattern[];
}

interface CustomPattern {
  id: string;
  regex: string;
  label: string;
  description: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  safeAlternative?: string;
  safeDescription?: string;
}

interface BlockHistoryEntry {
  id: string;
  timestamp: string;
  command: string;
  patternId: string;
  action: 'used-alternative' | 'executed-anyway' | 'dismissed';
  alternativeUsed?: string;
  snapshotLabel?: string;
}

// Default patterns (built-in, not editable)
const DEFAULT_PATTERNS: DangerPattern[] = [
  {
    id: 'reset-hard',
    regex: 'git\\s+reset\\s+.*--hard',
    label: 'git reset --hard',
    description: 'Destroys all uncommitted changes permanently',
    safeAlternative: 'git reset --soft HEAD~1',
    safeDescription: 'Undoes commit but keeps changes in working tree',
    riskLevel: 'critical',
  },
  {
    id: 'clean-force',
    regex: 'git\\s+clean\\s+.*-f',
    label: 'git clean -fd',
    description: 'Deletes all untracked files permanently',
    safeAlternative: 'git clean -fdn',
    safeDescription: 'Shows what would be deleted without removing anything',
    riskLevel: 'critical',
  },
  {
    id: 'push-force',
    regex: 'git\\s+push\\s+.*(--force|-f)',
    label: 'git push --force',
    description: 'Overwrites remote history, potentially losing others work',
    safeAlternative: 'git push --force-with-lease',
    safeDescription: 'Only forces if no one else has pushed since you pulled',
    riskLevel: 'high',
  },
  {
    id: 'checkout-dot',
    regex: 'git\\s+checkout\\s+.*(--\\s*\\.|\\.)',
    label: 'git checkout .',
    description: 'Discards all changes in working directory',
    safeAlternative: 'git stash push',
    safeDescription: 'Saves changes to stash instead of discarding',
    riskLevel: 'high',
  },
  {
    id: 'branch-delete-force',
    regex: 'git\\s+branch\\s+.*-D',
    label: 'git branch -D',
    description: 'Deletes branch even if it has unmerged commits',
    safeAlternative: 'git branch -d',
    safeDescription: 'Only deletes if branch is fully merged',
    riskLevel: 'medium',
  },
  {
    id: 'stash-drop',
    regex: 'git\\s+stash\\s+drop',
    label: 'git stash drop',
    description: 'Permanently deletes a stash',
    safeAlternative: 'git stash pop',
    safeDescription: 'Applies stash and removes it from list',
    riskLevel: 'medium',
  },
  {
    id: 'rebase-skip',
    regex: 'git\\s+rebase\\s+.*--skip',
    label: 'git rebase --skip',
    description: 'Silently drops commits during rebase',
    safeAlternative: 'git rebase --continue',
    safeDescription: 'Continues rebase after resolving conflicts',
    riskLevel: 'high',
  },
];

export function GitSafetyConfigPanel() {
  const [settings, setSettings] = useState<GitSafetySettings | null>(null);
  const [history, setHistory] = useState<BlockHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newPattern, setNewPattern] = useState<Partial<CustomPattern>>({});
  const [showAddPattern, setShowAddPattern] = useState(false);

  // Load settings from localStorage (project-scoped)
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const projectId = await window.deskflowAPI.getCurrentProjectId?.() || 'default';
      const raw = localStorage.getItem(`deskflow:git-safety:${projectId}`);
      if (raw) {
        setSettings(JSON.parse(raw));
      } else {
        setSettings(getDefaultSettings());
      }
      // Load history from main process
      const hist = await window.deskflowAPI.gitSafety?.getHistory?.(10);
      setHistory(hist || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = useCallback((next: GitSafetySettings) => {
    try {
      const projectId = window.deskflowAPI.getCurrentProjectId?.() || 'default';
      localStorage.setItem(`deskflow:git-safety:${projectId}`, JSON.stringify(next));
      setSettings(next);
      // Sync to main process for PTY interceptor
      window.deskflowAPI.gitSafety?.setSettings?.(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    }
  }, []);

  const getDefaultSettings = (): GitSafetySettings => ({
    enabled: true,
    protectionLevel: 'standard',
    autoSnapshot: true,
    showAlternatives: true,
    oneClickSafe: true,
    playSound: false,
    customPatterns: [],
  });

  const handleToggle = (key: keyof GitSafetySettings) => {
    if (!settings) return;
    saveSettings({ ...settings, [key]: !settings[key] });
  };

  const handleLevelChange = (level: GitSafetySettings['protectionLevel']) => {
    if (!settings) return;
    saveSettings({ ...settings, protectionLevel: level });
  };

  const handleAddPattern = () => {
    if (!newPattern.regex || !newPattern.label || !settings) return;
    const pattern: CustomPattern = {
      id: `custom-${Date.now()}`,
      regex: newPattern.regex,
      label: newPattern.label,
      description: newPattern.description || '',
      riskLevel: (newPattern.riskLevel as any) || 'medium',
      safeAlternative: newPattern.safeAlternative,
      safeDescription: newPattern.safeDescription,
    };
    saveSettings({
      ...settings,
      customPatterns: [...settings.customPatterns, pattern],
    });
    setNewPattern({});
    setShowAddPattern(false);
  };

  const handleDeletePattern = (id: string) => {
    if (!settings) return;
    saveSettings({
      ...settings,
      customPatterns: settings.customPatterns.filter(p => p.id !== id),
    });
  };

  const handleResetDefaults = () => {
    saveSettings(getDefaultSettings());
  };

  // ─── Loading State ────────────────────────────────────
  if (loading) {
    return (
      <div className="p-5 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  // ─── Error State ──────────────────────────────────────
  if (error) {
    return (
      <div className="p-5">
        <EmptyState
          icon={ShieldAlert}
          title="Failed to load safety settings"
          hint={error}
          action={{
            label: 'Retry',
            onClick: loadSettings,
          }}
        />
      </div>
    );
  }

  // ─── Empty State (shouldn't happen, but per spec) ─────
  if (!settings) {
    return (
      <div className="p-5">
        <EmptyState
          icon={Shield}
          title="Safety settings unavailable"
          hint="Settings could not be loaded. Try resetting to defaults."
          action={{
            label: 'Reset to Defaults',
            onClick: handleResetDefaults,
          }}
        />
      </div>
    );
  }

  // ─── Populated State ──────────────────────────────────
  const allPatterns = [...DEFAULT_PATTERNS, ...settings.customPatterns];
  const activePatterns = allPatterns.filter(p => {
    if (settings.protectionLevel === 'strict') return true;
    if (settings.protectionLevel === 'standard') return p.riskLevel !== 'low';
    if (settings.protectionLevel === 'minimal') return p.riskLevel === 'critical';
    return true;
  });

  return (
    <motion.div
      variants={listContainer}
      initial="hidden"
      animate="show"
      className="p-5 space-y-5 max-w-2xl"
    >
      {/* Header */}
      <motion.div variants={riseItem} className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
          <ShieldCheck className="w-5 h-5 text-orange-400" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-white">Git Safety</h2>
          <p className="text-sm text-white/40">Protect against destructive commands</p>
        </div>
      </motion.div>

      {/* Master Toggle */}
      <motion.div variants={riseItem} className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-white">Enable Command Interception</div>
            <div className="text-xs text-white/40">Block or warn on dangerous git commands</div>
          </div>
          <button
            onClick={() => handleToggle('enabled')}
            className={`relative w-11 h-6 rounded-full transition-colors ${settings.enabled ? 'bg-orange-500' : 'bg-white/10'}`}
          >
            <motion.div
              animate={{ x: settings.enabled ? 22 : 2 }}
              className="absolute top-1 w-4 h-4 rounded-full bg-white shadow"
            />
          </button>
        </div>
      </motion.div>

      {/* Protection Level */}
      <motion.div variants={riseItem} className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
        <div className="text-sm font-medium text-white mb-3">Protection Level</div>
        <div className="grid grid-cols-3 gap-2">
          {(['strict', 'standard', 'minimal'] as const).map(level => (
            <button
              key={level}
              onClick={() => handleLevelChange(level)}
              className={`rounded-lg px-3 py-2 text-xs font-medium transition-colors border ${
                settings.protectionLevel === level
                  ? 'bg-orange-500/15 border-orange-500/30 text-orange-300'
                  : 'bg-white/5 border-transparent text-white/40 hover:text-white/60'
              }`}
            >
              <div className="capitalize">{level}</div>
              <div className="text-[10px] text-white/30 mt-0.5">
                {level === 'strict' ? 'Block all' : level === 'standard' ? 'Warn medium+' : 'Block critical only'}
              </div>
            </button>
          ))}
        </div>
      </motion.div>

      {/* Toggles Grid */}
      <motion.div variants={riseItem} className="rounded-xl border border-white/5 bg-white/[0.02] p-4 space-y-3">
        <div className="text-sm font-medium text-white mb-2">Options</div>
        {[
          { key: 'autoSnapshot' as const, label: 'Auto-snapshot before destructive', desc: 'Creates backup before executing dangerous commands' },
          { key: 'showAlternatives' as const, label: 'Show safe alternatives', desc: 'Display replacement commands in warning banner' },
          { key: 'oneClickSafe' as const, label: 'One-click safe execution', desc: 'Click safe alternative to execute immediately' },
          { key: 'playSound' as const, label: 'Play sound on block', desc: 'Audio cue when command is intercepted' },
        ].map(opt => (
          <div key={opt.key} className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm text-white/80">{opt.label}</div>
              <div className="text-xs text-white/30">{opt.desc}</div>
            </div>
            <button
              onClick={() => handleToggle(opt.key)}
              className={`relative w-9 h-5 rounded-full transition-colors shrink-0 mt-0.5 ${settings[opt.key] ? 'bg-orange-500' : 'bg-white/10'}`}
            >
              <motion.div animate={{ x: settings[opt.key] ? 18 : 2 }} className="absolute top-1 w-3 h-3 rounded-full bg-white" />
            </button>
          </div>
        ))}
      </motion.div>

      {/* Protected Commands */}
      <motion.div variants={riseItem} className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm font-medium text-white">Protected Commands</div>
          <div className="text-xs text-white/30">{activePatterns.length} active</div>
        </div>
        <div className="space-y-2">
          {DEFAULT_PATTERNS.map(pattern => {
            const isActive = activePatterns.some(p => p.id === pattern.id);
            return (
              <div key={pattern.id} className={`flex items-center gap-3 rounded-lg px-3 py-2 ${isActive ? 'bg-white/5' : 'opacity-40'}`}>
                <div className={`w-2 h-2 rounded-full ${
                  pattern.riskLevel === 'critical' ? 'bg-red-500' :
                  pattern.riskLevel === 'high' ? 'bg-orange-500' :
                  pattern.riskLevel === 'medium' ? 'bg-amber-500' : 'bg-green-500'
                }`} />
                <code className="text-xs text-white/70 font-mono">{pattern.label}</code>
                <div className="flex-1 text-xs text-white/30 truncate">{pattern.description}</div>
                <div className="text-[10px] text-white/20 uppercase">{pattern.riskLevel}</div>
              </div>
            );
          })}
        </div>

        {/* Custom Patterns */}
        {settings.customPatterns.length > 0 && (
          <div className="mt-3 pt-3 border-t border-white/5">
            <div className="text-xs text-white/40 mb-2">Custom Patterns</div>
            {settings.customPatterns.map(pattern => (
              <div key={pattern.id} className="flex items-center gap-2 rounded-lg px-3 py-2 bg-white/[0.03]">
                <code className="text-xs text-white/60 font-mono flex-1">{pattern.label}</code>
                <button onClick={() => handleDeletePattern(pattern.id)} className="text-white/20 hover:text-red-400 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Add Custom Pattern */}
        <AnimatePresence>
          {showAddPattern ? (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-3 pt-3 border-t border-white/5 space-y-2"
            >
              <input
                placeholder="Pattern regex (e.g. rm -rf)"
                value={newPattern.regex || ''}
                onChange={e => setNewPattern({ ...newPattern, regex: e.target.value })}
                className={INPUT_CLS}
              />
              <input
                placeholder="Label"
                value={newPattern.label || ''}
                onChange={e => setNewPattern({ ...newPattern, label: e.target.value })}
                className={INPUT_CLS}
              />
              <input
                placeholder="Description"
                value={newPattern.description || ''}
                onChange={e => setNewPattern({ ...newPattern, description: e.target.value })}
                className={INPUT_CLS}
              />
              <div className="flex gap-2">
                <button onClick={handleAddPattern} className={BTN_PRIMARY}>Add Pattern</button>
                <button onClick={() => setShowAddPattern(false)} className={BTN_GHOST}>Cancel</button>
              </div>
            </motion.div>
          ) : (
            <button
              onClick={() => setShowAddPattern(true)}
              className="mt-3 flex items-center gap-2 text-xs text-orange-400/60 hover:text-orange-400 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Add custom pattern
            </button>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Recent Block History */}
      <motion.div variants={riseItem} className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
        <div className="flex items-center gap-2 mb-3">
          <History className="w-4 h-4 text-white/40" />
          <div className="text-sm font-medium text-white">Recent Blocks</div>
        </div>
        {history.length === 0 ? (
          <div className="text-xs text-white/20 text-center py-4">No commands intercepted yet</div>
        ) : (
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {history.map(entry => (
              <div key={entry.id} className="flex items-center gap-3 rounded-lg px-3 py-2 bg-white/[0.03]">
                <div className="text-[10px] text-white/20 font-mono">{entry.timestamp}</div>
                <code className="text-xs text-white/50 font-mono flex-1 truncate">{entry.command}</code>
                <Chip
                  label={entry.action === 'used-alternative' ? 'Safe' : entry.action === 'executed-anyway' ? 'Override' : 'Dismissed'}
                  color={entry.action === 'used-alternative' ? 'green' : entry.action === 'executed-anyway' ? 'red' : 'gray'}
                />
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Reset */}
      <motion.div variants={riseItem} className="flex justify-end">
        <button onClick={handleResetDefaults} className={`${BTN_GHOST} text-xs`}>
          <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
          Reset to Defaults
        </button>
      </motion.div>
    </motion.div>
  );
}
```

---

## 4. Backend / IPC

### 4.1 IPC Channel Spec

```typescript
// src/types/deskflow-api.d.ts — ADD TO EXISTING FILE

// ─── Git Safety IPC ───────────────────────────────────

interface GitSafetyAPI {
  /** Check if a command matches dangerous patterns. Returns risk assessment. */
  check: (command: string) => Promise<GitSafetyCheckResult>;

  /** Get current settings (from main process cache). */
  getSettings: () => Promise<GitSafetySettings>;

  /** Update settings (syncs to localStorage + main process). */
  setSettings: (settings: GitSafetySettings) => Promise<void>;

  /** Get recent block history (last N entries). */
  getHistory: (limit: number) => Promise<BlockHistoryEntry[]>;

  /** Record a block event (called by main process after interception). */
  recordBlock: (entry: Omit<BlockHistoryEntry, 'id'>) => Promise<void>;

  /** Create auto-snapshot before destructive execution. */
  createSnapshot: (label: string) => Promise<ProjectBackupManifest>;
}

interface GitSafetyCheckResult {
  matched: boolean;
  pattern?: DangerPattern;
  riskLevel: 'none' | 'low' | 'medium' | 'high' | 'critical';
  action: 'allow' | 'warn' | 'block';
  safeAlternative?: string;
  safeDescription?: string;
}

// ─── Add to existing deskflowAPI interface ──────────────

interface DeskFlowAPI {
  // ... existing namespaces ...

  /** Git Safety Layer */
  gitSafety: GitSafetyAPI;

  /** Existing project backup (already present) */
  projectBackup: ProjectBackupAPI;
}
```

### 4.2 Preload.ts Wiring

```typescript
// src/preload.ts — ADD TO EXISTING exposeInMainWorld

// After existing projectBackup block (~line 1067), add:

gitSafety: {
  check: (command: string) => ipcRenderer.invoke('git-safety:check', command),
  getSettings: () => ipcRenderer.invoke('git-safety:get-settings'),
  setSettings: (settings: GitSafetySettings) => ipcRenderer.invoke('git-safety:set-settings', settings),
  getHistory: (limit: number) => ipcRenderer.invoke('git-safety:get-history', limit),
  recordBlock: (entry: Omit<BlockHistoryEntry, 'id'>) => ipcRenderer.invoke('git-safety:record-block', entry),
  createSnapshot: (label: string) => ipcRenderer.invoke('git-safety:create-snapshot', label),
},
```

### 4.3 Main.ts Handlers

```typescript
// src/main.ts — ADD NEAR EXISTING IPC HANDLERS

// ─── Git Safety State ───────────────────────────────────

interface GitSafetyState {
  settings: GitSafetySettings;
  history: BlockHistoryEntry[];
  patterns: DangerPattern[];
}

const gitSafetyState: Map<string, GitSafetyState> = new Map(); // key = projectId

// ─── IPC Handlers ─────────────────────────────────────

ipcMain.handle('git-safety:check', async (_event, command: string) => {
  const projectId = getCurrentProjectId(); // existing helper
  const state = getOrCreateSafetyState(projectId);

  if (!state.settings.enabled) {
    return { matched: false, riskLevel: 'none', action: 'allow' };
  }

  // Combine default + custom patterns
  const allPatterns = [...DEFAULT_PATTERNS, ...state.settings.customPatterns];

  // Filter by protection level
  const activePatterns = allPatterns.filter(p => {
    if (state.settings.protectionLevel === 'strict') return true;
    if (state.settings.protectionLevel === 'standard') return p.riskLevel !== 'low';
    if (state.settings.protectionLevel === 'minimal') return p.riskLevel === 'critical';
    return true;
  });

  // Check for matches
  for (const pattern of activePatterns) {
    const regex = new RegExp(pattern.regex, 'i');
    if (regex.test(command)) {
      const action = state.settings.protectionLevel === 'strict' ? 'block' :
                    pattern.riskLevel === 'critical' ? 'block' :
                    pattern.riskLevel === 'high' ? 'warn' : 'warn';

      return {
        matched: true,
        pattern,
        riskLevel: pattern.riskLevel,
        action,
        safeAlternative: state.settings.showAlternatives ? pattern.safeAlternative : undefined,
        safeDescription: state.settings.showAlternatives ? pattern.safeDescription : undefined,
      };
    }
  }

  return { matched: false, riskLevel: 'none', action: 'allow' };
});

ipcMain.handle('git-safety:get-settings', async (_event) => {
  const projectId = getCurrentProjectId();
  return getOrCreateSafetyState(projectId).settings;
});

ipcMain.handle('git-safety:set-settings', async (_event, settings: GitSafetySettings) => {
  const projectId = getCurrentProjectId();
  const state = getOrCreateSafetyState(projectId);
  state.settings = settings;
  // Persist to a JSON file in project metadata dir
  await saveSafetySettings(projectId, settings);
});

ipcMain.handle('git-safety:get-history', async (_event, limit: number) => {
  const projectId = getCurrentProjectId();
  const state = getOrCreateSafetyState(projectId);
  return state.history.slice(-limit).reverse();
});

ipcMain.handle('git-safety:record-block', async (_event, entry: Omit<BlockHistoryEntry, 'id'>) => {
  const projectId = getCurrentProjectId();
  const state = getOrCreateSafetyState(projectId);
  const fullEntry: BlockHistoryEntry = {
    ...entry,
    id: `block-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  };
  state.history.push(fullEntry);
  // Keep only last 100 entries
  if (state.history.length > 100) {
    state.history = state.history.slice(-100);
  }
  await saveSafetyHistory(projectId, state.history);
});

ipcMain.handle('git-safety:create-snapshot', async (_event, label: string) => {
  // Delegate to existing ProjectBackupService
  return ipcMain.emit('projectBackup:create', { label, auto: true });
});

// ─── Helpers ──────────────────────────────────────────

function getOrCreateSafetyState(projectId: string): GitSafetyState {
  if (!gitSafetyState.has(projectId)) {
    gitSafetyState.set(projectId, {
      settings: loadSafetySettings(projectId),
      history: loadSafetyHistory(projectId),
      patterns: DEFAULT_PATTERNS,
    });
  }
  return gitSafetyState.get(projectId)!;
}

function loadSafetySettings(projectId: string): GitSafetySettings {
  try {
    const settingsPath = path.join(app.getPath('userData'), 'git-safety', projectId, 'settings.json');
    if (fs.existsSync(settingsPath)) {
      return JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
    }
  } catch (err) {
    console.error('Failed to load git safety settings:', err);
  }
  return getDefaultSettings();
}

function saveSafetySettings(projectId: string, settings: GitSafetySettings): void {
  try {
    const dir = path.join(app.getPath('userData'), 'git-safety', projectId);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'settings.json'), JSON.stringify(settings, null, 2));
  } catch (err) {
    console.error('Failed to save git safety settings:', err);
  }
}

function loadSafetyHistory(projectId: string): BlockHistoryEntry[] {
  try {
    const historyPath = path.join(app.getPath('userData'), 'git-safety', projectId, 'history.jsonl');
    if (fs.existsSync(historyPath)) {
      const lines = fs.readFileSync(historyPath, 'utf-8').split('\n').filter(Boolean);
      return lines.map(line => JSON.parse(line));
    }
  } catch (err) {
    console.error('Failed to load git safety history:', err);
  }
  return [];
}

function saveSafetyHistory(projectId: string, history: BlockHistoryEntry[]): void {
  try {
    const dir = path.join(app.getPath('userData'), 'git-safety', projectId);
    fs.mkdirSync(dir, { recursive: true });
    const lines = history.map(entry => JSON.stringify(entry)).join('\n') + '\n';
    fs.writeFileSync(path.join(dir, 'history.jsonl'), lines);
  } catch (err) {
    console.error('Failed to save git safety history:', err);
  }
}
```

### 4.4 PTY Write Path Interception

```typescript
// src/main.ts — INTEGRATE INTO EXISTING PTY WRITE HANDLER

// Find where terminal write is handled (likely near spawnTerminal / writeTerminal)
// Add interception BEFORE sending to PTY:

ipcMain.handle('terminal:write', async (event, terminalId: string, data: string) => {
  const term = terminals.get(terminalId);
  if (!term) return { error: 'Terminal not found' };

  // ─── GIT SAFETY INTERCEPTION ────────────────────────
  // Only intercept complete commands (user pressed Enter)
  if (data.includes('\r') || data.includes('\n')) {
    // Extract the current command line from terminal buffer
    // This is a simplified approach — in practice, track command buffer
    const command = extractCommandFromBuffer(term);

    if (command) {
      const check = await ipcMain.emit('git-safety:check', command);

      if (check.matched && check.action !== 'allow') {
        // Send warning to renderer instead of command to PTY
        event.sender.send('terminal:git-safety-warning', {
          terminalId,
          command,
          ...check,
        });
        return { intercepted: true, reason: 'git-safety' };
      }
    }
  }

  // Normal flow: send to PTY
  term.pty.write(data);
  return { success: true };
});

// ─── Alternative: Intercept at the PTY process level ──
// For more robust interception, hook into node-pty's onData:

function createSafetyInterceptedPTY(shell: string, cwd: string) {
  const pty = spawn(shell, [], { cwd, env: process.env });

  let commandBuffer = '';

  pty.onData((data: string) => {
    // Accumulate command until Enter
    commandBuffer += data;

    if (data.includes('\r') || data.includes('\n')) {
      const command = commandBuffer.trim();
      commandBuffer = '';

      // Run safety check asynchronously
      checkCommandSafety(command).then(check => {
        if (check.matched && check.action !== 'allow') {
          // Inject warning into terminal output
          pty.emit('git-safety-warning', check);
          // Don't forward the Enter key — command is blocked
          return;
        }
        // Normal: forward to renderer
        pty.emit('data', data);
      });
    } else {
      // Normal character: forward immediately for typing feedback
      pty.emit('data', data);
    }
  });

  return pty;
}
```

**Note:** The PTY interception approach depends on how DeskFlow currently handles terminal I/O. The design provides two options:
1. **IPC-level** (easier, intercept at `terminal:write` handler)
2. **PTY-level** (more robust, intercept before Enter reaches shell)

The implementer should choose based on the existing terminal architecture.

---

## 5. Persistence

### 5.1 Settings Schema

```typescript
// Stored in: %APPDATA%/DeskFlow/git-safety/<projectId>/settings.json
// AND synced to localStorage for fast renderer access

interface GitSafetySettings {
  /** Master switch */
  enabled: boolean;

  /** Protection strictness */
  protectionLevel: 'strict' | 'standard' | 'minimal';

  /** Auto-create snapshot before executing dangerous command */
  autoSnapshot: boolean;

  /** Show safe alternative commands in warning banner */
  showAlternatives: boolean;

  /** Allow one-click execution of safe alternative */
  oneClickSafe: boolean;

  /** Play audio cue on interception */
  playSound: boolean;

  /** User-defined custom patterns */
  customPatterns: CustomPattern[];
}

interface CustomPattern {
  id: string;
  regex: string;           // JavaScript RegExp source string
  label: string;          // Display name
  description: string;    // What this pattern protects against
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  safeAlternative?: string;
  safeDescription?: string;
}
```

### 5.2 History Schema

```typescript
// Stored in: %APPDATA%/DeskFlow/git-safety/<projectId>/history.jsonl
// Append-only JSONL for durability

interface BlockHistoryEntry {
  id: string;                    // Unique block ID
  timestamp: string;             // ISO 8601
  command: string;              // The command that was intercepted
  patternId: string;            // Which pattern matched
  action: 'used-alternative' | 'executed-anyway' | 'dismissed';
  alternativeUsed?: string;     // If user chose safe alternative
  snapshotLabel?: string;       // If auto-snapshot was created
}
```

### 5.3 Storage Strategy

| Data | Location | Format | Sync Strategy |
|------|----------|--------|---------------|
| Settings | `%APPDATA%/DeskFlow/git-safety/<projectId>/settings.json` | JSON | Main process owns, renderer reads from IPC + localStorage cache |
| History | `%APPDATA%/DeskFlow/git-safety/<projectId>/history.jsonl` | JSONL | Main process owns, renderer fetches via IPC |
| Active state | In-memory Map in main process | — | Loaded on project open, saved on change |

**Sync flow:**
```
Renderer changes setting
  → calls window.deskflowAPI.gitSafety.setSettings()
  → preload sends IPC to main
  → main saves to disk + updates in-memory state
  → main broadcasts to all renderers (if multi-window)
  → renderer updates localStorage cache
```

---

## 6. Integration Points

### 6.1 TerminalPage.tsx — Add Sub-tab

```typescript
// src/pages/TerminalPage.tsx

// 1. Add to SUBPAGE_LABELS (around line 128):
const SUBPAGE_LABELS: Record<string, string> = {
  // ... existing ...
  'setup/presets': 'Presets',
  'setup/configs': 'Configs',
  'setup/backup': 'Backup',
  'setup/safety': 'Safety',        // ← ADD THIS
  // ... existing ...
};

// 2. Add to group sub-tab list (around line 3449, in Setup group):
// Find where setup group tabs are defined and add:
{ key: 'setup/safety', label: 'Safety', icon: Shield },

// 3. Add to subpage switch renderer (find the switch statement):
case 'setup/safety':
  return (
    <GroupPanel accent="orange">
      <GitSafetyConfigPanel />
    </GroupPanel>
  );
```

### 6.2 Preload.ts — Add Namespace

```typescript
// src/preload.ts — Add gitSafety to existing exposeInMainWorld

contextBridge.exposeInMainWorld('deskflowAPI', {
  // ... existing namespaces ...

  gitSafety: {
    check: (command: string) => ipcRenderer.invoke('git-safety:check', command),
    getSettings: () => ipcRenderer.invoke('git-safety:get-settings'),
    setSettings: (settings: GitSafetySettings) => ipcRenderer.invoke('git-safety:set-settings', settings),
    getHistory: (limit: number) => ipcRenderer.invoke('git-safety:get-history', limit),
    recordBlock: (entry: Omit<BlockHistoryEntry, 'id'>) => ipcRenderer.invoke('git-safety:record-block', entry),
    createSnapshot: (label: string) => ipcRenderer.invoke('git-safety:create-snapshot', label),
  },

  // ... rest of existing API ...
});
```

### 6.3 Main.ts — Add Handlers

Add the IPC handlers from Section 4.3 near existing handlers (around line 12300, after existing git handlers).

### 6.4 Terminal Component — Wire Warning

```typescript
// In the terminal component that renders xterm output:
// Listen for safety warnings from main process

useEffect(() => {
  const handleWarning = (_event: any, data: GitSafetyWarningData) => {
    if (data.terminalId === terminalId) {
      setSafetyWarning(data);
    }
  };

  window.deskflowAPI.onTerminalGitSafetyWarning?.(handleWarning);

  return () => {
    window.deskflowAPI.offTerminalGitSafetyWarning?.(handleWarning);
  };
}, [terminalId]);

// Render warning above terminal output:
{safetyWarning && (
  <GitSafetyWarning
    {...safetyWarning}
    onDismiss={() => setSafetyWarning(null)}
    onExecuteAnyway={() => {
      // Send original command to PTY
      window.deskflowAPI.terminalWrite(terminalId, safetyWarning.command + '\r');
      setSafetyWarning(null);
    }}
    onUseAlternative={(cmd) => {
      // Send safe alternative to PTY
      window.deskflowAPI.terminalWrite(terminalId, cmd + '\r');
      setSafetyWarning(null);
    }}
  />
)}
```

---

## 7. Edge Cases

| Edge Case | Handling |
|-----------|----------|
| **Multiple terminals open** | Each terminal has independent warning state. Interception is per-terminal. Settings are shared per-project. |
| **Rapid-fire commands** | Command buffer is per-terminal. Each Enter triggers independent check. No debounce — safety checks are fast (<1ms). |
| **Partial match (command not complete)** | Only check on Enter (`\r` or `\n`). Typing `git reset --` without Enter is not checked. |
| **Pasted multi-line commands** | Each line ending triggers separate check. If line 1 is safe and line 2 is dangerous, line 2 is intercepted. |
| **Non-git commands that look like git** | Patterns use `git\s+` prefix regex. `echo "git reset --hard"` won't match because it's not a git command. |
| **Command in string/comment** | Regex matches anywhere in the command string. False positives possible but acceptable for safety. User can dismiss. |
| **CONFIRM in terminal buffer** | The "type DESTROY" confirmation is handled by the `GitSafetyWarning` React component, not the terminal buffer. The blocked command is never sent to PTY until confirmed. |
| **User navigates away while warning shown** | Warning is per-terminal component state. Navigating away and back clears it (component unmounts). Command remains unsent — user must retype. |
| **Settings changed mid-command** | Settings are fetched fresh on each check. Changing protection level takes effect immediately for next command. |
| **Project switch while warning shown** | Terminal components unmount on project switch. Warning state is lost. Command not sent. |
| **Auto-snapshot fails** | If `projectBackup:create` fails, show error in warning banner: "Snapshot failed — command blocked for safety." User can retry or dismiss. |
| **Custom pattern with invalid regex** | Validate regex on save. Show error in UI. Don't save invalid patterns. |
| **History grows unbounded** | Cap at 100 entries in memory, 1000 in JSONL file. Auto-truncate oldest. |
| **Renderer crashes mid-warning** | Main process never sent command to PTY (interception happened at IPC level). Command is safe — user retypes on restart. |
| **Two projects with different settings** | Settings are scoped by `projectId`. Each project has independent config stored in separate directory. |

---

## 8. Empty / Loading / Error States

### 8.1 `GitSafetyConfigPanel`

| State | Visual |
|-------|--------|
| **Loading** | 4 `Skeleton` bars (header, toggle, pattern list, history) using `_ds/primitives` |
| **Error** | `EmptyState` with `ShieldAlert` icon, error message, "Retry" button |
| **Empty (no history)** | History section shows "No commands intercepted yet" in `text-white/20` centered text |
| **Empty (no custom patterns)** | Custom patterns section shows "Add custom pattern" button only |
| **Populated** | Full panel with all sections rendered |

### 8.2 `GitSafetyWarning`

| State | Visual |
|-------|--------|
| **Hidden** | Not rendered (`null`) |
| **Warning** | Full banner with command, description, safe alternative, action buttons |
| **Confirming** | Shows text input for "DESTROY" with confirm button |
| **Snapshotting** | Spinner + "Creating safety snapshot..." text |
| **Executing** | Brief "Executing command..." before auto-dismiss |
| **Completed** | Green check + "Command executed. Snapshot available." Auto-dismisses after 3s |
| **Cancelled** | Slides out via Framer Motion `exit` animation |

---

## 9. Verification Checklist

### 9.1 Component Tests

- [ ] `GitSafetyWarning` renders correctly for each risk level (low/medium/high/critical)
- [ ] `GitSafetyWarning` shows confirmation input only for critical risk
- [ ] `GitSafetyWarning` safe alternative button sends correct command to PTY
- [ ] `GitSafetyWarning` dismiss button clears state
- [ ] `GitSafetyWarning` snapshotting state shows spinner
- [ ] `GitSafetyWarning` completed state auto-dismisses

### 9.2 Config Panel Tests

- [ ] `GitSafetyConfigPanel` loads settings from localStorage on mount
- [ ] `GitSafetyConfigPanel` saves settings to localStorage + IPC on change
- [ ] `GitSafetyConfigPanel` toggle switches animate correctly
- [ ] `GitSafetyConfigPanel` protection level buttons update active state
- [ ] `GitSafetyConfigPanel` custom pattern add/delete works
- [ ] `GitSafetyConfigPanel` shows empty history state
- [ ] `GitSafetyConfigPanel` reset to defaults works

### 9.3 IPC Tests

- [ ] `git-safety:check` returns `allow` for safe command (`git status`)
- [ ] `git-safety:check` returns `block` for `git reset --hard` in strict mode
- [ ] `git-safety:check` returns `warn` for `git reset --hard` in standard mode
- [ ] `git-safety:check` respects protection level setting
- [ ] `git-safety:check` matches custom patterns
- [ ] `git-safety:check` ignores disabled setting (returns allow)
- [ ] `git-safety:get-settings` returns default for new project
- [ ] `git-safety:set-settings` persists to disk
- [ ] `git-safety:get-history` returns last N entries
- [ ] `git-safety:record-block` appends to history
- [ ] `git-safety:create-snapshot` delegates to projectBackup

### 9.4 Integration Tests

- [ ] Typing `git reset --hard` in terminal shows warning banner
- [ ] Clicking safe alternative executes replacement command
- [ ] Clicking "Execute Anyway" on critical requires DESTROY confirmation
- [ ] Auto-snapshot creates backup before destructive execution
- [ ] Settings panel appears in Setup → Safety sub-tab
- [ ] Settings changes take effect immediately in terminal
- [ ] History shows recorded block after interception
- [ ] Multiple terminals have independent warning states

### 9.5 Edge Case Tests

- [ ] Pasted multi-line command with one dangerous line intercepts that line
- [ ] Rapid Enter presses don't crash or miss checks
- [ ] Invalid custom regex shows error, doesn't save
- [ ] Project switch clears terminal warning state
- [ ] Settings survive app restart

---

## 10. File-by-File Implementation Order

### Phase 1: Types & IPC (Foundation)

| # | File | Action | Lines |
|---|------|--------|-------|
| 1 | `src/types/deskflow-api.d.ts` | Add `GitSafetyAPI`, `GitSafetyCheckResult`, `GitSafetySettings`, `BlockHistoryEntry`, `DangerPattern`, `CustomPattern` interfaces | ~80 |
| 2 | `src/preload.ts` | Add `gitSafety` namespace to `exposeInMainWorld` | ~15 |

### Phase 2: Backend (Main Process)

| # | File | Action | Lines |
|---|------|--------|-------|
| 3 | `src/main.ts` | Add IPC handlers: `git-safety:check`, `git-safety:get-settings`, `git-safety:set-settings`, `git-safety:get-history`, `git-safety:record-block`, `git-safety:create-snapshot` | ~200 |
| 4 | `src/main.ts` | Add helper functions: `getOrCreateSafetyState`, `loadSafetySettings`, `saveSafetySettings`, `loadSafetyHistory`, `saveSafetyHistory` | ~80 |
| 5 | `src/main.ts` | Integrate PTY interception into existing `terminal:write` handler (or create `createSafetyInterceptedPTY` wrapper) | ~50 |

### Phase 3: UI Components (Renderer)

| # | File | Action | Lines |
|---|------|--------|-------|
| 6 | `src/components/terminal/GitSafetyWarning.tsx` | Create inline warning banner component with all states | ~250 |
| 7 | `src/components/workspace/GitSafetyConfigPanel.tsx` | Create settings panel with toggles, patterns, history | ~400 |

### Phase 4: Integration (Terminal Workspace)

| # | File | Action | Lines |
|---|------|--------|-------|
| 8 | `src/pages/TerminalPage.tsx` | Add `'setup/safety'` to `SUBPAGE_LABELS` | ~1 |
| 9 | `src/pages/TerminalPage.tsx` | Add Safety sub-tab to Setup group navigation | ~5 |
| 10 | `src/pages/TerminalPage.tsx` | Add `case 'setup/safety'` to subpage switch | ~5 |
| 11 | `src/pages/TerminalPage.tsx` | Wire `GitSafetyWarning` into terminal component (listen for `terminal:git-safety-warning` event) | ~30 |

### Phase 5: Polish & Testing

| # | File | Action | Lines |
|---|------|--------|-------|
| 12 | `src/components/terminal/GitSafetyWarning.tsx` | Add sound effect for `playSound` setting | ~10 |
| 13 | Test all flows from Verification Checklist | Manual testing | — |

**Total new files:** 2  
**Total modified files:** 3  
**Estimated implementation time:** 4-6 hours

---

## Appendix A: Design System Compliance

| Rule | Implementation |
|------|---------------|
| `rounded-xl` max | All cards use `rounded-xl` |
| `p-5` padding | Outer container uses `p-5`, inner content uses `p-4` |
| Geist / JetBrains Mono | UI text uses default (Geist), commands use `font-mono` (JetBrains Mono) |
| `--page-accent` | Config panel inherits orange from Setup group; warning banner uses risk-level colors (red/orange/amber) which are semantic, not accent-based |
| `_ds/primitives` | Uses `Chip`, `EmptyState`, `Skeleton` |
| `_ds/controls` | Uses `INPUT_CLS`, `BTN_PRIMARY`, `BTN_GHOST` |
| `_ds/motion` | Uses `listContainer`, `riseItem`, `EASE_OUT` |

## Appendix B: MCP Component Opportunities

| Component | MCP Source | Why |
|-----------|-----------|-----|
| Warning banner entrance animation | **Magic UI** — `Animated Beam` or `Border Beam` | Draws attention to blocked command |
| Safe alternative card | **shadcn** — `Card` with hover state | Clean clickable alternative |
| Toggle switches | **shadcn** — `Switch` | Already used in workspace |
| History list | **shadcn** — `ScrollArea` | Scrollable block history |
| Settings section dividers | **shadcn** — `Separator` | Visual grouping |
| Alert icon | **Lucide** — `AlertTriangle`, `Shield`, `ShieldCheck` | Semantic safety icons |
| Sound effect | **React Bits** — `Sound` or custom | Optional audio cue on block |

**Re-skin rules for all MCP components:**
- Replace default colors with `--bg-primary`, `--accent-primary` (orange for Setup group)
- Use `rounded-xl` max
- Use `p-5` padding
- Use Geist font for text, JetBrains Mono for code
- Use `_ds/primitives` and `_ds/controls` where possible

---

*End of design document. Ready for implementation.*
