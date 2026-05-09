import Database from 'better-sqlite3';

const dbPath = 'C:\\Users\\cleme\\AppData\\Roaming\\DeskFlow\\deskflow-data.db';

console.log('Opening:', dbPath);

const db = new Database(dbPath, { readonly: true });

const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
console.log('Tables:', tables.map(t => t.name).join(', '));

const logCount = db.prepare("SELECT COUNT(*) as count FROM logs").get();
console.log('Logs count:', logCount.count);

const recentLogs = db.prepare("SELECT * FROM logs ORDER BY id DESC LIMIT 5").all();
console.log('Recent logs:', JSON.stringify(recentLogs, null, 2));

db.close();