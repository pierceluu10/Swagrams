"use client";

// Swagrams — multiplayer match

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { RackView } from "@/components/RackView";
import { StickyScoreboard } from "@/components/stitch/StickyScoreboard";
import { TimerRing } from "@/components/stitch/TimerRing";
import { WordSlots } from "@/components/stitch/WordSlots";
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
  const lobbyId = params.lobbyId;

  const [state, setState] = useState<LobbySnapshot | null>(null);
  const [word, setWord] = useState("");
  const [error, setError] = useState("");
  const [displayRack, setDisplayRack] = useState("");
  const [countdown, setCountdown] = useState<number | null>(null);
  const [playerId, setPlayerId] = useState("");
  const [nowMs, setNowMs] = useState(() => Date.now());
  const hasSeenActiveRound = useRef(false);

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
  const lobbyStatus = useMemo(() => state?.lobby.status ?? "waiting", [state?.lobby.status]);

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8">
      <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12">
        <div className="lg:col-span-3">
          <StickyScoreboard points={me?.score ?? 0} wordsFound={wordsFound} lastWord={lastWord} />
        </div>

        <div className="flex flex-col items-center gap-8 lg:col-span-9">
          <TimerRing
            remainingMs={activeRound ? remaining : 0}
            totalMs={activeRound ? totalMs : 60_000}
            label={formatTime(activeRound ? remaining : 0)}
          />

          <p className="w-full text-center font-body text-sm text-on-surface-variant">
            Lobby {state?.lobby.code ?? "…"} · {lobbyStatus}
          </p>

          {!activeRound && countdown === null ? (
            <button
              type="button"
              className="stitch-start-btn"
              onClick={() => setCountdown(3)}
              disabled={!canStart}
            >
              Start
            </button>
          ) : null}

          {countdown !== null ? <p className="stitch-countdown">{countdown}</p> : null}

          {activeRound ? (
            <>
              <WordSlots word={word} />
              <RackView rack={displayRack || activeRound.rack} />

              <div className="stitch-actions">
                <button type="button" onClick={() => setDisplayRack((value) => shuffleRack(value || activeRound.rack))}>
                  <span>Shuffle</span>
                  <span className="stitch-actions__key">Shift</span>
                </button>
                <button className="stitch-submit" type="button" onClick={() => void submitWord()}>
                  <span>Submit</span>
                  <span className="stitch-actions__key">Enter</span>
                </button>
                <button type="button" onClick={() => setWord("")}>
                  <span>Clear</span>
                  <span className="stitch-actions__key">Esc</span>
                </button>
              </div>
            </>
          ) : (
            <p className="text-center font-body text-sm text-on-surface-variant">Waiting for round start.</p>
          )}

          <div className="row wrap center" style={{ justifyContent: "center", marginTop: 8 }}>
            <button type="button" onClick={() => void lobbyApi.toggleReady(lobbyId, playerId, !me?.is_ready)}>
              {me?.is_ready ? "Unready" : "Ready"}
            </button>
          </div>

          <div className="row wrap center" style={{ justifyContent: "center" }}>
            <Link href={`/results?lobbyId=${lobbyId}`} className="subtle" style={{ fontSize: "0.85rem" }}>
              Summary
            </Link>
            <button type="button" className="ghost" onClick={() => router.push("/lobby")}>
              Leave
            </button>
          </div>

          {error ? <p className="error center">{error}</p> : null}
        </div>
      </div>
    </main>
  );
}
