import { NextResponse } from "next/server";

import { getMissingWordsForRack } from "@/lib/words/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const rack = searchParams.get("rack") || "";
    if (!rack) {
      return NextResponse.json({ error: "rack is required" }, { status: 400 });
    }

    const submittedWords = (searchParams.get("submitted") || "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);

    return NextResponse.json({ words: getMissingWordsForRack(rack, submittedWords) });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
