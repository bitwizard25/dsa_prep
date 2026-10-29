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

/**
 * The attempt to show for `slug`.
 * A saved try comes back with its answers and solution flag. If the session map
 * was lost, a saved solution time is copied onto the new try so it cannot look unseen.
 */
export function resolveAttempt(memory, seen, slug, fresh) {
  const seenAt = seen && slug ? seen[slug] || null : null;
  const saved = memory && slug ? memory[slug] : null;
  if (saved && !saved.recorded) {
    if (seenAt && !saved.sawAt) saved.sawAt = seenAt;
    return { attempt: saved, restored: true };
  }
  const attempt = fresh();
  if (seenAt && !attempt.sawAt) attempt.sawAt = seenAt;
  if (memory && slug) memory[slug] = attempt;
  return { attempt, restored: false };
}
