// Updater policy, with a fake electron-updater. No network and no Electron.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { EventEmitter } = require("node:events");
const yaml = require("js-yaml");
const policy = require("../src/main/update-policy");
const { createUpdateController } = require("../src/main/update-controller");

function fakeUpdater() {
  const u = new EventEmitter();
  u.logger = null;
  u.feed = null;
  u.checks = 0;
  u.fail = false;
  u.installs = [];
  u.setFeedURL = (feed) => { u.feed = feed; };
  u.checkForUpdates = () => {
    u.checks += 1;
    return u.fail ? Promise.reject(new Error("offline")) : Promise.resolve();
  };
  u.quitAndInstall = (silent, force) => { u.installs.push([silent, force]); };
  return u;
}

function controller(extra = {}) {
  const updater = extra.updater || fakeUpdater();
  const notes = [];
  const statuses = [];
  let flushed = 0;
  const c = createUpdateController({
    autoUpdater: updater,
    isPackaged: extra.packaged !== false,
    isOnline: extra.isOnline || (() => true),
    feed: { owner: "bitwizard25", repo: "dsa_prep" },
    flush: () => { flushed += 1; return Promise.resolve(); },
    onNotify: (info) => notes.push(info),
    onStatus: (info) => statuses.push(info),
    about: extra.about,
    everyMs: policy.CHECK_EVERY_MS,
  });
  return { c, updater, notes, statuses, flushed: () => flushed };
}

test("offline, unpackaged, and a recent check do not contact GitHub", async () => {
  const off = controller({ isOnline: () => false });
  assert.deepEqual(await off.c.check(1_000), { checked: false, reason: "offline" });
  assert.equal(off.updater.checks, 0);

  const dev = controller({ packaged: false });
  assert.deepEqual(await dev.c.check(1_000), { checked: false, reason: "dev" });
  assert.equal(dev.updater.checks, 0);

  const live = controller();
  assert.deepEqual(await live.c.check(1_000), { checked: true });
  assert.deepEqual(await live.c.check(1_000 + 60_000), { checked: false, reason: "recent" });
  assert.equal(live.updater.checks, 1);
  assert.deepEqual(await live.c.check(1_000 + policy.CHECK_EVERY_MS), { checked: true });
  assert.equal(live.updater.checks, 2);
});

test("a failed check is swallowed", async () => {
  const { c, updater } = controller();
  updater.fail = true;
  assert.deepEqual(await c.check(5_000), { checked: false, reason: "error" });
});

test("a download while a session is busy waits, then offers a silent restart", async () => {
  const { c, updater, notes, flushed } = controller();
  c.setBusy(true);
  updater.emit("update-downloaded", { version: "2.4.0" });
  assert.equal(notes.length, 1);
  assert.equal(notes[0].ready, false);
  assert.equal(notes[0].busy, true);
  assert.equal(notes[0].announce, false);
  assert.deepEqual(await c.requestRestart(), { ok: false, reason: "busy" });
  assert.equal(updater.installs.length, 0);
  assert.equal(c.status().ready, false);
  assert.equal(c.status().version, "2.4.0");
  assert.equal(c.status().label, "Update ready. It installs after this session.");

  c.setBusy(false);
  assert.equal(notes.at(-1).ready, true);
  assert.equal(notes.at(-1).announce, true);
  assert.equal(c.status().ready, true);
  assert.equal(c.status().version, "2.4.0");
  assert.equal(c.status().label, "Update ready, restart to install");
  assert.deepEqual(await c.requestRestart(), { ok: true });
  assert.equal(flushed(), 1);
  assert.deepEqual(updater.installs, [[true, true]]);
  assert.equal(c.isInstalling(), true);
});

test("quit installs with autoInstallOnAppQuit and the feed carries no token", async () => {
  const { c, updater } = controller();
  assert.equal(updater.autoDownload, true);
  assert.equal(updater.autoInstallOnAppQuit, true);
  assert.equal(updater.disableWebInstaller, true);
  assert.equal(updater.feed.provider, "github");
  assert.equal(updater.feed.owner, "bitwizard25");
  assert.equal(updater.feed.repo, "dsa_prep");
  assert.equal("token" in updater.feed, false);
  assert.equal("private" in updater.feed, false);
  assert.deepEqual(await c.requestRestart(), { ok: false, reason: "none" });
});

test("the releases repo is configurable and a token in the file is ignored", () => {
  assert.deepEqual(policy.resolveFeed({}), policy.DEFAULT_FEED);
  assert.deepEqual(policy.resolveFeed({ envRepo: "other/releases" }), { owner: "other", repo: "releases" });
  assert.deepEqual(policy.resolveFeed({ envRepo: "not a repo", file: { owner: "acme", repo: "public" } }), { owner: "acme", repo: "public" });
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "dsa-updates-"));
  const file = path.join(dir, "updates.json");
  fs.writeFileSync(file, JSON.stringify({ owner: "acme", repo: "public", token: "secret" }));
  const read = policy.readUpdatesFile(file, fs);
  assert.deepEqual(read, { owner: "acme", repo: "public" });
  assert.equal("token" in read, false);
  assert.equal(policy.readUpdatesFile(path.join(dir, "missing.json"), fs), null);
});

