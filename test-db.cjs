const db = require('better-sqlite3')('C:\\Users\\cleme\\AppData\\Roaming\\deskflow\\deskflow-data.db');
console.log('Activities:', db.prepare('SELECT COUNT(*) as cnt FROM external_activities').get().cnt);
console.log('Sessions:', db.prepare('SELECT COUNT(*) as cnt FROM external_sessions').get().cnt);
console.log('Today:', db.prepare("SELECT COUNT(*) as cnt FROM external_sessions WHERE date(start_time) = date('now')").get().cnt);
console.log('This week:', db.prepare("SELECT COUNT(*) as cnt FROM external_sessions WHERE start_time >= date('now', 'weekday 0', '-7 days')").get().cnt);
db.close();
