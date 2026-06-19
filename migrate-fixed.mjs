/**
 * Fixed migration script: handles missing settings table, no crashes
 */
import fs from 'fs';
import path from 'path';
import initSqlJs from 'sql.js';

const userDataPath = process.env.APPDATA 
    ? path.join(process.env.APPDATA, 'DeskFlow')
  : path.join(process.env.HOME, '.config', 'DeskFlow');

const dbPath = path.join(userDataPath, 'deskflow-data.db');
const jsonPath = path.join(userDataPath, 'deskflow-data.json');

console.log('[Migration] Reading from:', dbPath);

if (!fs.existsSync(dbPath)) {
  console.error('[Migration] ERROR: Database file not found!');
  process.exit(1);
}

try {
  const dbBuffer = fs.readFileSync(dbPath);
  const SQL = await initSqlJs();
  const db = new SQL.Database(new Uint8Array(dbBuffer));

  // Get all logs (this worked before, 13267 logs found)
  const logsResult = db.exec('SELECT * FROM logs ORDER BY timestamp DESC');
  const logs = logsResult[0]?.values.map(row => {
    const columns = logsResult[0].columns;
    const log = {};
    columns.forEach((col, i) => log[col] = row[i]);
    return log;
  }) || [];
  console.log(`[Migration] Found ${logs.length} logs`);

  // Check if settings table exists first
  const tables = db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name='settings'");
  let settingsObj = {};
  if (tables.length > 0) {
    const settingsResult = db.exec('SELECT key, value FROM settings');
    const settings = settingsResult[0]?.values.map(row => ({ key: row[0], value: row[1] })) || [];
    settings.forEach(s => {
      try { settingsObj[s.key] = JSON.parse(s.value); } catch { settingsObj[s.key] = s.value; }
    });
    console.log(`[Migration] Found ${settings.length} settings`);
  } else {
    console.log('[Migration] No settings table found, skipping settings');
  }

  // Backup existing JSON
  if (fs.existsSync(jsonPath)) {
    const backupPath = `${jsonPath}.backup-${Date.now()}`;
    fs.copyFileSync(jsonPath, backupPath);
    console.log('[Migration] Backed up existing JSON to:', backupPath);
  }

  // Write final JSON with all your old logs
  const jsonData = { logs, settings: settingsObj, exportedAt: new Date().toISOString() };
  fs.writeFileSync(jsonPath, JSON.stringify(jsonData, null, 2));
  console.log(`[Migration] ✅ DONE! Exported ${logs.length} logs to JSON. Restart the app to see all your old data.`);

  db.close();
} catch (err) {
  console.error('[Migration] ERROR:', err);
  process.exit(1);
}