test("startup and the later interval are the only check times", () => {
  const { c } = controller();
  const seen = [];
  c.schedule({
    setTimeout: (_fn, ms) => seen.push(["startup", ms]),
    setInterval: (_fn, ms) => seen.push(["interval", ms]),
  });
  assert.deepEqual(seen, [["startup", policy.STARTUP_DELAY_MS], ["interval", policy.CHECK_EVERY_MS]]);
});

test("the release workflow is valid YAML and publishes with GITHUB_TOKEN only", () => {
  const file = path.resolve(".github/workflows/release.yml");
  const text = fs.readFileSync(file, "utf8");
  const doc = yaml.load(text);
  assert.equal(doc.on.push.tags[0], "v*");
  assert.equal(doc.jobs.windows["runs-on"], "windows-latest");
  assert.equal(doc.permissions.contents, "write");
  assert.match(text, /electron-builder --win nsis --x64 --publish always/);
  assert.match(text, /node tools\/write-build-info\.js/);
  const secrets = [...text.matchAll(/secrets\.([A-Z0-9_]+)/g)].map((m) => m[1]);
  assert.deepEqual([...new Set(secrets)], ["GITHUB_TOKEN"]);
  const pkg = JSON.parse(fs.readFileSync(path.resolve("package.json"), "utf8"));
  assert.equal(pkg.dependencies["electron-updater"] != null, true);
  assert.equal(pkg.build.publish.provider, "github");
  assert.equal(pkg.build.publish.owner, "bitwizard25");
  assert.equal(pkg.build.publish.repo, "dsa_prep");
  assert.equal(pkg.build.nsis.differentialPackage, "store-asar");
  assert.equal(pkg.build.nsis.deleteAppDataOnUninstall, false);
  assert.equal(JSON.stringify(pkg.build.publish).includes("token"), false);
});

test("a check reports up to date, and a manual check ignores the wait", async () => {
  const { c, updater } = controller({ about: { appVersion: "2.4.0", commit: "abc1234def", builtAt: "2026-11-01T06:00:00.000Z" } });
  assert.equal(c.status().phase, "idle");
  assert.equal(c.status().label, "Not checked yet");
  assert.equal(c.status().appVersion, "2.4.0");
  assert.equal(c.status().buildLabel, "abc1234 · 1 Nov 2026");
  assert.equal((await c.check(1_000)).checked, true);
  assert.equal(c.status().phase, "uptodate");
  assert.equal(c.status().label, "Up to date");
  assert.equal(c.status().lastCheckedAt, 1_000);
  assert.equal((await c.check(2_000)).reason, "recent");
  assert.equal(updater.checks, 1);
  assert.equal((await c.check(2_000, { force: true })).checked, true);
  assert.equal(updater.checks, 2);
});

test("download progress is a percent, and an error hides tokens", async () => {
  const { c, updater, statuses } = controller();
  updater.emit("update-available", { version: "9.9.9" });
  updater.emit("download-progress", { percent: 41.6 });
  assert.equal(c.status().phase, "downloading");
  assert.equal(c.status().percent, 42);
  assert.equal(c.status().available, "9.9.9");
  assert.equal(c.status().label, "Downloading 42%");
  assert.equal(statuses.at(-1).label, "Downloading 42%");
  updater.emit("update-downloaded", { version: "9.9.9" });
  updater.emit("error", new Error("401 unauthorized token example-not-real https://example.test/hidden"));
  c.setBusy(false);
  assert.equal(c.status().phase, "ready");
  assert.equal(c.status().label, "Update ready, restart to install");
  assert.equal(JSON.stringify(c.status()).includes("example-not-real"), false);

  const failed = controller();
  failed.updater.emit("error", new Error("bad token example-not-real"));
  const view = failed.c.status();
  assert.equal(view.phase, "error");
  assert.equal(view.label, "Error");
  assert.equal(view.detail, "Could not reach GitHub");
  assert.equal(JSON.stringify(view).includes("example-not-real"), false);
});

test("an unpackaged app never looks online, and offline is a status", async () => {
  const dev = controller({ packaged: false });
  assert.equal(dev.c.status().phase, "dev");
  assert.equal(dev.c.status().label, "Not checked in a development build");
  assert.equal(dev.c.status().buildLabel, "Development build");
  assert.deepEqual(await dev.c.check(1_000, { force: true }), { checked: false, reason: "dev" });
  assert.equal(dev.updater.checks, 0);

  const offline = controller({ isOnline: () => false });
  assert.deepEqual(await offline.c.check(1_000, { force: true }), { checked: false, reason: "offline" });
  assert.equal(offline.c.status().phase, "offline");
  assert.equal(offline.c.status().label, "Offline");
  assert.equal(offline.updater.checks, 0);
});
