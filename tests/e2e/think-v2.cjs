// Full Think-first v2 flow, offline. Run: npx electron tests/e2e/think-v2.cjs
const { app, BrowserWindow } = require("electron");
const fs = require("fs");
const os = require("os");
const path = require("path");
const assert = require("assert/strict");

const data = fs.mkdtempSync(path.join(os.tmpdir(), "think-v2-"));
app.setPath("userData", data);
const root = process.cwd();
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const META = {
  content: "<p><strong>Example 1:</strong></p><pre><strong>Input:</strong> nums = [2,7], target = 9\n<strong>Output:</strong> [0,1]</pre><p><strong>Constraints:</strong></p><ul><li><code>1 &lt;= nums.length &lt;= 10<sup>5</sup></code></li></ul>",
  tags: ["Array", "Hash Table"],
};

app.whenReady().then(async () => {
  const { registerIpc } = require(path.join(root, "src/main/ipc.js"));
  const win = new BrowserWindow({
    show: false,
    webPreferences: { preload: path.join(root, "src/preload/index.js"), contextIsolation: true, nodeIntegration: false, sandbox: true, additionalArguments: ["--dsa-dev"] },
  });
  const lc = {
    view: { setVisible() {} }, url: () => "",
    open() { return true; }, authStatus: async () => ({ signedIn: true, username: "ada" }),
    setFocus() {}, problemMeta: async () => META, setCover: async () => true, home() {}, back() {},
  };
  registerIpc({ win, lc, setLayout: () => 380, send() {}, view: "practice", openView() {}, setUA() {}, focusExisting() {} });
  const js = (s) => win.webContents.executeJavaScript(s);
  await win.loadFile(path.join(root, "src/renderer/index.html"));
  await wait(600);
  await js(`(async () => {
    const s = window.__dsa.store.S;
    const today = new Date();
    const key = today.getFullYear() + "-" + String(today.getMonth() + 1).padStart(2, "0") + "-" + String(today.getDate()).padStart(2, "0");
    s.profile = { ...s.profile, onboarded: true, dataVersion: 2, queue: ["two-sum"], completed: [], sources: ["amazon"], startDate: key, hoursPerDay: 2, daysPerWeek: 7, hubOwned: false };
    await window.__dsa.store.saveNow();
  })()`);
  await win.reload();
  await wait(700);
  win.webContents.send("lc-url", "https://leetcode.com/problems/two-sum/");
  for (let i = 0; i < 40; i++) {
    if (await js(`window.__dsa.ctx.attempt && window.__dsa.ctx.attempt.facts && window.__dsa.ctx.attempt.facts.example`)) break;
    await wait(50);
  }
  assert.equal(await js(`window.__dsa.ctx.attempt.think.version`), 2);
  assert.match(await js(`document.body.innerText`), /nums = \[2,7\], target = 9/);

  const set = async (k, v) => js(`(() => { const e = document.querySelector('[data-think=${JSON.stringify(k)}]'); e.value = ${JSON.stringify(v)}; e.dispatchEvent(new Event(e.tagName === "SELECT" ? "change" : "input", { bubbles: true })); })()`);
  const next = async () => { await js(`document.querySelector('[data-act="think-next"]').click()`); await wait(80); };

  await set("exampleTyped", "[1, 0]");
  await next();
  assert.equal(await js(`window.__dsa.ctx.attempt.think.exampleResult`), "misunderstood");
  assert.match(await js(`window.__dsa.ctx.attempt.nudge`), /\[0,1\]/);
  await js(`window.__dsa.ctx.attempt.think.step = 1; window.__dsa.render()`);
  await wait(50);
  await set("exampleTyped", "[0,1]");
  await next();
  assert.equal(await js(`window.__dsa.ctx.attempt.think.exampleResult`), "correct");

  await set("complexity", "O(n^2)");
  assert.match(await js(`document.body.innerText`), /too slow/i);
  await set("complexity", "O(n)");
  await next();
  await set("brute", "check every pair of numbers");
  await set("bruteComplexity", "O(n^2)");
  await next();
  assert.equal(await js(`window.__dsa.ctx.attempt.think.bruteFits`), false);
  assert.equal(await js(`window.__dsa.ctx.attempt.think.step`), 4);
  await set("waste", "hash");
  await next();
  await set("fix", "dp");
  await next();
  assert.equal(await js(`window.__dsa.ctx.attempt.think.chainCorrect`), false);
  assert.equal(await js(`window.__dsa.ctx.attempt.think.step`), 5);
  await set("fix", "hash");
  await next();
  assert.equal(await js(`window.__dsa.ctx.attempt.think.chainTries`), 2, "the wrong first fix is remembered");
  await js(`document.querySelectorAll('[data-edge]').forEach((e,i) => { if (i < 2) e.click(); })`);
  await wait(50);
  await js(`document.querySelector('[data-act="think-unlock"]').click()`);
  await wait(100);
  assert.equal(await js(`window.__dsa.ctx.attempt.unlocked`), true);

  win.webContents.send("accepted", "two-sum");
  await wait(100);
  await js(`document.querySelector('[data-act="accept-mark"][data-st="a"]').click()`);
  assert.match(await js(`document.body.innerText`), /editorial/i);
  await js(`document.querySelector('[data-act="grade"][data-v="matched"]').click()`);
  await js(`document.getElementById("finalCx").value = "O(n)"; document.getElementById("finalCx").dispatchEvent(new Event("change", { bubbles: true }));`);
  await wait(50);
  await js(`document.querySelector('[data-act="accept-mark"][data-st="a"]').click()`);
  await wait(100);
  assert.match(await js(`document.body.innerText`), /first try/i);
  assert.notEqual(await js(`window.__dsa.store.S.progress.status["two-sum"]`), "a");
  await js(`document.querySelector('[data-act="accept-mark"][data-st="h"]').click()`);
  await wait(150);
  assert.equal(await js(`window.__dsa.store.S.progress.status["two-sum"]`), "h");
  assert.equal(await js(`window.__dsa.store.S.progress.attempts["two-sum"].at(-1).think.version`), 2);
  assert.equal(await js(`window.__dsa.store.S.progress.attempts["two-sum"].at(-1).think.selfGrade`), "matched");

  console.log("Think-first v2 flow passed.");
  win.destroy();
  app.exit(0);
}).catch((e) => { console.error(e); app.exit(1); });

setTimeout(() => { console.error("timeout"); app.exit(1); }, 30000);
