const sharp = require("sharp");
const fs = require("fs");
const path = require("path");
const db = require("./db");

sharp.cache(false);
const dir = path.join(__dirname, "uploads");

(async () => {
  const rows = db.prepare("SELECT id, photo FROM employees WHERE photo IS NOT NULL").all();
  for (const r of rows) {
    const file = path.join(dir, r.photo);
    if (!fs.existsSync(file)) continue;
    const outName = `${Date.now()}-${r.id}.jpg`;
    try {
      await sharp(file)
        .rotate()
        .resize({ width: 800, height: 800, fit: "inside", withoutEnlargement: true })
        .jpeg({ quality: 80 })
        .toFile(path.join(dir, outName));
      db.prepare("UPDATE employees SET photo = ? WHERE id = ?").run(outName, r.id);
      fs.unlinkSync(file);
      console.log("done:", r.photo, "->", outName);
    } catch (err) {
      console.log("skipped:", r.photo, "-", err.message);
    }
  }
  console.log("Finished");
})();