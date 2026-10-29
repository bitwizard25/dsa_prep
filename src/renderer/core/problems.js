// Problem data and the per-company selection engine.
import { PATTERNS as PNAMES, PROBLEMS, COMPANIES, DATA_DATE } from "../data/dataset.js";

export const PATTERNS = PNAMES;
export const DIFF = { E: "Easy", M: "Medium", H: "Hard" };
export { DATA_DATE };

export const ALL = PROBLEMS.map(([slug, title, d, pi, id, premium, rating, pop], i) => ({
  i, slug, title, d, pi, pattern: PNAMES[pi], n: id ? String(id) : "?", premium: !!premium, rating, pop,
}));
export const BY_SLUG = new Map(ALL.map((p) => [p.slug, p]));
export const BY_NUM = new Map(ALL.filter((p) => p.n !== "?").map((p) => [p.n, p]));

const CO = new Map(COMPANIES.map((c) => [c.id, c]));
const companyMaps = new Map();
function companyMap(id) {
  if (!companyMaps.has(id)) {
    const m = new Map();
    for (const [i, f, r] of (CO.get(id) || { items: [] }).items) m.set(i, { f, r });
    companyMaps.set(id, m);
  }
  return companyMaps.get(id);
}

export const SOURCES = [
  { id: "general", name: "All companies", kind: "general", count: ALL.length, recent: 0 },
  ...COMPANIES.map((c) => ({ id: c.id, name: c.name, kind: "company", count: c.items.length, recent: c.items.filter((x) => x[2] === 2).length })),
];
/** A plan source is a list of ids: one or more companies, or ["general"], or ["custom"]. */
export const toIds = (src) => (Array.isArray(src) ? src : [src]).filter(Boolean);
export const isCompanyPlan = (src) => toIds(src).some((id) => CO.has(id));
export const sourceName = (src) => {
  const ids = toIds(src);
  if (!ids.length) return "Plan";
  if (ids[0] === "custom") return "My list";
  return ids.map((id) => (SOURCES.find((s) => s.id === id) || { name: id }).name).join(" + ");
};

/** Which of the plan's companies ask this problem: [{ id, name, f: frequency 0-100, r: 2 recent / 1 six months / 0 older }] */
export function companyTags(src, slug) {
  const p = BY_SLUG.get(slug);
  if (!p) return [];
  return toIds(src).filter((id) => CO.has(id)).map((id) => {
    const t = companyMap(id).get(p.i);
    return t ? { id, name: CO.get(id).name, ...t } : null;
  }).filter(Boolean);
}

/** Difficulty mix inside every pattern. */
export const MIX = { E: 0.25, M: 0.55, H: 0.2 };
const RANK = { E: 0, M: 1, H: 2 };

/**
 * Pick `perPattern` problems for every pattern:
 *  1. the company's own problems first, highest frequency first, a bonus for recently asked ones;
 *  2. gaps filled with the problems most asked across all companies ("core");
 *  3. each pattern keeps an Easy / Medium / Hard mix; output is ordered Easy -> Hard for a learning curve.
 */
export function buildSet(src, { perPattern = 30, premium = false, custom = [] } = {}) {
  const ids = toIds(src);
  if (ids[0] === "custom") {
    return custom.map((x) => BY_SLUG.get(x.slug) || x).filter((p) => premium || !p.premium)
      .sort((a, b) => a.pi - b.pi || RANK[a.d] - RANK[b.d]);
  }
  // Several companies: average each company's frequency (0 if it doesn't ask it), plus a recency bonus.
  // A problem frequent at all of them wins; one frequent at only one company still ranks, at half weight for two.
  const maps = ids.filter((id) => CO.has(id)).map(companyMap);
  const score = (p) => {
    let any = false, sum = 0;
    for (const m of maps) { const c = m.get(p.i); if (c) { any = true; sum += c.f + (c.r === 2 ? 40 : c.r === 1 ? 15 : 0); } }
    return any ? 1000 + sum / maps.length : p.pop;
  };
  const out = [];
  PNAMES.forEach((_, pi) => {
    const ranked = ALL.filter((p) => p.pi === pi && (premium || !p.premium)).sort((a, b) => score(b) - score(a));
    const want = { E: Math.round(perPattern * MIX.E), H: Math.round(perPattern * MIX.H) };
    want.M = perPattern - want.E - want.H;
    const picked = new Set();
    for (const d of ["E", "M", "H"]) {
      let n = 0;
      for (const p of ranked) { if (n >= want[d]) break; if (p.d === d) { picked.add(p); n++; } }
    }
    for (const p of ranked) { if (picked.size >= perPattern) break; picked.add(p); }   // pattern short on one difficulty
    [...picked].sort((a, b) => RANK[a.d] - RANK[b.d] || score(b) - score(a)).forEach((p) => out.push(p));
  });
  return out;
}

/**
 * For each chosen company: what share of its own most-asked problems (its top `perPattern` per pattern)
 * made it into the plan, and how many problems it has on record at all (few = thin data).
 */
export function coverage(src, set, { perPattern = 30, premium = false } = {}) {
  const inSet = new Set(set.map((p) => p.slug));
  return toIds(src).filter((id) => CO.has(id)).map((id) => {
    const c = CO.get(id);
    let top = 0, hit = 0;
    PNAMES.forEach((_, pi) => {
      c.items.filter(([i]) => ALL[i].pi === pi && (premium || !ALL[i].premium)).sort((a, b) => b[1] - a[1]).slice(0, perPattern)
        .forEach(([i]) => { top++; if (inSet.has(ALL[i].slug)) hit++; });
    });
    return { id, name: c.name, pct: top ? Math.round((100 * hit) / top) : 0, reported: c.items.length };
  });
}

/** Per-pattern counts: totals, difficulty mix, how many are company-tagged and how many are asked by all chosen companies. */
export function patternCounts(problems, src) {
  const m = new Map(), nCo = toIds(src).filter((id) => CO.has(id)).length;
  for (const p of problems) {
    const c = m.get(p.pattern) || { name: p.pattern, pi: p.pi, total: 0, E: 0, M: 0, H: 0, company: 0, all: 0 };
    c.total++; c[p.d]++;
    const t = nCo ? companyTags(src, p.slug).length : 0;
    if (t) c.company++;
    if (nCo > 1 && t === nCo) c.all++;
    m.set(p.pattern, c);
  }
  return [...m.values()].sort((a, b) => a.pi - b.pi);
}

const titleOf = (slug) => slug.split("-").map((w) => w[0].toUpperCase() + w.slice(1)).join(" ");

/** Paste: LeetCode URLs, slugs or problem numbers. Unknown slugs are kept under "Imported". */
export function parseImport(text) {
  const out = [], seen = new Set();
  for (const t of (text || "").split(/[\s,;]+/).map((x) => x.trim()).filter(Boolean)) {
    let p = null;
    const m = t.match(/leetcode\.com\/problems\/([a-z0-9-]+)/i);
    const slug = m ? m[1].toLowerCase() : /^[a-z0-9]+(-[a-z0-9]+)+$/i.test(t) ? t.toLowerCase() : null;
    if (slug) p = BY_SLUG.get(slug) || { n: "?", slug, d: "M", pi: 99, pattern: "Imported", title: titleOf(slug), premium: false };
    else if (/^\d+$/.test(t)) p = BY_NUM.get(t) || null;
    if (p && !seen.has(p.slug)) { seen.add(p.slug); out.push(p); }
  }
  return out;
}
