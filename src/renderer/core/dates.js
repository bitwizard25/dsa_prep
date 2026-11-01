// Date helpers. Stored days are "YYYY-MM-DD" in the computer's local time zone.
// Calendar arithmetic (parse / addDays / fmt) stays on those day strings.
export const parse = (s) => { const [y, m, d] = String(s || "").split("-").map(Number); return new Date(y, m - 1, d); };
export const fmt = (d) => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
export const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
export const diffDays = (a, b) => Math.round((parse(fmt(a)) - parse(fmt(b))) / 864e5);
export const todayKey = (now = new Date()) => fmt(now instanceof Date ? now : new Date(now));
/** An ISO instant (or a plain day string) as the local calendar day. */
export function instantKey(value) {
  if (!value) return "";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? "" : fmt(d);
}
export function isValidDay(s) {
  return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(parse(s).getTime()) && fmt(parse(s)) === s;
}
/** UTC milliseconds of the next local midnight after `now`. */
export function nextLocalMidnight(now = Date.now()) {
  const d = new Date(now);
  d.setHours(24, 0, 0, 0);
  return d.getTime();
}
export const pretty = (d, opts = { weekday: "short", day: "numeric", month: "short" }) =>
  (typeof d === "string" ? parse(d) : d).toLocaleDateString("en-IN", opts);
