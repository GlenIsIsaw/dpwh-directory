const bcrypt = require("bcryptjs");
const crypto = require("crypto");

const Database = require("better-sqlite3");
const path = require("path");

const db = new Database(path.join(__dirname, "employees.db"));
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS employees (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    idNumber    TEXT UNIQUE,
    lastName    TEXT NOT NULL,
    firstName   TEXT NOT NULL,
    middleName  TEXT,
    suffix      TEXT,
    department  TEXT,
    position    TEXT,
    contact     TEXT,
    hireDate    TEXT,
    status      TEXT DEFAULT 'Active',
    photo       TEXT,
    createdAt   TEXT DEFAULT CURRENT_TIMESTAMP
  )
`);

const empCols = db.prepare("PRAGMA table_info(employees)").all().map((c) => c.name);
["address", "birthday", "emergencyName", "emergencyContact", "nickname", "employmentType"].forEach((col) => {
  if (!empCols.includes(col)) db.exec(`ALTER TABLE employees ADD COLUMN ${col} TEXT`);
});

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    username     TEXT UNIQUE NOT NULL,
    passwordHash TEXT NOT NULL,
    role         TEXT NOT NULL DEFAULT 'viewer',
    createdAt    TEXT DEFAULT CURRENT_TIMESTAMP
  )
`);

const userCols = db.prepare("PRAGMA table_info(users)").all();
if (!userCols.some((c) => c.name === "fullName")) {
  db.exec("ALTER TABLE users ADD COLUMN fullName TEXT");
}

if (db.prepare("SELECT COUNT(*) AS n FROM users").get().n === 0) {
  const pw = crypto.randomBytes(5).toString("hex");
  db.prepare(
    "INSERT INTO users (username, passwordHash, role) VALUES (?, ?, ?)"
  ).run("admin", bcrypt.hashSync(pw, 10), "admin");
  console.log("==================================================");
  console.log("First-time setup: admin account created");
  console.log("  username: admin");
  console.log("  password: " + pw);
  console.log("Write this down. It is shown only once.");
  console.log("==================================================");
}

db.exec(`
  CREATE TABLE IF NOT EXISTS activity_log (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    username  TEXT,
    action    TEXT NOT NULL,
    details   TEXT,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP
  )
`);

try { db.exec("ALTER TABLE employees ADD COLUMN nickname TEXT"); } catch {}
try { db.exec("ALTER TABLE employees ADD COLUMN employmentType TEXT"); } catch {}

module.exports = db;