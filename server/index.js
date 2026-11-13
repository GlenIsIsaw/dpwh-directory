const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const db = require("./db");
const ExcelJS = require("exceljs");
const archiver = require("archiver");
const sharp = require("sharp");
const Database = require("better-sqlite3");

const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const cookieParser = require("cookie-parser");

const app = express();
app.use(cors());
app.use(express.json());

app.use(cookieParser());

const secretPath = path.join(__dirname, "secret.key");
if (!fs.existsSync(secretPath)) {
  fs.writeFileSync(secretPath, crypto.randomBytes(32).toString("hex"));
}
const JWT_SECRET = fs.readFileSync(secretPath, "utf8");

function requireAuth(roles) {
  return (req, res, next) => {
    try {
      const payload = jwt.verify(req.cookies.token, JWT_SECRET);
      const user = db
        .prepare("SELECT id, username, fullName, role FROM users WHERE id = ?")
        .get(payload.id);
      if (!user) return res.status(401).json({ error: "Not logged in" });
      if (roles && !roles.includes(user.role)) {
        return res.status(403).json({ error: "You do not have permission" });
      }
      req.user = user;
      next();
    } catch {
      res.status(401).json({ error: "Not logged in" });
    }
  };
}

function logActivity(username, action, details) {
  try {
    db.prepare(
      "INSERT INTO activity_log (username, action, details) VALUES (?, ?, ?)"
    ).run(username || "-", action, details || null);
  } catch (err) {
    console.error("Log error:", err.message);
  }
}

app.get("/api/logs", requireAuth(["admin"]), (req, res) => {
  const rows = db
    .prepare(
      `SELECT l.id, l.username, u.fullName, l.action, l.details, l.createdAt
       FROM activity_log l
       LEFT JOIN users u ON u.username = l.username
       ORDER BY l.id DESC LIMIT 500`
    )
    .all();
  res.json(rows);
});

app.post("/api/login", (req, res) => {
  const { username, password } = req.body;
  const user = db
    .prepare("SELECT * FROM users WHERE username = ?")
    .get(username || "");
  if (!user || !bcrypt.compareSync(password || "", user.passwordHash)) {
    logActivity(String(username || "").slice(0, 60), "LOGIN_FAILED", null);
    return res.status(401).json({ error: "Wrong username or password" });
  }
  const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: "12h" });
  res.cookie("token", token, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 12 * 60 * 60 * 1000,
  });
  logActivity(user.username, "LOGIN", null);
   res.json({ id: user.id, username: user.username, fullName: user.fullName, role: user.role });
});

app.post("/api/logout", (req, res) => {
  res.clearCookie("token");
  res.json({ ok: true });
});

app.get("/api/me", (req, res) => {
  try {
    const payload = jwt.verify(req.cookies.token, JWT_SECRET);
    const user = db
      .prepare("SELECT id, username, fullName, role FROM users WHERE id = ?")
      .get(payload.id);
    res.json(user || null);
  } catch {
    res.json(null);
  }
});

const ROLES = ["admin", "hr", "editor", "viewer"];

app.get("/api/users", requireAuth(["admin"]), (req, res) => {
  const rows = db
      .prepare("SELECT id, username, fullName, role, createdAt FROM users ORDER BY username")
    .all();
  res.json(rows);
});

app.post("/api/users", requireAuth(["admin"]), (req, res) => {
  const username = String(req.body.username || "").trim();
  const fullName = String(req.body.fullName || "").trim();
  const { password, role } = req.body;

  if (fullName.length < 2) {
    return res.status(400).json({ error: "Full name is required" });
  }
  if (username.length < 3) {
    return res.status(400).json({ error: "Username must be at least 3 characters" });
  }
  if (!password || password.length < 8) {
    return res.status(400).json({ error: "Password must be at least 8 characters" });
  }
  if (!ROLES.includes(role)) {
    return res.status(400).json({ error: "Invalid role" });
  }

  try {
    const result = db
      .prepare("INSERT INTO users (username, fullName, passwordHash, role) VALUES (?, ?, ?, ?)")
      .run(username, fullName, bcrypt.hashSync(password, 10), role);
    logActivity(req.user.username, "USER_CREATED", `${fullName} (${username}, ${role})`);
    res.status(201).json({ id: result.lastInsertRowid });
  } catch (err) {
    if (String(err.message).includes("UNIQUE")) {
      return res.status(409).json({ error: "That username already exists" });
    }
    res.status(500).json({ error: "Could not create user" });
  }
});

