import { describe, expect, it } from "vitest";
import {
  clearLobbyPlayerId,
  getLobbyPlayerId,
  getLobbyPlayerStorageKey,
  getOrCreateMultiplayerSessionId,
  setLobbyPlayerId,
  type BrowserStorage
} from "@/lib/multiplayer/storage";

function makeStorage(initial: Record<string, string> = {}): BrowserStorage {
  const data = new Map(Object.entries(initial));

  return {
    getItem(key) {
      return data.get(key) ?? null;
    },
    setItem(key, value) {
      data.set(key, value);
    },
    removeItem(key) {
      data.delete(key);
    }
  };
}

describe("multiplayer storage", () => {
  it("reuses the same tab session id once created", () => {
    const storage = makeStorage();

    const first = getOrCreateMultiplayerSessionId(storage, () => "tab-1");
    const second = getOrCreateMultiplayerSessionId(storage, () => "tab-2");

    expect(first).toBe("tab-1");
    expect(second).toBe("tab-1");
  });

  it("stores player ids per lobby", () => {
    const storage = makeStorage();

    setLobbyPlayerId(storage, "lobby-a", "player-1");
    setLobbyPlayerId(storage, "lobby-b", "player-2");

    expect(getLobbyPlayerId(storage, "lobby-a")).toBe("player-1");
    expect(getLobbyPlayerId(storage, "lobby-b")).toBe("player-2");
    expect(getLobbyPlayerStorageKey("lobby-a")).not.toBe(getLobbyPlayerStorageKey("lobby-b"));
  });

  it("clears only the requested lobby player id", () => {
    const storage = makeStorage({
      [getLobbyPlayerStorageKey("lobby-a")]: "player-1",
      [getLobbyPlayerStorageKey("lobby-b")]: "player-2"
    });

    clearLobbyPlayerId(storage, "lobby-a");

    expect(getLobbyPlayerId(storage, "lobby-a")).toBeNull();
    expect(getLobbyPlayerId(storage, "lobby-b")).toBe("player-2");
  });
});
