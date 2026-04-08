import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import wordListPath from "word-list";

import { afterEach, describe, expect, it, vi } from "vitest";

import { buildWordCatalog } from "@/lib/words/server";

function makeDictionaryFile(contents: string) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "swagrams-dict-"));
  const filePath = path.join(directory, "words.txt");
  fs.writeFileSync(filePath, contents, "utf8");
  return { directory, filePath };
}

describe("word server", () => {
  afterEach(() => {
    delete process.env.SWAGRAMS_DICTIONARY_PATH;
    vi.resetModules();
  });

  it("builds rack pools only from 6-letter words", () => {
    const catalog = buildWordCatalog([
      "stream",
      "master",
      "tamers",
      "steam",
      "teams",
      "meat",
      "ate",
      "at",
      "Alpha",
      "planet"
    ].join("\n"));

    expect(catalog.rackKeys).toContain("aemrst");
    expect(catalog.rackKeys).toContain("aelnpt");
    expect(catalog.validWords.has("steam")).toBe(true);
    expect(catalog.validWords.has("alpha")).toBe(false);
    expect(catalog.validWords.has("at")).toBe(false);
  });

  it("validates submissions and computes missing words from the configured dictionary", async () => {
    const { directory, filePath } = makeDictionaryFile([
      "stream",
      "master",
      "tamers",
      "steam",
      "teams",
      "meat",
      "mate",
      "tame",
      "team",
      "ate",
      "eat",
      "tea"
    ].join("\n"));
    process.env.SWAGRAMS_DICTIONARY_PATH = filePath;

    const wordsServer = await import("@/lib/words/server");

    const valid = wordsServer.validateSubmission("steam", "stream");
    expect(valid.valid).toBe(true);
    if (valid.valid) {
      expect(valid.score).toBe(1200);
    }

    const invalid = wordsServer.validateSubmission("streak", "stream");
    expect(invalid).toEqual({ valid: false, reason: "Word cannot be built from this rack." });

    expect(wordsServer.getMissingWordsForRack("stream", ["steam", "tea"])).toEqual([
      "master",
      "stream",
      "tamers",
      "teams",
      "mate",
      "meat",
      "tame",
      "team",
      "ate",
      "eat"
    ]);

    fs.rmSync(directory, { recursive: true, force: true });
  });

  it("defaults to the bundled word list so common words validate consistently across machines", async () => {
    const wordsServer = await import("@/lib/words/server");

    expect(wordsServer.dictionaryPath()).toBe(wordListPath);

    const valid = wordsServer.validateSubmission("hugs", "hugszz");
    expect(valid).toEqual({ valid: true, reason: "ok", score: 400, word: "hugs" });
  });
});
