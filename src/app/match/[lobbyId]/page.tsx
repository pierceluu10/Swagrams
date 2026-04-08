"use client";

// Swagrams — multiplayer match (waiting room + active round)

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { usePageTransition } from "@/components/PageTransition";
import { CountdownPulse } from "@/components/game/CountdownPulse";
import { RoundRackAndSlots } from "@/components/game/RoundRackAndSlots";
import { StickyScoreboard } from "@/components/game/StickyScoreboard";
import { TileFlightLayer, type TileFlightPayload } from "@/components/game/TileFlightLayer";
import { SubmissionFeedback } from "@/components/game/SubmissionFeedback";
import { canBuildFromRack, rackIndicesForTypedWord } from "@/lib/game/engine";
import { SessionNameForm } from "@/components/SessionNameForm";
import { NavLinkButton } from "@/components/ui/NavLinkButton";
import { SlabButton } from "@/components/ui/SlabButton";
import { SurfaceCard } from "@/components/ui/SurfaceCard";
import { lobbyApi, type LobbySnapshot } from "@/lib/multiplayer/api";
import { canOwnerStartRound } from "@/lib/multiplayer/rules";
import {
  clearBrowserLobbyPlayerId,
  getBrowserLobbyPlayerId,
  getOrCreateBrowserMultiplayerSessionId,
  setBrowserLobbyPlayerId
} from "@/lib/multiplayer/storage";
import { useGameActionPress } from "@/lib/hooks/useGameActionPress";
import { getSupabaseClient } from "@/lib/supabase/client";

