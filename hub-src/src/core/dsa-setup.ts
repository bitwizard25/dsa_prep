// Turns the Hub goal into a setup note for the practice app. The practice app builds the plan itself, with its own engine.
import { type Goal, type Plan, dsaMinutesFor } from "./planner";

const PRACTICE_COMPANIES = new Set(["google", "amazon", "microsoft", "meta", "flipkart", "uber", "servicenow"]);

export interface DsaSetup { id: string; sources: string[]; patterns: string[]; perPattern: number; hoursPerDay: number; daysPerWeek: number; startDate: string; targetDate: string; problemsPerDay: number }

export function dsaSetupFor(goal: Goal, plan: Plan): DsaSetup | null {
  const dsa = plan.subjects.find((s) => s.id === "dsa");
  if (!dsa || !goal.problemsPerDay) return null;
  const sources = PRACTICE_COMPANIES.has(goal.company) ? [goal.company] : ["general"];
  const patterns = dsa.topics.map((t) => t.name);                         // same names as the practice app's patterns
  const learnDays = plan.interviewStart ? plan.days.findIndex((d) => d[0]?.date >= plan.interviewStart!) : plan.studyDays;
  const total = goal.problemsPerDay * Math.max(1, learnDays);
  const perPattern = Math.min(40, Math.max(10, Math.round(total / patterns.length / 5) * 5));
  const body = { sources, patterns, perPattern, hoursPerDay: dsaMinutesFor(goal.problemsPerDay) / 60, daysPerWeek: goal.daysPerWeek, startDate: goal.startDate, targetDate: goal.targetDate, problemsPerDay: goal.problemsPerDay };
  return { id: JSON.stringify(body), ...body };
}
