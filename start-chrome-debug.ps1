# start-chrome-debug.ps1
# Launches Chrome with remote debugging so Playwright MCP can drive YOUR logged-in sessions.
#
# Usage:
#   .\start-chrome-debug.ps1            # uses a persistent debug profile (recommended)
#   .\start-chrome-debug.ps1 -Real     # uses your REAL profile (close all Chrome first!)
#   .\start-chrome-debug.ps1 -Port 9333
#
# After launch, verify: open http://localhost:9222/json/version

param(
  [switch]$Real,
  [int]$Port = 9222
)

$chrome = "C:\Program Files\Google\Chrome\Application\chrome.exe"
if (-not (Test-Path $chrome)) {
  $chrome = "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
}
if (-not (Test-Path $chrome)) {
  Write-Error "Chrome not found. Set `$chrome to your chrome.exe path."
  exit 1
}

if ($Real) {
  # Your actual profile — MUST close all Chrome windows first or it will refuse to start.
  $userData = "$env:LOCALAPPDATA\Google\Chrome\User Data"
  Write-Host "Using REAL profile. Make sure all Chrome windows are closed." -ForegroundColor Yellow
} else {
  # Dedicated persistent debug profile — log in once, cookies survive restarts.
  $userData = "$env:USERPROFILE\chrome-debug"
  Write-Host "Using debug profile: $userData (log in once; cookies persist here)" -ForegroundColor Cyan
}

# Kill any Chrome already holding this debug port (only ones WE started on this port).
Get-Process -Name chrome -ErrorAction SilentlyContinue | Where-Object {
  $_.MainWindowTitle -like "*$Port*"
} | Stop-Process -Force -ErrorAction SilentlyContinue

Start-Process -FilePath $chrome -ArgumentList @(
  "--remote-debugging-port=$Port",
  "--user-data-dir=$userData",
  "--no-first-run"
)

Start-Sleep -Seconds 2
try {
  $ver = Invoke-RestMethod -Uri "http://localhost:$Port/json/version" -ErrorAction Stop
  Write-Host "CDP is UP: $($ver.webSocketDebuggerUrl)" -ForegroundColor Green
  Write-Host "Playwright MCP should use: --cdp-endpoint http://localhost:$Port" -ForegroundColor Green
} catch {
  Write-Host "Chrome launched but CDP not reachable on :$Port. Is another Chrome using this profile?" -ForegroundColor Red
}
