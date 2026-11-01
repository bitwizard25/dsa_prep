// Offline Think-first review checks. Run: npx electron tests/e2e/think-review.cjs
const { app, BrowserWindow } = require("electron");
const fs = require("fs");
const os = require("os");
const path = require("path");
const assert = require("assert/strict");

const data = fs.mkdtempSync(path.join(os.tmpdir(), "think-review-"));
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
  let url = "";
  const lc = {
    view: { setVisible() {} },
    url: () => url,
    open: (s) => { url = "https://leetcode.com/problems/" + s + "/"; return true; },
    authStatus: async () => ({ signedIn: true, username: "ada" }),
    setFocus() {},
    problemMeta: async () => META,
    setCover: async () => true,
    home() { url = "https://leetcode.com/"; },
    back() {},
  };
  registerIpc({ win, lc, setLayout: () => 380, send() {}, view: "practice", openView() {}, setUA() {}, focusExisting() {} });
  const js = (s) => win.webContents.executeJavaScript(s);
  await win.loadFile(path.join(root, "src/renderer/index.html"));
  await wait(800);
  await js(`(async () => {
    const s = window.__dsa.store.S;
    const today = new Date();
    const key = today.getFullYear() + "-" + String(today.getMonth() + 1).padStart(2, "0") + "-" + String(today.getDate()).padStart(2, "0");
    s.profile = { ...s.profile, onboarded: true, dataVersion: 2, queue: ["two-sum", "valid-parentheses"], completed: [], sources: ["amazon"], startDate: key, hoursPerDay: 3, daysPerWeek: 7 };
    s.progress.status = { "two-sum": "h", "valid-parentheses": "h" };
    s.progress.when = { "two-sum": key, "valid-parentheses": key };
    s.progress.redo = { "two-sum": { due: key, stage: 0 }, "valid-parentheses": { due: key, stage: 0 } };
    s.progress.attempts = { "two-sum": [{ explain: { insight: "use a hash map for the complement" }, result: "h" }] };
    s.progress.solutionSeen = {};
    s.timer = { mode: "break", left: 180, running: true, endsAt: Date.now() + 180000, total: 300 };
    await window.__dsa.store.saveNow();
  })()`);
  await win.reload();
  await wait(1000);

  const fill = async (slug, fields) => {
    win.webContents.send("lc-url", "https://leetcode.com/problems/" + slug + "/");
    for (let i = 0; i < 40; i++) {
      if (await js(`window.__dsa.ctx.attempt && window.__dsa.ctx.attempt.slug === ${JSON.stringify(slug)} && window.__dsa.ctx.attempt.facts`)) break;
      await wait(50);
    }
    assert.equal(await js(`window.__dsa.ctx.attempt.slug`), slug);
    for (const [k, v] of Object.entries(fields)) {
      await js(`(() => { const e = document.querySelector('[data-think=${JSON.stringify(k)}]'); e.value = ${JSON.stringify(v)}; e.dispatchEvent(new Event(e.tagName === "SELECT" ? "change" : "input", { bubbles: true })); })()`);
    }
  };

  await fill("two-sum", { exampleTyped: "[0,1]" });
  await js(`document.querySelector('[data-act="think-next"]').click()`);
  await wait(80);
  await fill("two-sum", { complexity: "O(n^2)" });
  assert.match(await js(`document.body.innerText`), /too slow/i);
  await js(`document.querySelector('[data-act="think-next"]').click()`);
  await wait(80);
  assert.equal(await js(`window.__dsa.ctx.attempt.unlocked`), false, "a slow estimate must not block the next step");
  assert.match(await js(`window.__dsa.ctx.attempt.think.complexityWarning`), /too slow/);
  await fill("two-sum", { brute: "check every pair of numbers", bruteComplexity: "O(n^2)" });
  await js(`document.querySelector('[data-act="think-next"]').click()`);
  await wait(80);
  await fill("two-sum", { waste: "hash" });
  await js(`document.querySelector('[data-act="think-next"]').click()`);
  await wait(80);
  await fill("two-sum", { fix: "hash" });
  await js(`document.querySelector('[data-act="think-next"]').click()`);
  await wait(80);
  await js(`document.querySelectorAll('[data-edge]').forEach((e,i) => { if (i < 2) e.click(); })`);
  await js(`document.querySelector('[data-act="think-unlock"]').click()`);
  await wait(150);
  assert.equal(await js(`window.__dsa.ctx.attempt.unlocked`), true, "a slow estimate must not block unlock");
  assert.equal(await js(`window.__dsa.store.S.timer.mode`), "break");
  assert.match(await js(`document.body.innerText`), /use a hash map for the complement/);

  const sawBefore = Date.now();
  win.webContents.send("lc-url", "https://leetcode.com/problems/two-sum/solutions/");
  await wait(150);
  const sawAt = await js(`window.__dsa.ctx.attempt.sawAt`);
  assert.ok(sawAt >= sawBefore);
  win.webContents.send("lc-url", "https://leetcode.com/problems/valid-parentheses/");
  await wait(200);
  win.webContents.send("lc-url", "https://leetcode.com/problems/two-sum/");
  await wait(200);
  assert.equal(await js(`window.__dsa.ctx.attempt.slug`), "two-sum");
  assert.equal(await js(`window.__dsa.ctx.attempt.think.brute`), "check every pair of numbers");
  assert.equal(await js(`window.__dsa.ctx.attempt.sawAt`), sawAt);
  assert.equal(await js(`window.__dsa.ctx.attempt.unlocked`), true);
  assert.equal(await js(`window.__dsa.store.S.progress.solutionSeen["two-sum"]`), sawAt);

  await fill("valid-parentheses", { exampleTyped: "[0,1]" });
  await js(`document.querySelector('[data-act="think-next"]').click()`); await wait(60);
  await fill("valid-parentheses", { complexity: "O(n)" });
  await js(`document.querySelector('[data-act="think-next"]').click()`); await wait(60);
  await fill("valid-parentheses", { brute: "scan with a stack of openers", bruteComplexity: "O(n^2)" });
  await js(`document.querySelector('[data-act="think-next"]').click()`); await wait(60);
  await fill("valid-parentheses", { waste: "hash" });
  await js(`document.querySelector('[data-act="think-next"]').click()`); await wait(60);
  await fill("valid-parentheses", { fix: "hash" });
  await js(`document.querySelector('[data-act="think-next"]').click()`); await wait(60);
  await js(`document.querySelectorAll('[data-edge]').forEach((e,i) => { if (i < 2) e.click(); })`);
  await js(`document.querySelector('[data-act="think-unlock"]').click()`);
  await wait(200);
  assert.equal(await js(`window.__dsa.ctx.attempt.unlocked`), true);
  assert.equal(await js(`window.__dsa.ctx.attempt.think.patternTries`), 1);
  assert.equal(await js(`window.__dsa.ctx.attempt.think.patternCorrect`), true);
  win.webContents.send("accepted", "valid-parentheses");
  await wait(150);
  assert.equal(await js(`document.querySelector('[data-act="accept-mark"][data-st="a"]').disabled`), false);
  await js(`document.querySelector('[data-act="grade"][data-v="matched"]').click()`);
  await js(`(() => { const e = document.getElementById("finalCx"); e.value = "O(n)"; e.dispatchEvent(new Event("change", { bubbles: true })); })()`);
  await wait(50);
  await js(`document.querySelector('[data-act="accept-mark"][data-st="a"]').click()`);
  await wait(200);
  assert.equal(await js(`window.__dsa.store.S.progress.status["valid-parentheses"]`), "a");
  assert.equal(await js(`window.__dsa.store.S.progress.status["two-sum"]`), "h");
  assert.equal(await js(`window.__dsa.store.S.progress.redo["valid-parentheses"].stage`), 1);
  assert.equal(await js(`window.__dsa.store.S.progress.attempts["valid-parentheses"].at(-1).result`), "a");
  assert.equal(await js(`window.__dsa.store.S.progress.attempts["valid-parentheses"].at(-1).sawSolution`), false);
  assert.equal(await js(`window.__dsa.ctx.attempt.think.brute`), "", "recording the try starts a fresh one");
  assert.equal(await js(`window.__dsa.ctx.attempt.sawAt`), null);
  win.webContents.send("lc-url", "https://leetcode.com/problems/two-sum/");
  await wait(200);
  assert.equal(await js(`window.__dsa.ctx.attempt.sawAt`), sawAt, "an unrecorded solution view is still remembered");
  win.webContents.send("lc-url", "https://leetcode.com/problems/valid-parentheses/");
  await wait(200);
  assert.equal(await js(`window.__dsa.ctx.attempt.think.brute`), "");
  assert.equal(await js(`window.__dsa.ctx.attempt.sawAt`), null);

  console.log("Think-first review checks passed.");
  win.destroy();
  app.exit(0);
}).catch((e) => { console.error(e); app.exit(1); });

setTimeout(() => { console.error("timeout"); app.exit(1); }, 30000);
