/** Swagrams — shared rack validation, scoring, and round helpers */

export function normalizeWord(input: string) {
  return input.trim().toLowerCase();
}

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
