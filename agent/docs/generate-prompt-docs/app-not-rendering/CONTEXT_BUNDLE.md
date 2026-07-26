# Context Bundle — App Not Rendering Changes

## Problem

All code changes are present in source files and built files, but the running Electron app shows no changes.

## Key Files

### Built Files (verified to contain code):
- `dist-electron/main.cjs` (830KB) — all 25 restored handlers present
- `dist-electron/preload.cjs` (65KB) — all 16 restored bridges present
- `dist/assets/index.js` (9MB) — PeopleTab, PaymentAllocationModal, SpendingSplitCard, SubscriptionRenewalBanner present

### Source Files (verified to contain code):
- `src/main.ts` — all handlers, helper functions
- `src/preload.ts` — all bridges
- `src/pages/FinancePage.tsx` — all functions, imports, state
- `src/components/finance/PeopleTab.tsx` — 9218 bytes
- `src/components/finance/PersonCard.tsx` — 1894 bytes
- `src/components/finance/PersonDetailModal.tsx` — 7921 bytes
- `src/components/finance/PaymentAllocationModal.tsx` — 11383 bytes

### App Loading Logic (src/main.ts lines 3684-3717):
```typescript
if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
} else {
    const dist = path.join(__dirname, '../dist');
    // Creates HTTP server serving from dist/
    mainWindow.loadURL('http://localhost:' + prodPort + '/index.html');
}
```

### Environment:
- `VITE_DEV_SERVER_URL` is empty
- 8 Electron instances running (multiple from different times)
- App loads from `dist/` via local HTTP server

### What Needs to Happen:
1. Kill ALL Electron processes
2. Clear Electron cache
3. Rebuild all 3 artifacts
4. Start fresh
5. Navigate to Finance, enter password 12345
6. Verify features render