app.put("/api/users/:id", requireAuth(["admin"]), (req, res) => {
  const id = Number(req.params.id);
  const target = db.prepare("SELECT id, username FROM users WHERE id = ?").get(id);
  if (!target) return res.status(404).json({ error: "User not found" });

  const { role, password, fullName } = req.body;

  if (role !== undefined && !ROLES.includes(role)) {
    return res.status(400).json({ error: "Invalid role" });
  }
  if (role !== undefined && id === req.user.id && role !== req.user.role) {
    return res.status(400).json({ error: "You cannot change your own role" });
  }
  if (fullName !== undefined && String(fullName).trim().length < 2) {
    return res.status(400).json({ error: "Full name must be at least 2 characters" });
  }
  if (password !== undefined && password.length < 8) {
    return res.status(400).json({ error: "Password must be at least 8 characters" });
  }

  if (fullName !== undefined) {
    db.prepare("UPDATE users SET fullName = ? WHERE id = ?").run(String(fullName).trim(), id);
    logActivity(req.user.username, "USER_NAME_CHANGED", `${target.username} -> ${String(fullName).trim()}`);
  }
  if (role !== undefined) {
    db.prepare("UPDATE users SET role = ? WHERE id = ?").run(role, id);
    logActivity(req.user.username, "USER_ROLE_CHANGED", `${target.username} -> ${role}`);
  }
  if (password !== undefined) {
    db.prepare("UPDATE users SET passwordHash = ? WHERE id = ?").run(
      bcrypt.hashSync(password, 10),
      id
    );
    logActivity(req.user.username, "USER_PASSWORD_RESET", target.username);
  }
  res.json({ ok: true });
});

app.delete("/api/users/:id", requireAuth(["admin"]), (req, res) => {
  const id = Number(req.params.id);
  if (id === req.user.id) {
    return res.status(400).json({ error: "You cannot delete your own account" });
  }
  const doomed = db.prepare("SELECT username FROM users WHERE id = ?").get(id);
  const result = db.prepare("DELETE FROM users WHERE id = ?").run(id);
  if (result.changes === 0) {
    return res.status(404).json({ error: "User not found" });
  }
  logActivity(req.user.username, "USER_DELETED", doomed.username);
  res.json({ ok: true });
});

app.post("/api/me/password", requireAuth(), (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const row = db
    .prepare("SELECT passwordHash FROM users WHERE id = ?")
    .get(req.user.id);

  if (!bcrypt.compareSync(currentPassword || "", row.passwordHash)) {
    return res.status(400).json({ error: "Current password is wrong" });
  }
  if (!newPassword || newPassword.length < 8) {
    return res.status(400).json({ error: "New password must be at least 8 characters" });
  }

  db.prepare("UPDATE users SET passwordHash = ? WHERE id = ?").run(
    bcrypt.hashSync(newPassword, 10),
    req.user.id
  );
  logActivity(req.user.username, "PASSWORD_CHANGED", null);
  res.json({ ok: true });
});

