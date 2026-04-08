// Swagrams API — lobby snapshot

import { NextResponse } from "next/server";
import { getLobbyState } from "@/lib/supabase/db";

export const dynamic = "force-dynamic";

const noCache = {
  "Cache-Control": "private, no-cache, no-store, must-revalidate",
  Pragma: "no-cache"
} as const;

export async function GET(_request: Request, { params }: { params: Promise<{ lobbyId: string }> }) {
  try {
    const { lobbyId } = await params;
    const data = await getLobbyState(lobbyId);
    return NextResponse.json(data, { headers: noCache });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400, headers: noCache });
  }
}
