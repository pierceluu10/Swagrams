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
    }, 0);
    return () => clearTimeout(t);
  }, [lobbyId]);

  const isSolo = !lobbyId;

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

  return (
    <main className="mx-auto flex h-screen w-full max-w-5xl flex-col gap-5 overflow-y-auto px-4 pb-6 pt-6">
      <div className="fixed left-0 top-0 z-50 px-6 py-4">
        <NavLinkButton type="button" onClick={navigateHome}>
          ← Home
        </NavLinkButton>
      </div>
      <section className="flex flex-col items-center text-center">
        <h1 className="font-headline text-4xl font-extrabold leading-none tracking-tight text-primary sm:text-5xl">GG</h1>
      </section>

      <SurfaceCard className="space-y-5">
        <div className="relative w-full max-w-2xl overflow-hidden rounded-xl bg-secondary p-6 study-shadow wood-grain">
          <div className="relative z-10 flex flex-col gap-1">
            <span className="text-on-secondary font-headline text-xs font-bold uppercase tracking-widest opacity-70">Final Score</span>
            <div className="flex items-baseline gap-2">
              <span className="text-on-secondary font-headline text-7xl font-extrabold">{finalScore}</span>
              <span className="text-on-secondary font-body text-xl font-medium opacity-60">pts</span>
            </div>
          </div>
          <div className="relative z-10 mt-6 flex gap-10">
            <div className="flex flex-col">
              <span className="text-on-secondary font-headline text-xs font-bold opacity-60">Words Found</span>
              <span className="text-on-secondary font-headline text-2xl font-bold">{submittedWords.length}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-on-secondary font-headline text-xs font-bold opacity-60">Longest Word</span>
              <span className="text-on-secondary font-headline text-2xl font-bold">{longest.toUpperCase()}</span>
            </div>
          </div>
          <div className="absolute -bottom-4 -right-4 opacity-10">
            <span className="material-symbols-outlined text-[120px]" data-icon="auto_stories">
              auto_stories
            </span>
          </div>
        </div>

        <div className="w-full max-w-2xl">
          <div className="relative -rotate-1 rounded-lg border-t-8 border-error/20 bg-tertiary-fixed p-6 study-shadow">
            <div className="absolute -top-3 left-1/2 h-6 w-6 -translate-x-1/2 rounded-full border-2 border-on-error/10 bg-error shadow-inner"></div>
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="font-headline text-xl font-bold text-on-tertiary-fixed">Missed Words</h2>
              <button
                className="flex items-center gap-2 rounded-lg bg-on-tertiary-fixed/5 px-4 py-2 transition-colors hover:bg-on-tertiary-fixed/10"
                type="button"
                onClick={() => setRevealed((v) => !v)}
              >
                <span className="material-symbols-outlined text-sm text-on-tertiary-fixed" data-icon="visibility">
                  visibility
                </span>
                <span className="font-headline text-sm font-bold text-on-tertiary-fixed">{revealed ? "Hide" : "Reveal"}</span>
              </button>
            </div>

            <div className="mb-4 flex gap-2">
              {([6, 5, 4, 3] as const).map((len) => {
                const active = lengthFilter === len;
                const count = missedWords.filter((w) => w.length === len).length;
                return (
                  <button
                    key={len}
                    type="button"
                    onClick={() => setLengthFilter(len)}
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-headline text-sm font-bold transition-colors ${
                      active
                        ? "bg-on-tertiary-fixed text-tertiary-fixed"
                        : "bg-on-tertiary-fixed/5 text-on-tertiary-fixed hover:bg-on-tertiary-fixed/10"
                    }`}
                  >
                    <span>{len}</span>
                    <span className={`tabular-nums text-xs font-semibold ${active ? "opacity-80" : "opacity-50"}`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {(() => {
                const filtered = missedWords.filter((w) => w.length === lengthFilter);

                if (filtered.length === 0) {
                  return (
                    <p className="col-span-full font-body text-sm italic text-on-tertiary-fixed/50">
                      {rack ? "You found them all!" : "No data available."}
                    </p>
                  );
                }

                return filtered.map((word, idx) => (
                  <div
                    key={`${word}-${idx}`}
                    className="flex items-center gap-2 border-b border-on-tertiary-fixed/5 pb-1 font-body italic text-on-tertiary-fixed"
                    style={revealed ? undefined : { filter: "blur(4px)", userSelect: "none" }}
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-on-tertiary-fixed/20"></span>
                    <span>{word.toUpperCase()}</span>
                  </div>
                ));
              })()}
            </div>

            <div className="mt-6 flex justify-center">
              <SlabButton variant="tan" size="compact" type="button" onClick={handlePlayAgain} className="max-w-xs">
                <span>Play again</span>
              </SlabButton>
            </div>
          </div>
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
