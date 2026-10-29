// Date helpers. Dates are stored as "YYYY-MM-DD" strings in local time.
export const parse = (s) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
export const fmt = (d) => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
export const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
export const diffDays = (a, b) => Math.round((parse(fmt(a)) - parse(fmt(b))) / 864e5);
export const todayKey = () => fmt(new Date());
export const pretty = (d, opts = { weekday: "short", day: "numeric", month: "short" }) =>
  (typeof d === "string" ? parse(d) : d).toLocaleDateString("en-IN", opts);
