// Deterministic client/server-safe scoring. No LLM cost.
// Returns 0–100 across four axes.
export type JobScore = {
  compatibility: number; // overall fit vs profile
  bestFit: number; // role/title alignment
  alertMatch: number; // matches saved preferences (mode, type, location)
  preference: number; // salary/location wishlist
  overall: number;
  reasons: string[];
};

const norm = (s?: string | null) => (s ?? "").toLowerCase();
const words = (s?: string | null) =>
  norm(s)
    .split(/[^a-z0-9+.#]+/)
    .filter(Boolean);

export function scoreJob(job: any, profile: any | null): JobScore {
  const reasons: string[] = [];
  const jTitle = words(job?.title);
  const jDesc = words(job?.description);
  const jTokens = new Set([...jTitle, ...jDesc]);

  // best-fit: overlap of target role tokens with title
  const targetRoleTokens = words(profile?.target_role);
  const bestFitHits = targetRoleTokens.filter((t) => jTitle.includes(t)).length;
  const bestFit = targetRoleTokens.length
    ? Math.min(100, Math.round((bestFitHits / targetRoleTokens.length) * 100))
    : 40;
  if (bestFitHits > 0) reasons.push(`Title mentions "${profile?.target_role}"`);

  // compatibility: skill overlap
  const skills: string[] = Array.isArray(profile?.skills) ? profile.skills : [];
  const skillHits = skills.filter((s) => jTokens.has(norm(s))).length;
  const compatibility = skills.length
    ? Math.min(100, Math.round(30 + (skillHits / skills.length) * 70))
    : 45;
  if (skillHits > 0) reasons.push(`${skillHits} of your skills match`);

  // alert match: work_mode + employment_type preferences
  let alertHits = 0;
  let alertTotal = 0;
  const prefModes: string[] = Array.isArray(profile?.work_modes) ? profile.work_modes : [];
  const prefTypes: string[] = Array.isArray(profile?.employment_types)
    ? profile.employment_types
    : [];
  if (prefModes.length) {
    alertTotal += 1;
    if (job?.work_mode && prefModes.includes(job.work_mode)) {
      alertHits += 1;
      reasons.push(`${job.work_mode} matches your preference`);
    }
  }
  if (prefTypes.length) {
    alertTotal += 1;
    if (job?.employment_type && prefTypes.includes(job.employment_type)) {
      alertHits += 1;
      reasons.push(`${job.employment_type} matches your preference`);
    }
  }
  const alertMatch = alertTotal ? Math.round((alertHits / alertTotal) * 100) : 50;

  // preference: salary + location
  let prefScore = 50;
  const salMin = profile?.salary_min ?? null;
  if (salMin && job?.salary_max && job.salary_max >= salMin) {
    prefScore += 25;
    reasons.push("Salary meets your minimum");
  }
  const locs: string[] = Array.isArray(profile?.target_locations) ? profile.target_locations : [];
  if (locs.length && job?.location && locs.some((l) => norm(job.location).includes(norm(l)))) {
    prefScore += 25;
    reasons.push(`Located in ${job.location}`);
  }
  const preference = Math.min(100, prefScore);

  const overall = Math.round(
    compatibility * 0.4 + bestFit * 0.3 + alertMatch * 0.15 + preference * 0.15,
  );
  return { compatibility, bestFit, alertMatch, preference, overall, reasons };
}
