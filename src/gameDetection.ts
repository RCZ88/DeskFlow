import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileP = promisify(execFile);

// Process names (lowercased) that mean "a launcher is focused, not a game"
export const GAME_LAUNCHERS: Record<string, string[]> = {
  steam: ['steam.exe', 'steamwebhelper.exe'],
  epic: ['epicgameslauncher.exe', 'unrealcefsubprocess.exe'],
  'battle.net': ['battle.net.exe', 'agent.exe'],
  ea: ['eaapp.exe', 'origin.exe', 'eadesktop.exe'],
  gog: ['goggalaxy.exe'],
  ubisoft: ['ubisoftconnect.exe', 'upc.exe'],
  riot: ['riotclient.exe', 'riotclientservices.exe'],
};

const LAUNCHER_EXES = new Set(
  Object.values(GAME_LAUNCHERS).flat().map((e) => e.toLowerCase())
);

export const isLauncherProcess = (name?: string | null): boolean =>
  !!name && LAUNCHER_EXES.has(name.toLowerCase());

// Seed map: generic exe name -> display name. Extended at startup from the
// Steam library (see buildInstalledGameIndex). Keys are lowercased exe names.
export const KNOWN_GAME_PROCESSES: Record<string, string> = {
  'client.exe': 'Wuthering Waves',
  'wutheringwaves.exe': 'Wuthering Waves',
  'genshinimpact.exe': 'Genshin Impact',
  'yuanshen.exe': 'Genshin Impact',
  'starrail.exe': 'Honkai: Star Rail',
  'eldenring.exe': 'Elden Ring',
  'cyberpunk2077.exe': 'Cyberpunk 2077',
  'valorant.exe': 'Valorant',
  'valorant-win64-shipping.exe': 'Valorant',
};

// Window-title fallback. "Wuthering Waves - Steam" -> "Wuthering Waves"
export function gameNameFromTitle(title?: string | null): string | null {
  if (!title) return null;
  const m = title.match(/^(.+?)\s*[-–—]\s*(?:steam|epic games)\s*$/i);
  if (m) return m[1].trim();
  const t = title.trim();
  if (t && !/^(steam|epic games launcher|battle\.net)$/i.test(t)) return t;
  return null;
}

// exe-name (lower) -> display name, built once. Also tracks install dirs.
export const installedGameIndex = new Map<string, string>();

function steamRoots(): string[] {
  const guesses = [
    'C:\\Program Files (x86)\\Steam',
    'C:\\Program Files\\Steam',
    path.join(os.homedir(), '.steam', 'steam'),
    path.join(os.homedir(), 'Library', 'Application Support', 'Steam'),
  ];
  return guesses.filter((p) => safeExists(path.join(p, 'steamapps')));
}

const safeExists = (p: string): boolean => {
  try {
    return fs.existsSync(p);
  } catch {
    return false;
  }
};

// Minimal VDF value scrape: pull all "path" entries from libraryfolders.vdf
function libraryPaths(steamRoot: string): string[] {
  const out = [path.join(steamRoot, 'steamapps')];
  try {
    const vdf = fs.readFileSync(
      path.join(steamRoot, 'steamapps', 'libraryfolders.vdf'), 'utf8'
    );
    for (const m of vdf.matchAll(/"path"\s*"([^"]+)"/g)) {
      out.push(path.join(m[1].replace(/\\\\/g, '\\'), 'steamapps'));
    }
  } catch {
    // no library file: fall back to default only
  }
  return out;
}

