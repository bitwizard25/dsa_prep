import test from "node:test";
import assert from "node:assert/strict";
import * as R from "../src/renderer/core/reasoning.js";
import { PATTERNS } from "../src/renderer/data/dataset.js";
import { planOwnedByHub } from "../src/renderer/core/hub-sync.js";

const P = (name) => PATTERNS.indexOf(name);
const EXAMPLE = `<p><strong>Example 1:</strong></p><pre><strong>Input:</strong> nums = [2,7], target = 9
<strong>Output:</strong> [0,1]
<strong>Explanation:</strong> because 2 + 7.</pre>
<p><strong>Example 2:</strong></p><pre><strong>Input:</strong> nums = [3], target = 3
<strong>Output:</strong> [0]</pre>
<p><strong>Constraints:</strong></p><ul><li><code>1 &lt;= nums.length &lt;= 10<sup>5</sup></code></li></ul>`;

test("a specific tag replaces a broad primary, and broad tags still add nothing", () => {
  assert.deepEqual(R.acceptedPatterns(P("Trees"), ["Array", "Binary Search"]), [P("Binary Search")]);
  assert.deepEqual(R.acceptedPatterns(P("Trees"), ["Array", "String", "Sorting", "Matrix"]), [P("Trees")]);
});

test("example 1 is read from the statement, and a missing example is a fallback", () => {
  const ex = R.parseExample(EXAMPLE);
  assert.equal(ex.input, "nums = [2,7], target = 9");
  assert.equal(ex.output, "[0,1]");
  assert.equal(R.outputsMatch(" [0, 1] ", ex.output), true);
  assert.equal(R.outputsMatch("[1,0]", ex.output), false);
  assert.equal(R.parseExample("<p>No example</p>"), null);
  assert.equal(R.parseExample(""), null);
});

test("brute force that fits skips the chain, and a faster brute force contradicts the target", () => {
  assert.equal(R.judgeBrute("O(n)", "O(n)", 1e7).bruteFits, true);
  assert.equal(R.judgeBrute("O(n)", "O(n^2)", 1e5).bruteFits, false);
  assert.equal(R.judgeBrute("O(n^2)", "O(n)", 1e5).contradiction, true);
  assert.equal(R.judgeBrute("O(n)", "O(n^2)", 1e5).contradiction, false);
});

test("the chain is right only when the fix matches the waste and the specific tags", () => {
  const ok = R.judgeChain("hash", "hash", ["Array", "Hash Table"]);
  assert.equal(ok.fixMatches, true);
  assert.equal(ok.patternRight, true);
  assert.equal(ok.chainCorrect, true);
  const wrongFix = R.judgeChain("hash", "dp", ["Hash Table"]);
  assert.equal(wrongFix.fixMatches, false);
  assert.equal(wrongFix.chainCorrect, false);
  const noTag = R.judgeChain("hash", "hash", ["Array", "String"]);
  assert.equal(noTag.unverifiable, true);
  assert.equal(noTag.chainCorrect, false);
  const window = R.judgeChain("window", "window", ["Sliding Window"]);
  assert.equal(window.chainCorrect, true);
});

test("v2 solved alone requires the example, a first-try chain, no early solution, and a matched grade", () => {
  const think = { version: 2, skipped: false, exampleResult: "correct", chainTries: 1, chainCorrect: true, bruteFits: false, selfGrade: "matched" };
  const base = { think, sawSolution: false, manual: false, accepted: true, result: "a" };
  assert.equal(R.eligibility(base).alone, true);
  assert.equal(R.eligibility({ ...base, think: { ...think, exampleResult: "misunderstood" } }).alone, false);
  assert.equal(R.eligibility({ ...base, think: { ...think, exampleResult: "unverified" } }).alone, false);
  assert.equal(R.eligibility({ ...base, think: { ...think, chainTries: 2, chainCorrect: true } }).alone, false);
  assert.equal(R.eligibility({ ...base, think: { ...think, bruteFits: true, chainTries: 0, chainCorrect: false } }).alone, true);
  assert.equal(R.eligibility({ ...base, sawSolution: true }).alone, false);
  assert.equal(R.eligibility({ ...base, think: { ...think, selfGrade: "partly" } }).alone, false);
  assert.equal(R.eligibility({ ...base, think: { ...think, skipped: true } }).alone, false);
});

test("a v1 record keeps the old alone rule and is counted apart from v2 rates", () => {
  const v1 = { think: { skipped: false, patternTries: 1, patternCorrect: true, unverifiable: false }, sawSolution: false, manual: false, accepted: true, explain: { insight: "use a hash map here" }, result: "a" };
  assert.equal(R.eligibility(v1).alone, true);
  const attempts = {
    "two-sum": [
      v1,
      { think: { version: 2, exampleResult: "correct", chainTries: 1, chainCorrect: true, selfGrade: "matched", gateMs: 90000 } },
      { think: { version: 2, exampleResult: "misunderstood", chainTries: 2, chainCorrect: false, selfGrade: "missed", gateMs: 30000 } },
    ],
  };
  const stats = R.thinkStats(attempts, () => "Arrays & Hashing");
  assert.equal(stats["Arrays & Hashing"].v1, 1);
  assert.equal(stats["Arrays & Hashing"].v2, 2);
  assert.equal(stats["Arrays & Hashing"].chain, 0.5);
  assert.equal(stats["Arrays & Hashing"].understand, 0.5);
  assert.equal(stats["Arrays & Hashing"].matched, 0.5);
  assert.equal(stats["Arrays & Hashing"].gateSec, 60);
});

test("the 10 minute gate is a soft limit", () => {
  const start = 1_000;
  const think = { version: 2, gateStarted: start, skipped: false };
  assert.equal(R.gateStuck(think, start + R.GATE_LIMIT_MS - 1), false);
  assert.equal(R.gateStuck(think, start + R.GATE_LIMIT_MS), true);
  assert.equal(R.gateStuck({ version: 1, gateStarted: start }, start + R.GATE_LIMIT_MS), false);
});

test("a Plan Mode id owns the goal, a practice id does not", () => {
  assert.equal(planOwnedByHub({ dsaSetup: { id: "{\"problemsPerDay\":4}" } }), true);
  assert.equal(planOwnedByHub({ dsaSetup: { id: "practice:amazon|4|6|10" } }), false);
  assert.equal(planOwnedByHub({ dsaSetup: {} }), false);
  assert.equal(planOwnedByHub(null), false);
});
