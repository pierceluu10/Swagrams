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
const SYSTEM_DICTIONARY_PATH = "/usr/share/dict/words";
const DEFAULT_DICTIONARY_PATHS = [wordListPath, SYSTEM_DICTIONARY_PATH] as const;

let catalogCache: WordCatalog | null = null;
const answersCache = new Map<string, string[]>();

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

  const contents = fs.readFileSync(dictionaryPath(), "utf8").toLowerCase();
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

function randomRackKey(excludeSet: Set<string>) {
  const { rackKeys } = getWordCatalog();
  const candidates = rackKeys.filter((rackKey) => !excludeSet.has(rackKey));
  const pickFrom = candidates.length > 0 ? candidates : rackKeys;
  return pickFrom[Math.floor(Math.random() * pickFrom.length)];
}

function answerWordsForRackKey(rackKey: string) {
  const cached = answersCache.get(rackKey);
  if (cached) return cached;

  const { playableWords } = getWordCatalog();
  const answers = playableWords.filter((word) => canBuildFromRack(word, rackKey));
  answersCache.set(rackKey, answers);
  return answers;
}

export function getRandomPoolEntry(options?: { excludeMultisetKeys?: Iterable<string> }): WordPoolEntry {
  const excludeSet = new Set<string>();
  for (const key of options?.excludeMultisetKeys ?? []) {
    if (key) excludeSet.add(key);
  }

  return {
    rack: randomRackKey(excludeSet),
    difficulty: "hard"
  };
}

export function randomizeRack(entry: WordPoolEntry) {
  return shuffleString(entry.rack);
}

type GenerateRoundOptions = {
  previousRack?: string;
  excludeMultisetKeys?: Iterable<string>;
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

  const entry = getRandomPoolEntry({ excludeMultisetKeys: excludeSet });
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
