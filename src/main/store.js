// Small JSON file store in the app's data folder. Writes are atomic (temp file + rename).
const fs = require("fs");
const path = require("path");
const { app } = require("electron");

const file = (name) => {
  if (typeof name !== "string" || !/^[a-zA-Z0-9_-]+\.json$/.test(name)) throw new Error("Invalid store filename");
  return path.join(app.getPath("userData"), name);
};

function read(name) {
  const f = file(name);
  for (const candidate of [f, f + ".bak"]) {
    try { return JSON.parse(fs.readFileSync(candidate, "utf8")); } catch {}
  }
  return null;
}

function retryRename(rename, from, to, attempt = 0) {
  try { rename(from, to); }
  catch (e) {
    if ((e.code !== "EPERM" && e.code !== "EBUSY") || attempt >= 4) throw e;
    const wait = [15, 40, 80, 160][attempt];
    const end = Date.now() + wait;
    while (Date.now() < end) {}
    retryRename(rename, from, to, attempt + 1);
  }
}
function renameWithRetry(from, to) { retryRename(fs.renameSync, from, to); }

function write(name, data) {
  const f = file(name), tmp = f + ".tmp";
  const json = JSON.stringify(data);
  if (json === undefined) throw new TypeError("Store data must be JSON serializable");
  fs.mkdirSync(path.dirname(f), { recursive: true });
  try {
    // Preserve only a valid primary save; corruption must never replace a good backup.
    let previous;
    try { previous = fs.readFileSync(f, "utf8"); JSON.parse(previous); }
    catch { previous = undefined; }
    if (previous !== undefined) {
      fs.writeFileSync(f + ".bak.tmp", previous, { mode: 0o600, flush: true });
      renameWithRetry(f + ".bak.tmp", f + ".bak");
    }
    fs.writeFileSync(tmp, json, { mode: 0o600, flush: true });
    renameWithRetry(tmp, f);
  } finally {
    for (const pending of [tmp, f + ".bak.tmp"]) {
      try { fs.unlinkSync(pending); } catch {}
    }
  }
}

module.exports = { read, write, file, renameWithRetry, retryRename };
