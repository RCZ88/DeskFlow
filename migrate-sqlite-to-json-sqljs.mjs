/**
 * Migration script using sql.js (pure JS, no native modules) to read SQLite data
 * and export to JSON. No better-sqlite3 version issues here.
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
console.log('[Migration] Writing to:', jsonPath);

if (!fs.existsSync(dbPath)) {
  console.error('[Migration] ERROR: Database file not found!');
  process.exit(1);
}

try {
  // Read SQLite database as raw binary (works with pure JS sql.js)
  const dbBuffer = fs.readFileSync(dbPath);
  const uint8Array = new Uint8Array(dbBuffer);

  // Initialize pure JS SQLite
  const SQL = await initSqlJs();
  const db = new SQL.Database(uint8Array);

  // Extract all logs
  const logsResult = db.exec('SELECT * FROM logs ORDER BY timestamp DESC');
  const logs = logsResult[0]?.values.map(row => {
    const columns = logsResult[0].columns;
    const log = {};
    columns.forEach((col, i) => log[col] = row[i]);
    return log;
  }) || [];
  console.log(`[Migration] Found ${logs.length} logs in SQLite database`);

  // Extract all settings
  const settingsResult = db.exec('SELECT key, value FROM settings');
  const settings = settingsResult[0]?.values.map(row => ({
    key: row[0],
    value: row[1]
  })) || [];
  console.log(`[Migration] Found ${settings.length} settings in SQLite database`);

  // Parse settings values
  const settingsObj = {};
  settings.forEach(s => {
    try { settingsObj[s.key] = JSON.parse(s.value); }
    catch { settingsObj[s.key] = s.value; }
  });

  // Prepare JSON data
  const jsonData = {
    logs: logs,
    settings: settingsObj,
    exportedAt: new Date().toISOString(),
    source: 'sqlite-migration-sqljs'
  };

  // Backup existing JSON if present
  if (fs.existsSync(jsonPath)) {
    const backupPath = `${jsonPath}.backup-${Date.now()}`;
    fs.copyFileSync(jsonPath, backupPath);
    console.log('[Migration] Backed up existing JSON to:', backupPath);
  }

  // Write final JSON
  fs.writeFileSync(jsonPath, JSON.stringify(jsonData, null, 2));
  console.log(`[Migration] ✅ SUCCESS! Exported ${logs.length} logs to JSON. Your old data is now in the JSON file the app uses.`);

  db.close();
} catch (err) {
  console.error('[Migration] ERROR:', err);
  process.exit(1);
}
