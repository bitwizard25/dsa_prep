// Offline Think-first smoke. Run: npx electron tests/smoke-think.cjs
const { app, BrowserWindow } = require("electron");
const fs = require("fs");
const os = require("os");
const path = require("path");
const assert = require("assert/strict");

const data = fs.mkdtempSync(path.join(os.tmpdir(), "think-check-"));
app.setPath("userData", data);
const root = process.cwd();
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const META = {
  content: "<p><strong>Example 1:</strong></p><pre><strong>Input:</strong> nums = [2,7], target = 9\n<strong>Output:</strong> [0,1]</pre><p><strong>Constraints:</strong></p><ul><li><code>1 &lt;= nums.length &lt;= 10<sup>5</sup></code></li></ul>",
  tags: ["Array", "Hash Table"],
};

app.whenReady().then(async () => {
  const { registerIpc } = require(path.join(root, "src/main/ipc.js"));
  const win = new BrowserWindow({ show: false, webPreferences: { preload: path.join(root, "src/preload/index.js"), contextIsolation: true, nodeIntegration: false, sandbox: true, additionalArguments: ["--dsa-dev"] } });
  const lc = { view: { setVisible() {} }, url: () => "", open() { return true; }, authStatus: async () => ({ signedIn: false }), setFocus() {}, problemMeta: async () => META, setCover: async () => true };
  registerIpc({ win, lc, setLayout: () => 380, send() {}, view: "practice", openView() {}, setUA() {}, focusExisting() {} });
  const js = (s) => win.webContents.executeJavaScript(s);
  await win.loadFile(path.join(root, "src/renderer/index.html"));
  await wait(800);
  await js(`(async () => { const s = window.__dsa.store.S; s.profile = { ...s.profile, onboarded: true, dataVersion: 2, queue: ["two-sum"], completed: [], sources: ["amazon"], startDate: "2026-10-29", hoursPerDay: 2, daysPerWeek: 7 }; await window.__dsa.store.saveNow(); })()`);
  await win.reload();
  await wait(800);
  const open = await js(`!!document.querySelector('[data-act="open"][data-slug="two-sum"]')`);
  if (!open) throw new Error("two-sum row missing: " + await js(`document.body.innerText.slice(0, 400)`));
  await js(`document.querySelector('[data-act="open"][data-slug="two-sum"]').click()`);
  await wait(400);
  for (let i = 0; i < 30; i++) {
    if (await js(`window.__dsa.ctx.attempt && window.__dsa.ctx.attempt.facts`)) break;
    await wait(50);
  }
  assert.equal(await js(`!!document.querySelector(".think")`), true);
  await js(`document.querySelector('[data-act="think-next"]').click()`);
  assert.match(await js(`window.__dsa.ctx.attempt.nudge`), /\[0,1\]/);
  await js(`window.__dsa.ctx.attempt.think.step = 1; window.__dsa.render()`);
  const set = async (k, v) => js(`(() => { const e = document.querySelector('[data-think=${JSON.stringify(k)}]'); e.value = ${JSON.stringify(v)}; e.dispatchEvent(new Event(e.tagName === "SELECT" ? "change" : "input", { bubbles: true })); })()`);
  const next = async () => { await js(`document.querySelector('[data-act="think-next"]').click()`); await wait(60); };
  await set("exampleTyped", "[0,1]");
  await next();
  await set("complexity", "O(n)");
  await next();
  await set("brute", "check every pair of numbers");
  await set("bruteComplexity", "O(n^2)");
  await next();
  await set("waste", "hash");
  await next();
  await set("fix", "hash");
  await next();
  await js(`document.querySelectorAll("[data-edge]").forEach((e,i) => { if (i < 2) e.click(); })`);
  await js(`document.querySelector('[data-act="think-unlock"]').click()`);
  await wait(120);
  assert.equal(await js(`window.__dsa.ctx.attempt.unlocked`), true);
  assert.equal(await js(`window.__dsa.ctx.attempt.think.patternCorrect`), true);
  win.webContents.send("accepted", "two-sum");
  await wait(100);
  assert.equal(await js(`!document.querySelector('[data-act="accept-mark"][data-st="a"]').disabled`), true);
  await js(`document.querySelector('[data-act="accept-mark"][data-st="a"]').click()`);
  assert.match(await js(`document.body.innerText`), /editorial/i);
  await js(`document.querySelector('[data-act="grade"][data-v="matched"]').click()`);
  await js(`(() => { const e = document.getElementById("finalCx"); e.value = "O(n)"; e.dispatchEvent(new Event("change", { bubbles: true })); })()`);
  await wait(40);
  await js(`document.querySelector('[data-act="accept-mark"][data-st="a"]').click()`);
  await wait(120);
  assert.equal(await js(`window.__dsa.store.S.progress.status["two-sum"]`), "a");
  assert.equal(await js(`window.__dsa.store.S.progress.attempts["two-sum"].at(-1).think.patternCorrect`), true);
  assert.equal(await js(`window.__dsa.store.S.progress.attempts["two-sum"].at(-1).explain.insight`), "Matched the editorial.");
  console.log("Think-first flow passed: offline gate, validation, first-try unlock, Accepted and saved explanation");
  win.destroy();
  app.exit(0);
}).catch((e) => { console.error(e); app.exit(1); });
setTimeout(() => { console.error("timeout"); app.exit(1); }, 30000);
