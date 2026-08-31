## Assistant (Build · Solar Pro4 · continuation)

**Thinking:**

The previous session traced the browser/website detection → focus group blocking pipeline but was cut off at the investigation stage. Let me synthesize what was found and write the actual fixes.

**The bug (restated):**

When a focus group session is active, browsing a website that IS in the group's `allowed_domains` still triggers the distraction overlay and breaks focus. The user reports: "it's not detecting that it is a browser and it just simply blocks the comment in itself" — meaning every website gets blocked regardless of whether it's in the focus group's allow-list.

**Root cause (identified by tracing the full pipeline):**

Three separate gaps in the detection-to-blocking chain:

---

### GAP 1: `handleBrowserData` calls the WRONG focus engine

**Location:** `src/main.ts:20769-20771`

```typescript
// Notify focus manager of web activity
if (focusManager) {
    focusManager.onWebActivity(data.domain);
}
```

`focusManager` is the **main** `FocusManager` instance (the one users start manually with "Start Focus"). It runs with whatever config the user set (`allowed.apps`, `allowed.domains`, `strictness`).

When a **focus group session** is active (started via `startWithGroup`/`startWithGroups`), the main `focusManager` is still the one that receives `onWebActivity` — but it's running with the user's manually-configured settings, NOT the focus group's allowed_domains. So the group's website whitelist is never checked.

The focus group session config lives in `FocusGroupManager.toConfig(id)` which produces a `FocusConfig` with the group's `allowed.domains`, `strictness`, etc. But this config is only passed to `FocusManager.start(cfg)` — it doesn't replace the main engine's active state.

**What should happen:** When a focus group session is active, `onWebActivity` must check the group's `allowed_domains` (not the main engine's config). If the domain is in the group's allow-list, it should be allowed (no overlay). If not, the group's strictness rule applies.

**Fix approach:** Add a focus-group session registry in main.ts. When `handleBrowserData` fires, check if any focus group session is active. If so, route the domain check through the group's config instead of (or in addition to) the main engine.

---

### GAP 2: `pollForeground` skips browser apps entirely for focus notifications

**Location:** `src/main.ts:4769-4771`

```typescript
// Skip if the app is the browser-with-extension (website-level detection handles it via handleBrowserData -> onWebActivity)
if (focusManager && appName && !isBrowserWithExtension(appName)) {
    focusManager.onForegroundApp(appName, categorizeApp(appName));
}
```

This is CORRECT for the main engine — when the browser is foreground, `onForegroundApp` is skipped and `handleBrowserData` → `onWebActivity` handles it instead.

**But for focus GROUP sessions:** there's no equivalent path. When the browser is the active window and a group session is running, nobody checks the group's `allowed_domains` against the current website. The main engine's `onWebActivity` fires (Gap 1), but it uses the wrong config.

---

### GAP 3: Focus group sessions don't register their allowed-domains with the focus engine

When `focusGroup:startWith` is called (main.ts:5151-5168):

```typescript
electron_1.ipcMain.handle('focusGroup:startWith', (_e, id, durationSec?, strictness?) => {
    const cfg = focusGroupManager.toConfig(id, durationSec, strictness);
    if (!cfg) return { success: false, error: 'Focus group not found' };
    const state = focusManager ? focusManager.start(cfg) : null;
    // ...
});
```

This calls `focusManager.start(cfg)` — which DOES set the main engine's allowed list to the group's config. So in theory, the main engine should enforce the group's domains.

**But here's the subtlety:** `focusManager.start()` sets `this.state.allowed.domains = cfg.allowed.domains`. If the group has `allowed_domains: ['youtube.com']` and strictness is `'non_allowed'`, then `onWebActivity('youtube.com')` should pass the `isAllowed` check at `focusManager.ts:120`:

```typescript
if (kind === 'website' && a.domains.includes(name)) return true;
```

This SHOULD work. So why doesn't it?

**The real bug (synthesized):** The issue is in the `isAllowed` logic for STRICT ('non_allowed') groups combined with the CATEGORY BUFFER. Looking at `focusManager.ts:122-127`:

```typescript
if (this.state.strictness === 'non_allowed') {
    // STRICT: exact whitelist only — the category buffer is BLOCKED here.
    // A group session (explicit list present) allows ONLY its exact apps/sites.
    if (hasExplicit) return false;
    return a.tiers.includes(tier);
}
```

