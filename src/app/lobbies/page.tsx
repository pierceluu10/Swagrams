"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { NavLinkButton } from "@/components/ui/NavLinkButton";
import { SurfaceCard } from "@/components/ui/SurfaceCard";
import { lobbyApi, type OpenLobby } from "@/lib/multiplayer/api";
import { getOrCreateBrowserMultiplayerSessionId, setBrowserLobbyPlayerId } from "@/lib/multiplayer/storage";

export default function BrowseLobbiesPage() {
  const router = useRouter();
  const [lobbies, setLobbies] = useState<OpenLobby[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [joining, setJoining] = useState<string | null>(null);
  const [error, setError] = useState("");
  const sessionId = useMemo(() => getOrCreateBrowserMultiplayerSessionId(), []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setLobbies(await lobbyApi.open());
    } catch {
      setLobbies([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleJoin = async (lobby: OpenLobby) => {
    const clean = name.trim();
    if (clean.length < 2) {
      setError("Enter a display name first.");
      return;
    }
    setJoining(lobby.lobbyId);
    setError("");
    try {
      const data = await lobbyApi.join(lobby.code, clean, sessionId);
      setBrowserLobbyPlayerId(data.lobbyId, data.playerId);
      router.push(`/match/${data.lobbyId}`);
    } catch (e) {
      setError((e as Error).message);
      setJoining(null);
    }
  };

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden">
      <header className="fixed top-0 left-0 z-50 w-full">
        <div className="flex items-center justify-start px-6 py-4">
          <NavLinkButton type="button" onClick={() => router.push("/lobby")}>
            ← Back
          </NavLinkButton>
        </div>
      </header>

      <main className="mx-auto flex min-h-[calc(100vh-6rem)] w-full max-w-md flex-col items-center justify-start px-6 pb-12 pt-24">
        <SurfaceCard className="space-y-5">
          <div className="space-y-2 text-center">
            <h2 className="font-headline text-2xl font-bold text-on-surface">Browse Lobbies</h2>
            <p className="font-body text-sm leading-relaxed text-on-surface-variant">
            </p>
          </div>

          <div className="flex w-full flex-col gap-3.5">
            <label
              className="block w-full text-left font-label text-xs uppercase tracking-wider text-on-surface-variant"
              htmlFor="browse-name"
            >
              Display name
            </label>
            <input
              id="browse-name"
              className="w-full rounded-xl border border-outline-variant/30 bg-surface-container px-4 py-3 font-headline text-on-surface placeholder:text-on-surface-variant/50"
              placeholder="Type your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={18}
              required
              autoComplete="nickname"
            />
          </div>

          <div className="flex w-full items-center justify-between gap-3">
            <p className="font-label text-xs uppercase tracking-wider text-on-surface-variant">
              {loading ? "Loading…" : `${lobbies.length} ${lobbies.length === 1 ? "LOBBY" : "LOBBIES"}`}
            </p>
            <button
              type="button"
              onClick={() => void load()}
              className="shrink-0 font-label text-xs uppercase tracking-wider text-on-surface-variant transition-colors hover:text-on-surface"
            >
              Refresh
            </button>
          </div>

          {!loading && lobbies.length === 0 ? (
            <p className="py-6 text-center text-sm text-on-surface-variant/70">No open lobbies right now.</p>
          ) : null}

          <div className="space-y-2">
            {lobbies.map((lobby) => {
              const isFull = lobby.playerCount >= 10;
              return (
                <button
                  key={lobby.lobbyId}
                  type="button"
                  disabled={joining !== null || isFull}
                  onClick={() => void handleJoin(lobby)}
                  className="flex w-full items-center justify-between rounded-lg border border-outline-variant/20 bg-surface-container px-4 py-3 text-left transition-colors hover:bg-surface-container-high disabled:opacity-60"
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="font-headline text-sm font-bold text-on-surface">
                      {lobby.hostName}&apos;s Lobby
                    </span>
                    <span className="font-body text-xs text-on-surface-variant">
                      {lobby.playerCount}/10 players
                      {lobby.samplePlayers.length > 0 ? ` · ${lobby.samplePlayers.join(", ")}` : ""}
                    </span>
                  </div>
                  <span className={`font-label text-[10px] uppercase tracking-wider ${isFull ? "text-error" : "text-primary"}`}>
                    {joining === lobby.lobbyId ? "Joining..." : isFull ? "Full" : "Join"}
                  </span>
                </button>
              );
            })}
          </div>

          {error ? <p className="text-center text-sm text-error">{error}</p> : null}
        </SurfaceCard>
      </main>

      <div className="pointer-events-none absolute -bottom-10 -left-10 h-64 w-64 rounded-full bg-primary/5 blur-[100px]"></div>
      <div className="pointer-events-none absolute top-20 -right-20 h-80 w-80 rounded-full bg-secondary/5 blur-[120px]"></div>
    </div>
  );
}
