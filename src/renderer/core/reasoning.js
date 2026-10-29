// Judging the Think-first step and attempts. Pure functions only: no DOM, no Electron, no storage.
// Unit-tested in tests/reasoning.test.mjs. Shared by the practice app and the Hub (via the bridge).
import { PATTERNS } from "../data/dataset.js";

const PI = (name) => PATTERNS.indexOf(name);

export const COMPLEXITIES = ["O(1)", "O(log n)", "O(n)", "O(n log n)", "O(n^2)", "O(n^3)", "O(2^n)", "O(n!)"];

// Specific LeetCode topic tags -> pattern. Broad tags (Array, String, Sorting, Matrix, Math) are left out on
// purpose: almost every problem has them, so they would accept any answer. The problem's primary pattern
// (from tools/build-data.js) is always accepted on top of these.
const TAG_PATTERN = [
  [["Trie"], "Tries"],
  [["Line Sweep"], "Intervals"],
  [["Backtracking"], "Backtracking"],
  [["Linked List", "Doubly-Linked List"], "Linked Lists"],
  [["Graph Theory", "Topological Sort", "Shortest Path", "Minimum Spanning Tree", "Union-Find", "Breadth-First Search", "Depth-First Search"], "Graphs"],
  [["Tree", "Binary Tree", "Binary Search Tree"], "Trees"],
  [["Sliding Window"], "Sliding Window"],
  [["Monotonic Stack", "Monotonic Queue", "Stack"], "Stack & Monotonic Stack"],
  [["Heap (Priority Queue)"], "Heaps & Top K"],
  [["Dynamic Programming", "Memoization"], "Dynamic Programming"],
  [["Binary Search"], "Binary Search"],
  [["Two Pointers"], "Two Pointers"],
  [["Greedy"], "Greedy"],
  [["Hash Table", "Prefix Sum", "Counting"], "Arrays & Hashing"],
];

/** Every pattern that genuinely fits: the primary one plus any a specific tag points to. */
export function acceptedPatterns(primary, tags) {
  const out = new Set(Number.isInteger(primary) && primary >= 0 && primary < PATTERNS.length ? [primary] : []);
  for (const [group, name] of TAG_PATTERN) if (group.some((t) => (tags || []).includes(t)) && PI(name) >= 0) out.add(PI(name));
  return [...out].sort((a, b) => a - b);
}

// "10^5", "5 * 10^4", "2*10^5", "5000" -> number
function toNumber(expr) {
  const s = expr.replace(/\s+/g, "");
  let m = s.match(/^(\d+(?:\.\d+)?)\*10\^(\d+)$/);
  if (m) return +m[1] * 10 ** +m[2];
  m = s.match(/^10\^(\d+)$/);
  if (m) return 10 ** +m[1];
  m = s.match(/^\d+$/);
  return m ? +s : null;
}
const SIZE_WORDS = /(length|\bn\b|\bm\b|\bk\b|size|number of|nodes|\.length)/i;
const VALUE_INDEX = /\[\s*i\s*\]|\[\s*j\s*\]|\bval\b|Node\.val/i;

/** The Constraints list and the largest input size in it (n), from a LeetCode problem's HTML. */
export function parseConstraints(html) {
  if (!html) return { lines: [], n: null };
  // Block tags end a line; inline tags (<code>, <strong>) don't, so "in the range <code>[0, 100]</code>" stays one line.
  const text = html.replace(/<sup>(.*?)<\/sup>/g, "^$1").replace(/<\/?(li|p|ul|ol|br|div)[^>]*>/gi, "\n").replace(/<[^>]+>/g, "")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/≤/g, "<=");
  const at = text.search(/Constraints:/i);
  if (at < 0) return { lines: [], n: null };
  const lines = text.slice(at + 12).split("\n").map((s) => s.trim()).filter((s) => /\d/.test(s)).slice(0, 12);
  let n = null;
  for (const l of lines) {
    if (!SIZE_WORDS.test(l) || VALUE_INDEX.test(l)) continue;
    const range = l.match(/range\s*\[\s*[-\d^*\s]+,\s*([\d^*\s]+)\]/i);
    const upper = range ? range[1] : (l.match(/<=\s*([\d^*.\s]+)\s*\.?$/) || [])[1];
    const v = upper ? toNumber(upper) : null;
    if (v !== null && (n === null || v > n)) n = v;
  }
  return { lines, n };
}

