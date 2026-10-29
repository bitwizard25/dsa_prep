// What the practice app may copy onto the Hub. The Hub goal itself is the user's; this does not change it.

function wholeNumber(n) {
  return Number.isSafeInteger(n) && n > 0 ? n : null;
}

/**
 * Record the practice plan on the Hub without overwriting the goal the user set there.
 * problemsPerDay stays the saved count. It is not derived from hours.
 */
export function syncPracticePlan(hub, profile) {
  if (!hub || !hub.goal || !profile) return { hub, profile, changed: false };
  const ppd = wholeNumber(profile.problemsPerDay) || wholeNumber(hub.goal.problemsPerDay);
  const nextProfile = { ...profile };
  if (ppd) nextProfile.problemsPerDay = ppd;
  const id = "practice:" + [(profile.sources || []).join(","), profile.hoursPerDay, profile.daysPerWeek, (profile.queue || []).length, nextProfile.problemsPerDay || 0].join("|");
  const nextHub = {
    ...hub,
    goal: hub.goal,
    dsaSetup: { ...(hub.dsaSetup || {}), id, problemsPerDay: ppd || (hub.dsaSetup || {}).problemsPerDay, sources: profile.sources, hoursPerDay: profile.hoursPerDay, daysPerWeek: profile.daysPerWeek },
  };
  nextProfile.hubSetupId = id;
  return { hub: nextHub, profile: nextProfile, changed: true };
}
