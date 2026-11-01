// Reads the stamp written at build time. Missing or unreadable means a development build.
const fs = require("fs");
const path = require("path");

function readBuildInfo(file, fsImpl = fs) {
  try {
    const raw = JSON.parse(fsImpl.readFileSync(file, "utf8"));
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { commit: null, builtAt: null };
    const commit = typeof raw.commit === "string" ? raw.commit : null;
    const builtAt = typeof raw.builtAt === "string" ? raw.builtAt : null;
    return { commit, builtAt };
  } catch {
    return { commit: null, builtAt: null };
  }
}

function loadBuildInfo() {
  return readBuildInfo(path.join(__dirname, "..", "build-info.json"));
}

module.exports = { readBuildInfo, loadBuildInfo };
