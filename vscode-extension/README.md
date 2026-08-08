# RHEO Activity Tracker for VS Code

A lightweight VS Code extension that captures your live coding activity and sends it to the RHEO desktop app for analytics and insights.

## What it tracks

- **Files opened** — which files you spend time in
- **Lines changed** — additions and deletions per file
- **Active duration** — time spent with each file focused
- **Edit counts** — how many individual edits you made

## Requirements

- [RHEO](https://github.com/your-repo/rheo) desktop app running locally (the capture server must be listening on `http://localhost:54321`)
- VS Code 1.85 or later

## How it works

1. The extension activates when VS Code starts (`onStartupFinished`)
2. It silently monitors editor focus and text changes
3. Every **60 seconds**, it batches the accumulated activity and POSTs it to RHEO's local capture server at `http://localhost:54321/code-activity`
4. The server stores the data in the `code_activity` table for the IDE Analytics dashboard

The extension performs a health check before each flush — if RHEO isn't running, it skips and retries next cycle. No data is lost; activity stays buffered until the next successful push.

## Installation

### From VSIX (recommended)

1. Build the VSIX:
   ```
   cd vscode-extension
   npm install
   npm run compile
   npx @vscode/vsce package
   ```
2. In VS Code: `Ctrl+Shift+P` → **Extensions: Install from VSIX...**
3. Select `vscode-extension/rheo-vscode-1.0.0.vsix`
4. Reload VS Code when prompted

### From source (development)

1. Open the `vscode-extension` folder in VS Code
2. Press `F5` to launch the Extension Development Host
3. The extension activates in the new VS Code window

## Data flow

```
VS Code  ──POST /code-activity──>  RHEO local server (port 54321)
                                        │
                                        ▼
                                  code_activity table
                                        │
                                        ▼
                              IDE Analytics dashboard
```

## Privacy

- All data stays local — nothing is sent to external servers
- The extension only tracks files you actively edit (not reads)
- Activity is batched and flushed in-memory; nothing persists on disk in VS Code
- You can disable the extension at any time from the Extensions panel

## License

MIT