// Read appmanifest_*.acf -> { name, installdir }. Index the install dir name
// AND a best-guess exe so both process-name and title paths can resolve.
export function buildInstalledGameIndex(): void {
  installedGameIndex.clear();
  try {
    for (const root of steamRoots()) {
      for (const lib of libraryPaths(root)) {
        if (!safeExists(lib)) continue;
        for (const f of fs.readdirSync(lib)) {
          if (!/^appmanifest_\d+\.acf$/.test(f)) continue;
          const acf = fs.readFileSync(path.join(lib, f), 'utf8');
          const name = acf.match(/"name"\s*"([^"]+)"/)?.[1];
          const dir = acf.match(/"installdir"\s*"([^"]+)"/)?.[1];
          if (!name) continue;
          if (dir) installedGameIndex.set(dir.toLowerCase(), name);
          installedGameIndex.set(
            name.toLowerCase().replace(/[^a-z0-9]/g, '') + '.exe', name
          );
        }
      }
    }
  } catch (e) {
    console.warn('[gameDetection] index build skipped:', (e as Error)?.message);
  }
}

type ResolvedCache = { name: string | null; at: number };
let scanCache: ResolvedCache = { name: null, at: 0 };
const SCAN_TTL = 10000;
let scanInFlight: Promise<string | null> | null = null;

export function lookupExe(exe: string, fullPath?: string | null): string | null {
  const k = exe.toLowerCase();
  
  // 1. Check if we can disambiguate by path (most reliable for generic names like Client.exe)
  if (fullPath) {
    const lowerPath = fullPath.toLowerCase();
    for (const [dir, name] of installedGameIndex.entries()) {
      // If the path contains the install directory name, it's a very strong match
      if (lowerPath.includes(dir)) return name;
    }
  }

  // 2. Fallback to direct process name mapping
  return KNOWN_GAME_PROCESSES[k] ?? installedGameIndex.get(k) ?? null;
}

// Returns a game display name if a known game process is running, else null
async function scanForGameProcess(): Promise<string | null> {
  const now = Date.now();
  if (now - scanCache.at < SCAN_TTL) return scanCache.name;
  if (scanInFlight) return scanInFlight;

  scanInFlight = (async () => {
    let found: string | null = null;
    try {
      if (process.platform === 'win32') {
        const { stdout } = await execFileP(
          'tasklist', ['/fo', 'csv', '/nh'], { windowsHide: true, timeout: 4000 }
        );
        for (const line of stdout.split(/\r?\n/)) {
          const exe = line.split('","')[0]?.replace(/"/g, '').trim();
          if (!exe) continue;
          if (isLauncherProcess(exe)) continue;
          const hit = lookupExe(exe, null);
          if (hit) { found = hit; break; }
        }
      }
    } catch {
      // timeout / denied: keep found = null
    }
    scanCache = { name: found, at: Date.now() };
    scanInFlight = null;
    return found;
  })();
  return scanInFlight;
}

export type ResolveSource = 'title' | 'map' | 'index' | 'scan' | 'keepalive' | 'raw';
let lastResolvedGame: string | null = null;

export async function resolveForegroundApp(
  raw: { owner?: { name?: string; path?: string }; title?: string } | null,
): Promise<{ name: string; source: ResolveSource } | null> {
  if (!raw) {
    if (lastResolvedGame) return { name: lastResolvedGame, source: 'keepalive' };
    return null;
  }

  const proc = raw.owner?.name ?? '';
  const procPath = raw.owner?.path ?? '';
  const title = raw.title ?? '';

  const launcher = isLauncherProcess(proc);
  const mappedByProc = lookupExe(proc, procPath);

  if (!launcher && !mappedByProc) {
    lastResolvedGame = null;
    return { name: proc || title || 'Unknown', source: 'raw' };
  }

  if (mappedByProc) {
    lastResolvedGame = mappedByProc;
    return { name: mappedByProc, source: 'map' };
  }

  const byTitle = gameNameFromTitle(title);
  if (byTitle) {
    lastResolvedGame = byTitle;
    return { name: byTitle, source: 'title' };
  }

  const byScan = await scanForGameProcess();
  if (byScan) {
    lastResolvedGame = byScan;
    return { name: byScan, source: 'scan' };
  }

  lastResolvedGame = null;
  return { name: proc, source: 'raw' };
}

// For manual "Rescan games" button
export function rescanGames(): void {
  buildInstalledGameIndex();
  // Reset scan cache so next game poll will re-scan
  scanCache = { name: null, at: 0 };
}