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

/** Milliseconds until the next daily reset (midnight UTC). */
export function msUntilDailyReset(): number {
  const now = new Date();
  const nextMidnight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0, 0));
  return nextMidnight.getTime() - now.getTime();
}

/** Milliseconds until the next weekly reset (next Monday 00:00 UTC). */
export function msUntilWeeklyReset(): number {
  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
  const day = today.getUTCDay();
  const toNextMonday = day === 0 ? 1 : 8 - day;
  const nextMonday = new Date(today);
  nextMonday.setUTCDate(today.getUTCDate() + toNextMonday);
  return nextMonday.getTime() - now.getTime();
}

/** Formats a duration in ms as a compact string: "Xd Yh", "Xh Ym", or "Xm". */
export function formatResetsIn(ms: number): string {
  const totalMinutes = Math.max(0, Math.floor(ms / 60_000));
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
  if (hours > 0) return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  return `${minutes}m`;
}