const SUBMIT_REFRESH_FALLBACK_MS = 900;
const LOCAL_SUBMISSION_ID_PREFIX = "local-submission";

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
  const HOME_FLASH_KEY = "swagrams_home_flash";
  const params = useParams<{ lobbyId: string }>();
  const router = useRouter();
  const { navigateHome } = usePageTransition();
  const lobbyId = params.lobbyId;

  const handleLeaveAndGoHome = useCallback(() => {
    const pid = getBrowserLobbyPlayerId(lobbyId);
    if (pid) {
      clearBrowserLobbyPlayerId(lobbyId);
      void lobbyApi.leave(lobbyId, pid).catch(() => undefined);
    }
    navigateHome();
  }, [lobbyId, navigateHome]);

  const [state, setState] = useState<LobbySnapshot | null>(null);
  const [word, setWord] = useState("");
  const [error, setError] = useState("");
  const [displayRack, setDisplayRack] = useState("");
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [playerLoaded, setPlayerLoaded] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [successFlash, setSuccessFlash] = useState("");
  const [copied, setCopied] = useState(false);
  const prevRoundStatusRef = useRef<string | null>(null);
  const prevRoundIdRef = useRef<string | null>(null);
  const pushedResultsRef = useRef(false);
  const [flight, setFlight] = useState<TileFlightPayload | null>(null);
  const flightId = useRef(0);
  const prevWordLen = useRef(0);
  const prevWordStr = useRef("");
  const rackBtnRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const slotRefs = useRef<(HTMLDivElement | null)[]>([]);
  const submitSyncTimerRef = useRef<number | null>(null);
  const [dealt, setDealt] = useState(false);
  const [submittingWord, setSubmittingWord] = useState<string | null>(null);
  const { pressedAction, flashAction } = useGameActionPress();

  useEffect(() => {
    const id = setTimeout(() => {
      setPlayerId(getBrowserLobbyPlayerId(lobbyId));
      setPlayerLoaded(true);
    }, 0);
    return () => clearTimeout(id);
  }, [lobbyId]);

  const refresh = useCallback(async () => {
    try {
      const snapshot = await lobbyApi.state(lobbyId);
      setState(snapshot);
      setError("");
    } catch (e) {
      const message = (e as Error).message;
      if (message.toLowerCase().includes("lobby not found")) {
        if (typeof window !== "undefined") {
          sessionStorage.setItem(HOME_FLASH_KEY, "lobby_not_found");
        }
        router.replace("/");
        return;
      }
      setError(message);
    }
  }, [lobbyId, router]);

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
      .on("postgres_changes", { event: "*", schema: "public", table: "submissions", filter: `lobby_id=eq.${lobbyId}` }, refresh)
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

  useEffect(() => {
    return () => {
      if (submitSyncTimerRef.current !== null) {
        window.clearTimeout(submitSyncTimerRef.current);
        submitSyncTimerRef.current = null;
      }
    };
  }, []);

  const me = state?.players.find((p) => p.id === playerId);
  const isHost = !!me?.is_host;
  const activeRound = state?.round && state.round.status === "active" ? state.round : null;

  const totalMs = activeRound
    ? Math.max(1, new Date(activeRound.ends_at).getTime() - new Date(activeRound.started_at).getTime())
    : 60_000;
  const remaining = activeRound ? Math.max(0, new Date(activeRound.ends_at).getTime() - nowMs) : 0;
  const timerProgress = activeRound ? remaining / totalMs : 0;
  const timerSec = Math.max(0, Math.floor(remaining / 1000));
  const timerLabel = `${Math.floor(timerSec / 60).toString().padStart(2, "0")}:${(timerSec % 60).toString().padStart(2, "0")}`;
  const TIMER_CIRC = 2 * Math.PI * 60;
  const timerStrokeDashoffset = String((1 - timerProgress) * TIMER_CIRC);

  const mySubmissions = useMemo(
    () => (state?.submissions && playerId ? state.submissions.filter((s) => s.player_id === playerId) : []),
    [state?.submissions, playerId]
  );
  const wordsFound = mySubmissions.length;
  const lastWord = mySubmissions.length ? mySubmissions[0].word.toUpperCase() : "—";
  const displayedPoints = me?.score ?? 0;
  const displayedWordsFound = wordsFound;
  const displayedLastWord = lastWord;

  useEffect(() => {
    if (!activeRound) return;
    const id = window.setTimeout(() => setDisplayRack(activeRound.rack), 0);
    return () => window.clearTimeout(id);
  }, [activeRound]);

  useEffect(() => {
    if (!activeRound?.id) return;
    setDealt(false);
    const t = window.setTimeout(() => setDealt(true), 500);
    return () => window.clearTimeout(t);
  }, [activeRound?.id]);

  useEffect(() => {
    if (!state) return;

    const round = state.round;
    const status = round?.status ?? null;
    const id = round?.id ?? null;
    const prevStatus = prevRoundStatusRef.current;
    const prevId = prevRoundIdRef.current;

    if (prevStatus === "active" && status === "complete" && id != null && prevId === id) {
      pushedResultsRef.current = true;
      router.push(`/results?lobbyId=${lobbyId}`);
    }

    prevRoundStatusRef.current = status;
    prevRoundIdRef.current = id;
  }, [state, lobbyId, router]);

  useEffect(() => {
    if (!activeRound?.id) return;
    pushedResultsRef.current = false;
  }, [activeRound?.id]);

  const submitWord = useCallback(async () => {
    const pendingWord = word.trim();
    if (!activeRound || !playerId || !pendingWord || submittingWord) return;

    if (pendingWord.length < 3 || pendingWord.length > 6) {
      setSuccessFlash("");
      setWord("");
      setError("Words must be 3-6 letters.");
      return;
    }

    const rack = (displayRack || activeRound.rack).toLowerCase();
    if (!canBuildFromRack(pendingWord.toLowerCase(), rack)) {
      setSuccessFlash("");
      setWord("");
      setError("Word cannot be built from this rack.");
      return;
    }

    setWord("");
    setSubmittingWord(pendingWord);
    setSuccessFlash("");
    setError("");
    try {
      const result = await lobbyApi.submit(lobbyId, playerId, pendingWord);
      setSuccessFlash(`+${result.score}`);
      setState((current) => {
        if (!current || current.round?.id !== activeRound.id) return current;

        const alreadyTracked = current.submissions.some(
          (submission) => submission.player_id === playerId && submission.word === result.word
        );
        const nextSubmissions = alreadyTracked
          ? current.submissions
          : [
              {
                id: `${LOCAL_SUBMISSION_ID_PREFIX}-${Date.now()}`,
                player_id: playerId,
                word: result.word,
                score: result.score
              },
              ...current.submissions
            ];
        const nextPlayers = current.players
          .map((player) => (player.id === playerId ? { ...player, score: result.totalScore } : player))
          .sort((left, right) => {
            const scoreDelta = right.score - left.score;
            return scoreDelta !== 0 ? scoreDelta : left.display_name.localeCompare(right.display_name);
          });

        return { ...current, players: nextPlayers, submissions: nextSubmissions };
      });
      if (submitSyncTimerRef.current !== null) {
        window.clearTimeout(submitSyncTimerRef.current);
      }
      // Realtime should normally sync quickly; fallback with one delayed snapshot.
      submitSyncTimerRef.current = window.setTimeout(() => {
        submitSyncTimerRef.current = null;
        void refresh();
      }, SUBMIT_REFRESH_FALLBACK_MS);
    } catch (e) {
      setSuccessFlash("");
      setError((e as Error).message);
    } finally {
      setSubmittingWord(null);
    }
  }, [activeRound, displayRack, lobbyId, playerId, refresh, submittingWord, word]);

  useEffect(() => {
    if (activeRound && remaining <= 0) {
      void lobbyApi.finalize(lobbyId).catch(() => undefined);
    }
  }, [activeRound, lobbyId, remaining]);

  // Fallback: if realtime/polling misses the exact active->complete transition,
  // force a state check shortly after timer expiry and navigate once round is no longer active.
  useEffect(() => {
    if (!activeRound || remaining > 0 || pushedResultsRef.current) return;
    const id = window.setTimeout(async () => {
      if (pushedResultsRef.current) return;
      try {
        const snapshot = await lobbyApi.state(lobbyId);
        setState(snapshot);
        if (snapshot.round?.status !== "active") {
          pushedResultsRef.current = true;
          router.push(`/results?lobbyId=${lobbyId}`);
        }
      } catch {
        // Keep current UI; existing refresh/realtime paths will continue trying.
      }
    }, 1200);
    return () => window.clearTimeout(id);
  }, [activeRound, remaining, lobbyId, router]);

  useEffect(() => {
    if (!activeRound) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Enter") {
        event.preventDefault();
        flashAction("submit");
        void submitWord();
        return;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        flashAction("clear");
        setWord("");
        return;
      }
      if (event.key === "Shift") {
        event.preventDefault();
        flashAction("shuffle");
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
        const rack = displayRack || activeRound.rack;
        setWord((value) => {
          if (value.length >= 6) return value;
          if (!canAppendFromRack(value, letter, rack)) return value;
          return `${value}${letter}`;
        });
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [activeRound, displayRack, flashAction, submitWord]);

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
        const rackEl = rackBtnRefs.current[rackIdx];
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
        const rackEl = rackBtnRefs.current[rackIdx];
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

  const canStart = !!state && canOwnerStartRound(state.players, playerId) && !activeRound;
  const inLobbyCount = state?.players?.filter((p) => p.in_lobby).length ?? 0;
  const totalPlayers = state?.players?.length ?? 0;
  const minimumPlayersToStart = 2;
  const startDisabledReason =
    !isHost || !state || activeRound || canOwnerStartRound(state.players, playerId)
      ? ""
      : totalPlayers < minimumPlayersToStart
        ? "Waiting for players to join"
        : `Waiting for players to return to the lobby (${inLobbyCount}/${totalPlayers})`;

  const consumedRack = useMemo(
    () => new Set(rackIndicesForTypedWord(word, rackVisual)),
    [word, rackVisual]
  );

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
    clearBrowserLobbyPlayerId(lobbyId);
    if (playerId) {
      void lobbyApi.leave(lobbyId, playerId).catch(() => undefined);
    }
    router.push("/lobby");
  }, [lobbyId, playerId, router]);

  const preRoundCountdown = activeRound
    ? Math.ceil((new Date(activeRound.started_at).getTime() - nowMs) / 1000)
    : null;
  const isPreRound = preRoundCountdown !== null && preRoundCountdown > 0;
  const isWaiting = !activeRound;
  const needsJoin = !!state && playerLoaded && !me;
  const notYetLoaded = !state || !playerLoaded;

  /** Realtime can miss events; keep a tighter poll while waiting or during the shared countdown. */
  useEffect(() => {
    if (!lobbyId || (!isWaiting && !isPreRound)) return;
    const pollMs = isPreRound ? 250 : 500;
    const id = setInterval(() => void refresh(), pollMs);
    return () => clearInterval(id);
  }, [isPreRound, isWaiting, lobbyId, refresh]);

  const handleMatchJoin = useCallback(async (displayName: string) => {
    if (!state?.lobby.code) return;
    setError("");
    try {
      const sessionId = getOrCreateBrowserMultiplayerSessionId();
      const data = await lobbyApi.join(state.lobby.code, displayName, sessionId);
      setBrowserLobbyPlayerId(data.lobbyId, data.playerId);
      setPlayerId(data.playerId);
      void refresh();
    } catch (e) {
      setError((e as Error).message);
    }
  }, [state?.lobby.code, refresh]);

  /* ---- JOIN GATE ---- */
  if (isWaiting && (needsJoin || notYetLoaded)) {
    return (
      <div className="relative flex min-h-screen w-full flex-col items-center overflow-x-hidden">
        <main className="mx-auto flex min-h-[calc(100vh-6rem)] w-full max-w-md flex-col items-center justify-center px-6 pb-12 pt-24">
          {notYetLoaded ? (
            <p className="font-body text-sm text-on-surface-variant">Loading lobby...</p>
          ) : (
            <SurfaceCard className="space-y-4">
              <div className="space-y-2 text-center">
                <h2 className="font-headline text-2xl font-bold text-on-surface">Join lobby</h2>
                <p className="font-body text-sm text-on-surface-variant">
                  Code: <span className="font-headline font-bold tracking-wider text-primary">{state?.lobby.code}</span>
                </p>
              </div>
              <SessionNameForm onSubmit={handleMatchJoin} buttonLabel="Join" inputId="match-join-name" />
              {error ? <p className="text-center text-sm text-error">{error}</p> : null}
            </SurfaceCard>
          )}
        </main>
      </div>
    );
  }

  /* ---- SHARED PRE-ROUND COUNTDOWN ---- */
  if (isPreRound) {
    return (
      <div className="flex min-h-screen w-full flex-col items-center justify-center">
        <CountdownPulse value={preRoundCountdown} />
      </div>
    );
  }

  /* ---- WAITING ROOM ---- */
  if (isWaiting) {
    return (
      <div className="relative flex min-h-screen w-full flex-col items-center overflow-x-hidden">
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
              Players ({state?.players.length ?? 0}/10)
            </h3>
            <div className="flex flex-col gap-3">
              {[...(state?.players ?? [])]
                .sort((a, b) => Number(b.is_host) - Number(a.is_host) || b.score - a.score)
                .map((player) => (
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
                  {player.is_host ? (
                    <span className="font-label text-[10px] uppercase tracking-wider text-on-surface-variant">Host</span>
                  ) : null}
                  {!player.in_lobby ? (
                    <span className="font-label text-[10px] uppercase tracking-wider text-on-surface-variant/70">Away</span>
                  ) : null}
                  {player.id === playerId ? (
                    <span className="ml-auto font-label text-[10px] uppercase tracking-wider text-primary">You</span>
                  ) : null}
                </div>
              ))}
            </div>
          </SurfaceCard>

          {/* Waiting / Start */}
          <div className="flex w-full flex-col items-center gap-4">
            {me && !me.in_lobby ? (
              <div className="w-full max-w-sm">
                <SlabButton
                  variant="tan"
                  size="compact"
                  type="button"
                  onClick={() => {
                    setError("");
                    void lobbyApi
                      .returnToLobby(lobbyId, me.id)
                      .then(() => refresh())
                      .catch((e: Error) => setError(e.message));
                  }}
                >
                  Return to lobby
                </SlabButton>
              </div>
            ) : null}
            {isHost ? (
              <div className="flex w-full justify-center">
                <div className="flex w-full max-w-sm flex-col items-center gap-2">
                  {startDisabledReason ? (
                    <p className="text-center font-label text-[11px] uppercase tracking-[0.16em] text-on-surface-variant/70">
                      {startDisabledReason}
                    </p>
                  ) : null}
                  <SlabButton
                    variant="lavender"
                    size="compact"
                    type="button"
                    disabled={!canStart}
                    onClick={() => {
                      if (!playerId) return;
                      setError("");
                      void lobbyApi.start(lobbyId, playerId)
                        .then(() => refresh())
                        .then(async () => {
                          const startedAt = Date.now();
                          while (Date.now() - startedAt < 5000) {
                            const snapshot = await lobbyApi.state(lobbyId);
                            setState(snapshot);
                            if (snapshot.round?.status === "active") return;
                            await new Promise((r) => setTimeout(r, 350));
                          }
                        })
                        .catch((e: Error) => setError(e.message));
                    }}
                >
                  <span>Start game</span>
                  </SlabButton>
                </div>
              </div>
            ) : (
              <p className="font-body text-sm text-on-surface-variant">
                {inLobbyCount >= totalPlayers
                  ? "Waiting for host to start..."
                  : `Waiting for players to return to the lobby (${inLobbyCount}/${totalPlayers})`}
                <span className="waiting-dots"></span>
              </p>
            )}
          </div>

          {/* Leave */}
          <NavLinkButton type="button" tone="leave" onClick={handleLeave}>
            {state?.players.length === 1 ? "Disband lobby" : "Leave lobby"}
          </NavLinkButton>

          {error ? <p className="text-center text-sm text-error">{error}</p> : null}
        </main>
      </div>
    );
  }

  /* ---- ACTIVE ROUND ---- */
  return (
    <>
      <main className="relative mx-auto min-h-[calc(100dvh-3rem)] w-full max-w-[1600px] px-4 pb-20 pt-20 lg:px-6 lg:pt-24">
        <aside className="mb-10 flex w-full justify-center lg:mb-0 lg:absolute lg:left-12 lg:top-24 lg:z-10 lg:block lg:w-auto lg:justify-start xl:left-20 2xl:left-24">
          <div className="w-full max-w-[260px] sm:max-w-[280px]">
            <StickyScoreboard points={displayedPoints} wordsFound={displayedWordsFound} lastWord={displayedLastWord} />
          </div>
        </aside>

        <div className="flex w-full flex-col items-center gap-12">
          {activeRound ? (
            <>
              <div className="flex w-full flex-col items-center gap-4">
                <div className="relative flex h-32 w-32 shrink-0 items-center justify-center">
                  <svg className="pointer-events-none absolute inset-0 h-full w-full -rotate-90" aria-hidden>
                    <circle className="text-outline/20" cx="64" cy="64" fill="none" r="60" stroke="currentColor" strokeWidth="6" />
                    <circle
                      className="text-primary transition-[stroke-dashoffset] duration-300"
                      cx="64"
                      cy="64"
                      fill="none"
                      r="60"
                      stroke="currentColor"
                      strokeDasharray={String(TIMER_CIRC)}
                      strokeDashoffset={timerStrokeDashoffset}
                      strokeWidth="6"
                    />
                  </svg>
                  <div className="relative z-10 flex flex-col items-center justify-center gap-1 px-1 text-center">
                    <span className="font-label text-[11px] uppercase tracking-[0.2em] text-on-surface-variant">Timer</span>
                    <span className="font-headline text-3xl font-bold leading-none tabular-nums text-on-surface">{timerLabel}</span>
                  </div>
                </div>
              </div>

              <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-2">
                <SubmissionFeedback
                  message={successFlash || error}
                  tone={successFlash ? "success" : "error"}
                  className="w-full"
                />
                <RoundRackAndSlots
                  word={word}
                  displayRack={rackVisual}
                  dealt={dealt}
                  slotRefs={slotRefs}
                  rackBtnRefs={rackBtnRefs}
                  consumedRack={consumedRack}
                  onRackLetter={(letter) => {
                    setWord((value) => {
                      if (value.length >= 6) return value;
                      const rack = displayRack || activeRound.rack;
                      if (!canAppendFromRack(value, letter, rack)) return value;
                      return `${value}${letter}`;
                    });
                  }}
                />
              </div>

              <div className="game-actions">
                <button
                  className={pressedAction === "shuffle" ? "game-action-pressed" : ""}
                  type="button"
                  onClick={() => setDisplayRack((value) => shuffleRack(value || activeRound.rack))}
                >
                  <span>Shuffle</span>
                  <span className="game-actions__key">Shift</span>
                </button>
                <button
                  className={`game-submit ${pressedAction === "submit" ? "game-action-pressed" : ""}`.trim()}
                  type="button"
                  onClick={() => void submitWord()}
                >
                  <span>Submit</span>
                  <span className="game-actions__key">Enter</span>
                </button>
                <button className={pressedAction === "clear" ? "game-action-pressed" : ""} type="button" onClick={() => setWord("")}>
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
