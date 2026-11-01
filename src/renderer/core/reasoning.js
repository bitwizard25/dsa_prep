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

const BROAD_TAGS = new Set(["Array", "String", "Math", "Sorting", "Matrix"]);

/** Patterns named by a specific LeetCode tag. Broad tags never add one. */
export function patternsFromTags(tags) {
  const out = new Set();
  for (const [group, name] of TAG_PATTERN) {
    if (group.some((t) => (tags || []).includes(t) && !BROAD_TAGS.has(t)) && PI(name) >= 0) out.add(PI(name));
  }
  return [...out].sort((a, b) => a - b);
}

/**
 * Patterns that count for this problem.
 * When a specific tag exists, only those patterns count: a dataset primary that came from a broad tag does not.
 * With no specific tag, the dataset primary is the fallback. Broad tags still add nothing.
 */
export function acceptedPatterns(primary, tags) {
  const specific = patternsFromTags(tags);
  if (specific.length) return specific;
  const primaryOk = Number.isInteger(primary) && primary >= 0 && primary < PATTERNS.length;
  return primaryOk ? [primary] : [];
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

/** One row of the waste -> fix -> pattern table. The pattern names are the dataset's. */
export const WASTE_FIX = [
  { id: "dp", waste: "Same subproblem solved again", fix: "Store results", patterns: ["Dynamic Programming"] },
  { id: "window", waste: "Overlapping range re-scanned", fix: "Slide a window / prefix sums", patterns: ["Sliding Window", "Arrays & Hashing"] },
  { id: "hash", waste: "Searching values one by one", fix: "Hash lookup", patterns: ["Arrays & Hashing"] },
  { id: "bin", waste: "Searching a sorted or monotonic space one by one", fix: "Halve the space", patterns: ["Binary Search"] },
  { id: "pair", waste: "Comparing every pair", fix: "Sort, then two pointers", patterns: ["Two Pointers"] },
  { id: "stack", waste: "Re-scanning for the next bigger or smaller item", fix: "Keep a monotonic stack", patterns: ["Stack & Monotonic Stack"] },
  { id: "heap", waste: "Recomputing min, max or kth each time", fix: "Keep a heap", patterns: ["Heaps & Top K"] },
  { id: "back", waste: "Exploring branches that can't work", fix: "Prune early", patterns: ["Backtracking"] },
  { id: "graph", waste: "Visiting the same node or state again", fix: "Visited set, BFS or DFS", patterns: ["Graphs", "Trees"] },
  { id: "trie", waste: "Re-checking shared prefixes of words", fix: "Trie", patterns: ["Tries"] },
  { id: "greedy", waste: "Trying every order when a local choice is safe", fix: "Greedy choice", patterns: ["Greedy"] },
  { id: "interval", waste: "Checking intervals pair by pair", fix: "Sort by start", patterns: ["Intervals"] },
  { id: "list", waste: "Extra pass or extra space on a list", fix: "Fast and slow pointers", patterns: ["Linked Lists"] },
];
export const EDGE_CASES = [
  ["empty", "Empty"], ["one", "One element"], ["dupes", "Duplicates"], ["neg", "Negatives"],
  ["equal", "All equal"], ["overflow", "Overflow"], ["sorted", "Already sorted"], ["cycles", "Cycles"],
];
export const GATE_LIMIT_MS = 10 * 60 * 1000;
export const SELF_GRADES = [["matched", "Matched"], ["partly", "Partly"], ["missed", "Missed"]];

const rowById = (id) => WASTE_FIX.find((r) => r.id === id) || null;

/** Example 1's input and output from a LeetCode statement, or null when the page doesn't have both. */
export function parseExample(html) {
  if (!html) return null;
  const text = html.replace(/<sup>(.*?)<\/sup>/gi, "^$1").replace(/<br\s*\/?>/gi, "\n").replace(/<\/(p|pre|div|li|h\d)>/gi, "\n").replace(/<[^>]+>/g, "")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&");
  const ex = text.split(/Example\s*1\b/i)[1];
  if (!ex) return null;
  const input = (ex.match(/Input:\s*([\s\S]*?)Output:/i) || [])[1];
  const output = (ex.match(/Output:\s*([\s\S]*?)(?:Explanation:|Example\s*2\b|Constraints:|$)/i) || [])[1];
  if (!input || !output || !input.trim() || !output.trim()) return null;
  return { input: input.trim(), output: output.trim() };
}
const normOut = (s) => String(s || "").trim().replace(/\s+/g, "").toLowerCase();
export function outputsMatch(typed, expected) {
  return normOut(typed) !== "" && normOut(typed) === normOut(expected);
}

/**
 * Brute force against the budget and against the target the user picked.
 * Faster than the target is a contradiction: the brute force cannot be a tighter bound than the aim.
 */
export function judgeBrute(target, bruteComplexity, n) {
  const fit = fitsBudget(bruteComplexity, n);
  const both = COMPLEXITIES.includes(target) && COMPLEXITIES.includes(bruteComplexity);
  return {
    bruteFits: fit === "ok",
    contradiction: both && COMPLEXITIES.indexOf(bruteComplexity) < COMPLEXITIES.indexOf(target),
    fit,
  };
}

/**
 * The fix has to be the one paired with the waste, and the pattern has to be one of the problem's specific tags.
 * No specific tag means the chain cannot be checked.
 */
export function judgeChain(wasteId, fixId, tags) {
  const row = rowById(wasteId);
  const fixMatches = !!(row && fixId && row.id === fixId);
  const specific = patternsFromTags(tags);
  const indexes = row ? row.patterns.map((name) => PI(name)).filter((i) => i >= 0) : [];
  const patternRight = specific.length > 0 && indexes.some((i) => specific.includes(i));
  return { fixMatches, patternRight, unverifiable: specific.length === 0, patterns: indexes, chainCorrect: fixMatches && patternRight };
}

export function gateElapsed(think, now = Date.now()) {
  const start = think && think.gateStarted;
  return start ? Math.max(0, now - start) : 0;
}
export function gateStuck(think, now = Date.now()) {
  return !!(think && think.version === 2 && !think.skipped && gateElapsed(think, now) >= GATE_LIMIT_MS);
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
  const unverifiable = !!(facts && facts.unverifiable);
  const patternRight = !facts || unverifiable || think.pattern === null || think.pattern === undefined ? null : facts.accepted.includes(think.pattern);
  return { problems, patternRight, warning, unverifiable };
}

/** v2 records carry think.version 2. Anything else stays on the original rule and is not re-scored. */
export function isV2(think) { return !!(think && think.version === 2); }

function eligibilityV2(rec) {
  const reasons = [];
  const t = rec.think;
  if (!t || t.skipped) reasons.push("Think-first was skipped");
  else if (t.exampleResult === "misunderstood") reasons.push("The example output was wrong");
  else if (t.exampleResult === "unverified") reasons.push("The example was worked by hand, not checked");
  else if (t.exampleResult !== "correct") reasons.push("The example was not checked");
  else if (t.bruteFits) { /* brute force already fit: steps 4 and 5 are not a chain */ }
  else if (t.chainTries !== 1 || t.chainCorrect !== true) reasons.push("The waste and fix were not right on the first try");
  if (rec.sawSolution) reasons.push("You opened the solution before Accepted");
  if (rec.manual) reasons.push("Marked by hand, not after Accepted");
  else if (!rec.accepted) reasons.push("Not marked after an Accepted submission");
  if (!t || t.selfGrade !== "matched") reasons.push("The editorial self-grade was not matched");
  return { alone: reasons.length === 0, reasons };
}

/** "Solved alone" is earned, not clicked: every condition must hold. */
export function eligibility(rec) {
  if (isV2(rec && rec.think)) return eligibilityV2(rec);
  const reasons = [];
  if (!rec.think || rec.think.skipped) reasons.push("Think-first was skipped");
  else if (rec.think.unverifiable) reasons.push("This problem's pattern can't be checked, so it can't count as solved alone");
  // patternTries 0 is not a confirmed choice. An unconfirmed pattern never counts, even if the other fields look right.
  else if (rec.think.patternTries !== 1 || rec.think.patternCorrect !== true || rec.think.patternUnconfirmed) reasons.push("The pattern was not confirmed on the first try");
  if (rec.sawSolution) reasons.push("You opened the solution");
  if (rec.manual) reasons.push("Marked by hand, not after Accepted");
  else if (!rec.accepted) reasons.push("Not marked after an Accepted submission");
  if (!rec.explain || !wordsOk(rec.explain.insight)) reasons.push("The key insight was not written down");
  return { alone: reasons.length === 0, reasons };
}

/** Per-pattern rates from recorded tries. v1 tries are counted, not folded into the v2 rates. */
export function thinkStats(attempts, patternOf) {
  const by = {};
  for (const [slug, list] of Object.entries(attempts || {})) {
    const name = patternOf(slug);
    if (!name || !Array.isArray(list)) continue;
    const b = by[name] || (by[name] = { v1: 0, v2: 0, chainYes: 0, chainN: 0, understood: 0, understandN: 0, gateMs: 0, gateN: 0, matched: 0, gradeN: 0 });
    for (const rec of list) {
      const t = rec && rec.think;
      if (!t) continue;
      if (!isV2(t)) { b.v1++; continue; }
      b.v2++;
      if (t.exampleResult === "correct" || t.exampleResult === "misunderstood") {
        b.understandN++;
        if (t.exampleResult === "correct") b.understood++;
      }
      if (!t.skipped && !t.bruteFits && t.chainTries) {
        b.chainN++;
        if (t.chainCorrect && t.chainTries === 1) b.chainYes++;
      }
      if (t.gateMs > 0) { b.gateMs += t.gateMs; b.gateN++; }
      if (t.selfGrade) { b.gradeN++; if (t.selfGrade === "matched") b.matched++; }
    }
  }
  const rate = (n, d) => (d ? n / d : null);
  const out = {};
  for (const [name, b] of Object.entries(by)) {
    out[name] = {
      v1: b.v1, v2: b.v2,
      chain: rate(b.chainYes, b.chainN),
      understand: rate(b.understood, b.understandN),
      gateSec: b.gateN ? Math.round(b.gateMs / b.gateN / 1000) : null,
      matched: rate(b.matched, b.gradeN),
    };
  }
  return out;
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

