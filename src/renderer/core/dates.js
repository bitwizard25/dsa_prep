// Date helpers. Stored days are "YYYY-MM-DD". "Today" is the calendar day in Asia/Kolkata,
// not the computer's timezone. Calendar arithmetic (parse / addDays / fmt) stays on those day strings.
const IST = "Asia/Kolkata";

export const parse = (s) => { const [y, m, d] = String(s || "").split("-").map(Number); return new Date(y, m - 1, d); };
export const fmt = (d) => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
export const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
export const diffDays = (a, b) => Math.round((parse(fmt(a)) - parse(fmt(b))) / 864e5);

export function istParts(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: IST, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(now);
  const num = (type) => Number(parts.find((p) => p.type === type)?.value || "0");
  let hour = num("hour");
  if (hour === 24) hour = 0;
  return { year: num("year"), month: num("month"), day: num("day"), hour, minute: num("minute") };
}
export const todayKey = (now = new Date()) => { const p = istParts(now); return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`; };
/** An ISO instant (or a plain day string) as the Kolkata calendar day. */
export function instantKey(value) {
  if (!value) return "";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? "" : todayKey(d);
}
export function isValidDay(s) {
  return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(parse(s).getTime()) && fmt(parse(s)) === s;
}
export const pretty = (d, opts = { weekday: "short", day: "numeric", month: "short" }) =>
  (typeof d === "string" ? parse(d) : d).toLocaleDateString("en-IN", opts);
