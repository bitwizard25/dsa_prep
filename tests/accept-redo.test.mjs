import test from "node:test";
import assert from "node:assert/strict";
import { build } from "../hub-src/node_modules/esbuild/lib/main.js";
import { store } from "../src/renderer/core/state.js";
import { acceptResult, recordAttempt } from "../src/renderer/core/practice.js";
import { isVerifiedAlone } from "../src/renderer/core/reasoning.js";
import { todayKey, fmt, addDays } from "../src/renderer/core/dates.js";
import { PATTERNS, PROBLEMS } from "../src/renderer/data/dataset.js";

globalThis.window = { api: { saveState() {}, loadState: async () => null } };

const plus = (n) => fmt(addDays(new Date(), n));
const patternName = (slug) => PATTERNS[PROBLEMS.find((p) => p[0] === slug)[3]];
const honest = (result) => ({
  at: todayKey(),
  think: { complexity: "O(n)", brute: "one two three", waste: "one two three", pattern: 0, patternTries: 1, patternCorrect: true, skipped: false },
  n: 1e5, tags: [], sawSolution: false, accepted: true,
  explain: { why: "one two three", insight: "map the complement" },
  result, manual: false,
});

let bridge;
async function summary() {
  if (!bridge) {
    const { outputFiles } = await build({ entryPoints: ["hub-src/src/core/practice-bridge.ts"], bundle: true, platform: "node", format: "esm", write: false });
    bridge = await import(`data:text/javascript;base64,${Buffer.from(outputFiles[0].contents).toString("base64")}`);
  }
  return bridge.summarizeDsa({
    version: 2,
    profile: { onboarded: true, sources: ["amazon"], queue: ["two-sum"], completed: [], hoursPerDay: 2, daysPerWeek: 7, startDate: todayKey() },
    progress: store.S.progress,
  }, todayKey());
}

test("an accepted alone redo changes Help to Alone and the Hub counts it as verified", async () => {
  store.S.progress = {
    status: { "two-sum": "h" }, when: { "two-sum": "2026-10-01" },
    redo: { "two-sum": { due: todayKey(), stage: 0 } }, attempts: {}, solutionSeen: {},
  };
  recordAttempt("two-sum", honest("a"));
  const name = patternName("two-sum");
  const before = await summary();
  assert.equal(before.patterns[name].help, 1);
  assert.equal(before.patterns[name].verified, 0);
  assert.equal(isVerifiedAlone(store.S.progress, "two-sum"), false);

  acceptResult("two-sum", "a");
  assert.equal(store.S.progress.status["two-sum"], "a");
  assert.equal(store.S.progress.when["two-sum"], todayKey());
  assert.equal(store.S.progress.redo["two-sum"].stage, 1);
  assert.equal(store.S.progress.redo["two-sum"].due, plus(10));
  assert.equal(isVerifiedAlone(store.S.progress, "two-sum"), true);
  const after = await summary();
  assert.equal(after.patterns[name].alone, 1);
  assert.equal(after.patterns[name].help, 0);
  assert.equal(after.patterns[name].verified, 1);
});

test("an accepted help redo stays Help and is not verified", async () => {
  store.S.progress = {
    status: { "valid-parentheses": "h" }, when: { "valid-parentheses": "2026-10-01" },
    redo: { "valid-parentheses": { due: todayKey(), stage: 1 } }, attempts: {}, solutionSeen: {},
  };
  recordAttempt("valid-parentheses", honest("h"));
  acceptResult("valid-parentheses", "h");
  assert.equal(store.S.progress.status["valid-parentheses"], "h");
  assert.equal(store.S.progress.when["valid-parentheses"], "2026-10-01");
  assert.equal(store.S.progress.redo["valid-parentheses"].stage, 0);
  assert.equal(store.S.progress.redo["valid-parentheses"].due, plus(3));
  assert.equal(isVerifiedAlone(store.S.progress, "valid-parentheses"), false);
  const name = patternName("valid-parentheses");
  const hub = await summary();
  assert.equal(hub.patterns[name].help, 1);
  assert.equal(hub.patterns[name].verified, 0);
  assert.equal(hub.patterns[name].alone, 0);
});

test("the last successful redo clears the schedule and keeps the Alone mark", () => {
  store.S.progress = {
    status: { "two-sum": "h" }, when: {}, redo: { "two-sum": { due: todayKey(), stage: 2 } }, attempts: {}, solutionSeen: {},
  };
  acceptResult("two-sum", "a");
  assert.equal(store.S.progress.status["two-sum"], "a");
  assert.equal(store.S.progress.redo["two-sum"], undefined);
});

test("a first Accepted mark still uses the normal status", () => {
  store.S.progress = { status: {}, when: {}, redo: {}, attempts: {}, solutionSeen: {} };
  acceptResult("two-sum", "h");
  assert.equal(store.S.progress.status["two-sum"], "h");
  assert.equal(store.S.progress.redo["two-sum"].stage, 0);
  assert.equal(store.S.progress.redo["two-sum"].due, plus(3));
});
