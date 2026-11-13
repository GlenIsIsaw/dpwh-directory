const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const db = require("./db");

const pw = crypto.randomBytes(5).toString("hex");
const hash = bcrypt.hashSync(pw, 10);
const row = db.prepare("SELECT id FROM users WHERE username = 'admin'").get();

if (row) {
  db.prepare("UPDATE users SET passwordHash = ?, role = 'admin' WHERE id = ?").run(hash, row.id);
} else {
  db.prepare("INSERT INTO users (username, passwordHash, role) VALUES ('admin', ?, 'admin')").run(hash);
}
console.log("New admin password: " + pw);