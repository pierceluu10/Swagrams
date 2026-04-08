import { NextResponse } from "next/server";
import { leaveLobby } from "@/lib/supabase/db";

export async function POST(req: Request, { params }: { params: Promise<{ lobbyId: string }> }) {
  try {
    const { lobbyId } = await params;
    const body = await req.json();
    await leaveLobby(lobbyId, body.playerId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