const BUDGET = [[11, "O(n!)"], [25, "O(2^n)"], [464, "O(n^3)"], [1e4, "O(n^2)"], [1e6, "O(n log n)"], [Infinity, "O(n)"]];
/** Rough upper bound for about 10^8 operations; actual runtimes vary. */
export function budgetFor(n) {
  if (typeof n !== "number" || !Number.isFinite(n) || n <= 0) return null;
  return BUDGET.find(([lim]) => n <= lim)[1];
}
export function fitsBudget(choice, n) {
  const b = budgetFor(n);
  if (!b || !COMPLEXITIES.includes(choice)) return "unknown";
  return COMPLEXITIES.indexOf(choice) <= COMPLEXITIES.indexOf(b) ? "ok" : "too-slow";
}

const FILLER = /^(idk|i don'?t know|na|n\/a|none|nothing|skip|no idea|-+|\.+|\?+)$/i;
/** At least `min` real words (2+ letters or digits), and not a filler answer. */
export function wordsOk(text, min = 3) {
  const t = (text || "").trim();
  if (!t || FILLER.test(t)) return false;
  return t.split(/\s+/).filter((w) => /[a-z0-9]{2,}/i.test(w)).length >= min;
}

const fmtN = (n) => (n >= 1e4 && /^10*$/.test(String(n)) ? `10^${String(n).length - 1}` : n.toLocaleString("en-IN"));

/**
 * What's still missing before the editor opens, and whether the pattern fits (null when unknown).
 * A slow-looking complexity is a warning, not a block. The check uses one size (the largest n it
 * can see). Real problems also depend on m, k, or other limits, so a "too slow" guess must not
 * keep the editor locked.
 */
export function checkThink(think, facts) {
  const problems = [];
  if (!COMPLEXITIES.includes(think.complexity)) problems.push("Pick the time complexity you're aiming for.");
  if (!wordsOk(think.brute)) problems.push("Describe the brute force in a few words.");
  if (!wordsOk(think.waste)) problems.push("Say what the brute force repeats or wastes.");
  if (think.pattern === null || think.pattern === undefined || think.pattern < 0) problems.push("Pick a pattern.");
  let warning = "";
  const n = facts ? facts.n : null;
  if (COMPLEXITIES.includes(think.complexity) && fitsBudget(think.complexity, n) === "too-slow") {
    warning = `With n up to ${fmtN(n)}, ${think.complexity} may be too slow. Consider ${budgetFor(n)} or better.`;
  }
  const patternRight = !facts || think.pattern === null || think.pattern === undefined ? null : facts.accepted.includes(think.pattern);
  return { problems, patternRight, warning };
}

/** "Solved alone" is earned, not clicked: every condition must hold. */
export function eligibility(rec) {
  const reasons = [];
  if (!rec.think || rec.think.skipped) reasons.push("Think-first was skipped");
  // patternTries 0 is not a confirmed choice. An unconfirmed pattern never counts, even if the other fields look right.
  else if (rec.think.patternTries !== 1 || rec.think.patternCorrect !== true || rec.think.patternUnconfirmed) reasons.push("The pattern was not confirmed on the first try");
  if (rec.sawSolution) reasons.push("You opened the solution");
  if (rec.manual) reasons.push("Marked by hand, not after Accepted");
  else if (!rec.accepted) reasons.push("Not marked after an Accepted submission");
  if (!rec.explain || !wordsOk(rec.explain.insight)) reasons.push("The key insight was not written down");
  return { alone: reasons.length === 0, reasons };
}
/** A manual mark must not replace a solve that already earned verified alone. */
export function canManualMark(progress, slug) {
  return !isVerifiedAlone(progress, slug);
}
/** Why a manual Solved alone / Needed help mark is refused, or "" when it is allowed. */
export function manualMarkBlock(progress, slug, gated) {
  if (gated) return "Finish Think-first or skip it before marking this problem.";
  if (!canManualMark(progress, slug)) return "This problem is already verified as solved alone. A manual mark can't replace that.";
  return "";
}

export function recordAttempt(progress, slug, rec, cap = 5) {
  const all = progress.attempts || (progress.attempts = {});
  const list = all[slug] || (all[slug] = []);
  list.push(rec);
  if (list.length > cap) list.splice(0, list.length - cap);
}
export function latestAttempt(progress, slug) {
  const list = progress && progress.attempts && progress.attempts[slug];
  return list && list.length ? list[list.length - 1] : null;
}
/** Marked alone AND the latest attempt earned it. */
export function isVerifiedAlone(progress, slug) {
  if (!progress || !progress.status || progress.status[slug] !== "a") return false;
  const rec = latestAttempt(progress, slug);
  return !!rec && rec.result === "a" && eligibility(rec).alone;
}

