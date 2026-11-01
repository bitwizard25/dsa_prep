// Writes src/build-info.json for a CI or release build. Safe to run with no git and no network.
const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

function shortSha(raw) {
  const s = String(raw || "").trim().toLowerCase();
  if (!/^[0-9a-f]{7,40}$/.test(s)) return null;
  return s.slice(0, 7);
}

function resolveCommit(env = process.env) {
  const fromEnv = shortSha(env.GITHUB_SHA);
  if (fromEnv) return fromEnv;
  try {
    return shortSha(execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }));
  } catch {
    return null;
  }
}

function writeBuildInfo(file, info, fsImpl = fs) {
  fsImpl.mkdirSync(path.dirname(file), { recursive: true });
  const body = JSON.stringify({ commit: info.commit || null, builtAt: info.builtAt || null }, null, 2) + "\n";
  fsImpl.writeFileSync(file, body);
}

function main() {
  const dest = path.join(__dirname, "..", "src", "build-info.json");
  writeBuildInfo(dest, { commit: resolveCommit(), builtAt: new Date().toISOString() });
}

if (require.main === module) main();

module.exports = { shortSha, resolveCommit, writeBuildInfo };
