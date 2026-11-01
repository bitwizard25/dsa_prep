// About copy, the build stamp, and the practice settings block.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { buildLabel, safeDetail, presentAbout } from "../src/main/about-view.js";
import { readBuildInfo } from "../src/main/build-info.js";
import { shortSha, writeBuildInfo, resolveCommit } from "../tools/write-build-info.js";
import { aboutInner } from "../src/renderer/ui/about.js";

test("the build line uses a short commit and a UTC date, or says it is a development build", () => {
  assert.equal(buildLabel({ commit: "ABC1234ffff", builtAt: "2026-11-01T18:30:00.000Z" }), "abc1234 · 1 Nov 2026");
  assert.equal(buildLabel({ commit: "abc1234" }), "abc1234");
  assert.equal(buildLabel({ commit: null, builtAt: null }), "Development build");
  assert.equal(buildLabel({ commit: "not-a-sha", builtAt: "yesterday" }), "Development build");
});

test("errors shown in About never include a token or a URL", () => {
  assert.equal(safeDetail(new Error("request failed token example-not-real")), "Could not reach GitHub");
  assert.equal(safeDetail(new Error("getaddrinfo ENOTFOUND github.com")), "Could not reach GitHub");
  const text = safeDetail(new Error("No published versions"));
  assert.equal(text, "No published versions");
  assert.equal(text.includes("http"), false);
});

test("a missing stamp file is a development build", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "dsa-build-"));
  const file = path.join(dir, "build-info.json");
  assert.deepEqual(readBuildInfo(file), { commit: null, builtAt: null });
  writeBuildInfo(file, { commit: "abc1234", builtAt: "2026-11-01T00:00:00.000Z" });
  const read = readBuildInfo(file);
  assert.equal(presentAbout({ phase: "idle", ready: false }, { appVersion: "2.4.0", ...read }).buildLabel, "abc1234 · 1 Nov 2026");
  assert.equal(shortSha("0123456789abcdef"), "0123456");
  assert.equal(shortSha("nope"), null);
  assert.match(resolveCommit({ GITHUB_SHA: "deadbeefcafebabe" }), /^deadbee$/);
});

test("the practice About block shows version, build, status, and the check button", () => {
  const html = aboutInner({
    appVersion: "2.4.0",
    buildLabel: "abc1234 · 1 Nov 2026",
    label: "Up to date",
    phase: "uptodate",
    ready: false,
    available: "",
    detail: "",
    lastCheckedAt: null,
  });
  assert.match(html, /Version <b>2\.4\.0<\/b>/);
  assert.match(html, /abc1234 · 1 Nov 2026/);
  assert.match(html, /Up to date/);
  assert.match(html, /Last checked not yet/);
  assert.match(html, /Check for updates/);
  const escaped = aboutInner({ appVersion: "<script>", buildLabel: "ok", label: "Error", phase: "error", detail: "<b>no</b>", ready: false, lastCheckedAt: null });
  assert.equal(escaped.includes("<script>"), false);
  assert.match(escaped, /&lt;script&gt;/);
  assert.match(escaped, /&lt;b&gt;no&lt;\/b&gt;/);
  const ready = aboutInner({ appVersion: "2.4.0", buildLabel: "Development build", label: "Update ready, restart to install", phase: "ready", ready: true, available: "2.5.0", lastCheckedAt: 1 });
  assert.match(ready, /Restart now/);
  assert.match(ready, /Available 2\.5\.0/);
});

test("both screens keep a visible version and an About check", () => {
  const practiceHtml = fs.readFileSync(path.resolve("src/renderer/index.html"), "utf8");
  const practice = fs.readFileSync(path.resolve("src/renderer/screens/workspace.js"), "utf8");
  const aboutUi = fs.readFileSync(path.resolve("src/renderer/ui/about.js"), "utf8");
  const practiceApp = fs.readFileSync(path.resolve("src/renderer/app.js"), "utf8");
  const hub = fs.readFileSync(path.resolve("hub-src/src/screens/Pages.tsx"), "utf8");
  const app = fs.readFileSync(path.resolve("hub-src/src/App.tsx"), "utf8");
  const ci = fs.readFileSync(path.resolve(".github/workflows/ci.yml"), "utf8");
  assert.match(practiceHtml, /id="appver"/);
  assert.match(practice, /id="about"/);
  assert.match(aboutUi, /Check for updates/);
  assert.match(practiceApp, /check-updates/);
  assert.match(hub, /Check for updates/);
  assert.match(app, /tn-ver/);
  assert.match(ci, /node tools\/write-build-info\.js/);
});
