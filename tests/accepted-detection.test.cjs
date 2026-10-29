const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { EventEmitter } = require("node:events");
const load = require("./load-main.cjs");

const { exactAccepted, trackSubmission, WATCH, LeetCodeView } = load(path.resolve("src/main/leetcode-view.js"), {
  electron: {
    session: { fromPartition: () => ({ setUserAgent() {}, getUserAgent: () => "Chrome" }) },
    WebContentsView: class { constructor() { this.webContents = new EventEmitter(); this.webContents.getURL = () => this.webContents.url || ""; this.webContents.setWindowOpenHandler = () => {}; this.webContents.executeJavaScript = async () => null; } },
    shell: {},
  },
});

test("Accepted is an exact status line, not a substring", () => {
  assert.equal(exactAccepted("Accepted"), true);
  assert.equal(exactAccepted("Accepted\nRuntime: 4 ms"), true);
  assert.equal(exactAccepted("Not Accepted"), false);
  assert.equal(exactAccepted("Wrong Answer"), false);
  assert.equal(exactAccepted("Accepted something else"), false);
  assert.equal(WATCH.includes("/Accepted/"), false);
});

test("only a fresh submission from the editor on leetcode.com counts", () => {
  let state = { prevPath: "", fresh: {}, done: {} };
  const old = trackSubmission(state, "https://leetcode.com/problems/two-sum/submissions/10/", "Accepted");
  assert.equal(old.fire, false);
  state = old.state;
  state.prevPath = "/problems/two-sum/description/";
  const pending = trackSubmission(state, "https://leetcode.com/problems/two-sum/submissions/11/", "Pending");
  assert.equal(pending.fire, false);
  const ok = trackSubmission(pending.state, "https://leetcode.com/problems/two-sum/submissions/11/", "Accepted");
  assert.equal(ok.fire, true);
  assert.equal(ok.slug, "two-sum");
  assert.equal(trackSubmission(ok.state, "https://leetcode.com/problems/two-sum/submissions/11/", "Accepted").fire, false);
  const not = trackSubmission({ prevPath: "/problems/two-sum/", fresh: {}, done: {} }, "https://leetcode.com/problems/two-sum/submissions/12/", "Not Accepted");
  assert.equal(not.fire, false);
  const evil = trackSubmission({ prevPath: "/problems/two-sum/", fresh: {}, done: {} }, "https://evilleetcode.com/problems/two-sum/submissions/13/", "Accepted");
  assert.equal(evil.fire, false);
  const list = trackSubmission({ prevPath: "/problems/two-sum/submissions/", fresh: {}, done: {} }, "https://leetcode.com/problems/two-sum/submissions/14/", "Accepted");
  assert.equal(list.fire, false);
});

test("the main process ignores Accepted events for another problem or host", () => {
  const sent = [];
  const wc = new EventEmitter();
  wc.url = "https://leetcode.com/problems/two-sum/submissions/11/";
  wc.getURL = () => wc.url;
  wc.setWindowOpenHandler = () => {};
  wc.executeJavaScript = async () => null;
  const session = { fromPartition: () => ({ setUserAgent() {}, getUserAgent: () => "Chrome" }) };
  const { LeetCodeView: View } = load(path.resolve("src/main/leetcode-view.js"), {
    electron: { session, WebContentsView: class { constructor() { this.webContents = wc; } }, shell: {} },
  });
  new View({ send: (ch, data) => sent.push([ch, data]), onUrl() {} });
  wc.emit("console-message", { message: "__DSA_ACCEPTED__:two-sum" });
  wc.url = "https://notleetcode.com/problems/two-sum/submissions/11/";
  wc.emit("console-message", { message: "__DSA_ACCEPTED__:two-sum" });
  wc.url = "https://leetcode.com/problems/two-sum/submissions/11/";
  wc.emit("console-message", { message: "__DSA_ACCEPTED__:other-problem" });
  wc.url = "https://leetcode.com/problems/two-sum/";
  wc.emit("console-message", { message: "__DSA_ACCEPTED__:two-sum" });
  assert.deepEqual(sent, [["accepted", "two-sum"]]);
  assert.equal(typeof LeetCodeView, "function");
});