When `hasExplicit` is true (apps OR domains list is non-empty), it returns `false` for EVERYTHING — including domains that ARE in the allow-list. Wait, no — the domain check at line 120 happens BEFORE this block. So `isAllowed` for a domain in the list returns `true` at line 120, and the strictness block at line 122 is never reached.

**So the isAllowed logic IS correct.** The problem must be elsewhere.

Let me re-examine. The `onWebActivity` at line 149-162:

```typescript
onWebActivity(domain: string) {
    if (!this.state.active || this.state.paused) return { overlay: false };
    const tier = this.classifyDomain(domain);
    if (this.isAllowed(tier, domain, 'website')) {
        if (!this.overlayHideTimer) this.hideOverlay();
        return { overlay: false };
    }
    // ... show overlay, break focus
}
```

This looks correct. If the domain is allowed, it returns early with no overlay.

**THE ACTUAL BUG:** `classifyDomain` at line 151. The domain is classified into a tier BEFORE the allow-list check. But the allow-list check at line 120 doesn't use the tier — it just checks if the domain name is in the list. So classification shouldn't matter.

Wait — let me re-read `isAllowed` more carefully:

```typescript
private isAllowed(tier: Tier, name: string, kind: 'app' | 'website', category?: string) {
    const a = this.state.allowed;
    if (kind === 'app' && a.apps.includes(name)) return true;
    if (kind === 'website' && a.domains.includes(name)) return true;  // ← line 120
    const hasExplicit = a.apps.length > 0 || a.domains.length > 0;
    if (this.state.strictness === 'non_allowed') {
        if (hasExplicit) return false;  // ← line 125: THIS IS THE BUG
        return a.tiers.includes(tier);
    }
    // ...
}
```

**Line 120** checks `a.domains.includes(name)` — this should return `true` for domains in the group's allow-list.

**BUT** — what if the domain being passed to `onWebActivity` doesn't exactly match what's stored in `allowed_domains`? For example:
- Stored: `['www.youtube.com']`
- Incoming: `'youtube.com'` (without www)

The `includes` check is exact string match. If the extension sends `'youtube.com'` but the group has `'www.youtube.com'`, it won't match.

**This is the most likely root cause:** Domain normalization mismatch between what the extension sends and what's stored in the focus group.

**Secondary bug:** Even if the domain matches, `handleBrowserData` (line 20753) has a guard at line 20761:

```typescript
if (data.is_browser_focused === false) {
    return;
}
```

