// Pure rules for GitHub updates. No network, no Electron, no tokens.
const CHECK_EVERY_MS = 4 * 60 * 60 * 1000;
const STARTUP_DELAY_MS = 15 * 1000;
const DEFAULT_FEED = { owner: "bitwizard25", repo: "dsa_prep" };
const REPO = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;

function parseRepo(spec) {
  if (typeof spec !== "string" || !REPO.test(spec.trim())) return null;
  const [owner, repo] = spec.trim().split("/");
  return { owner, repo };
}

/** owner/repo only. A token in the file is dropped and never returned. */
function readUpdatesFile(filePath, fsImpl) {
  try {
    const raw = JSON.parse(fsImpl.readFileSync(filePath, "utf8"));
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
    return { owner: raw.owner, repo: raw.repo };
  } catch {
    return null;
  }
}

/** Env DSA_UPDATES_REPO, then %APPDATA%/dsa-practice/updates.json, then this repo. */
function resolveFeed({ envRepo, file } = {}) {
  return parseRepo(envRepo) || parseRepo(file && file.owner && file.repo ? `${file.owner}/${file.repo}` : "") || { ...DEFAULT_FEED };
}

function shouldCheck({ packaged, online, now, lastCheckAt, everyMs }) {
  if (!packaged || !online) return false;
  if (!lastCheckAt) return true;
  return now - lastCheckAt >= everyMs;
}

/** none: nothing downloaded. defer: a session is in progress. install: safe to restart. */
function restartDecision({ downloaded, sessionBusy }) {
  if (!downloaded) return "none";
  if (sessionBusy) return "defer";
  return "install";
}

module.exports = {
  CHECK_EVERY_MS, STARTUP_DELAY_MS, DEFAULT_FEED,
  parseRepo, readUpdatesFile, resolveFeed, shouldCheck, restartDecision,
};
