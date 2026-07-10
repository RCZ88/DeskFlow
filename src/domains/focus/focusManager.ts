import { BrowserWindow, ipcMain, screen } from 'electron';
import path from 'path';
import type Database from 'better-sqlite3';
import { ensureFocusSchema } from './focusSchema';

export type Tier = 'productive' | 'neutral' | 'distracting';
export type Strictness = 'distracting' | 'non_allowed';

export interface FocusConfig {
  durationSec: number;
  strictness?: Strictness;
  allowed?: { apps?: string[]; domains?: string[]; tiers?: Tier[] };
}

interface FocusState {
  active: boolean; sessionId: number | null;
  startedAt: number | null; endsAt: number | null;
  strictness: Strictness;
  allowed: { apps: string[]; domains: string[]; tiers: Tier[] };
  returnCount: number; paused: boolean;
}

export class FocusManager {
  private state: FocusState = this.idle();
  private overlay: BrowserWindow | null = null;
  private endTimer: NodeJS.Timeout | null = null;
  private current: { type: 'app' | 'website'; name: string } | null = null;

  constructor(
    private db: Database.Database,
    private getMainWindow: () => BrowserWindow | null,
    private classifyApp: (appName: string, category?: string) => Tier,
    private classifyDomain: (domain: string) => Tier,
    private token: string,
  ) {
    ensureFocusSchema(db);
    this.registerIpc();
  }

  private idle(): FocusState {
    return { active: false, sessionId: null, startedAt: null, endsAt: null,
      strictness: 'distracting',
      allowed: { apps: [], domains: [], tiers: ['productive', 'neutral'] },
      returnCount: 0, paused: false };
  }

  getPublicState() {
    return {
      active: this.state.active,
      endsAt: this.state.endsAt,
      strictness: this.state.strictness,
      remainingSec: this.state.endsAt ? Math.max(0, Math.round((this.state.endsAt - Date.now()) / 1000)) : 0,
      paused: this.state.paused,
    };
  }

  verifyToken(t?: string | string[]) {
    const v = Array.isArray(t) ? t[0] : t;
    return !!v && v === this.token;
  }

  start(cfg: FocusConfig) {
    if (this.state.active) this.end('aborted', 'restart');
    const now = Date.now();
    const strictness = cfg.strictness ?? 'distracting';
    const allowed = {
      apps: cfg.allowed?.apps ?? [],
      domains: cfg.allowed?.domains ?? [],
      tiers: cfg.allowed?.tiers ?? ['productive', 'neutral'] as Tier[],
    };
    const info = this.db.prepare(
      `INSERT INTO deep_focus_sessions (started_at, planned_sec, outcome, strictness, allowed_json)
       VALUES (?, ?, 'active', ?, ?)`
    ).run(new Date(now).toISOString(), cfg.durationSec, strictness, JSON.stringify(allowed));
    this.state = { active: true, sessionId: Number(info.lastInsertRowid),
      startedAt: now, endsAt: now + cfg.durationSec * 1000,
      strictness, allowed, returnCount: 0, paused: false };
    this.endTimer = setTimeout(() => this.complete(), cfg.durationSec * 1000);
    console.log('[focus] start', { id: this.state.sessionId, durationSec: cfg.durationSec, strictness });
    this.pushState();
    return this.getPublicState();
  }

  private isAllowed(tier: Tier, name: string, kind: 'app' | 'website') {
    const a = this.state.allowed;
    if (kind === 'app' && a.apps.includes(name)) return true;
    if (kind === 'website' && a.domains.includes(name)) return true;
    if (this.state.strictness === 'non_allowed') return a.tiers.includes(tier);
    return tier !== 'distracting';
  }

  onForegroundApp(appName: string, category?: string) {
    if (!this.state.active || this.state.paused) return;
    const tier = this.classifyApp(appName, category);
    if (this.isAllowed(tier, appName, 'app')) { this.hideOverlay(); return; }
    this.current = { type: 'app', name: appName };
    this.logEvent('distraction_shown', 'app', appName);
    console.log('[focus] app distraction', appName, tier);
    this.showOverlay({ type: 'app', name: appName, tier });
  }

  onWebActivity(domain: string) {
    if (!this.state.active || this.state.paused) return { overlay: false };
    const tier = this.classifyDomain(domain);
    if (this.isAllowed(tier, domain, 'website')) return { overlay: false };
    this.current = { type: 'website', name: domain };
    this.logEvent('distraction_shown', 'website', domain);
    console.log('[focus] web distraction', domain, tier);
    return { overlay: true, endsAt: this.state.endsAt, domain };
  }

