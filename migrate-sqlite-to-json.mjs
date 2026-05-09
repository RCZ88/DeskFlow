/**
 * Migration script: Read data from better-sqlite3 database and export to JSON
 * Using ES module syntax (.mjs) to work with your project's "type": "module"
 */

import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

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
  const db = new Database(dbPath);
  
  // Check if logs table exists and get all logs
  const logs = db.prepare('SELECT * FROM logs ORDER BY timestamp DESC').all();
  console.log(`[Migration] Found ${logs.length} logs in SQLite database`);
  
  // Get all settings
  const settings = db.prepare('SELECT key, value FROM settings').all();
  console.log(`[Migration] Found ${settings.length} settings in SQLite database`);
  
  const settingsObj = {};
  settings.forEach(s => {
    try {
      settingsObj[s.key] = JSON.parse(s.value);
    } catch {
      settingsObj[s.key] = s.value;
    }
  });
  
  // Create JSON data structure
  const jsonData = {
    logs: logs,
    settings: settingsObj,
    exportedAt: new Date().toISOString(),
    source: 'sqlite-migration'
  };
  
  // Backup existing JSON if it exists
  if (fs.existsSync(jsonPath)) {
    const backupPath = jsonPath + '.backup-' + Date.now();
    fs.copyFileSync(jsonPath, backupPath);
    console.log('[Migration] Backed up existing JSON to:', backupPath);
  }
  
  // Write the JSON file
  fs.writeFileSync(jsonPath, JSON.stringify(jsonData, null, 2));
  console.log(`[Migration] ✅ Successfully exported ${logs.length} logs to JSON!`);
  
  db.close();
  
} catch (err) {
  console.error('[Migration] ERROR:', err);
  process.exit(1);
}
