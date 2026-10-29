// Small reusable UI pieces (return HTML strings).
import { DIFF, companyTags, isCompanyPlan, toIds } from "../core/problems.js";
import { store } from "../core/state.js";
import { status } from "../core/practice.js";

export const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

export function bar(a, h, total) {
  const pa = total ? (a / total) * 100 : 0, ph = total ? (h / total) * 100 : 0;
  return `<div class="bar" role="img" aria-label="${a} alone, ${h} with help, of ${total}"><i class="a" style="width:${pa}%"></i><i class="h" style="width:${ph}%"></i></div>`;
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
  return `<li class="item ${st ? "st-" + st : ""} ${p.slug === curSlug ? "cur" : ""}">
    <span class="dot d-${p.d}" title="${DIFF[p.d] || ""}"></span>
    <div class="body">
      <button class="link" data-act="open" data-slug="${p.slug}">${esc(p.title)}</button>
      <span class="meta">${p.n !== "?" ? "#" + p.n + ", " : ""}<span class="t-${p.d}">${DIFF[p.d] || "Unknown"}</span>${tagHtml(p)}</span>
    </div>
    <div class="seg" role="group" aria-label="Mark ${esc(p.title)}">
      <button class="a ${st === "a" ? "on" : ""}" data-act="mark" data-slug="${p.slug}" data-st="a" aria-pressed="${st === "a"}" title="Solved on my own">Alone</button>
      <button class="h ${st === "h" ? "on" : ""}" data-act="mark" data-slug="${p.slug}" data-st="h" aria-pressed="${st === "h"}" title="Looked at the solution">Help</button>
    </div></li>`;
}

export const problemList = (arr, curSlug, empty = "Nothing here.") =>
  arr.length ? `<ul class="list">${arr.map((p) => problemRow(p, curSlug)).join("")}</ul>` : `<p class="empty">${empty}</p>`;

export function diffPills(c) {
  return `<span class="pills"><span class="pill e">${c.E} E</span><span class="pill m">${c.M} M</span><span class="pill h">${c.H} H</span></span>`;
}

export const monogram = (name) => esc(name.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase());
