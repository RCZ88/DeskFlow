// DeskFlow Browser Extension - Background Service Worker (MV3)
// Tracks only the actively viewed tab and sends data to DeskFlow Electron app
//
// Key design decisions (based on Chromium MV3 best practices):
// - Uses chrome.alarms instead of setInterval (SW gets killed when idle)
// - Persists state to chrome.storage.local (survives SW restarts)
// - Listens for tabs.onRemoved (handles tab close/crash)
// - Defensive error handling for tabs.get ("No tab with id")

const DESKFLOW_SERVER = 'http://localhost:54321';
const ALARM_NAME = 'deskflowSync';
const SYNC_PERIOD_MINUTES = 0.083; // ~5 seconds
const MIN_SESSION_MS = 3000;       // Minimum 3 seconds before logging
const HEALTH_CHECK_TIMEOUT_MS = 3000;

// --- State (persisted to chrome.storage.local) ---
let state = {
  activeTabId: null,
  activeTabUrl: '',
  activeTabTitle: '',
  activeTabDomain: '',
  sessionStart: Date.now(),
  lastPeriodicSync: Date.now(),  // Track last sync time for delta calculation
  isTrackingEnabled: true,
  serverHealthy: false,
  isBrowserFocused: true         // Track if browser window has focus
};

// --- Persistence helpers ---
async function saveState() {
  try {
    await chrome.storage.local.set({
      deskflow_activeTabId: state.activeTabId,
      deskflow_activeTabUrl: state.activeTabUrl,
      deskflow_activeTabTitle: state.activeTabTitle,
      deskflow_activeTabDomain: state.activeTabDomain,
      deskflow_sessionStart: state.sessionStart,
      deskflow_lastPeriodicSync: state.lastPeriodicSync,
      deskflow_isTrackingEnabled: state.isTrackingEnabled,
      deskflow_isBrowserFocused: state.isBrowserFocused
    });
  } catch (err) {
    console.debug('[DeskFlow] Failed to save state:', err.message);
  }
}

async function loadState() {
  try {
    const data = await chrome.storage.local.get([
      'deskflow_activeTabId',
      'deskflow_activeTabUrl',
      'deskflow_activeTabTitle',
      'deskflow_activeTabDomain',
      'deskflow_sessionStart',
      'deskflow_lastPeriodicSync',
      'deskflow_isTrackingEnabled',
      'deskflow_isBrowserFocused'
    ]);

    if (data.deskflow_activeTabId !== undefined) state.activeTabId = data.deskflow_activeTabId;
    if (data.deskflow_activeTabUrl) state.activeTabUrl = data.deskflow_activeTabUrl;
    if (data.deskflow_activeTabTitle) state.activeTabTitle = data.deskflow_activeTabTitle;
    if (data.deskflow_activeTabDomain) state.activeTabDomain = data.deskflow_activeTabDomain;
    if (data.deskflow_sessionStart) state.sessionStart = data.deskflow_sessionStart;
    if (data.deskflow_lastPeriodicSync) state.lastPeriodicSync = data.deskflow_lastPeriodicSync;
    // CRITICAL FIX: If lastPeriodicSync is not set, initialize to now to prevent huge delta on first sync
    if (!data.deskflow_lastPeriodicSync) state.lastPeriodicSync = Date.now();
    if (data.deskflow_isTrackingEnabled !== undefined) state.isTrackingEnabled = data.deskflow_isTrackingEnabled;
    if (data.deskflow_isBrowserFocused !== undefined) state.isBrowserFocused = data.deskflow_isBrowserFocused;

    console.log('[DeskFlow] 📦 State loaded from storage');
  } catch (err) {
    console.warn('[DeskFlow] Failed to load state, using defaults:', err.message);
    // Initialize lastPeriodicSync on error
    state.lastPeriodicSync = Date.now();
  }
}

// --- Helper: Detect which browser the extension is running in ---
function detectBrowserName() {
  const ua = navigator.userAgent;
  // Comet - check for Comet-specific patterns (based on user's Comet browser)
  if (ua.includes('Comet') || ua.includes('comet')) return 'Comet';
  // Arc browser
  if (ua.includes('Arc')) return 'Arc';
  // Microsoft Edge (must check before Chrome since Edge includes Chrome in UA)
  if (ua.includes('Edg/')) return 'Edge';
  // Opera (must check before Chrome since Opera includes Chrome in UA)
  if (ua.includes('OPR/') || ua.includes('Opera')) return 'Opera';
  // Brave (must check before Chrome since Brave includes Chrome in UA)
  if (ua.includes('Brave')) return 'Brave';
  // Vivaldi
  if (ua.includes('Vivaldi')) return 'Vivaldi';
  // Firefox
  if (ua.includes('Firefox')) return 'Firefox';
  // Chrome (generic - keep last since many browsers include Chrome)
  if (ua.includes('Chrome')) return 'Chrome';
  // Safari (keep last since some Chrome-based browsers may include Safari)
  if (ua.includes('Safari')) return 'Safari';
  return 'Unknown';
}

