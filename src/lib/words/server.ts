import fs from "node:fs";

import wordListPath from "word-list";

import type { RoundState } from "@/lib/game/types";
import { canBuildFromRack, normalizeWord, scoreWord } from "@/lib/game/engine";
import { ROUND_SECONDS } from "@/lib/words/constants";
import { rackMultisetKey } from "@/lib/words/rackMultisetKey";

type Difficulty = RoundState["difficulty"];

type ValidationResult =
  | { valid: false; reason: string }
  | { valid: true; reason: "ok"; score: number; word: string };

type WordCatalog = {
  rackKeys: string[];
  rackWordsByKey: Map<string, string[]>;
  playableWords: string[];
  validWords: Set<string>;
};

export type WordPoolEntry = {
  rack: string;
  difficulty: Difficulty;
};

const MIN_WORD_LENGTH = 3;
const MAX_WORD_LENGTH = 6;
const RACK_LENGTH = 6;
const EASY_SIX_LETTER_THRESHOLD = 3;
const EASY_MIN_VOWELS = 2;
const EASY_MAX_LETTER_REPEAT = 2;
const VOWELS = new Set(["a", "e", "i", "o", "u"]);
const SYSTEM_DICTIONARY_PATH = "/usr/share/dict/words";
const DEFAULT_DICTIONARY_PATHS = [wordListPath, SYSTEM_DICTIONARY_PATH] as const;

let catalogCache: WordCatalog | null = null;
const answersCache = new Map<string, string[]>();
// Lazily populated when racks are requested — avoids expensive startup classification.
const rackDifficultyCache = new Map<string, Difficulty>();

export function dictionaryPath() {
  const configuredPath = process.env.SWAGRAMS_DICTIONARY_PATH;
  if (configuredPath) return configuredPath;

  const fallbackPath = DEFAULT_DICTIONARY_PATHS.find((candidatePath) => fs.existsSync(candidatePath));
  if (fallbackPath) return fallbackPath;

  throw new Error("Could not find a usable dictionary file.");
}

function normalizeDictionaryWord(rawWord: string) {
  const word = rawWord.trim();
  if (!/^[a-z]+$/.test(word)) return null;
  if (word.length < MIN_WORD_LENGTH || word.length > MAX_WORD_LENGTH) return null;
  return word;
}

export function buildWordCatalog(dictionaryContents: string): WordCatalog {
  const validWords = new Set<string>();
  const rackWordsByKey = new Map<string, string[]>();

  for (const line of dictionaryContents.split(/\r?\n/)) {
    const word = normalizeDictionaryWord(line);
    if (!word) continue;
    validWords.add(word);
  }

  for (const word of validWords) {
    if (word.length !== RACK_LENGTH) continue;
    const key = rackMultisetKey(word);
    const rackWords = rackWordsByKey.get(key) ?? [];
    rackWords.push(word);
    rackWordsByKey.set(key, rackWords);
  }

  const rackKeys = [...rackWordsByKey.keys()];
  if (rackKeys.length === 0) {
    throw new Error("Dictionary did not produce any 6-letter racks.");
  }

  const playableWords = [...validWords];

  for (const words of rackWordsByKey.values()) {
    words.sort((left, right) => left.localeCompare(right));
  }

  rackKeys.sort((left, right) => left.localeCompare(right));
  playableWords.sort((left, right) => {
    const lengthDelta = right.length - left.length;
    return lengthDelta !== 0 ? lengthDelta : left.localeCompare(right);
  });

  return { rackKeys, rackWordsByKey, playableWords, validWords };
}

function getWordCatalog() {
  if (catalogCache) return catalogCache;

  // Merge all available dictionary sources for maximum coverage.
  const sources = [wordListPath, SYSTEM_DICTIONARY_PATH].filter((p) => fs.existsSync(p));
  const contents = sources.map((p) => fs.readFileSync(p, "utf8").toLowerCase()).join("\n");
  catalogCache = buildWordCatalog(contents);
  return catalogCache;
}

