# SQLite JS Migration Skill
Use sql.js for SQLite migration when native modules fail.

## When to Use
- better-sqlite3 version mismatch errors
- Native rebuild fails (missing build tools)
- Cross-version Node/Electron compatibility needed

## Steps
1. Write .mjs (ES module) if project uses "type": "module" in package.json
2. Import: `import initSqlJs from 'sql.js'`
3. Read DB: `const dbBuffer = fs.readFileSync(dbPath)`
4. Init: `const SQL = await initSqlJs()`
5. Load: `const db = new SQL.Database(new Uint8Array(dbBuffer))`
6. Check tables: `db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name='table'")`
7. Query: `db.exec("SELECT * FROM table")`
8. Export: `fs.writeFileSync(jsonPath, JSON.stringify(data))`

## Example
```javascript
import fs from 'fs';
import initSqlJs from 'sql.js';

async function migrate() {
  const dbBuffer = fs.readFileSync('./deskflow-data.db');
  const SQL = await initSqlJs();
  const db = new SQL.Database(new Uint8Array(dbBuffer));
  
  // Check if table exists
  const tables = db.exec("SELECT name FROM sqlite_master WHERE type='table'");
  console.log('Tables:', tables);
  
  // Export data
  const logs = db.exec("SELECT * FROM jsonLogs");
  fs.writeFileSync('./migration.json', JSON.stringify(logs));
}
```
