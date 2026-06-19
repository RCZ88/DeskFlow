const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('C:\\Users\\cleme\\AppData\\Roaming\\deskflow\\deskflow-data.db');
db.serialize(() => {
  db.each('SELECT name FROM sqlite_master WHERE type="table" ORDER BY name', (err, row) => {
    console.log('Table:', row.name);
  });
});