const uploadsDir = path.join(__dirname, "uploads");
fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`);
  },
});

const upload = multer({
  storage,
    limits: { fileSize: 15 * 1024 * 1024 }, // 15 MB max (resized after upload)
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only image files are allowed"));
  },
});


app.use("/uploads", requireAuth(), express.static(uploadsDir));

sharp.cache(false);

async function compressPhoto(req, res, next) {
  if (!req.file) return next();
  const original = req.file.path;
  const outName = `${Date.now()}-${Math.round(Math.random() * 1e6)}.jpg`;
  const outPath = path.join(uploadsDir, outName);
  try {
    await sharp(original)
      .rotate()
      .resize({ width: 800, height: 800, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toFile(outPath);
    fs.unlink(original, () => {});
    req.file.path = outPath;
    req.file.filename = outName;
    next();
  } catch {
    fs.unlink(original, () => {});
    res.status(400).json({ error: "Could not read that image" });
  }
}

const UNIQUE_POSITIONS = [
  "District Engineer",
  "Assistant District Engineer",
  "OIC - Chief, Administrative Section",
  "OIC - Chief, Construction Section",
  "OIC - Chief, Finance Section",
  "OIC - Chief, Maintenance Section",
  "OIC - Chief, Planning and Design Section",
  "OIC - Chief, Quality Assurance Section",
];

function positionTaken(position, status, exceptId) {
  if (!UNIQUE_POSITIONS.includes(position)) return false;
  if ((status || "Active") !== "Active") return false;
  const row = db
    .prepare("SELECT id FROM employees WHERE position = ? AND status = 'Active' AND id != ?")
    .get(position, exceptId);
  return !!row;
}

app.get("/api/health", (req, res) => {
  res.json({ ok: true, message: "Server is running" });
});

app.get("/api/employees", requireAuth(), (req, res) => {
  const rows = db.prepare("SELECT * FROM employees ORDER BY lastName").all();
  res.json(rows);
});

app.post("/api/employees",   requireAuth(["admin", "hr", "editor"]), upload.single("photo"), compressPhoto, (req, res) => {
  const removePhoto = () => {
    if (req.file) fs.unlink(req.file.path, () => {});
  };

  

  const {
    idNumber, lastName, firstName, middleName, suffix,
    department, position, contact, hireDate, status,
    address, birthday, emergencyName, emergencyContact,
  } = req.body;

  if (!lastName || !firstName) {
    removePhoto();
    return res.status(400).json({ error: "Last name and first name are required" });
  }

  if (positionTaken(position, status, 0)) {
    removePhoto();
    return res.status(409).json({ error: `${position} is already held by another active employee` });
  }

  try {
    const result = db
      .prepare(
        `INSERT INTO employees
         (idNumber, lastName, firstName, middleName, suffix,
          department, position, contact, hireDate, status, photo,
          address, birthday, emergencyName, emergencyContact)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        idNumber || null, lastName, firstName, middleName || null, suffix || null,
        department || null, position || null, contact || null, hireDate || null,
        status || "Active", req.file ? req.file.filename : null,
        address || null, birthday || null, emergencyName || null, emergencyContact || null
      );

          logActivity(
      req.user.username,
      "EMPLOYEE_ADDED",
      `${lastName}, ${firstName}${idNumber ? ` (${idNumber})` : ""}`
    );

    res.status(201).json({ id: result.lastInsertRowid });
  } catch (err) {
    console.error(err);
    removePhoto();
    if (String(err.message).includes("UNIQUE")) {
      return res.status(409).json({ error: "That ID number already exists" });
    }
    res.status(500).json({ error: "Could not save employee" });
  }
});

