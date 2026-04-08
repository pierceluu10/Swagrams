"use client";

import { useCallback, useEffect, useState } from "react";
import type { LeaderboardEntryRow, LeaderboardPeriod } from "@/lib/leaderboard/types";

const TABS: { id: LeaderboardPeriod; label: string }[] = [
  { id: "daily", label: "Daily" },
  { id: "weekly", label: "Weekly" },
  { id: "alltime", label: "All-time" }
];

type ListState = "loading" | "ok_empty" | "ok_data" | "failed";

/** Outer shell shared by SSR + first client paint (avoids hydration mismatch vs cached HTML). */
function LeaderboardStickyShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="sticky-note flex min-h-[240px] w-full max-w-sm -rotate-1 flex-col p-6 lg:max-w-none">
      <div
        className="sticky-note__texture pointer-events-none absolute inset-0 rounded-lg"
        aria-hidden="true"
      />
      <div className="sticky-note__pin" aria-hidden="true" />

      <div className="relative z-10 flex w-full flex-col gap-4 pt-2">{children}</div>
    </div>
  );
}

export function HomeLeaderboard() {
  const [clientReady, setClientReady] = useState(false);
  const [period, setPeriod] = useState<LeaderboardPeriod>("daily");
  const [entries, setEntries] = useState<LeaderboardEntryRow[]>([]);
  const [listState, setListState] = useState<ListState>("loading");

  useEffect(() => {
    setClientReady(true);
  }, []);

  const load = useCallback(async (p: LeaderboardPeriod) => {
    setListState("loading");
    try {
      const res = await fetch(`/api/leaderboard?period=${p}`);
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setEntries([]);
        setListState("failed");
        return;
      }
      const rows = (json.entries ?? []) as LeaderboardEntryRow[];
      setEntries(rows);
      setListState(rows.length ? "ok_data" : "ok_empty");
    } catch {
      setEntries([]);
      setListState("failed");
    }
  }, []);

  useEffect(() => {
    if (!clientReady) return;
    load(period);
  }, [period, load, clientReady]);

  if (!clientReady) {
    return (
      <LeaderboardStickyShell>
        <h2 className="border-b border-on-tertiary-fixed-variant/20 pb-2 font-headline text-lg font-bold text-on-tertiary-fixed">
          Leaderboard
        </h2>
        <div className="min-h-16" aria-busy="true" />
      </LeaderboardStickyShell>
    );
  }

  return (
    <LeaderboardStickyShell>
      <h2 className="border-b border-on-tertiary-fixed-variant/20 pb-2 font-headline text-lg font-bold text-on-tertiary-fixed">
        Leaderboard
      </h2>

      <div className="flex flex-wrap gap-2">
        {TABS.map((tab) => {
          const active = period === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setPeriod(tab.id)}
              className={`rounded-lg px-3 py-1.5 font-headline text-sm font-bold transition-colors ${
                active
                  ? "bg-on-tertiary-fixed text-tertiary-fixed"
                  : "bg-on-tertiary-fixed/5 text-on-tertiary-fixed hover:bg-on-tertiary-fixed/10"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {listState === "loading" ? (
        <div className="min-h-16" aria-busy="true" />
      ) : listState === "failed" ? (
        <div className="min-h-16" aria-hidden="true" />
      ) : listState === "ok_empty" ? (
        <p className="font-body text-sm italic text-on-tertiary-fixed/50">No scores yet for this period.</p>
      ) : (
        <ul className="flex max-h-64 flex-col gap-2 overflow-y-auto pr-1 font-body text-sm text-on-tertiary-fixed">
          {entries.map((e) => (
            <li
              key={`${e.rank}-${e.displayName}-${e.score}-${e.createdAt}`}
              className="flex items-center justify-between gap-3 border-b border-on-tertiary-fixed/10 pb-1.5 last:border-0"
            >
              <span className="flex min-w-0 items-center gap-2">
                <span className="shrink-0 tabular-nums text-on-tertiary-fixed-variant">{e.rank}.</span>
                <span className="truncate font-medium">{e.displayName}</span>
              </span>
              <span className="shrink-0 font-headline tabular-nums font-bold">{e.score}</span>
            </li>
          ))}
        </ul>
      )}
    </LeaderboardStickyShell>
  );
}
