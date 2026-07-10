# =============================================================================
# ELECTRON NUCLEAR FIX — Windows PowerShell
# =============================================================================
# Root cause: Electron's HTTP server loads dist/ files INTO MEMORY at startup.
# Rebuilding dist/ does NOT update the running server.
# You MUST kill all instances, clear caches, and start fresh.
# =============================================================================

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "    ELECTRON NUCLEAR FIX" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan

# PHASE 1: Kill all Electron processes
Write-Host "`n[1/5] Killing all Electron processes..." -ForegroundColor Yellow
Get-Process electron -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 2
$remaining = Get-Process electron -ErrorAction SilentlyContinue
if ($remaining) {
    Write-Host "  Force killing remaining..." -ForegroundColor Red
    $remaining | Stop-Process -Force
}
Write-Host "  All Electron processes killed" -ForegroundColor Green

# PHASE 2: Clear all caches
Write-Host "`n[2/5] Clearing caches..." -ForegroundColor Yellow
$cachePaths = @(
    "$env:APPDATA\DeskFlow\Cache",
    "$env:APPDATA\DeskFlow\Code Cache",
    "$env:APPDATA\DeskFlow\GPUCache",
    "node_modules\.vite"
)
foreach ($p in $cachePaths) {
    if (Test-Path $p) {
        Remove-Item -Recurse -Force $p -ErrorAction SilentlyContinue
        Write-Host "  Cleared: $p" -ForegroundColor Green
    }
}

# Delete old dist folders
Remove-Item -Recurse -Force "dist" -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "dist-electron" -ErrorAction SilentlyContinue
Write-Host "  Cleared dist/ and dist-electron/" -ForegroundColor Green

# PHASE 3: Rebuild everything
Write-Host "`n[3/5] Rebuilding..." -ForegroundColor Yellow
node scripts\rebuild-main.mjs
npx esbuild src/preload.ts --bundle --platform=node --format=cjs --external:electron --outfile=dist-electron\preload.cjs
npx vite build

# PHASE 4: Verify built files
Write-Host "`n[4/5] Verifying built files..." -ForegroundColor Yellow
$checks = @(
    @("dist-electron\main.cjs", "subscriptions:list", "main.cjs: subscriptions handler"),
    @("dist-electron\main.cjs", "get-home-summary", "main.cjs: home summary handler"),
    @("dist-electron\main.cjs", "finance:get-lock-state", "main.cjs: lock state handler"),
    @("dist-electron\preload.cjs", "subscriptions", "preload.cjs: subscriptions bridge"),
    @("dist\assets\index.js", "PeopleTab", "renderer: PeopleTab"),
    @("dist\assets\index.js", "PaymentAllocationModal", "renderer: PaymentAllocationModal"),
    @("dist\assets\index.js", "SpendingSplitCard", "renderer: SpendingSplitCard"),
    @("dist\assets\index.js", "SubscriptionRenewalBanner", "renderer: SubscriptionRenewalBanner")
)
foreach ($c in $checks) {
    $found = Select-String -Path $c[0] -Pattern $c[1] -Quiet
    if ($found) { Write-Host "  PASS  $($c[2])" -ForegroundColor Green }
    else { Write-Host "  FAIL  $($c[2])" -ForegroundColor Red }
}

# PHASE 5: Launch
Write-Host "`n[5/5] Launching fresh instance..." -ForegroundColor Yellow
Write-Host ""
Write-Host "NEXT STEPS:" -ForegroundColor Cyan
Write-Host "  1. Start: npx electron ."
Write-Host "  2. Navigate to Finance page"
Write-Host "  3. Enter password: 12345"
Write-Host "  4. Check if People tab appears"
Write-Host ""