app.put("/api/employees/:id", requireAuth(["admin", "hr", "editor"]), upload.single("photo"), compressPhoto, (req, res) => {
  const removeNewPhoto = () => {
    if (req.file) fs.unlink(req.file.path, () => {});
  };

  const existing = db
    .prepare("SELECT * FROM employees WHERE id = ?")
    .get(req.params.id);

  if (!existing) {
    removeNewPhoto();
    return res.status(404).json({ error: "Employee not found" });
  }

  const {
    idNumber, lastName, firstName, middleName, suffix,
    department, position, contact, hireDate, status,
    address, birthday, emergencyName, emergencyContact, 
  } = req.body;

  if (!lastName || !firstName) {
    removeNewPhoto();
    return res.status(400).json({ error: "Last name and first name are required" });
  }

  if (positionTaken(position, status, Number(req.params.id))) {
    removeNewPhoto();
    return res.status(409).json({ error: `${position} is already held by another active employee` });
  }

  try {
    db.prepare(
      `UPDATE employees SET
         idNumber = ?, lastName = ?, firstName = ?, middleName = ?, suffix = ?,
         department = ?, position = ?, contact = ?, hireDate = ?, status = ?,
         photo = ?,
         address = ?, birthday = ?, emergencyName = ?, emergencyContact = ?
       WHERE id = ?`
    ).run(
      idNumber || null, lastName, firstName, middleName || null, suffix || null,
      department || null, position || null, contact || null, hireDate || null,
      status || "Active",
      req.file ? req.file.filename : existing.photo,
      address || null, birthday || null, emergencyName || null, emergencyContact || null,
      req.params.id
    );

    // a new photo replaced the old one, so delete the old file
    if (req.file && existing.photo) {
      fs.unlink(path.join(uploadsDir, existing.photo), () => {});
    }

    const changed = [
      "idNumber", "lastName", "firstName", "middleName", "suffix",
      "department", "position", "contact", "hireDate", "status",
      "address", "birthday", "emergencyName", "emergencyContact",
    ].filter((f) => (existing[f] || "") !== (req.body[f] || ""));
    if (req.file) changed.push("photo");
    logActivity(
      req.user.username,
      "EMPLOYEE_EDITED",
      `${lastName}, ${firstName} - changed: ${changed.join(", ") || "nothing"}`
    );

    res.json({ id: existing.id });
  } catch (err) {
    console.error(err);
    removeNewPhoto();
    if (String(err.message).includes("UNIQUE")) {
      return res.status(409).json({ error: "That ID number already exists" });
    }
    res.status(500).json({ error: "Could not update employee" });
  }
});

  app.delete("/api/employees/:id", requireAuth(["admin", "hr"]), (req, res) => {
  const existing = db
    .prepare("SELECT * FROM employees WHERE id = ?")
    .get(req.params.id);

  if (!existing) {
    return res.status(404).json({ error: "Employee not found" });
  }

  db.prepare("DELETE FROM employees WHERE id = ?").run(req.params.id);
  logActivity(
    req.user.username,
    "EMPLOYEE_DELETED",
    `${existing.lastName}, ${existing.firstName}${existing.idNumber ? ` (${existing.idNumber})` : ""}`
  );

  if (existing.photo) {
    fs.unlink(path.join(uploadsDir, existing.photo), () => {});
  }

  res.json({ ok: true });
});

  app.get("/api/export", requireAuth(["admin", "hr"]), async (req, res) => {
  try {
    const employees = db
      .prepare("SELECT * FROM employees ORDER BY lastName, firstName")
      .all();

    logActivity(req.user.username, "EXPORT_EXCEL", `${employees.length} employees`);
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Employees");

    ws.columns = [
      { header: "Photo", key: "photo", width: 14 },
      { header: "ID Number", key: "idNumber", width: 16 },
      { header: "Last Name", key: "lastName", width: 20 },
      { header: "First Name", key: "firstName", width: 20 },
      { header: "Middle Name", key: "middleName", width: 20 },
      { header: "Suffix", key: "suffix", width: 10 },
      { header: "Department", key: "department", width: 38 },
      { header: "Position", key: "position", width: 38 },
      { header: "Contact", key: "contact", width: 20 },
      { header: "Hire Date", key: "hireDate", width: 14 },
      { header: "Status", key: "status", width: 12 },
    ];
    ws.getRow(1).font = { bold: true };
    ws.views = [{ state: "frozen", ySplit: 1 }];

    const IMAGE_TYPES = { ".jpg": "jpeg", ".jpeg": "jpeg", ".png": "png", ".gif": "gif" };

    employees.forEach((e, i) => {
      const row = ws.addRow({
        photo: "",
        idNumber: e.idNumber,
        lastName: e.lastName,
        firstName: e.firstName,
        middleName: e.middleName,
        suffix: e.suffix,
        department: e.department,
        position: e.position,
        contact: e.contact,
        hireDate: e.hireDate,
        status: e.status,
      });
      row.height = 75;
      row.alignment = { vertical: "middle" };

      if (e.photo) {
        const ext = IMAGE_TYPES[path.extname(e.photo).toLowerCase()];
        const file = path.join(uploadsDir, e.photo);
        if (ext && fs.existsSync(file)) {
          const imageId = wb.addImage({ filename: file, extension: ext });
          ws.addImage(imageId, {
            tl: { col: 0, row: i + 1 },
            ext: { width: 90, height: 90 },
          });
        }
      }
    });

    const stamp = new Date().toISOString().slice(0, 10);
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", `attachment; filename="employees-${stamp}.xlsx"`);
    await wb.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error(err);
    if (!res.headersSent) {
      res.status(500).json({ error: "Could not create export" });
    }
  }
});

  app.get("/api/backup", requireAuth(["admin", "hr"]), async (req, res) => {
  const snapshot = path.join(__dirname, `backup-temp-${Date.now()}.db`);
  const cleanup = () => fs.unlink(snapshot, () => {});

  try {
    await db.backup(snapshot);

    if (req.user.role !== "admin") {
      const copy = new Database(snapshot);
      copy.pragma("journal_mode = DELETE");
      copy.exec("DELETE FROM users; DELETE FROM activity_log;");
      copy.exec("VACUUM");
      copy.close();
    }
    logActivity(
      req.user.username,
      "BACKUP_DOWNLOADED",
      req.user.role === "admin" ? "full" : "without user accounts"
    );

    const stamp = new Date().toISOString().slice(0, 10);
    res.setHeader("Content-Type", "application/zip");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="employee-backup-${stamp}.zip"`
    );
    res.on("close", cleanup);

    const archive = archiver("zip", { zlib: { level: 6 } });
    archive.on("error", (err) => {
      console.error(err);
      res.destroy();
    });
    archive.pipe(res);
    archive.file(snapshot, { name: "employees.db" });
    archive.directory(uploadsDir, "uploads");
    await archive.finalize();
  } catch (err) {
    console.error(err);
    cleanup();
    if (!res.headersSent) {
      res.status(500).json({ error: "Could not create backup" });
    } else {
      res.destroy();
    }
  }
});

app.use(express.static(path.join(__dirname, "..", "client", "dist")));

app.use((err, req, res, next) => {
  res.status(400).json({ error: err.message });
});

app.listen(3000, "0.0.0.0", () => {
  console.log("Server running at http://127.0.0.1:3000");
});