If the extension sends `is_browser_focused: false` (which happens when the extension thinks it's not the focused window), the data is discarded BEFORE it reaches `focusManager.onWebActivity`. The user's complaint "it's not detecting that it is a browser" could be caused by the extension misreporting focus state.

---

### SUMMARY OF BUGS

| # | Bug | Location | Impact |
|---|-----|----------|--------|
| B1 | Domain string mismatch: extension sends bare domain (e.g. `youtube.com`) but group stores `www.youtube.com` → `includes()` fails → everything blocked | `focusManager.ts:120` + extension domain format | Primary: all websites blocked |
| B2 | `handleBrowserData` discards data when `is_browser_focused === false` — extension may misreport focus | `main.ts:20761` | Browser not detected as active |
| B3 | No focus-group-scoped website check when group session is active — main engine's config may differ from group config | `main.ts:20769-20771` | Group allowed-domains not enforced |

---

### FIXES

**Fix B1: Domain normalization in `isAllowed`**

In `src/domains/focus/focusManager.ts`, normalize domains before comparison. Strip `www.` prefix and compare case-insensitively.

**Fix B2: Don't discard browser data on `is_browser_focused === false` when a focus group session is active**

In `src/main.ts:handleBrowserData`, when a focus group session is active, still process the domain check even if `is_browser_focused` is false — the group's blocking logic needs to see the website regardless.

Actually, re-reading this: `is_browser_focused === false` is sent by the extension when the browser window is NOT the foreground window. In that case, the data IS phantom (background tab). The correct fix is to ensure the extension correctly reports focus state. But as a safety net, we should still run the domain through `isAllowed` — if it's blocked, we block; if it's allowed, we let it through (the time won't be logged since the browser isn't focused, but the blocking decision should still be correct).

Wait — actually the user's complaint says "it's not detecting that it is a browser and it just simply blocks the comment in itself." This suggests the extension IS detecting the browser but the focus group is blocking everything. So B2 may not be the primary issue.

**Fix B3: Focus group session domain checking**

The cleanest fix: when a focus group session is active, store the group's allowed-domains in a separate registry that `handleBrowserData` checks BEFORE (or instead of) the main engine.

Actually, re-reading the code flow one more time:

1. User starts a focus group session → `focusGroup:startWith` → `focusManager.start(cfg)` where `cfg.allowed.domains` = group's domains
2. User browses a website → extension sends data → `handleBrowserData` → `focusManager.onWebActivity(domain)`
3. `onWebActivity` calls `isAllowed(tier, domain, 'website')` which checks `a.domains.includes(domain)`

If the domain IS in the group's allowed_domains and the strings match exactly, this should work. The fact that it doesn't means either:
- (a) String mismatch (B1)
- (b) The focus group session isn't actually starting the focus manager with the right config
- (c) `focusManager` is null when `handleBrowserData` runs

Let me check (c): `handleBrowserData` guards with `if (focusManager)`. If `focusManager` is null, `onWebActivity` never fires. But `focusManager` is initialized at startup (main.ts:5115-5116), so it should be available.

Let me check (b): `focusGroup:startWith` at line 5151 calls `focusGroupManager.toConfig(id)` which returns a `FocusConfig`. Then `focusManager.start(cfg)`. If `toConfig` returns null (group not found), the handler returns `{ success: false }`. So if the start succeeded, the config was applied.

**Most likely: B1 (string mismatch) is the primary bug.**

---

### IMPLEMENTATION

**Fix 1: Domain normalization in focusManager.ts isAllowed()**

```typescript
// Add a helper to normalize domain for comparison
function normalizeDomain(d: string): string {
    const lower = d.toLowerCase().trim();
    // Strip www. prefix
    return lower.replace(/^www\./, '');
}

// In isAllowed(), compare normalized domains:
if (kind === 'website' && a.domains.some(d => normalizeDomain(d) === normalizeDomain(name))) return true;
```

**Fix 2: Also normalize domains when saving a focus group**

In `FocusGroupManager.save()`, normalize domains before storing:

```typescript
JSON.stringify(g.allowed_domains ?? []).map(d => normalizeDomain(d))
```

Wait — better to normalize at comparison time only, so existing groups don't break. Normalize both sides at check time.

**Fix 3: Pre-check domain against active focus group sessions in handleBrowserData**

Add a registry for active focus group sessions. When `handleBrowserData` fires, if a group session is active, check the domain against the group's allowed_domains using normalized comparison.

Actually, Fix 1 alone should solve the primary issue. Fix 3 is a safety net.

Let me also check: does `focusManager.start(cfg)` actually get called when a focus group session starts? Looking at the handler flow:

```typescript
// focusGroup:startWith (main.ts:5151)
const cfg = focusGroupManager.toConfig(id, durationSec, strictness);
const state = focusManager ? focusManager.start(cfg) : null;
```

`focusManager.start(cfg)` at `focusManager.ts:85`:
```typescript
start(cfg: FocusConfig) {
    // ...
    const allowed = {
        apps: cfg.allowed?.apps ?? [],
        domains: cfg.allowed?.domains ?? [],
        tiers: ...,
        categories: cfg.allowed?.categories ?? [],
    };
    this.state = {
        // ...
        allowed,
    };
}
```

So the allowed domains ARE set on the main engine. The `isAllowed` check at line 120 should work IF the strings match.

**Conclusion: Fix B1 (domain normalization) is the primary fix. B3 (group session registry) is secondary.**

---

### FILES TO MODIFY

1. `src/domains/focus/focusManager.ts` — add domain normalization to `isAllowed()`
2. `src/main.ts` — add focus group session registry + domain pre-check in `handleBrowserData`

### VERIFICATION STEPS

1. Create a focus group with `allowed_domains: ['youtube.com']`
2. Start a focus session with that group
3. Browse to youtube.com in the tracked browser
4. Verify: no distraction overlay, focus not broken
5. Browse to facebook.com
6. Verify: distraction overlay appears, focus broken

---

**CYCLE CONTINUATION PLAN:**

1. Apply Fix 1 (domain normalization in isAllowed)
2. Apply Fix 2 (handleBrowserData group session check)  
3. Build: `node scripts/build.mjs`
4. Verify in running app

---

**ARTIFACTS:**

- Source files to modify: `src/domains/focus/focusManager.ts`, `src/main.ts`
- Build command: `node scripts/build.mjs`
- Test: Focus group with youtube.com allowed → browse youtube → no block; browse facebook → blocked
