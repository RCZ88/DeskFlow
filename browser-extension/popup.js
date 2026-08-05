// DeskFlow Browser Tracker - Popup script
// Reads persisted state from chrome.storage.local + live server status.
const DESKFLOW_SERVER = 'http://localhost:54321';

const $ = (id) => document.getElementById(id);

function fmtDuration(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${m}:${String(s).padStart(2, '0')}`;
}

function fmtSync(ts) {
  if (!ts) return '—';
  const diff = Date.now() - ts;
  if (diff < 5000) return 'just now';
  if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  return new Date(ts).toLocaleTimeString();
}

function setStatus(ok, label) {
  const dot = $('statusDot');
  dot.className = 'dot ' + ok;
  $('statusLabel').textContent = label;
}

function render(state, serverHealthy) {
  $('trackToggle').classList.toggle('tracking', !!state.isTrackingEnabled);
  $('trackToggle').setAttribute('aria-checked', String(!!state.isTrackingEnabled));

  const healthy = serverHealthy && state.serverHealthy !== false;
  $('serverVal').textContent = healthy ? 'connected' : 'offline';
  $('domainVal').textContent = state.activeTabDomain || '—';
  $('titleVal').textContent = state.activeTabTitle || '—';

  const sessionStart = state.sessionStart || Date.now();
  $('sessionVal').textContent = fmtDuration(Date.now() - sessionStart);
  $('syncVal').textContent = fmtSync(state.lastPeriodicSync);

  if (healthy && state.isTrackingEnabled) setStatus('ok', 'tracking');
  else if (healthy && !state.isTrackingEnabled) setStatus('warn', 'paused');
  else setStatus('off', 'offline');
}

async function refresh() {
  let serverHealthy = false;
  try {
    const r = await fetch(`${DESKFLOW_SERVER}/health`, { signal: AbortSignal.timeout(2000) });
    serverHealthy = r.ok;
  } catch { serverHealthy = false; }

  chrome.storage.local.get([
    'deskflow_activeTabUrl',
    'deskflow_activeTabTitle',
    'deskflow_activeTabDomain',
    'deskflow_sessionStart',
    'deskflow_lastPeriodicSync',
    'deskflow_isTrackingEnabled',
    'deskflow_isBrowserFocused'
  ], (data) => {
    const err = chrome.runtime.lastError;
    if (err) {
      $('errorBox').textContent = 'Storage read failed: ' + err.message;
      $('errorBox').style.display = 'block';
      return;
    }
    render({
      activeTabDomain: data.deskflow_activeTabDomain,
      activeTabTitle: data.deskflow_activeTabTitle,
      sessionStart: data.deskflow_sessionStart || Date.now(),
      lastPeriodicSync: data.deskflow_lastPeriodicSync,
      isTrackingEnabled: data.deskflow_isTrackingEnabled !== false,
      isBrowserFocused: data.deskflow_isBrowserFocused !== false
    }, serverHealthy);
  });

  $('serverVal').textContent = serverHealthy ? 'connected' : 'offline';
}

function toggleTracking() {
  chrome.storage.local.get('deskflow_isTrackingEnabled', (data) => {
    const next = !(data.deskflow_isTrackingEnabled !== false);
    chrome.storage.local.set({ deskflow_isTrackingEnabled: next }, () => {
      const toggle = $('trackToggle');
      toggle.classList.toggle('tracking', next);
      toggle.setAttribute('aria-checked', String(next));
      if (next) setStatus('ok', 'tracking');
      else setStatus('warn', 'paused');
    });
  });
}

try {
  const ua = navigator.userAgent;
  const brand = ua.includes('Edg/') ? 'edge' : ua.includes('OPR/') ? 'opera' : ua.includes('Chrome') ? 'chrome' : 'browser';
  $('browserPill').textContent = brand;
} catch {}

$('trackToggle').addEventListener('click', toggleTracking);
$('trackToggle').addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleTracking(); }
});

// Live-updating session timer + status (popup stays open while user reads it)
setInterval(refresh, 1000);
refresh();