type WordValidationResponse =
  | { valid: false; reason: string }
  | { valid: true; reason: "ok"; score: number; word: string };

type RoundResponse = {
  rack: string;
  difficulty: "easy" | "hard";
  startedAt: string;
  endsAt: string;
  status: "active" | "complete";
};

async function requestJson<T>(input: RequestInfo, init?: RequestInit) {
  const response = await fetch(input, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {})
    },
    cache: "no-store"
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string"
        ? payload.error
        : "Request failed.";
    throw new Error(message);
  }
  return payload as T;
}

export async function fetchRandomRound(excludeMultisetKeys: string[]) {
  const params = new URLSearchParams();
  if (excludeMultisetKeys.length > 0) {
    params.set("exclude", excludeMultisetKeys.join(","));
  }
  return requestJson<RoundResponse>(`/api/words/round?${params.toString()}`);
}

export async function validateWord(word: string, rack: string) {
  return requestJson<WordValidationResponse>("/api/words/validate", {
    method: "POST",
    body: JSON.stringify({ word, rack })
  });
}

export async function fetchMissingWords(rack: string, submittedWords: string[]) {
  const params = new URLSearchParams({ rack });
  if (submittedWords.length > 0) {
    params.set("submitted", submittedWords.join(","));
  }
  return requestJson<{ words: string[] }>(`/api/words/missing?${params.toString()}`);
}
