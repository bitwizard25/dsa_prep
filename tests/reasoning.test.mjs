import test from "node:test";
import assert from "node:assert/strict";
import * as R from "../src/renderer/core/reasoning.js";
import { PATTERNS } from "../src/renderer/data/dataset.js";

const P = (name) => PATTERNS.indexOf(name);

test("acceptedPatterns: primary always accepted, specific tags add patterns, broad tags don't", () => {
  assert.deepEqual(R.acceptedPatterns(P("Arrays & Hashing"), ["Array", "Hash Table"]), [P("Arrays & Hashing")]);
  const lis = R.acceptedPatterns(P("Dynamic Programming"), ["Array", "Binary Search", "Dynamic Programming"]);
  assert.ok(lis.includes(P("Dynamic Programming")) && lis.includes(P("Binary Search")));
  assert.ok(!R.acceptedPatterns(P("Trees"), ["Array", "String", "Sorting"]).includes(P("Arrays & Hashing")));
});

test("parseConstraints: size bounds in several LeetCode formats", () => {
  const two = "<p>x</p><p><strong>Constraints:</strong></p><ul><li><code>2 &lt;= nums.length &lt;= 10<sup>4</sup></code></li><li><code>-10<sup>9</sup> &lt;= nums[i] &lt;= 10<sup>9</sup></code></li></ul>";
  assert.equal(R.parseConstraints(two).n, 1e4);
  assert.equal(R.parseConstraints("<p><strong>Constraints:</strong></p><ul><li><code>1 &lt;= s.length &lt;= 5 * 10<sup>4</sup></code></li></ul>").n, 5e4);
  assert.equal(R.parseConstraints("<p><strong>Constraints:</strong></p><ul><li>The number of nodes in the tree is in the range <code>[0, 100]</code>.</li></ul>").n, 100);
  assert.equal(R.parseConstraints("<p><strong>Constraints:</strong></p><ul><li><code>1 &lt;= n &lt;= 8</code></li></ul>").n, 8);
  assert.deepEqual(R.parseConstraints("<p>No constraints here</p>"), { lines: [], n: null });
  assert.equal(R.parseConstraints("").n, null);
});

test("budgetFor and fitsBudget", () => {
  assert.equal(R.budgetFor(8), "O(n!)");
  assert.equal(R.budgetFor(20), "O(2^n)");
  assert.equal(R.budgetFor(400), "O(n^3)");
  assert.equal(R.budgetFor(1e4), "O(n^2)");
  assert.equal(R.budgetFor(1e5), "O(n log n)");
  assert.equal(R.budgetFor(1e7), "O(n)");
  assert.equal(R.budgetFor(null), null);
  assert.equal(R.fitsBudget("O(n^2)", 1e5), "too-slow");
  assert.equal(R.fitsBudget("O(n log n)", 1e5), "ok");
  assert.equal(R.fitsBudget("O(n)", null), "unknown");
});

test("wordsOk rejects filler", () => {
  assert.equal(R.wordsOk("check every pair i j"), true);
  for (const bad of ["", "idk", "n/a", "...", "a b"]) assert.equal(R.wordsOk(bad), false, bad);
});

test("checkThink: lists what's missing, flags slow complexity, judges the pattern", () => {
  const facts = { n: 1e5, lines: [], tags: [], accepted: [P("Sliding Window")], live: true };
  const empty = { complexity: "", brute: "", waste: "", pattern: null, patternTries: 0, skipped: false };
  assert.equal(R.checkThink(empty, facts).problems.length, 4);
  const slow = { complexity: "O(n^2)", brute: "try every start and end", waste: "recounts the same window", pattern: P("Sliding Window"), patternTries: 0, skipped: false };
  assert.match(R.checkThink(slow, facts).problems[0], /too slow/);
  const good = { ...slow, complexity: "O(n)" };
  assert.deepEqual(R.checkThink(good, facts), { problems: [], patternRight: true });
  assert.equal(R.checkThink({ ...good, pattern: P("Graphs") }, facts).patternRight, false);
  assert.equal(R.checkThink(good, null).patternRight, null);
});

test("eligibility: only fully honest attempts count as alone", () => {
  const base = { at: "2026-10-29", think: { complexity: "O(n)", brute: "x y z", waste: "x y z", pattern: 2, patternTries: 1, patternCorrect: true, skipped: false },
    n: 1e5, tags: [], sawSolution: false, accepted: true, explain: { why: "a b c", insight: "a b c" }, result: "a", manual: false };
  assert.deepEqual(R.eligibility(base), { alone: true, reasons: [] });
  assert.equal(R.eligibility({ ...base, think: null }).alone, false);
  assert.equal(R.eligibility({ ...base, think: { ...base.think, skipped: true } }).alone, false);
  assert.equal(R.eligibility({ ...base, sawSolution: true }).alone, false);
  assert.equal(R.eligibility({ ...base, think: { ...base.think, patternTries: 2 } }).alone, false);
  assert.equal(R.eligibility({ ...base, manual: true }).alone, false);
  assert.equal(R.eligibility({ ...base, accepted: false }).alone, false);
});

test("attempt storage: newest last, capped, verified-alone reads the latest", () => {
  const progress = { status: { "two-sum": "a" } };
  const rec = (result, ok) => ({ at: "2026-10-29", think: ok ? { complexity: "O(n)", brute: "x y z", waste: "x y z", pattern: 0, patternTries: 1, patternCorrect: true, skipped: false } : null,
    n: null, tags: [], sawSolution: false, accepted: true, explain: null, result, manual: false });
  for (let i = 0; i < 7; i++) R.recordAttempt(progress, "two-sum", rec("a", i % 2 === 0), 5);
  assert.equal(progress.attempts["two-sum"].length, 5);
  assert.equal(R.latestAttempt(progress, "two-sum").think !== null, true);
  assert.equal(R.isVerifiedAlone(progress, "two-sum"), true);
  progress.status["two-sum"] = "h";
  assert.equal(R.isVerifiedAlone(progress, "two-sum"), false);
  assert.equal(R.latestAttempt({}, "x"), null);
});

test("eligibility requires one positively verified pattern choice", () => {
  const base = { think: { patternTries: 1, patternCorrect: true, skipped: false }, accepted: true, manual: false, sawSolution: false };
  assert.equal(R.eligibility(base).alone, true);
  for (const think of [{ patternTries: 0, patternCorrect: true }, { patternTries: 1 }, { patternTries: 1, patternCorrect: false }, { patternTries: 2, patternCorrect: true }]) {
    assert.equal(R.eligibility({ ...base, think }).alone, false);
  }
});

test("unknown or malformed constraint sizes do not crash or return a budget", () => {
  for (const n of [-1, NaN, Infinity, "100"]) assert.equal(R.budgetFor(n), null);
});

test("tag mapping never introduces invalid pattern indexes", () => {
  assert.deepEqual(R.acceptedPatterns(-1, ["Trie"]), [P("Tries")].filter(n => n >= 0));
  assert.deepEqual(R.acceptedPatterns(999, []), []);
});