  breakFocus(source: 'app' | 'website', name: string) {
    if (!this.state.active) return;
    this.logEvent('broke', source, name);
    console.log('[focus] BROKE', source, name);
    this.end('failed', `${source}:${name}`);
  }

  returnToFocus() {
    if (!this.state.active) return;
    this.state.returnCount++;
    this.logEvent('returned', this.current?.type, this.current?.name);
    console.log('[focus] returned', this.current);
    this.hideOverlay();
    this.refocusMain();
  }

  private complete() { this.end('completed', null); }

  end(outcome: 'completed' | 'failed' | 'aborted', reason: string | null) {
    if (!this.state.active) return;
    const now = Date.now();
    const actualSec = this.state.startedAt ? Math.round((now - this.state.startedAt) / 1000) : 0;
    const [bt, bn] = reason && reason.includes(':') ? reason.split(':') : [null, null];
    this.db.prepare(
      `UPDATE deep_focus_sessions SET ended_at=?, actual_sec=?, outcome=?, broke_on_type=?, broke_on_name=?, return_count=? WHERE id=?`
    ).run(new Date(now).toISOString(), actualSec, outcome,
          outcome === 'failed' ? bt : null, outcome === 'failed' ? bn : null,
          this.state.returnCount, this.state.sessionId);
    this.logEvent(outcome === 'completed' ? 'completed' : 'aborted');
    if (this.endTimer) { clearTimeout(this.endTimer); this.endTimer = null; }
    console.log('[focus] end', { outcome, actualSec, reason });
    this.hideOverlay();
    const id = this.state.sessionId;
    this.state = this.idle();
    this.pushState();
    this.getMainWindow()?.webContents.send('focus:ended', { outcome, reason, id });
  }

  private showOverlay(payload: { type: 'app' | 'website'; name: string; tier: Tier }) {
    const display = screen.getPrimaryDisplay();
    if (!this.overlay) {
      const overlayPreloadPath = path.join(__dirname, 'resources', 'focus', 'overlayPreload.cjs');
      const overlayHtmlPath = path.join(__dirname, 'resources', 'focus', 'overlay.html');
      this.overlay = new BrowserWindow({
        ...display.bounds, frame: false, transparent: true, resizable: false,
        movable: false, skipTaskbar: true, alwaysOnTop: true,
        fullscreenable: false, focusable: true,
        webPreferences: {
          preload: overlayPreloadPath,
          contextIsolation: true, nodeIntegration: false,
        },
      });
      this.overlay.setAlwaysOnTop(true, 'screen-saver');
      this.overlay.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
      this.overlay.loadFile(overlayHtmlPath);
      this.overlay.on('closed', () => { this.overlay = null; });
    }
    const send = () => this.overlay?.webContents.send('focus:overlay-data', { ...payload, endsAt: this.state.endsAt });
    if (this.overlay.webContents.isLoading())
      this.overlay.webContents.once('did-finish-load', send);
    else send();
    this.overlay.show();
    this.overlay.setAlwaysOnTop(true, 'screen-saver');
    this.overlay.focus();
  }

  private hideOverlay() { if (this.overlay?.isVisible()) this.overlay.hide(); this.current = null; }
  private refocusMain() { const mw = this.getMainWindow(); mw?.show(); mw?.focus(); }

  private logEvent(kind: string, t?: string | null, n?: string | null) {
    if (!this.state.sessionId) return;
    this.db.prepare(
      `INSERT INTO deep_focus_events (session_id, ts, kind, target_type, target_name) VALUES (?, ?, ?, ?, ?)`
    ).run(this.state.sessionId, new Date().toISOString(), kind, t ?? null, n ?? null);
  }

  private pushState() { this.getMainWindow()?.webContents.send('focus:state', this.getPublicState()); }

  private registerIpc() {
    ipcMain.handle('focus:start', (_e, cfg: FocusConfig) => this.start(cfg));
    ipcMain.handle('focus:end', (_e, outcome?: 'aborted') => { this.end(outcome ?? 'aborted', 'user'); });
    ipcMain.handle('focus:get-state', () => this.getPublicState());
    ipcMain.handle('focus:history', (_e, opts?: { limit?: number }) =>
      this.db.prepare(`SELECT * FROM deep_focus_sessions ORDER BY started_at DESC LIMIT ?`).all(opts?.limit ?? 50));
    ipcMain.on('focus:overlay-return', () => this.returnToFocus());
    ipcMain.on('focus:overlay-break', () =>
      this.breakFocus(this.current?.type ?? 'app', this.current?.name ?? 'unknown'));
  }
}
