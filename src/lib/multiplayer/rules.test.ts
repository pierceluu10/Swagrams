import { describe, expect, it } from "vitest";
import { canOwnerStartRound } from "@/lib/multiplayer/rules";

describe("canOwnerStartRound", () => {
  it("returns true only when the host is present and all players are back in the lobby", () => {
    expect(
      canOwnerStartRound(
        [
          { id: "host", is_host: true, in_lobby: true },
          { id: "guest", is_host: false, in_lobby: true }
        ],
        "host"
      )
    ).toBe(true);
  });

  it("rejects non-host players", () => {
    expect(
      canOwnerStartRound(
        [
          { id: "host", is_host: true, in_lobby: true },
          { id: "guest", is_host: false, in_lobby: true }
        ],
        "guest"
      )
    ).toBe(false);
  });

  it("rejects when everyone is not back in the waiting lobby", () => {
    expect(
      canOwnerStartRound(
        [
          { id: "host", is_host: true, in_lobby: true },
          { id: "guest", is_host: false, in_lobby: false }
        ],
        "host"
      )
    ).toBe(false);
  });

  it("rejects when fewer than two players remain", () => {
    expect(canOwnerStartRound([{ id: "host", is_host: true, in_lobby: true }], "host")).toBe(false);
  });
});
