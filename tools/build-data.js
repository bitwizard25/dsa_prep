// Builds src/renderer/data/dataset.js from public GitHub data.
//   node tools/build-data.js <companyDir> <doocs README_EN.md> <zerotrac data.json>
// Sources:
//   companyDir: github.com/liquidslr/leetcode-company-wise-problems (one folder per company, CSVs with
//               Difficulty, Title, Frequency, Acceptance Rate, Link, Topics)
//   doocs:      github.com/doocs/leetcode solution/README_EN.md (problem numbers + Premium lock marks)
//   zerotrac:   github.com/zerotrac/leetcode_problem_rating data.json (contest difficulty ratings)
const fs = require("fs");
const path = require("path");

const [companyDir, doocsFile, ratingFile] = process.argv.slice(2);
if (!companyDir) { console.error("usage: node tools/build-data.js <companyDir> <doocs.md> <ratings.json>"); process.exit(1); }

// Learning order. Index = pattern id stored in the dataset.
const PATTERNS = ["Arrays & Hashing", "Two Pointers", "Sliding Window", "Stack & Monotonic Stack", "Binary Search",
  "Linked Lists", "Trees", "Heaps & Top K", "Backtracking", "Tries", "Graphs", "Intervals", "Greedy", "Dynamic Programming"];
const P = Object.fromEntries(PATTERNS.map((n, i) => [n, i]));

// Companies offered in the app (folder name -> display name).
const COMPANIES = [
  "Amazon", "Google", "Microsoft", "Meta", "Apple", "Uber", "Bloomberg", "LinkedIn", "Adobe", "Salesforce", "Oracle",
  "Goldman Sachs", "Walmart Labs", "Flipkart", "PhonePe", "Intuit", "Visa", "Atlassian", "Nvidia", "DE Shaw",
  "ServiceNow", "Nutanix", "Zoho", "Expedia", "Morgan Stanley", "Cisco", "Samsung", "Qualcomm", "Infosys",
  "Accenture", "Swiggy", "Meesho", "Zomato", "Paytm", "Media.net",
];

// ---------- CSV ----------
function parseCsv(text) {
  const rows = []; let row = [], cell = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c; }
    else if (c === '"') q = true;
    else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") { if (c === "\r" && text[i + 1] === "\n") i++; row.push(cell); rows.push(row); row = []; cell = ""; }
    else cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  const [head, ...body] = rows.filter((r) => r.length > 1);
  return body.map((r) => Object.fromEntries(head.map((h, i) => [h.trim(), (r[i] || "").trim()])));
}
const readCsv = (f) => (fs.existsSync(f) ? parseCsv(fs.readFileSync(f, "utf8")) : []);
const slugOf = (link) => link.replace(/\/+$/, "").split("/").pop().toLowerCase();
const norm = (t) => t.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

// ---------- pattern classifier (most specific signal wins) ----------
const EXCLUDE = ["Database", "Shell", "Concurrency"];
const INTERVAL_WORDS = /interval|meeting-rooms|my-calendar|overlap|arrows-to-burst|employee-free-time|range-module|count-days-without-meetings/;
function classify(slug, topics) {
  const has = (...t) => t.some((x) => topics.includes(x));
  if (has(...EXCLUDE)) return -1;
  if (has("Trie") && !has("Dynamic Programming")) return P["Tries"];
  if (INTERVAL_WORDS.test(slug) || has("Line Sweep")) return P["Intervals"];
  if (has("Backtracking")) return P["Backtracking"];
  if (has("Linked List", "Doubly-Linked List")) return P["Linked Lists"];
  // Union-Find alone (e.g. Longest Consecutive Sequence) is usually a hashing problem; it is a graph problem only with graph signals.
  if (has("Union-Find") && has("Graph Theory", "Depth-First Search", "Breadth-First Search", "Matrix")) return P["Graphs"];
  if (has("Graph Theory", "Topological Sort", "Shortest Path", "Minimum Spanning Tree", "Dijkstra's Algorithm",
    "Eulerian Circuit", "Strongly Connected Component", "Biconnected Component")) return P["Graphs"];
  if (has("Tree", "Binary Tree", "Binary Search Tree")) return P["Trees"];
  if (has("Sliding Window")) return P["Sliding Window"];
  if (has("Monotonic Stack", "Monotonic Queue", "Stack")) return P["Stack & Monotonic Stack"];
  if (has("Heap (Priority Queue)")) return P["Heaps & Top K"];
  if (has("Dynamic Programming", "Memoization")) return P["Dynamic Programming"];
  if (has("Binary Search")) return P["Binary Search"];
  if (has("Breadth-First Search", "Depth-First Search")) return P["Graphs"];
  if (has("Two Pointers")) return P["Two Pointers"];
  if (has("Greedy")) return P["Greedy"];
  if (has("Hash Table", "Prefix Sum", "Array", "String", "Matrix", "Counting", "Sorting")) return P["Arrays & Hashing"];
  return -1;   // pure math / bit tricks etc.: not part of the pattern plan
}

