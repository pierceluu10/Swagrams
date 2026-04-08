// Swagrams API — list open lobbies

import { NextResponse } from "next/server";
import { getOpenLobbies } from "@/lib/supabase/db";

export const dynamic = "force-dynamic";

const noCache = {
  "Cache-Control": "private, no-cache, no-store, must-revalidate",
  Pragma: "no-cache"
} as const;

export async function GET() {
  try {
    const data = await getOpenLobbies();
    return NextResponse.json(data, { headers: noCache });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400, headers: noCache });
  }
}

