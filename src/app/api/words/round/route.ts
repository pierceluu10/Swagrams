import { NextResponse } from "next/server";

import { generateRound } from "@/lib/words/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const exclude = (searchParams.get("exclude") || "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);

    const rawDifficulty = searchParams.get("difficulty");
    const difficulty = rawDifficulty === "easy" || rawDifficulty === "hard" ? rawDifficulty : undefined;

    return NextResponse.json(generateRound({ excludeMultisetKeys: exclude, difficulty }));
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
