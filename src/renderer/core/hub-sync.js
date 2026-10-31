// Practice and the Hub share problems per day, study days, and company.
// Only a real value the user set is copied. Missing or invalid numbers never replace the Hub goal.

const COMPANIES = ["google", "amazon", "microsoft", "meta", "flipkart", "uber", "servicenow"];

function wholeNumber(n) {
  return Number.isSafeInteger(n) && n > 0 ? n : null;
}

/**
 * Copy the practice plan onto the Hub goal and the setup note.
 * Role, dates, hours, and anything the practice screen did not set stay as they are.
 */
export function syncPracticePlan(hub, profile) {
  if (!hub || !hub.goal || !profile) return { hub, profile, changed: false };
  const goal = { ...hub.goal };
  const ppd = wholeNumber(profile.problemsPerDay);
  if (ppd) goal.problemsPerDay = ppd;
  const days = Number(profile.daysPerWeek);
  if (days === 5 || days === 6 || days === 7) goal.daysPerWeek = days;
  const sources = Array.isArray(profile.sources) ? profile.sources : [];
  if (sources.length === 1 && COMPANIES.includes(sources[0])) goal.company = sources[0];

  const nextProfile = { ...profile };
  if (!ppd && wholeNumber(hub.goal.problemsPerDay)) nextProfile.problemsPerDay = hub.goal.problemsPerDay;
  const id = "practice:" + [sources.join(","), nextProfile.problemsPerDay || 0, goal.daysPerWeek, (profile.queue || []).length].join("|");
  const nextHub = {
    ...hub,
    goal,
    dsaSetup: {
      ...(hub.dsaSetup || {}),
      id,
      problemsPerDay: goal.problemsPerDay,
      sources,
      hoursPerDay: profile.hoursPerDay,
      daysPerWeek: goal.daysPerWeek,
      patterns: profile.patterns,
      perPattern: profile.perPattern,
      startDate: profile.startDate,
      targetDate: profile.targetDate,
    },
  };
  nextProfile.hubSetupId = id;
  return { hub: nextHub, profile: nextProfile, changed: true };
}
