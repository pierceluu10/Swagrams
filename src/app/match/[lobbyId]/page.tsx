"use client";

// Swagrams — multiplayer match (waiting room + active round)

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { usePageTransition } from "@/components/PageTransition";
import { RackView } from "@/components/RackView";
import { CountdownPulse } from "@/components/game/CountdownPulse";
import { StickyScoreboard } from "@/components/game/StickyScoreboard";
import { TileFlightLayer, type TileFlightPayload } from "@/components/game/TileFlightLayer";
import { TimerRing } from "@/components/game/TimerRing";
import { SubmissionFeedback } from "@/components/game/SubmissionFeedback";
import { WordSlots } from "@/components/game/WordSlots";
import { rackIndicesForTypedWord } from "@/lib/game/engine";
import { NavLinkButton } from "@/components/ui/NavLinkButton";
import { SlabButton } from "@/components/ui/SlabButton";
import { SurfaceCard } from "@/components/ui/SurfaceCard";
import { lobbyApi, type LobbySnapshot } from "@/lib/multiplayer/api";
import { getSupabaseClient } from "@/lib/supabase/client";

function formatTime(ms: number) {
  const sec = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(sec / 60).toString().padStart(2, "0");
  const s = (sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function shuffleRack(value: string) {
  const chars = value.split("");
  for (let i = chars.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}

function canAppendFromRack(currentWord: string, nextChar: string, rack: string) {
  const nextWord = `${currentWord}${nextChar}`;
  const rackCounts = new Map<string, number>();
  const wordCounts = new Map<string, number>();
  for (const ch of rack) rackCounts.set(ch, (rackCounts.get(ch) ?? 0) + 1);
  for (const ch of nextWord) wordCounts.set(ch, (wordCounts.get(ch) ?? 0) + 1);
  for (const [ch, count] of wordCounts) {
    if ((rackCounts.get(ch) ?? 0) < count) return false;
  }
  return true;
}

export default function MatchPage() {
  const params = useParams<{ lobbyId: string }>();
  const router = useRouter();
  const { navigateHome } = usePageTransition();
  const lobbyId = params.lobbyId;

  const [state, setState] = useState<LobbySnapshot | null>(null);
  const [word, setWord] = useState("");
  const [error, setError] = useState("");
  const [displayRack, setDisplayRack] = useState("");
  const [countdown, setCountdown] = useState<number | null>(null);
  const [playerId, setPlayerId] = useState("");
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [copied, setCopied] = useState(false);
  const hasSeenActiveRound = useRef(false);
  const [flight, setFlight] = useState<TileFlightPayload | null>(null);
  const flightId = useRef(0);
  const prevWordLen = useRef(0);
  const prevWordStr = useRef("");
  const rackTileRefs = useRef<(HTMLDivElement | null)[]>([]);
  const slotRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const id = setTimeout(() => {
      setPlayerId(localStorage.getItem("player_id") || "");
    }, 0);
    return () => clearTimeout(id);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const snapshot = await lobbyApi.state(lobbyId);
      setState(snapshot);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [lobbyId]);

  useEffect(() => {
    const init = setTimeout(() => {
      void refresh();
    }, 0);

    let supabase;
    try {
      supabase = getSupabaseClient();
    } catch {
      return () => clearTimeout(init);
    }

    const channel = supabase
      .channel(`lobby-${lobbyId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "players", filter: `lobby_id=eq.${lobbyId}` }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "rounds", filter: `lobby_id=eq.${lobbyId}` }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "submissions" }, refresh)
      .subscribe();

    return () => {
      clearTimeout(init);
      channel.unsubscribe();
    };
  }, [lobbyId, refresh]);

  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), 250);
    return () => clearInterval(timer);
  }, []);

  const me = state?.players.find((p) => p.id === playerId);
  const activeRound = state?.round && state.round.status === "active" ? state.round : null;

  const totalMs = activeRound
    ? Math.max(1, new Date(activeRound.ends_at).getTime() - new Date(activeRound.started_at).getTime())
    : 60_000;
  const remaining = activeRound ? new Date(activeRound.ends_at).getTime() - nowMs : 0;
  const wordsFound = state?.submissions && playerId
    ? state.submissions.filter((s) => s.player_id === playerId).length
    : 0;

  const lastWord = useMemo(() => {
    if (!state?.submissions?.length || !playerId) return "—";
    const mine = state.submissions.filter((s) => s.player_id === playerId);
    if (!mine.length) return "—";
    return mine[mine.length - 1].word.toUpperCase();
  }, [state, playerId]);

  useEffect(() => {
    if (!activeRound) return;
    const id = window.setTimeout(() => setDisplayRack(activeRound.rack), 0);
    return () => window.clearTimeout(id);
  }, [activeRound]);

  useEffect(() => {
    if (activeRound) {
      hasSeenActiveRound.current = true;
    }
  }, [activeRound]);

  useEffect(() => {
    if (hasSeenActiveRound.current && state?.round?.status === "complete") {
      router.push(`/results?lobbyId=${lobbyId}`);
    }
  }, [state?.round?.status, lobbyId, router]);

  const submitWord = useCallback(async () => {
    if (!activeRound) return;
    try {
      await lobbyApi.submit(lobbyId, playerId, word);
      setWord("");
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }, [activeRound, lobbyId, playerId, word]);

  useEffect(() => {
    if (activeRound && remaining <= 0) {
      void lobbyApi.finalize(lobbyId).catch(() => undefined);
    }
  }, [activeRound, lobbyId, remaining]);

  useEffect(() => {
    if (!activeRound) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Enter") {
        event.preventDefault();
        void submitWord();
        return;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        setWord("");
        return;
      }
      if (event.key === "Shift") {
        event.preventDefault();
        setDisplayRack((value) => shuffleRack(value || activeRound.rack));
        return;
      }
      if (event.key === "Backspace") {
        event.preventDefault();
        setWord((value) => value.slice(0, -1));
        return;
      }
      if (/^[a-zA-Z]$/.test(event.key)) {
        const letter = event.key.toLowerCase();
        setWord((value) => {
          if (value.length >= 6) return value;
          if (!canAppendFromRack(value, letter, activeRound.rack)) return value;
          return `${value}${letter}`;
        });
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeRound, submitWord]);

  const rackVisual = displayRack || activeRound?.rack || "";
  const clearFlight = useCallback(() => setFlight(null), []);

  useEffect(() => {
    if (!activeRound) {
      prevWordLen.current = word.length;
      prevWordStr.current = word;
      return;
    }
    const prevLen = prevWordLen.current;
    const curLen = word.length;

    if (curLen > prevLen && rackVisual.length >= 6) {
      const indices = rackIndicesForTypedWord(word, rackVisual);
      const rackIdx = indices[indices.length - 1];
      const slotIdx = curLen - 1;
      const ch = word[slotIdx];
      if (ch !== undefined && rackIdx !== undefined) {
        const rackEl = rackTileRefs.current[rackIdx];
        const slotEl = slotRefs.current[slotIdx];
        if (rackEl && slotEl) {
          flightId.current += 1;
          setFlight({
            id: flightId.current,
            char: ch,
            from: rackEl.getBoundingClientRect(),
            to: slotEl.getBoundingClientRect()
          });
        }
      }
    } else if (curLen < prevLen && rackVisual.length >= 6) {
      const removedChar = prevWordStr.current[prevLen - 1];
      const prevIndices = rackIndicesForTypedWord(prevWordStr.current, rackVisual);
      const rackIdx = prevIndices[prevLen - 1];
      const slotIdx = prevLen - 1;
      if (removedChar !== undefined && rackIdx !== undefined) {
        const rackEl = rackTileRefs.current[rackIdx];
        const slotEl = slotRefs.current[slotIdx];
        if (rackEl && slotEl) {
          flightId.current += 1;
          setFlight({
            id: flightId.current,
            char: removedChar,
            from: slotEl.getBoundingClientRect(),
            to: rackEl.getBoundingClientRect(),
            reverse: true
          });
        }
      }
    }

    prevWordLen.current = curLen;
    prevWordStr.current = word;
  }, [word, activeRound, rackVisual]);

  useEffect(() => {
    if (countdown === null) return;
    if (countdown <= 0) {
      const id = window.setTimeout(() => {
        setCountdown(null);
        void lobbyApi.start(lobbyId).catch((e: Error) => setError(e.message));
      }, 0);
      return () => window.clearTimeout(id);
    }
    const timer = window.setTimeout(() => setCountdown((value) => (value ?? 1) - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [countdown, lobbyId]);

  const canStart = !!state && state.players.length >= 2 && !activeRound;

  const handleCopyCode = useCallback(async () => {
    const code = state?.lobby.code;
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked */
    }
  }, [state?.lobby.code]);

  const handleLeave = useCallback(() => {
    void lobbyApi.leave(lobbyId, playerId).catch(() => undefined);
    router.push("/lobby");
  }, [lobbyId, playerId, router]);

  const isWaiting = !activeRound && countdown === null;

  /* ---- WAITING ROOM ---- */
  if (isWaiting) {
    return (
      <div className="relative flex min-h-screen w-full flex-col items-center overflow-x-hidden">
        <div className="fixed left-0 top-0 z-50 px-6 py-4">
          <NavLinkButton type="button" onClick={navigateHome}>
            ← Home
          </NavLinkButton>
        </div>

        <main className="mx-auto flex w-full max-w-lg flex-col items-center gap-8 px-6 pb-16 pt-20">
          {/* Lobby code */}
          <div className="flex w-full flex-col items-center gap-3">
            <p className="font-label text-xs uppercase tracking-[0.2em] text-on-surface-variant/70">Lobby code</p>
            <div className="flex items-center gap-3">
              <span className="font-headline text-4xl font-extrabold tracking-[0.3em] text-primary sm:text-5xl">
                {state?.lobby.code ?? "…"}
              </span>
              <button
                type="button"
                onClick={handleCopyCode}
                className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-container-high text-on-surface-variant transition-colors hover:bg-surface-container-highest"
                aria-label="Copy code"
              >
                <span className="material-symbols-outlined text-lg" data-icon={copied ? "check" : "content_copy"}>
                  {copied ? "check" : "content_copy"}
                </span>
              </button>
            </div>
            {copied ? <p className="font-label text-xs text-primary">Copied!</p> : null}
          </div>

          {/* Player list */}
          <SurfaceCard className="p-6">
            <h3 className="mb-4 font-headline text-sm font-bold uppercase tracking-wider text-on-surface-variant/70">
              Players ({state?.players.length ?? 0})
            </h3>
            <div className="flex flex-col gap-3">
              {state?.players.map((player) => (
                <div
                  key={player.id}
                  className={`flex items-center gap-3 rounded-xl px-4 py-3 transition-colors ${
                    player.id === playerId
                      ? "bg-primary/10 ring-1 ring-primary/30"
                      : "bg-surface-container"
                  }`}
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-on-secondary">
                    <span className="font-headline text-sm font-bold">
                      {player.display_name.slice(0, 2).toUpperCase()}
                    </span>
                  </div>
                  <span className="font-headline text-base font-bold text-on-surface">
                    {player.display_name}
                  </span>
                  {player.id === playerId ? (
                    <span className="ml-auto font-label text-[10px] uppercase tracking-wider text-primary">You</span>
                  ) : null}
                </div>
              ))}
            </div>
          </SurfaceCard>

          {/* Waiting / Start */}
          <div className="flex w-full flex-col items-center gap-4">
            {canStart ? (
              <SlabButton variant="lavender" type="button" onClick={() => setCountdown(3)}>
                <span>Start game</span>
              </SlabButton>
            ) : (
              <p className="font-body text-sm text-on-surface-variant">
                Waiting for players<span className="waiting-dots"></span>
              </p>
            )}
          </div>

          {/* Leave */}
          <NavLinkButton type="button" tone="leave" onClick={handleLeave}>
            Leave lobby
          </NavLinkButton>

          {error ? <p className="text-center text-sm text-error">{error}</p> : null}
        </main>
      </div>
    );
  }

  /* ---- COUNTDOWN ---- */
  if (countdown !== null && !activeRound) {
    return (
      <div className="flex min-h-screen w-full flex-col items-center justify-center">
        <CountdownPulse value={countdown} />
      </div>
    );
  }

  /* ---- ACTIVE ROUND ---- */
  return (
    <>
      <div className="fixed left-0 top-0 z-50 px-6 py-4">
        <NavLinkButton type="button" onClick={navigateHome}>
          ← Home
        </NavLinkButton>
      </div>

      <main className="relative mx-auto min-h-[calc(100dvh-3rem)] w-full max-w-[1600px] px-4 pb-20 pt-20 lg:px-6 lg:pt-24">
        <aside className="mb-10 flex w-full justify-center lg:mb-0 lg:absolute lg:left-12 lg:top-24 lg:z-10 lg:block lg:w-auto lg:justify-start xl:left-20 2xl:left-24">
          <div className="w-full max-w-[260px] sm:max-w-[280px]">
            <StickyScoreboard points={me?.score ?? 0} wordsFound={wordsFound} lastWord={lastWord} />
          </div>
        </aside>

        <div className="flex w-full flex-col items-center gap-12">
          {activeRound ? (
            <>
              <TimerRing remainingMs={remaining} totalMs={totalMs} label={formatTime(remaining)} />

              <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-2">
                <SubmissionFeedback message={error} className="w-full" />
                <WordSlots word={word} slotRefs={slotRefs} />
              </div>
              <RackView rack={rackVisual} tileRefs={rackTileRefs} />

              <div className="game-actions">
                <button type="button" onClick={() => setDisplayRack((value) => shuffleRack(value || activeRound.rack))}>
                  <span>Shuffle</span>
                  <span className="game-actions__key">Shift</span>
                </button>
                <button className="game-submit" type="button" onClick={() => void submitWord()}>
                  <span>Submit</span>
                  <span className="game-actions__key">Enter</span>
                </button>
                <button type="button" onClick={() => setWord("")}>
                  <span>Clear</span>
                  <span className="game-actions__key">Esc</span>
                </button>
              </div>
              {flight ? <TileFlightLayer key={flight.id} flight={flight} onComplete={clearFlight} /> : null}
            </>
          ) : null}
        </div>
      </main>
    </>
  );
}
