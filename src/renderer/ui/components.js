// Small reusable UI pieces (return HTML strings).
import { DIFF, companyTags, isCompanyPlan, toIds } from "../core/problems.js";
import { store } from "../core/state.js";
import { status } from "../core/practice.js";
import { isVerifiedAlone } from "../core/reasoning.js";

export const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

export function bar(a, h, total, verified = 0) {
  const v = Math.max(0, Math.min(a, verified || 0));
  const pv = total ? (v / total) * 100 : 0, pa = total ? ((a - v) / total) * 100 : 0, ph = total ? (h / total) * 100 : 0;
  return `<div class="bar" role="img" aria-label="${v} verified alone, ${a - v} marked alone, ${h} with help, of ${total}"><i class="v" style="width:${pv}%"></i><i class="a" style="width:${pa}%"></i><i class="h" style="width:${ph}%"></i></div>`;
}

/** Difficulty is a small dot and a letter, in LeetCode's green, amber and red. */
export function diffMark(d, extra = "") {
  const letter = d === "E" || d === "M" || d === "H" ? d : "?";
  return `<span class="diff" title="${esc(DIFF[d] || "")}"><i class="d-${esc(d)}"></i><span class="t-${esc(d)}">${extra}${letter}</span></span>`;
}

// Only mark exceptions: a badge on every row says nothing.
//   red dot  = asked in the last 3 months by any chosen company
//   names    = asked by only some of the chosen companies (when you picked several)
//   Core     = asked by none of them (fills the pattern)
function tagHtml(p) {
  const src = store.S.profile.sources;
  if (!isCompanyPlan(src)) return p.premium ? `<span class="tag lock" title="Needs LeetCode Premium">Premium</span>` : "";
  const nCo = toIds(src).length, tags = companyTags(src, p.slug);
  let h = "";
  if (tags.some((t) => t.r === 2)) h += `<span class="hotdot" title="Asked in the last 3 months by ${esc(tags.filter((t) => t.r === 2).map((t) => t.name).join(", "))}"></span>`;
  if (!tags.length) h += `<span class="tag core" title="Not on your companies' lists: a widely asked problem that fills this pattern">Core</span>`;
  else if (nCo > 1 && tags.length < nCo) h += tags.map((t) => `<span class="tag co">${esc(t.name)}</span>`).join("");
  if (p.premium) h += `<span class="tag lock" title="Needs LeetCode Premium">Premium</span>`;
  return h;
}

export function problemRow(p, curSlug) {
  const st = status(p.slug);
  const verified = st === "a" && isVerifiedAlone(store.S.progress, p.slug);
  return `<li class="item ${st ? "st-" + st : ""} ${verified ? "verified" : ""} ${p.slug === curSlug ? "cur" : ""}">
    ${diffMark(p.d)}
    <div class="body">
      <button class="link" data-act="open" data-slug="${p.slug}">${esc(p.title)}</button>
      <span class="meta">${st ? `<span class="chk" aria-hidden="true">✓</span>` : ""}${p.n !== "?" ? "#" + p.n : ""}${tagHtml(p)}</span>
    </div>
    <div class="seg" role="group" aria-label="Mark ${esc(p.title)}">
      <button class="a ${st === "a" ? "on" : ""}" data-act="mark" data-slug="${p.slug}" data-st="a" aria-pressed="${st === "a"}" title="Solved on my own">Alone</button>
      <button class="h ${st === "h" ? "on" : ""}" data-act="mark" data-slug="${p.slug}" data-st="h" aria-pressed="${st === "h"}" title="Looked at the solution">Help</button>
    </div></li>`;
}

export const problemList = (arr, curSlug, empty = "Nothing here.") =>
  arr.length ? `<ul class="list">${arr.map((p) => problemRow(p, curSlug)).join("")}</ul>` : `<p class="empty">${empty}</p>`;

export function diffPills(c) {
  return `<span class="pills">${diffMark("E", c.E + " ")}${diffMark("M", c.M + " ")}${diffMark("H", c.H + " ")}</span>`;
}

export const monogram = (name) => esc(name.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase());
