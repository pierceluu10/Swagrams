/** Period boundaries for leaderboard filters — UTC (see migration comment). */

export function startOfUtcDayIso(): string {
  const n = new Date();
  return new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate(), 0, 0, 0, 0)).toISOString();
}

/** ISO week: Monday 00:00:00.000 UTC */
export function startOfUtcIsoWeekIso(): string {
  const n = new Date();
  const d = new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate(), 0, 0, 0, 0));
  const day = d.getUTCDay();
  const toMonday = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + toMonday);
  return d.toISOString();
}
