import * as vscode from 'vscode';
import * as http from 'http';
import * as crypto from 'crypto';

const RHEO_SERVER = 'http://localhost:54321';
const FLUSH_INTERVAL_MS = 60000;
const HEALTH_CHECK_TIMEOUT = 2000;

interface FileActivity {
  id: string;
  file_path: string;
  file_type: string;
  lines_added: number;
  lines_removed: number;
  duration_ms: number;
  edits_count: number;
}

const activityMap = new Map<string, FileActivity>();
let activeEditor: vscode.TextEditor | undefined;
let focusStartTime: number = Date.now();

export function activate(context: vscode.ExtensionContext) {
  console.log('[RHEO] Extension activated');

  // Track active editor for duration calculation
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor(editor => {
      if (activeEditor) {
        recordDuration(activeEditor);
      }
      activeEditor = editor;
      focusStartTime = Date.now();
      if (editor) ensureFileEntry(editor.document.uri.fsPath, editor.document.languageId);
    })
  );

  // Track text changes
  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument(event => {
      if (!activeEditor || event.document !== activeEditor.document) return;
      const path = event.document.uri.fsPath;
      ensureFileEntry(path, event.document.languageId);
      const entry = activityMap.get(path)!;

      event.contentChanges.forEach(change => {
        const addedLines = change.text.split('\n').length - 1;
        const removedLines = change.range.end.line - change.range.start.line;
        entry.lines_added += Math.max(0, addedLines);
        entry.lines_removed += Math.max(0, removedLines);
        entry.edits_count += 1;
      });
    })
  );

  // Initial state
  activeEditor = vscode.window.activeTextEditor;
  if (activeEditor) ensureFileEntry(activeEditor.document.uri.fsPath, activeEditor.document.languageId);

  // Batching alarm (setInterval)
  const interval = setInterval(flushToRHEO, FLUSH_INTERVAL_MS);
  context.subscriptions.push({ dispose: () => clearInterval(interval) });
}

function ensureFileEntry(path: string, langId: string) {
  if (!activityMap.has(path)) {
    activityMap.set(path, {
      id: crypto.randomUUID(),
      file_path: path,
      file_type: langId,
      lines_added: 0,
      lines_removed: 0,
      duration_ms: 0,
      edits_count: 0
    });
  }
}

function recordDuration(editor: vscode.TextEditor) {
  const path = editor.document.uri.fsPath;
  if (activityMap.has(path)) {
    activityMap.get(path)!.duration_ms += (Date.now() - focusStartTime);
  }
}

async function checkHealth(): Promise<boolean> {
  return new Promise((resolve) => {
    const req = http.get(`${RHEO_SERVER}/health`, { timeout: HEALTH_CHECK_TIMEOUT }, (res) => {
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => { req.destroy(); resolve(false); });
  });
}

async function flushToRHEO() {
  if (activityMap.size === 0) return;

  // Finalize current active editor duration before flush
  if (activeEditor) {
    recordDuration(activeEditor);
    focusStartTime = Date.now(); // Reset for next batch
  }

  const isHealthy = await checkHealth();
  if (!isHealthy) {
    console.log('[RHEO] Server not healthy, skipping flush (will retry next interval)');
    return;
  }

  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (!workspaceFolder) {
    activityMap.clear(); // No workspace, discard
    return;
  }

  const payload = {
    workspace_path: workspaceFolder.uri.fsPath,
    activities: Array.from(activityMap.values()).filter(a => a.edits_count > 0 || a.duration_ms > 5000)
  };

  if (payload.activities.length === 0) {
    activityMap.clear();
    return;
  }

  const data = JSON.stringify(payload);
  const options = {
    hostname: 'localhost',
    port: 54321,
    path: '/code-activity',
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
  };

  const req = http.request(options, (res) => {
    if (res.statusCode === 200) activityMap.clear(); // Clear only on success
  });
  req.on('error', (err) => console.error('[RHEO] Flush failed:', err.message));
  req.write(data);
  req.end();
}

export function deactivate() {
  flushToRHEO(); // Final push on VS Code close
}
