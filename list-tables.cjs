const Database = require('better-sqlite3');
const db = new Database('C:\\Users\\cleme\\AppData\\Roaming\\DeskFlow\\deskflow-data.db', { readonly: true });
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
console.log('Tables:', tables.map(t => t.name).join(', '));

const logCount = db.prepare('SELECT COUNT(*) as count FROM logs').get();
console.log('Total logs:', logCount.count);

db.close();