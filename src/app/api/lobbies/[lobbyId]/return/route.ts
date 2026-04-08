import { NextResponse } from "next/server";
import { returnToLobby } from "@/lib/supabase/db";

export async function POST(request: Request, { params }: { params: Promise<{ lobbyId: string }> }) {
  try {
    const { lobbyId } = await params;
    const { playerId } = await request.json();
    if (!playerId) {
      return NextResponse.json({ error: "playerId is required" }, { status: 400 });
    }

    const data = await returnToLobby(lobbyId, playerId);
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
