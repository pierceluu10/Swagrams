import { NextResponse } from "next/server";

import { validateSubmission } from "@/lib/words/server";

export async function POST(request: Request) {
  try {
    const { word, rack } = await request.json();
    if (!word || !rack) {
      return NextResponse.json({ error: "word and rack are required" }, { status: 400 });
    }

    return NextResponse.json(validateSubmission(word, rack));
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
