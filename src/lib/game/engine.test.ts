/** Swagrams — engine tests */

import { describe, expect, it } from "vitest";
import { canBuildFromRack, normalizeWord, rackIndicesForTypedWord, scoreWord } from "@/lib/game/engine";

describe("game engine", () => {
  it("validates letters against rack", () => {
    expect(canBuildFromRack("steam", "stream")).toBe(true);
    expect(canBuildFromRack("streak", "stream")).toBe(false);
  });

  it("normalizes submitted words", () => {
    expect(normalizeWord("  STEAM ")).toBe("steam");
  });

  it("scores by word length", () => {
    expect(scoreWord("cat")).toBe(100);
    expect(scoreWord("tame")).toBe(400);
    expect(scoreWord("steam")).toBe(1200);
    expect(scoreWord("stream")).toBe(2000);
  });

  it("assigns greedy rack indices for multiset typing order", () => {
    expect(rackIndicesForTypedWord("ab", "baba")).toEqual([1, 0]);
    expect(rackIndicesForTypedWord("", "stream")).toEqual([]);
    expect(rackIndicesForTypedWord("steam", "stream").length).toBe(5);
  });
});
