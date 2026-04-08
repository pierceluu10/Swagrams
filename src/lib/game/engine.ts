/** Swagrams — rack validation, scoring, round helpers */

import { ROUND_SECONDS, getRandomPoolEntry, rackMultisetKey, randomizeRack } from "@/lib/words/pools";
import type { RoundState } from "@/lib/game/types";

export function normalizeWord(input: string) {
  return input.trim().toLowerCase();
}

type ValidationResult =
  | { valid: false; reason: string }
  | { valid: true; reason: "ok"; score: number; word: string };

export function canBuildFromRack(word: string, rack: string) {
  const wordChars = word.split("").sort().join("");
  const rackChars = rack.split("").sort().join("");
  if (wordChars.length > rackChars.length) {
    return false;
  }

  let i = 0;
  let j = 0;
  while (i < wordChars.length && j < rackChars.length) {
    if (wordChars[i] === rackChars[j]) {
      i += 1;
      j += 1;
    } else {
      j += 1;
    }
  }
  return i === wordChars.length;
}

export function scoreWord(word: string) {
  const len = word.length;
  if (len <= 2) return 0;
  if (len === 3) return 100;
  if (len === 4) return 400;
  if (len === 5) return 1200;
  if (len === 6) return 2000;
  return 0;
}

/** Greedy multiset match: each typed letter takes the leftmost unused rack index. */
export function rackIndicesForTypedWord(typed: string, rack: string): number[] {
  const lowerRack = rack.toLowerCase();
  const used = new Set<number>();
  const indices: number[] = [];
  for (const ch of typed.toLowerCase()) {
    let picked = -1;
    for (let i = 0; i < lowerRack.length; i += 1) {
      if (lowerRack[i] === ch && !used.has(i)) {
        picked = i;
        break;
      }
    }
    if (picked < 0) return indices;
    used.add(picked);
    indices.push(picked);
  }
  return indices;
}

/** @param previousRack Optional rack string (any order); avoids picking the same six letters again when possible. */
export function generateRound(previousRack?: string): RoundState {
  const entry = getRandomPoolEntry({
    excludeMultisetKey: previousRack ? rackMultisetKey(previousRack) : undefined
  });
  const rack = randomizeRack(entry);
  const now = new Date();
  const endsAt = new Date(now.getTime() + ROUND_SECONDS * 1000);

  return {
    rack,
    difficulty: entry.difficulty,
    startedAt: now.toISOString(),
    endsAt: endsAt.toISOString(),
    status: "active" as const
  };
}

export async function validateSubmission(wordInput: string, rack: string): Promise<ValidationResult> {
  const word = normalizeWord(wordInput);
  if (word.length < 3 || word.length > 6) {
    return { valid: false, reason: "Words must be 3-6 letters." };
  }
  if (!canBuildFromRack(word, rack)) {
    return { valid: false, reason: "Word cannot be built from this rack." };
  }

  let res: Response;
  try {
    res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`);
  } catch {
    return { valid: false, reason: "Could not reach dictionary." };
  }

  if (res.status === 404) {
    return { valid: false, reason: "Not a valid word." };
  }
  if (!res.ok) {
    return { valid: false, reason: "Could not reach dictionary." };
  }

  return { valid: true, reason: "ok", score: scoreWord(word), word };
}
