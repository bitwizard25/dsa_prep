// One data folder for source runs and installed builds. Older names are copied in, never deleted.
const fs = require("fs");
const path = require("path");

const FOLDER = "dsa-practice";
const OLD_FOLDERS = ["DSA Practice", "dsa_prep"];

function migrateUserData(appData, copyFile) {
  const target = path.join(appData, FOLDER);
  fs.mkdirSync(target, { recursive: true });
  const copy = copyFile || ((from, to) => fs.cpSync(from, to, { recursive: true, errorOnExist: false }));
  for (const name of OLD_FOLDERS) {
    const old = path.join(appData, name);
    if (path.resolve(old) === path.resolve(target) || !fs.existsSync(old)) continue;
    let names = [];
    try { names = fs.readdirSync(old); } catch { continue; }
    for (const entry of names) {
      const from = path.join(old, entry);
      const to = path.join(target, entry);
      if (fs.existsSync(to)) continue;
      try { copy(from, to); } catch {}
    }
  }
  return target;
}

module.exports = { FOLDER, OLD_FOLDERS, migrateUserData };