// ---------- doocs: numbers + premium ----------
const meta = new Map();   // normalised title -> { id, premium }
for (const line of fs.readFileSync(doocsFile, "utf8").split("\n")) {
  const m = line.match(/^\|\s*(\d+)\s*\|\s*\[([^\]]+)\]/);
  if (!m) continue;
  meta.set(norm(m[2]), { id: +m[1], premium: line.includes("🔒") });
}
// ---------- zerotrac: ratings ----------
const rating = new Map();
for (const r of JSON.parse(fs.readFileSync(ratingFile, "utf8"))) rating.set(r.TitleSlug, Math.round(r.Rating));

// ---------- pool: every problem any company asks ----------
const pool = new Map();   // slug -> problem
for (const dir of fs.readdirSync(companyDir)) {
  for (const r of readCsv(path.join(companyDir, dir, "5. All.csv"))) {
    const slug = slugOf(r.Link);
    let p = pool.get(slug);
    if (!p) {
      const topics = r.Topics.split(",").map((t) => t.trim()).filter(Boolean);
      const m = meta.get(norm(r.Title)) || {};
      p = { slug, title: r.Title, d: (r.Difficulty[0] || "M").toUpperCase(), pi: classify(slug, topics),
        id: m.id || 0, premium: m.premium ? 1 : 0, rating: rating.get(slug) || 0, score: 0, companies: 0 };
      pool.set(slug, p);
    }
    p.score += (+r.Frequency || 0) / 100;
    p.companies++;
  }
}
const problems = [...pool.values()].filter((p) => p.pi >= 0).sort((a, b) => b.score - a.score);
const index = new Map(problems.map((p, i) => [p.slug, i]));

// ---------- companies ----------
const companies = [];
for (const name of COMPANIES) {
  const dir = path.join(companyDir, name);
  if (!fs.existsSync(dir)) { console.warn("missing company:", name); continue; }
  const recent = new Map();
  for (const r of readCsv(path.join(dir, "3. Six Months.csv"))) recent.set(slugOf(r.Link), 1);
  for (const f of ["1. Thirty Days.csv", "2. Three Months.csv"]) for (const r of readCsv(path.join(dir, f))) recent.set(slugOf(r.Link), 2);
  const items = [];
  for (const r of readCsv(path.join(dir, "5. All.csv"))) {
    const i = index.get(slugOf(r.Link));
    if (i === undefined) continue;
    items.push([i, Math.round(+r.Frequency || 0), recent.get(slugOf(r.Link)) || 0]);
  }
  companies.push({ id: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"), name, items });
}

// ---------- write ----------
const out = `// GENERATED by tools/build-data.js. Do not edit by hand.
// Company tags: liquidslr/leetcode-company-wise-problems (LeetCode company tags, June 2025).
// Numbers + Premium marks: doocs/leetcode. Contest ratings: zerotrac/leetcode_problem_rating.
export const PATTERNS = ${JSON.stringify(PATTERNS)};
// [slug, title, difficulty E/M/H, pattern index, problem number (0 = unknown), premium 0/1, contest rating (0 = none), popularity across all companies]
export const PROBLEMS = ${JSON.stringify(problems.map((p) => [p.slug, p.title, p.d, p.pi, p.id, p.premium, p.rating, Math.round(p.score * 10) / 10]))};
// items: [problem index, frequency 0-100, recency: 2 = last 3 months, 1 = last 6 months, 0 = older]
export const COMPANIES = ${JSON.stringify(companies)};
export const DATA_DATE = "June 2025";
`;
fs.writeFileSync(path.join(__dirname, "..", "src", "renderer", "data", "dataset.js"), out);

// report
console.log("problems:", problems.length, "premium:", problems.filter((p) => p.premium).length, "unknown id:", problems.filter((p) => !p.id).length);
const per = PATTERNS.map((n, i) => `${n}: ${problems.filter((p) => p.pi === i && !p.premium).length}`);
console.log("free problems per pattern:", per.join(" | "));
console.log("companies:", companies.map((c) => `${c.name} ${c.items.length}`).join(", "));
console.log("size KB:", Math.round(out.length / 1024));
