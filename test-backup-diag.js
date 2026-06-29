"use strict";
const path = require("path");
const fs = require("fs");
const Database = require("better-sqlite3");
const electron = require("electron");

const dbPath = path.join(electron.app.getPath("userData"), "deskflow-data.db");
const backupDir = path.join(electron.app.getPath("userData"), "backups");

console.log("=== DIAG ===");
console.log("dbPath:", dbPath);
console.log("backupDir:", backupDir);
console.log("exists:", fs.existsSync(backupDir));

try {
  fs.mkdirSync(backupDir, { recursive: true });
  console.log("mkdir: OK");
} catch (e) {
  console.log("mkdir:", e.message);
}

const db = new Database(dbPath);
console.log("DB opened:", !!db);

try {
  db.pragma("wal_checkpoint(TRUNCATE)");
  console.log("checkpoint: OK");
} catch (e) {
  console.log("checkpoint:", e.message, "code:", e.code);
}

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const rawPath = path.join(backupDir, "diag-" + stamp + ".db");

try {
  db.backup(rawPath);
  const stat = fs.statSync(rawPath);
  console.log("backup: OK, size:", stat.size);
} catch (e) {
  console.log("backup:", e.message, "code:", e.code);
}

try {
  const vdb = new Database(rawPath, { readonly: true });
  console.log("open-vdb: OK");
  vdb.close();
} catch (e) {
  console.log("open-vdb readonly:", e.message, "code:", e.code);
}

try {
  const vdb = new Database(rawPath);
  console.log("open-vdb writable: OK");
  vdb.close();
} catch (e) {
  console.log("open-vdb writable:", e.message, "code:", e.code);
}

db.close();

console.log("=== DIAG DONE ===");