const BROWSER_NAME = detectBrowserName();

// Map browser brand names to OS process names (what active-win returns)
// Key = BROWSER_NAME return value, values = possible process names (without .exe)
// This handles cases where the UA brand name differs from the executable name
const BROWSER_PROCESS_NAMES = {
  'comet': ['chrome', 'comet', 'chromium'],
  'chrome': ['chrome', 'chromium'],
  'brave': ['brave', 'chrome'],
  'edge': ['msedge', 'edge'],
  'opera': ['opera'],
  'vivaldi': ['vivaldi'],
  'firefox': ['firefox'],
  'arc': ['arc'],
  'safari': ['safari'],
};

function getBrowserProcessNames(browserName) {
  const key = browserName.toLowerCase();
  return BROWSER_PROCESS_NAMES[key] || [key];
}

// --- Send browser identification to DeskFlow ---
async function identifyBrowser() {
  try {
    const processNames = getBrowserProcessNames(BROWSER_NAME);
    // Send the BROWSER_NAME (brand) AND a normalized process-compatible name
    // so the desktop app can match against OS process names
    await fetch(`${DESKFLOW_SERVER}/browser-identify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ browser: BROWSER_NAME, processNames }),
      signal: AbortSignal.timeout(2000)
    });
    console.log('[DeskFlow] 🏷️ Identified as:', BROWSER_NAME, 'processNames:', processNames);
  } catch (err) {
    console.debug('[DeskFlow] Could not identify browser to server:', err.message);
  }
}

// --- Helper: Extract domain from URL ---
function extractDomain(url) {
  if (!url) return 'unknown';
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace(/^www\./, '');
  } catch {
    return url.split('/')[2] || 'unknown';
  }
}

// --- Helper: Sanitize URL (strip query params and hash, keep path root) ---
function sanitizeUrl(url) {
  if (!url) return '';
  try {
    const urlObj = new URL(url);
    return `${urlObj.origin}${urlObj.pathname.replace(/\/$/, '')}`;
  } catch {
    return url.split('?')[0].split('#')[0];
  }
}

// --- Helper: Check if domain/URL should be excluded ---
function shouldExclude(url, domain) {
  // Non-http/https URLs (chrome://, about:, edge://, comet://, etc.)
  if (!url.startsWith('http://') && !url.startsWith('https://')) return true;

  const excludedPatterns = [
    'localhost',
    '127.0.0.1',
    'chrome-extension://',
    'about:blank',
    'newtab'
  ];

  return excludedPatterns.some(pattern =>
    url.includes(pattern) || domain.includes(pattern)
  );
}

// --- Send data to DeskFlow ---
async function sendToDeskFlow(data) {
  if (!state.isTrackingEnabled) return;

  try {
    const response = await fetch(`${DESKFLOW_SERVER}/browser-data`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      signal: AbortSignal.timeout(2000)
    });

    if (response.ok) {
      state.serverHealthy = true;
      console.log('[DeskFlow] ✅ Synced:', data.domain, `(${Math.round(data.active_duration_ms / 1000)}s)`);
    } else {
      state.serverHealthy = false;
      console.warn('[DeskFlow] ⚠️ Server returned', response.status, response.statusText);
    }
  } catch (err) {
    state.serverHealthy = false;
    if (err.name === 'AbortError') {
      console.debug('[DeskFlow] ⏱️ Request timed out — server may not be running');
    } else {
      console.debug('[DeskFlow] ⚠️ Server unreachable:', err.message);
    }
  }
}

// --- Health check on startup ---
async function healthCheck() {
  try {
    const response = await fetch(`${DESKFLOW_SERVER}/health`, {
      signal: AbortSignal.timeout(HEALTH_CHECK_TIMEOUT_MS)
    });
    if (response.ok) {
      const data = await response.json();
      console.log('[DeskFlow] 💚 Server healthy:', data);
      state.serverHealthy = true;
    }
  } catch (err) {
    console.warn('[DeskFlow] 💔 Server health check failed — tracking data will queue until server starts');
    state.serverHealthy = false;
  }
}

// --- Check if the SPECIFIC browser with this extension is the focused application ---
// Queries the desktop app to see what app is currently in foreground
// Only considers the browser focused if the foreground app matches THIS browser
// (not just any browser), preventing website tracking when a different browser/app is active
async function checkBrowserFocus() {
  try {
    const response = await fetch(`${DESKFLOW_SERVER}/foreground-app`, {
      signal: AbortSignal.timeout(HEALTH_CHECK_TIMEOUT_MS)
    });
    if (response.ok) {
      const data = await response.json();
      const appName = (data.app || '').toLowerCase();
      const browserName = BROWSER_NAME.toLowerCase();
      const processNames = getBrowserProcessNames(BROWSER_NAME);
      
      // Check multiple matching strategies:
      // 1. Foreground app contains the browser brand name (e.g., "chrome.exe" contains "chrome")
      // 2. Browser brand name contains the foreground app (handles short process names)
      // 3. Foreground app matches any known process name for this browser (handles brand-name mismatch)
      const isBrowserActive = browserName.length > 0 && (
        appName.includes(browserName) ||
        browserName.includes(appName) ||
        processNames.some(p => appName.includes(p))
      );
      
      console.log('[DeskFlow] 🔍 Foreground app:', data.app, `(extension host: ${BROWSER_NAME})`, '-> Browser focused:', isBrowserActive);
      state.isBrowserFocused = isBrowserActive;
      await saveState();
      return isBrowserActive;
    }
  } catch (err) {
    console.debug('[DeskFlow] Could not check foreground app:', err.message);
  }
  // On error (server unreachable, timeout), assume browser is NOT focused
  // Prevents phantom tracking when the desktop app isn't responding
  state.isBrowserFocused = false;
  await saveState();
  return false;
}

// Poll for foreground app changes periodically
let focusCheckInterval = null;
function startFocusCheckPolling() {
  if (focusCheckInterval) clearInterval(focusCheckInterval);
  focusCheckInterval = setInterval(checkBrowserFocus, 2000); // Check every 2 seconds
  console.log('[DeskFlow] 🔄 Started focus check polling');
}

// --- Update active tab tracking ---
async function updateActiveTab(tabId) {
  if (!tabId) return;

  try {
    const tab = await chrome.tabs.get(tabId);
    if (!tab || !tab.url) {
      console.debug('[DeskFlow] Tab', tabId, 'has no URL, skipping');
      return;
    }

    const domain = extractDomain(tab.url);

    // Skip excluded domains/URLs
    if (shouldExclude(tab.url, domain)) {
      console.debug('[DeskFlow] Excluded URL:', tab.url.substring(0, 60));
      return;
    }

    // If switching to a different tab, log the previous session first
    if (state.activeTabId !== null && state.activeTabId !== tabId) {
      await logPreviousSession();
    }

    // Update active tab state
    state.activeTabId = tabId;
    state.activeTabUrl = sanitizeUrl(tab.url);
    state.activeTabTitle = tab.title || domain;
    state.activeTabDomain = domain;
    state.sessionStart = Date.now();
    // CRITICAL FIX: Reset lastPeriodicSync when switching to new domain to prevent huge delta
    state.lastPeriodicSync = Date.now();

    await saveState();
    console.log('[DeskFlow] 🔄 Tab activated:', domain);

  } catch (err) {
    // Defensive: tabs.get throws "No tab with id" when tab is gone
    if (err.message && err.message.includes('No tab with id')) {
      console.debug('[DeskFlow] Tab', tabId, 'no longer exists, skipping');
    } else {
      console.debug('[DeskFlow] Tab update failed:', err.message);
    }
  }
}

// --- Log previous session if it was long enough ---
async function logPreviousSession(force = false) {
  if (!state.activeTabId || !state.activeTabUrl) return;

  // Skip if browser lost focus UNLESS this is the final flush on focus loss
  // Prevents background tab navigations/activations from creating phantom entries
  if (!force && !state.isBrowserFocused) {
    console.debug('[DeskFlow] 🔇 Browser not focused, skipping background tab log');
    return;
  }

  const duration = Date.now() - state.sessionStart;

  // Only log if session was long enough to matter
  if (duration < MIN_SESSION_MS) {
    console.debug('[DeskFlow] Session too short, skipping:', Math.round(duration / 1000) + 's');
    return;
  }

  const data = {
    url: state.activeTabUrl,
    domain: state.activeTabDomain,
    title: state.activeTabTitle,
    tab_id: state.activeTabId,
    timestamp: new Date(state.sessionStart).toISOString(),
    active_duration_ms: duration,
    sanitized_url: sanitizeUrl(state.activeTabUrl),
    is_periodic: false, // Important: this is a tab switch, NOT a periodic sync
    delta_ms: 0,
    is_browser_focused: state.isBrowserFocused // Tell desktop app if browser was focused
  };

  await sendToDeskFlow(data);
  
  // CRITICAL FIX: Reset lastPeriodicSync after logging to prevent huge delta on next periodic sync
  state.lastPeriodicSync = Date.now();
  await saveState();
}

// --- Periodic sync: send delta (new time since last sync) ---
async function periodicSync() {
  // Don't track if no active tab or tracking is disabled
  if (!state.activeTabId || !state.isTrackingEnabled) return;

  // If browser is not focused, just update sync timestamp and return
  // Prevents phantom delta accumulation when focus returns
  if (!state.isBrowserFocused) {
    state.lastPeriodicSync = Date.now();
    await saveState();
    return;
  }

  // Calculate DELTA (new time since last sync), not total duration
  const deltaMs = Date.now() - state.lastPeriodicSync;
  
  // Only sync if we've accumulated at least MIN_SESSION_MS of new activity
  if (deltaMs < MIN_SESSION_MS) return;

  // Cap delta at 5 minutes to prevent sleep-time artifacts
  const MAX_DELTA_MS = 5 * 60 * 1000;
  const cappedDelta = Math.min(deltaMs, MAX_DELTA_MS);

  const data = {
    url: state.activeTabUrl,
    domain: state.activeTabDomain,
    title: state.activeTabTitle,
    tab_id: state.activeTabId,
    timestamp: new Date(state.lastPeriodicSync).toISOString(),
    active_duration_ms: cappedDelta,        // Now sending DELTA, not total
    sanitized_url: sanitizeUrl(state.activeTabUrl),
    is_periodic: true,
    delta_ms: cappedDelta,                   // Explicit delta for desktop app
    is_browser_focused: state.isBrowserFocused // Tell desktop app if browser is focused
  };

  // Update last sync time after preparing data
  state.lastPeriodicSync = Date.now();
  await saveState();

  await sendToDeskFlow(data);
}

// ========================================
// --- Event Listeners ---
// ========================================

// 1. Tab activated (user clicked on a different tab)
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  console.log('[DeskFlow] 📑 Tab activated:', activeInfo.tabId, 'in window', activeInfo.windowId);
  await updateActiveTab(activeInfo.tabId);
});

// 2. Tab updated (URL changed, page loaded, title changed)
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  // Only process if this is the active tab
  if (tabId !== state.activeTabId) return;

  // URL or title changed — update our tracking
  if (changeInfo.url || changeInfo.title) {
    const url = changeInfo.url || state.activeTabUrl;
    const domain = extractDomain(url);

    if (shouldExclude(url, domain)) {
      console.debug('[DeskFlow] Tab update to excluded URL, skipping');
      return;
    }

    // Log previous URL session before updating (navigation within same tab)
    if (state.activeTabUrl && sanitizeUrl(url) !== state.activeTabUrl) {
      console.log('[DeskFlow] 🔗 Navigation detected:', state.activeTabDomain, '→', domain);
      await logPreviousSession();
    }

    state.activeTabUrl = sanitizeUrl(url);
    state.activeTabTitle = tab.title || state.activeTabTitle;
    state.activeTabDomain = domain;
    state.sessionStart = Date.now();

    await saveState();
  }
});

// 3. Navigation completed (page fully loaded in main frame)
chrome.webNavigation.onCompleted.addListener(async (details) => {
  // Only track main frame navigations (not iframes)
  if (details.frameId !== 0) return;

  // Only if this is the active tab
  if (details.tabId !== state.activeTabId) return;

  try {
    const tab = await chrome.tabs.get(details.tabId);
    if (!tab || !tab.url) return;

    if (shouldExclude(tab.url, extractDomain(tab.url))) return;

    // Log previous page session before updating
    if (state.activeTabUrl && sanitizeUrl(tab.url) !== state.activeTabUrl) {
      console.log('[DeskFlow] 📄 Page navigation completed:', details.tabId);
      await logPreviousSession();
    }

    state.activeTabId = details.tabId;
    state.activeTabUrl = sanitizeUrl(tab.url);
    state.activeTabTitle = tab.title || extractDomain(tab.url);
    state.activeTabDomain = extractDomain(tab.url);
    state.sessionStart = Date.now();
    state.lastPeriodicSync = Date.now(); // Reset sync time for new page

    await saveState();
  } catch (err) {
    console.debug('[DeskFlow] webNavigation handler failed:', err.message);
  }
});

// 4. Window focus changed (user switched browser windows or left browser entirely)
chrome.windows.onFocusChanged.addListener(async (windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    // Lost focus — user left the browser (Alt+Tab, clicked another app)
    console.log('[DeskFlow] 🪟 Browser lost focus - pausing tracking');
    state.isBrowserFocused = false;
    await saveState();
    await logPreviousSession(true); // Force flush: capture time spent up to focus loss
  } else {
    // Regained focus — refresh active tab for the SPECIFIC window that gained focus
    // FIX: Use windowId from the event, NOT currentWindow:true (which queries extension's popup window)
    console.log('[DeskFlow] 🪟 Browser regained focus, window:', windowId);
    state.isBrowserFocused = true;
    state.lastPeriodicSync = Date.now(); // Reset sync time when regaining focus
    await saveState();
    try {
      // Query tabs in the SPECIFIC window that just gained focus
      const tabs = await chrome.tabs.query({ active: true, windowId: windowId });
      if (tabs.length > 0) {
        await updateActiveTab(tabs[0].id);
      }
    } catch (err) {
      console.debug('[DeskFlow] Focus change handler failed:', err.message);
    }
  }
});

// 5. Tab removed (closed or crashed) — ADDED based on Perplexity feedback
chrome.tabs.onRemoved.addListener(async (tabId, removeInfo) => {
  if (tabId === state.activeTabId) {
    console.log('[DeskFlow] ❌ Active tab removed:', tabId);
    await logPreviousSession();

    // Reset state
    state.activeTabId = null;
    state.activeTabUrl = '';
    state.activeTabTitle = '';
    state.activeTabDomain = '';
    state.sessionStart = Date.now();
    state.lastPeriodicSync = Date.now(); // Reset sync time for new session

    await saveState();
  }
});

// ========================================
// --- chrome.alarms for periodic sync ---
// (Replaces setInterval — survives SW suspension)
// ========================================

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === ALARM_NAME) {
    await periodicSync();
  }
});

// ========================================
// --- Startup sequence ---
// ========================================

async function onStartup() {
  console.log('[DeskFlow] 🚀 Browser tracker extension started (MV3)');

  // 1. Load persisted state
  await loadState();

  // 2. Health check — verify DeskFlow server is running
  await healthCheck();

  // 3. Identify which browser this extension is running in
  await identifyBrowser();

  // 4. Check initial browser focus state
  await checkBrowserFocus();

  // 4. Start focus check polling to monitor foreground app changes
  startFocusCheckPolling();

  // 5. Set up periodic sync alarm (every ~5 seconds)
  // Clear existing alarm first to avoid duplicates on reload
  chrome.alarms.clear(ALARM_NAME);
  chrome.alarms.create(ALARM_NAME, { periodInMinutes: SYNC_PERIOD_MINUTES });
  console.log(`[DeskFlow] ⏰ Periodic sync alarm set (every ${SYNC_PERIOD_MINUTES * 60}s)`);

  // 6. If we had an active tab from before SW restart, verify it still exists
  if (state.activeTabId) {
    try {
      const tab = await chrome.tabs.get(state.activeTabId);
      if (tab && tab.url) {
        console.log('[DeskFlow] 📋 Restored active tab:', state.activeTabDomain);
      } else {
        console.log('[DeskFlow] 📋 Previously active tab no longer exists, resetting');
        state.activeTabId = null;
        state.activeTabUrl = '';
        state.activeTabDomain = '';
        await saveState();
      }
    } catch {
      // Tab no longer exists — reset
      state.activeTabId = null;
      await saveState();
    }
  }

  // 5. Query the currently active tab to initialize tracking
  try {
    const tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    if (tabs.length > 0 && tabs[0].url) {
      await updateActiveTab(tabs[0].id);
      console.log('[DeskFlow] 📋 Initialized with current tab:', state.activeTabDomain);
    }
  } catch (err) {
    console.debug('[DeskFlow] Could not query active tab on startup:', err.message);
  }
}

// Listen for extension runtime events
chrome.runtime.onStartup.addListener(onStartup);
chrome.runtime.onInstalled.addListener(onStartup);

// Also run on service worker wake (handles SW being killed and restarted)
onStartup();

// ========================================
// --- Cleanup on service worker shutdown ---
// ========================================

chrome.runtime.onSuspend.addListener(async () => {
  console.log('[DeskFlow] 💤 Service worker suspending — flushing session');
  await logPreviousSession();
});
