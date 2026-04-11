// Swagrams API — set lobby difficulty (host only)

import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: Request, { params }: { params: Promise<{ lobbyId: string }> }) {
  try {
    const { lobbyId } = await params;
    const { playerId, difficulty } = await request.json();

    if (!playerId) {
      return NextResponse.json({ error: "playerId is required" }, { status: 400 });
    }
    if (difficulty !== "easy" && difficulty !== "hard") {
      return NextResponse.json({ error: "difficulty must be easy or hard" }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();

    const { data: player } = await supabase
      .from("players")
      .select("is_host")
      .eq("id", playerId)
      .eq("lobby_id", lobbyId)
      .maybeSingle();

    if (!player?.is_host) {
      return NextResponse.json({ error: "Only the host can change difficulty." }, { status: 403 });
    }

    const { error } = await supabase
      .from("lobbies")
      .update({ difficulty })
      .eq("id", lobbyId);

    if (error) throw new Error(error.message);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
