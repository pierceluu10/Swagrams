// Swagrams API — leaderboard (GET by period, POST submit)

import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { LeaderboardGetResponse, LeaderboardPeriod, LeaderboardPostBody } from "@/lib/leaderboard/types";
import { startOfUtcDayIso, startOfUtcIsoWeekIso } from "@/lib/leaderboard/utc";

const LIMIT = 20;
const MAX_SCORE = 1_000_000;
const NAME_MIN = 2;
const NAME_MAX = 24;

function parsePeriod(v: string | null): LeaderboardPeriod | null {
  if (v === "daily" || v === "weekly" || v === "alltime") return v;
  return null;
}

function normalizeName(raw: string): string {
  return raw.trim().replace(/\s+/g, " ");
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const period = parsePeriod(searchParams.get("period"));
    if (!period) {
      return NextResponse.json({ error: "period must be daily, weekly, or alltime" }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();
    let q = supabase
      .from("leaderboard_entries")
      .select("display_name, score, created_at")
      .order("score", { ascending: false })
      .order("created_at", { ascending: true })
      .limit(LIMIT);

    if (period === "daily") {
      q = q.gte("created_at", startOfUtcDayIso());
    } else if (period === "weekly") {
      q = q.gte("created_at", startOfUtcIsoWeekIso());
    }

    const { data, error } = await q;
    if (error) throw new Error(error.message);

    const rows = (data ?? []) as { display_name: string; score: number; created_at: string }[];
    const payload: LeaderboardGetResponse = {
      entries: rows.map((r, i) => ({
        rank: i + 1,
        displayName: r.display_name,
        score: r.score,
        createdAt: r.created_at
      }))
    };
    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<LeaderboardPostBody>;
    const displayName = typeof body.displayName === "string" ? normalizeName(body.displayName) : "";
    const score = typeof body.score === "number" && Number.isFinite(body.score) ? Math.floor(body.score) : NaN;
    const mode = body.mode;

    if (displayName.length < NAME_MIN || displayName.length > NAME_MAX) {
      return NextResponse.json(
        { error: `displayName must be between ${NAME_MIN} and ${NAME_MAX} characters` },
        { status: 400 }
      );
    }
    if (Number.isNaN(score) || score < 0 || score > MAX_SCORE) {
      return NextResponse.json({ error: "score must be a valid number in range" }, { status: 400 });
    }
    if (mode !== "solo" && mode !== "multiplayer") {
      return NextResponse.json({ error: "mode must be solo or multiplayer" }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();
    const { error } = await supabase.from("leaderboard_entries").insert({
      display_name: displayName,
      score,
      mode
    });
    if (error) throw new Error(error.message);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
