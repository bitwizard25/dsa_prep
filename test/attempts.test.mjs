import test from "node:test";
import assert from "node:assert/strict";
import * as A from "../src/renderer/core/attempts.js";

const blank = (slug) => ({
  slug, sawAt: null, recorded: false,
  think: { brute: "", complexity: "", waste: "", pattern: null },
});

test("leaving a problem and coming back keeps the think answers and the solution flag", () => {
  const memory = {};
  const seen = {};
  let current = null;
  const open = (slug) => {
    if (current?.slug === slug) return current;
    if (current) A.stashAttempt(memory, current);
    current = A.resolveAttempt(memory, seen, slug, () => blank(slug)).attempt;
    return current;
  };

  const first = open("two-sum");
  first.think.brute = "check every pair of numbers";
  first.think.complexity = "O(n)";
  first.sawAt = 1000;
  assert.equal(A.markSolutionSeen(seen, "two-sum", first.sawAt), true);

  open("valid-parentheses");
  const back = open("two-sum");
  assert.equal(back, first);
  assert.equal(back.think.brute, "check every pair of numbers");
  assert.equal(back.think.complexity, "O(n)");
  assert.equal(back.sawAt, 1000);
  assert.equal(seen["two-sum"], 1000);
});

test("a recorded try starts clean, and a saved solution time fills a new session", () => {
  const memory = {};
  const seen = { "two-sum": 50 };
  const first = A.resolveAttempt(memory, seen, "two-sum", () => blank("two-sum"));
  assert.equal(first.restored, false);
  assert.equal(first.attempt.sawAt, 50);

  first.attempt.think.brute = "nested loops";
  first.attempt.recorded = true;
  A.dropAttempt(memory, "two-sum");
  delete seen["two-sum"];

  const again = A.resolveAttempt(memory, seen, "two-sum", () => blank("two-sum"));
  assert.equal(again.restored, false);
  assert.notEqual(again.attempt, first.attempt);
  assert.equal(again.attempt.sawAt, null);
  assert.equal(again.attempt.think.brute, "");
});

test("the first solution view sticks until the try is dropped", () => {
  const seen = {};
  assert.equal(A.markSolutionSeen(seen, "two-sum", 10), true);
  assert.equal(A.markSolutionSeen(seen, "two-sum", 99), false);
  assert.equal(seen["two-sum"], 10);
  const restored = A.resolveAttempt({}, seen, "two-sum", () => blank("two-sum")).attempt;
  assert.equal(restored.sawAt, 10);
});
