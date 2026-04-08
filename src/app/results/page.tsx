"use client";

// Swagrams — post-match results

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { usePageTransition } from "@/components/PageTransition";
import { NavLinkButton } from "@/components/ui/NavLinkButton";
import { SlabButton } from "@/components/ui/SlabButton";
import { SurfaceCard } from "@/components/ui/SurfaceCard";
import { lobbyApi, type LobbySnapshot } from "@/lib/multiplayer/api";
import { CURATED_ANSWERS } from "@/lib/words/pools";

const SOLO_STORAGE_KEY = "swagrams_solo_result";

type SoloResult = {
  rack: string;
  score: number;
  words: string[];
};

function computeMissedWords(rack: string, submittedWords: string[]): string[] {
  const key = rack.split("").sort().join("");
  const curated = CURATED_ANSWERS.get(key) ?? new Set<string>();
  const submitted = new Set(submittedWords.map((w) => w.toLowerCase()));
  return [...curated].filter((w) => !submitted.has(w));
}

function longestWord(words: string[]): string {
  if (!words.length) return "—";
  return words.reduce((best, w) => (w.length > best.length ? w : best), "");
}

function ResultsInner() {
  const search = useSearchParams();
  const router = useRouter();
  const { navigateHome } = usePageTransition();
  const lobbyId = search.get("lobbyId");

  const [mpState, setMpState] = useState<LobbySnapshot | null>(null);
  const [soloResult, setSoloResult] = useState<SoloResult | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [lengthFilter, setLengthFilter] = useState<6 | 5 | 4 | 3>(6);
  const [myPlayerId, setMyPlayerId] = useState<string | null>(null);
  const [lbName, setLbName] = useState("");
  const [lbNameTouched, setLbNameTouched] = useState(false);
  const [lbLoading, setLbLoading] = useState(false);
  const [lbError, setLbError] = useState<string | null>(null);
  const [lbSuccess, setLbSuccess] = useState(false);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const [soloDataChecked, setSoloDataChecked] = useState(false);

  useEffect(() => {
    if (lobbyId) {
      lobbyApi.state(lobbyId).then(setMpState).catch(() => undefined);
      return;
    }
    const t = window.setTimeout(() => {
      const raw = sessionStorage.getItem(SOLO_STORAGE_KEY);
      if (raw) {
        try {
          setSoloResult(JSON.parse(raw) as SoloResult);
        } catch {
          // malformed storage — ignore
        }
      }
      setSoloDataChecked(true);
    }, 0);
    return () => clearTimeout(t);
  }, [lobbyId]);

  useEffect(() => {
    if (lobbyId) {
      setMyPlayerId(localStorage.getItem("player_id"));
    }
  }, [lobbyId]);

  const isSolo = !lobbyId;

  const myPlayer =
    !isSolo && mpState && myPlayerId ? mpState.players.find((p) => p.id === myPlayerId) : undefined;

  const leaderboardScore = isSolo ? (soloResult?.score ?? null) : (myPlayer ? myPlayer.score : null);

  const leaderboardDedupeKey =
    isSolo && soloResult
      ? `swagrams_leaderboard_submitted:solo:${soloResult.rack}:${soloResult.score}`
      : lobbyId
        ? `swagrams_leaderboard_submitted:mp:${lobbyId}`
        : "";

  useEffect(() => {
    if (!leaderboardDedupeKey) return;
    setAlreadySubmitted(sessionStorage.getItem(leaderboardDedupeKey) === "1");
  }, [leaderboardDedupeKey]);

  useEffect(() => {
    if (lbNameTouched) return;
    if (!isSolo && myPlayer?.display_name) setLbName(myPlayer.display_name);
  }, [isSolo, myPlayer?.display_name, lbNameTouched]);

  const finalScore = isSolo
    ? (soloResult?.score ?? 0)
    : (mpState?.players?.length
        ? Math.max(...mpState.players.map((p) => p.score))
        : 0);

  const submittedWords: string[] = isSolo
    ? (soloResult?.words ?? [])
    : (mpState?.submissions?.map((s) => s.word) ?? []);

  const rack: string = isSolo
    ? (soloResult?.rack ?? "")
    : (mpState?.round?.rack ?? "");

  const missedWords = rack ? computeMissedWords(rack, submittedWords) : [];
  const longest = longestWord(submittedWords);

  const handlePlayAgain = () => {
    if (isSolo) {
      sessionStorage.removeItem(SOLO_STORAGE_KEY);
      router.push("/solo");
    } else {
      router.push(`/match/${lobbyId}`);
    }
  };

  const canShowLeaderboardForm =
    leaderboardScore !== null && (isSolo ? soloResult !== null : mpState !== null && myPlayer !== undefined);

  const mpMissingPlayer = !isSolo && mpState !== null && myPlayer === undefined;

  const soloNothingToSubmit = isSolo && soloDataChecked && !soloResult;

  const handleLeaderboardSubmit = async () => {
    setLbError(null);
    const trimmed = lbName.trim();
    if (trimmed.length < 2) {
      setLbError("Enter a name (2–24 characters).");
      return;
    }
    if (trimmed.length > 24) {
      setLbError("Name must be at most 24 characters.");
      return;
    }
    if (leaderboardScore === null || !canShowLeaderboardForm) return;

    setLbLoading(true);
    try {
      const res = await fetch("/api/leaderboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: trimmed,
          score: leaderboardScore,
          mode: isSolo ? "solo" : "multiplayer"
        })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Submit failed");
      if (leaderboardDedupeKey) sessionStorage.setItem(leaderboardDedupeKey, "1");
      setAlreadySubmitted(true);
      setLbSuccess(true);
    } catch (e) {
      setLbError((e as Error).message);
    } finally {
      setLbLoading(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-2 bg-background px-4 pb-4 pt-14 lg:h-[100dvh] lg:max-h-[100dvh] lg:min-h-0 lg:overflow-hidden lg:pb-3 lg:pt-11">
      <div className="fixed left-0 top-0 z-50 px-6 py-4">
        <NavLinkButton type="button" onClick={navigateHome}>
          ← Home
        </NavLinkButton>
      </div>

      <SurfaceCard className="flex min-h-0 flex-1 flex-col gap-2 overflow-visible p-4 sm:p-5 lg:min-h-0">
        <div className="grid min-h-0 flex-1 gap-4 overflow-visible lg:grid-cols-[minmax(0,3fr)_minmax(220px,2fr)] lg:items-start lg:gap-6">
          {/* Left: final score + missed words */}
          <div className="flex min-h-0 flex-col gap-3 lg:max-h-full lg:min-h-0">
            <div className="relative w-full shrink-0 overflow-hidden rounded-xl bg-secondary p-4 study-shadow wood-grain sm:p-5">
              <div className="relative z-10 flex flex-col gap-0.5">
                <span className="text-on-secondary font-headline text-[10px] font-bold uppercase tracking-widest opacity-70 sm:text-xs">
                  Final Score
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-on-secondary font-headline text-5xl font-extrabold tabular-nums sm:text-6xl lg:text-5xl xl:text-6xl">
                    {finalScore}
                  </span>
                  <span className="text-on-secondary font-body text-lg font-medium opacity-60">pts</span>
                </div>
              </div>
              <div className="relative z-10 mt-3 flex gap-8 sm:gap-10">
                <div className="flex flex-col">
                  <span className="text-on-secondary font-headline text-[10px] font-bold opacity-60 sm:text-xs">Words Found</span>
                  <span className="text-on-secondary font-headline text-xl font-bold sm:text-2xl">{submittedWords.length}</span>
                </div>
                <div className="flex min-w-0 flex-col">
                  <span className="text-on-secondary font-headline text-[10px] font-bold opacity-60 sm:text-xs">Longest Word</span>
                  <span className="truncate text-on-secondary font-headline text-xl font-bold sm:text-2xl">
                    {longest.toUpperCase()}
                  </span>
                </div>
              </div>
              <div className="pointer-events-none absolute -bottom-4 -right-4 opacity-10">
                <span className="material-symbols-outlined text-[80px] sm:text-[100px]" data-icon="auto_stories">
                  auto_stories
                </span>
              </div>
            </div>

            <div className="relative flex min-h-[11rem] flex-1 flex-col overflow-visible lg:min-h-0">
              <div className="sticky-note relative flex h-full min-h-0 flex-1 flex-col -rotate-1 p-4 sm:p-5">
                <div className="sticky-note__texture" aria-hidden />
                <div className="sticky-note__pin" aria-hidden />
                <div className="relative z-10 flex shrink-0 flex-col gap-3 pb-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
                  <h2 className="font-headline text-lg font-bold text-on-tertiary-fixed sm:text-xl">Missed Words</h2>
                  <button
                    className="flex w-fit items-center gap-2 rounded-lg bg-on-tertiary-fixed/5 px-3 py-1.5 transition-colors hover:bg-on-tertiary-fixed/10"
                    type="button"
                    onClick={() => setRevealed((v) => !v)}
                  >
                    <span className="material-symbols-outlined text-sm text-on-tertiary-fixed" data-icon="visibility">
                      visibility
                    </span>
                    <span className="font-headline text-xs font-bold text-on-tertiary-fixed sm:text-sm">
                      {revealed ? "Hide" : "Reveal"}
                    </span>
                  </button>
                </div>

                <div className="relative z-10 mb-2 flex shrink-0 flex-wrap gap-1.5 sm:gap-2">
                  {([6, 5, 4, 3] as const).map((len) => {
                    const active = lengthFilter === len;
                    const count = missedWords.filter((w) => w.length === len).length;
                    return (
                      <button
                        key={len}
                        type="button"
                        onClick={() => setLengthFilter(len)}
                        className={`flex items-center gap-1 rounded-lg px-2.5 py-1 font-headline text-xs font-bold transition-colors sm:px-3 sm:py-1.5 sm:text-sm ${
                          active
                            ? "bg-on-tertiary-fixed text-tertiary-fixed"
                            : "bg-on-tertiary-fixed/5 text-on-tertiary-fixed hover:bg-on-tertiary-fixed/10"
                        }`}
                      >
                        <span>{len}</span>
                        <span className={`tabular-nums text-[10px] font-semibold sm:text-xs ${active ? "opacity-80" : "opacity-50"}`}>
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="relative z-10 min-h-0 flex-1 overflow-y-auto pr-1">
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1 sm:grid-cols-3">
                    {(() => {
                      const filtered = missedWords.filter((w) => w.length === lengthFilter);

                      if (filtered.length === 0) {
                        return (
                          <p className="col-span-full font-body text-xs italic text-on-tertiary-fixed/50 sm:text-sm">
                            {rack ? "You found them all!" : "No data available."}
                          </p>
                        );
                      }

                      return filtered.map((word, idx) => (
                        <div
                          key={`${word}-${idx}`}
                          className="flex items-center gap-1.5 border-b border-on-tertiary-fixed/5 pb-0.5 font-body text-xs italic text-on-tertiary-fixed sm:text-sm"
                          style={revealed ? undefined : { filter: "blur(4px)", userSelect: "none" }}
                        >
                          <span className="h-1 w-1 shrink-0 rounded-full bg-on-tertiary-fixed/20"></span>
                          <span className="truncate">{word.toUpperCase()}</span>
                        </div>
                      ));
                    })()}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right: leaderboard sticky (tilt opposite missed words) */}
          <div className="flex w-full flex-col overflow-visible">
            <div className="sticky-note relative flex flex-col rotate-1 overflow-visible p-4 sm:p-5">
              <div className="sticky-note__texture" aria-hidden />
              <div className="sticky-note__pin" aria-hidden />

              <div className="relative z-10 flex flex-col gap-3 pb-1 pt-2">
                <h3 className="shrink-0 border-b border-on-tertiary-fixed-variant/20 pb-2 font-headline text-lg font-bold text-on-tertiary-fixed">
                  Leaderboard
                </h3>

                {soloNothingToSubmit ? (
                  <p className="font-body text-xs text-on-tertiary-fixed/70 sm:text-sm">
                    No solo game to submit — play a round first.
                  </p>
                ) : mpMissingPlayer ? (
                  <p className="font-body text-xs text-on-tertiary-fixed/70 sm:text-sm">
                    Open results on the device you played from to submit your score.
                  </p>
                ) : !canShowLeaderboardForm ? (
                  <p className="font-body text-xs italic text-on-tertiary-fixed/50 sm:text-sm">Loading your results…</p>
                ) : alreadySubmitted || lbSuccess ? (
                  <p className="font-body text-sm text-on-tertiary-fixed">Thanks — you&apos;re on the board.</p>
                ) : (
                  <>
                    <p className="font-body text-xs text-on-tertiary-fixed-variant sm:text-sm">
                      Your score:{" "}
                      <span className="font-headline font-bold tabular-nums text-on-tertiary-fixed">{leaderboardScore}</span>
                    </p>
                    <label className="block shrink-0 font-body text-[10px] font-medium text-on-tertiary-fixed-variant sm:text-xs">
                      Name for the leaderboard
                      <input
                        type="text"
                        maxLength={24}
                        value={lbName}
                        onChange={(e) => {
                          setLbNameTouched(true);
                          setLbName(e.target.value);
                        }}
                        placeholder="Your name"
                        className="mt-1 w-full rounded-lg border border-on-tertiary-fixed/20 bg-on-tertiary-fixed/5 px-2.5 py-1.5 font-body text-sm text-on-tertiary-fixed placeholder:text-on-tertiary-fixed/35 focus:border-on-tertiary-fixed/40 focus:outline-none"
                      />
                    </label>
                    {lbError ? <p className="font-body text-xs text-error sm:text-sm">{lbError}</p> : null}
                    <SlabButton
                      variant="lavender"
                      size="compact"
                      type="button"
                      disabled={lbLoading}
                      onClick={handleLeaderboardSubmit}
                      className="mt-1 w-full shrink-0 !gap-1 !px-3 !py-2 !text-xs !shadow-[0_8px_0_var(--slab-lavender-shadow)] active:!translate-y-[6px] active:!shadow-[0_2px_0_var(--slab-lavender-shadow)] sm:!text-sm"
                    >
                      <span>{lbLoading ? "Submitting…" : "Submit score"}</span>
                    </SlabButton>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 justify-center border-t border-outline-variant/10 pt-2">
          <SlabButton
            variant="tan"
            size="compact"
            type="button"
            onClick={handlePlayAgain}
            className="max-w-[14rem] !py-2 !text-sm !shadow-[0_5px_0_var(--slab-tan-shadow)] active:!translate-y-[3px] active:!shadow-[0_2px_0_var(--slab-tan-shadow)]"
          >
            <span>Play again</span>
          </SlabButton>
        </div>
      </SurfaceCard>
    </main>
  );
}

export default function ResultsPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col items-center justify-center px-4 pb-6 pt-24">
          <SurfaceCard className="max-w-md text-center font-body text-on-surface-variant">Loading…</SurfaceCard>
        </main>
      }
    >
      <ResultsInner />
    </Suspense>
  );
}
