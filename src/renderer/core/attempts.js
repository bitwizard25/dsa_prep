// In-progress Think-first tries, one per problem, until that try is recorded.
// The map lives in memory for the session. solutionSeen is the part saved to disk:
// once the solution was opened, that try stays seen until the attempt is written down.

export function stashAttempt(memory, attempt) {
  if (!memory || !attempt?.slug || attempt.recorded) return memory;
  memory[attempt.slug] = attempt;
  return memory;
}

export function dropAttempt(memory, slug) {
  if (memory && slug) delete memory[slug];
}

export function clearAttempts(memory) {
  if (!memory) return;
  for (const slug of Object.keys(memory)) delete memory[slug];
}

/** First time the solution is opened for this try. Later calls keep the original time. */
export function markSolutionSeen(seen, slug, at) {
  if (!seen || !slug || seen[slug]) return false;
  seen[slug] = at;
  return true;
}

const blankThink = () => ({ complexity: "", brute: "", waste: "", pattern: null, patternTries: 0, patternCorrect: false, patternUnconfirmed: false, skipped: false, complexityWarning: "" });

/** Serializable copy of the current try: pattern evidence, solution flag, and explain-back. */
export function draftFrom(attempt, explain) {
  if (!attempt?.slug || attempt.recorded) return null;
  const think = { ...blankThink(), ...(attempt.think || {}) };
  const note = explain || attempt.explain || null;
  return {
    start: attempt.start, sawAt: attempt.sawAt || null, gate: !!attempt.gate, unlocked: !!attempt.unlocked, unlockedAt: attempt.unlockedAt || null,
    think, explain: note ? { why: note.why || "", insight: note.insight || "" } : null,
  };
}

/** Rebuild an in-progress try from disk. A problem that no longer needs the gate is not locked again. */
export function hydrateAttempt(slug, draft, gateNow, seenAt) {
  const think = { ...blankThink(), ...(draft?.think || {}) };
  const attempt = {
    slug, start: draft?.start || Date.now(), sawAt: draft?.sawAt || seenAt || null,
    gate: !!gateNow, unlocked: gateNow ? !!draft?.unlocked : true, unlockedAt: draft?.unlockedAt || (gateNow ? null : Date.now()),
    think, facts: null, nudge: "", explain: draft?.explain || null, recorded: false,
  };
  if (seenAt && !attempt.sawAt) attempt.sawAt = seenAt;
  return attempt;
}

/**
 * The attempt to show for `slug`.
 * Memory wins for this session. Otherwise the saved draft (pattern tries, solution flag,
 * explain-back) is restored. A bare solution time still marks a new try as seen.
 */
export function resolveAttempt(memory, seen, slug, fresh, disk, gateNow) {
  const seenAt = seen && slug ? seen[slug] || null : null;
  const saved = memory && slug ? memory[slug] : null;
  if (saved && !saved.recorded) {
    if (seenAt && !saved.sawAt) saved.sawAt = seenAt;
    if (disk?.sawAt && !saved.sawAt) saved.sawAt = disk.sawAt;
    return { attempt: saved, restored: true };
  }
  if (disk && slug) {
    const attempt = hydrateAttempt(slug, disk, gateNow, seenAt);
    if (memory) memory[slug] = attempt;
    return { attempt, restored: true };
  }
  const attempt = fresh();
  if (seenAt && !attempt.sawAt) attempt.sawAt = seenAt;
  if (memory && slug) memory[slug] = attempt;
  return { attempt, restored: false };
}