function shuffleString(value: string): string {
  const chars = value.split("");
  for (let i = chars.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}

function answerWordsForRackKey(rackKey: string) {
  const cached = answersCache.get(rackKey);
  if (cached) return cached;

  const { playableWords } = getWordCatalog();
  const answers = playableWords.filter((word) => canBuildFromRack(word, rackKey));
  answersCache.set(rackKey, answers);
  return answers;
}

/** Classify a single rack key as easy or hard. Result is cached permanently.
 *  Easy requires ALL of:
 *   - contains S (enables plurals)
 *   - no Y (Y is tricky)
 *   - ≥ EASY_MIN_VOWELS vowels (a/e/i/o/u)
 *   - no letter repeated more than EASY_MAX_LETTER_REPEAT times
 *   - more than EASY_SIX_LETTER_THRESHOLD valid 6-letter anagrams in the dictionary */
function classifyRackDifficulty(rackKey: string): Difficulty {
  const cached = rackDifficultyCache.get(rackKey);
  if (cached) return cached;

  let difficulty: Difficulty = "hard";

  if (
    rackKey.includes("s") &&
    !rackKey.includes("y") &&
    [...rackKey].filter((c) => VOWELS.has(c)).length >= EASY_MIN_VOWELS &&
    Math.max(...Object.values(
      [...rackKey].reduce<Record<string, number>>((acc, c) => { acc[c] = (acc[c] ?? 0) + 1; return acc; }, {})
    )) <= EASY_MAX_LETTER_REPEAT
  ) {
    const { rackWordsByKey } = getWordCatalog();
    const sixLetterWords = rackWordsByKey.get(rackKey) ?? [];
    if (sixLetterWords.length > EASY_SIX_LETTER_THRESHOLD) {
      difficulty = "easy";
    }
  }

  rackDifficultyCache.set(rackKey, difficulty);
  return difficulty;
}

export function getRandomPoolEntry(options?: {
  excludeMultisetKeys?: Iterable<string>;
  difficulty?: Difficulty;
}): WordPoolEntry {
  const excludeSet = new Set<string>();
  for (const key of options?.excludeMultisetKeys ?? []) {
    if (key) excludeSet.add(key);
  }

  const { rackKeys } = getWordCatalog();
  const requestedDifficulty = options?.difficulty ?? "hard";

  const candidates = rackKeys.filter((k) => !excludeSet.has(k));
  const pool = candidates.length > 0 ? candidates : rackKeys;

  // Try up to 200 random racks looking for one matching the requested difficulty.
  // classifyRackDifficulty is cached after the first call per rack key.
  const MAX_TRIES = 200;
  for (let i = 0; i < MAX_TRIES; i++) {
    const rack = pool[Math.floor(Math.random() * pool.length)];
    const actualDifficulty = classifyRackDifficulty(rack);
    if (actualDifficulty === requestedDifficulty) {
      return { rack, difficulty: actualDifficulty };
    }
  }

  // Fallback: scan the full pool for any matching rack (never return wrong difficulty).
  console.warn(`[swagrams] Could not find a ${requestedDifficulty} rack in ${MAX_TRIES} random tries — scanning`);
  const match = pool.find((k) => classifyRackDifficulty(k) === requestedDifficulty);
  if (match) return { rack: match, difficulty: requestedDifficulty };

  // Absolute last resort: wrong difficulty is better than crashing.
  console.warn(`[swagrams] No ${requestedDifficulty} rack found in entire pool — using random`);
  const rack = pool[Math.floor(Math.random() * pool.length)];
  return { rack, difficulty: classifyRackDifficulty(rack) };
}

export function randomizeRack(entry: WordPoolEntry) {
  return shuffleString(entry.rack);
}

type GenerateRoundOptions = {
  previousRack?: string;
  excludeMultisetKeys?: Iterable<string>;
  difficulty?: Difficulty;
};

export function generateRound(previousRackOrOptions?: string | GenerateRoundOptions): RoundState {
  const options = typeof previousRackOrOptions === "string"
    ? { previousRack: previousRackOrOptions }
    : (previousRackOrOptions ?? {});

  const excludeSet = new Set<string>();
  if (options.previousRack) excludeSet.add(rackMultisetKey(options.previousRack));
  for (const key of options.excludeMultisetKeys ?? []) {
    if (key) excludeSet.add(key);
  }

  const entry = getRandomPoolEntry({ excludeMultisetKeys: excludeSet, difficulty: options.difficulty });
  const rack = randomizeRack(entry);
  const now = new Date();
  const endsAt = new Date(now.getTime() + ROUND_SECONDS * 1000);

  return {
    rack,
    difficulty: entry.difficulty,
    startedAt: now.toISOString(),
    endsAt: endsAt.toISOString(),
    status: "active"
  };
}

export function isDictionaryWord(word: string) {
  return getWordCatalog().validWords.has(word);
}

export function validateSubmission(wordInput: string, rack: string): ValidationResult {
  const word = normalizeWord(wordInput);
  if (word.length < MIN_WORD_LENGTH || word.length > MAX_WORD_LENGTH) {
    return { valid: false, reason: "Words must be 3-6 letters." };
  }
  if (!canBuildFromRack(word, rack)) {
    return { valid: false, reason: "Word cannot be built from this rack." };
  }
  if (!isDictionaryWord(word)) {
    return { valid: false, reason: "Not a valid word." };
  }

  return { valid: true, reason: "ok", score: scoreWord(word), word };
}

export function getAllWordsForRack(rack: string) {
  const rackKey = rackMultisetKey(rack);
  return answerWordsForRackKey(rackKey);
}

export function getMissingWordsForRack(rack: string, submittedWords: string[]) {
  const submitted = new Set(submittedWords.map((word) => normalizeWord(word)));
  return getAllWordsForRack(rack).filter((word) => !submitted.has(word));
}
