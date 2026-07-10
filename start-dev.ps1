param(
  [switch]$NoDesktop,
  [switch]$NoSync,
  [switch]$Build
)

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "    DeskFlow - Dev Startup                  " -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan

function Generate-Base64Url($bytes=32) {
  $r = [System.Security.Cryptography.RandomNumberGenerator]::Create()
  $b = [byte[]]::new($bytes)
  $r.GetBytes($b)
  return [Convert]::ToBase64String($b) -replace '\+','-' -replace '/','_' -replace '=',''
}

$env:JWT_SECRET = if ($env:JWT_SECRET) { $env:JWT_SECRET } else { Generate-Base64Url 32 }
$env:RELAY_TICKET_SECRET = if ($env:RELAY_TICKET_SECRET) { $env:RELAY_TICKET_SECRET } else { Generate-Base64Url 32 }

Write-Host "[keys] JWT_SECRET ............ $($env:JWT_SECRET.Substring(0,16))..." -ForegroundColor DarkGray
Write-Host "[keys] RELAY_TICKET_SECRET ... $($env:RELAY_TICKET_SECRET.Substring(0,16))..." -ForegroundColor DarkGray

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$syncPort = if ($env:SYNC_PORT) { $env:SYNC_PORT } else { "8787" }
$relayPort = if ($env:RELAY_PORT) { $env:RELAY_PORT } else { "8788" }

# Start Sync Server
if (-not $NoSync) {
  Write-Host "`n[server] Starting sync server on 0.0.0.0:$syncPort ..." -ForegroundColor Green
  $syncDir = Join-Path $scriptDir "sync-server"

  $envFile = Join-Path $syncDir ".env"
  if (-not (Test-Path $envFile)) {
    @"
PORT=$syncPort
HOST=0.0.0.0
DATABASE_URL=file:./data/sync.db
JWT_SECRET=$env:JWT_SECRET
RELAY_TICKET_SECRET=$env:RELAY_TICKET_SECRET
CORS_ORIGINS=*
"@ | Set-Content $envFile
    Write-Host "[server] Created $envFile" -ForegroundColor DarkGray
  }

  $syncJob = Start-Job -ScriptBlock {
    param($dir, $envFile)
    Set-Location $dir
    Get-Content $envFile | ForEach-Object {
      if ($_ -match '^([^#=]+)=(.*)$') {
        [Environment]::SetEnvironmentVariable($matches[1].Trim(), $matches[2].Trim())
      }
    }
    npx tsx src/index.ts
  } -ArgumentList $syncDir, $envFile

  Write-Host "[server] Waiting for sync server..."
  Start-Sleep 3

  try {
    $pairUrl = "http://127.0.0.1:$syncPort/v1/auth/pair"
    $pairBody = @{ deviceName = "desktop-dev"; platform = "win32" } | ConvertTo-Json
    $pairResult = Invoke-RestMethod -Uri $pairUrl -Method Post -Body $pairBody -ContentType "application/json" -ErrorAction Stop
    $env:SYNC_ACCESS_TOKEN = $pairResult.accessToken
    Write-Host "[sync] Paired desktop device" -ForegroundColor Green
  } catch {
    Write-Host "[sync] Warning: Could not pair. Error: $_" -ForegroundColor Yellow
  }
}

# Desktop Relay IP
$relayHost = $env:RELAY_HOST
if (-not $relayHost) {
  $tailscaleIp = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -like "*tailscale*" } | Select-Object -First 1).IPAddress
  if ($tailscaleIp) {
    $relayHost = $tailscaleIp
    Write-Host "[relay] Detected Tailscale IP: $relayHost" -ForegroundColor Green
  } else {
    $lanIp = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -notlike "*Loopback*" -and $_.AddressFamily -eq "IPv4" } | Select-Object -First 1).IPAddress
    $relayHost = if ($lanIp) { $lanIp } else { "127.0.0.1" }
    Write-Host "[relay] Using LAN IP: $relayHost" -ForegroundColor Yellow
  }
}

# Desktop App
if (-not $NoDesktop) {
  Write-Host "`n[desktop] Starting Electron app ..." -ForegroundColor Green

  $env:RELAY_PORT = $relayPort
  $env:SYNC_URL = "http://127.0.0.1:$syncPort"
  if (-not $env:SYNC_ENC_KEY) {
    $env:SYNC_ENC_KEY = (Generate-Base64Url 32)
  }

  Write-Host "[config] SYNC_URL = $env:SYNC_URL" -ForegroundColor DarkGray
  Write-Host "[config] RELAY_PORT = $env:RELAY_PORT" -ForegroundColor DarkGray

  # Kill stale Electron instances
  Get-Process electron -ErrorAction SilentlyContinue | Stop-Process -Force

  # Clear dev env vars — this is production mode, not vite dev server
  Remove-Item Env:VITE_DEV_SERVER_URL -ErrorAction SilentlyContinue

  # --- BEGIN REBUILD LOGIC & STALENESS CHECK ---
  Write-Host "[build] Checking staleness... " -NoNewline -ForegroundColor Cyan

  # Ensure dependencies are present before evaluating build state
  if (-not (Test-Path "$scriptDir\node_modules" -PathType Container)) {
    Write-Host "[build] CRITICAL: node_modules folder not found. Running npm install..." -ForegroundColor Red
    & npm install
  }

  $outputs = @(
    "$scriptDir\dist-electron\preload.cjs",
    "$scriptDir\dist-electron\main.cjs",
    "$scriptDir\dist\index.html",
    "$scriptDir\dist\assets\index.js"
  )

  $needBuild = $Build
  $buildReason = ""

  if ($Build) {
    $buildReason = "Force rebuild (-Build flag set)"
    Write-Host "Forced via parameter" -ForegroundColor Gray
  } else {
    # Check if output files exist at all — only rebuild if completely missing
    $missing = $outputs | Where-Object { -not (Test-Path $_ -PathType Leaf) }
    if ($missing.Count -gt 0) {
      $needBuild = $true
      $buildReason = "Missing output files: ($($missing -join ', '))"
    }
  }

  if ($needBuild) {
    Write-Host "[build] $buildReason" -ForegroundColor Yellow
    Write-Host "[build] Rebuilding renderer and main processes..." -ForegroundColor Cyan

    # Build preload
    & npx esbuild src/preload.ts --bundle --platform=node --format=cjs --external:electron --outfile=dist-electron/preload.cjs 2>&1
    if ($LASTEXITCODE -ne 0) { Write-Host "[build] Preload build failed!" -ForegroundColor Red; exit $LASTEXITCODE }

    # Build main.cjs
    & node scripts/rebuild-main.mjs 2>&1
    if ($LASTEXITCODE -ne 0) { Write-Host "[build] Main build failed!" -ForegroundColor Red; exit $LASTEXITCODE }

    # Build renderer
    & npx vite build 2>&1
    if ($LASTEXITCODE -ne 0) { Write-Host "[build] Renderer build failed!" -ForegroundColor Red; exit $LASTEXITCODE }
  } else {
    Write-Host "[build] Skipped (use -Build flag to force rebuild)" -ForegroundColor Green
  }
  # --- END REBUILD LOGIC ---

  npx electron .
} else {
  Write-Host "`n=== Quick Reference ===" -ForegroundColor Cyan
  Write-Host "Sync server:     http://127.0.0.1:$syncPort"
  Write-Host "Desktop relay:  ws://${relayHost}:${relayPort}"
}
