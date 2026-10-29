// Reads the DSA practice app's own data (state.json) to show DSA progress in the Hub. Read-only: never writes it.
import { PROBLEMS, PATTERNS } from "../../../src/renderer/data/dataset.js";
// The practice app's own scheduling code and problem table: the Hub never re-derives DSA days its own way.
import { schedule } from "../../../src/renderer/core/plan.js";
import { BY_SLUG } from "../../../src/renderer/core/problems.js";
import { isVerifiedAlone } from "../../../src/renderer/core/reasoning.js";

export interface DsaPattern { name: string; alone: number; help: number; planned: number; verified: number }
export interface DsaSummary {
  hasPlan: boolean; source: string; patterns: Record<string, DsaPattern>; soloToday: number; doneToday: number; streakDays: number; activeDays: string[];
  todayTotal: number; todayLeft: number; leftovers: number;         // from the practice app's schedule
  todayPatterns: string[]; todayTitles: string[]; nextSlug: string | null;
}

const patternOf = new Map<string, string>((PROBLEMS as any[]).map((p) => [p[0], (PATTERNS as string[])[p[3]]]));

export function summarizeDsa(raw: any, today: string): DsaSummary {
  const patterns: Record<string, DsaPattern> = {};
  for (const name of PATTERNS as string[]) patterns[name] = { name, alone: 0, help: 0, planned: 0, verified: 0 };
  const empty = { todayTotal: 0, todayLeft: 0, leftovers: 0, todayPatterns: [], todayTitles: [], nextSlug: null };
  if (!raw || raw.version !== 2) return { hasPlan: false, source: "", patterns, soloToday: 0, doneToday: 0, streakDays: 0, activeDays: [], ...empty };
  const status: Record<string, string> = raw.progress?.status || {};
  const when: Record<string, string> = raw.progress?.when || {};
  const prof = raw.profile || {};
  const planned = [...(prof.completed || []), ...(prof.queue || [])];
  for (const slug of planned) { const pt = patternOf.get(slug); if (pt) patterns[pt].planned++; }
  for (const [slug, st] of Object.entries(status)) {
    const pt = patternOf.get(slug);
    if (!pt) continue;
    if (st === "a") { patterns[pt].alone++; if (isVerifiedAlone(raw.progress, slug)) patterns[pt].verified++; }
    else if (st === "h") patterns[pt].help++;
  }
  const doneToday = Object.values(when).filter((d) => d === today).length;
  const soloToday = Object.entries(when).filter(([s, d]) => d === today && status[s] === "a").length;
  const names = (prof.sources || []).join(" + ");
  const activeDays = [...new Set([...Object.values(when), ...Object.entries(raw.log || {}).filter(([, l]: any) => (l.pomos || 0) > 0).map(([k]) => k)])];
  // Today's list and leftovers exactly as the practice app computes them.
  let day = empty as Pick<DsaSummary, keyof typeof empty>;
  if (prof.onboarded && (prof.queue || []).length) {
    const custom = new Map((prof.custom || []).map((p: any) => [p.slug, p]));
    const q = prof.queue.map((s: string) => BY_SLUG.get(s) || custom.get(s)).filter(Boolean);
    const days: any[] = schedule(q, prof);
    const done = (s: string) => !!status[s];
    const todays = (days.find((d) => d.date === today) || { items: [] }).items;
    const left = days.filter((d) => d.date < today).flatMap((d) => d.items).filter((p: any) => !done(p.slug));
    const todayLeft = todays.filter((p: any) => !done(p.slug));
    day = { todayTotal: todays.length, todayLeft: todayLeft.length, leftovers: left.length,
      todayPatterns: [...new Set<string>(todays.map((p: any) => p.pattern))], todayTitles: todays.map((p: any) => p.title),
      nextSlug: (left[0] || todayLeft[0] || null)?.slug || null };
  }
  return { hasPlan: !!prof.onboarded, source: names, patterns, soloToday, doneToday, streakDays: 0, activeDays, ...day };
}

/** Recorded Think-first solves count fully, other alone marks half, and help a quarter. */
export function dsaMastery(p: DsaPattern | undefined, perPattern = 30): number | null {
  if (!p || p.alone + p.help === 0) return null;
  return Math.min(1, (p.verified + 0.5 * (p.alone - p.verified) + 0.25 * p.help) / Math.max(p.planned || perPattern, 10));
}
