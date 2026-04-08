// Swagrams API — list open lobbies

import { NextResponse } from "next/server";
import { getOpenLobbies } from "@/lib/supabase/db";

export async function GET() {
  try {
    const data = await getOpenLobbies();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}

