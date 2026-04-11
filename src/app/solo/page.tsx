"use client";

// Swagrams — solo play

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { usePageTransition } from "@/components/PageTransition";
import { NavLinkButton } from "@/components/ui/NavLinkButton";
import { CountdownPulse } from "@/components/game/CountdownPulse";
import { StickyScoreboard } from "@/components/game/StickyScoreboard";
import { SubmissionFeedback } from "@/components/game/SubmissionFeedback";
import { RoundRackAndSlots } from "@/components/game/RoundRackAndSlots";
import { TileFlightLayer, type TileFlightPayload } from "@/components/game/TileFlightLayer";
import { useGameActionPress } from "@/lib/hooks/useGameActionPress";
import { useSoloGame } from "@/lib/hooks/useSoloGame";
import { rackIndicesForTypedWord } from "@/lib/game/engine";

const TIMER_CIRCUMFERENCE = 377;

function SoloPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawDifficulty = searchParams.get("difficulty");
  const difficulty = rawDifficulty === "easy" || rawDifficulty === "hard" ? rawDifficulty : undefined;
  const { navigateHome } = usePageTransition();
  const { pressedAction, flashAction } = useGameActionPress();
  const {
    active,
    started,
    completed,
    countdown,
    timerLabel,
    timerProgress,
    score,
    wordsFound,
    lastWord,
    error,
    successFlash,
    displayRack,
    rack,
    typed,
    submittedWords,
    submit,
    clearWord,
    shuffleRack,
    typeChar,
    difficulty: roundDifficulty
  } = useSoloGame({ autoStart: true, onActionFlash: flashAction, difficulty });

  const [flight, setFlight] = useState<TileFlightPayload | null>(null);
  const flightId = useRef(0);
  const prevTypedLen = useRef(0);
  const prevTypedStr = useRef("");
  const rackBtnRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const slotRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [dealt, setDealt] = useState(false);

  const consumedRack = useMemo(() => new Set(rackIndicesForTypedWord(typed, displayRack)), [typed, displayRack]);

  useEffect(() => {
    if (active && !dealt) {
      const t = window.setTimeout(() => setDealt(true), 500);
      return () => clearTimeout(t);
    }
  }, [active, dealt]);

  useEffect(() => {
    if (!completed) return;
    sessionStorage.setItem(
      "swagrams_solo_result",
      JSON.stringify({ rack, score, words: submittedWords, difficulty: roundDifficulty })
    );
    router.push("/results");
  }, [completed, rack, score, submittedWords, router]);

  useEffect(() => {
    if (!active) {
      prevTypedLen.current = typed.length;
      prevTypedStr.current = typed;
      return;
    }

    const prevLen = prevTypedLen.current;
    const curLen = typed.length;

    if (curLen > prevLen) {
      const indices = rackIndicesForTypedWord(typed, displayRack);
      const rackIdx = indices[indices.length - 1];
      const slotIdx = curLen - 1;
      const ch = typed[slotIdx];
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
    } else if (curLen < prevLen) {
      const removedChar = prevTypedStr.current[prevLen - 1];
      const prevIndices = rackIndicesForTypedWord(prevTypedStr.current, displayRack);
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

    prevTypedLen.current = curLen;
    prevTypedStr.current = typed;
  }, [typed, active, displayRack]);

  const clearFlight = useCallback(() => setFlight(null), []);

  const strokeDashoffset = String((1 - timerProgress) * TIMER_CIRCUMFERENCE);

  const showCountdown = countdown !== null;
  const showPlayfield = active;

  return (
    <>
      <div className="fixed left-0 top-0 z-50 px-6 py-4">
        <NavLinkButton type="button" onClick={navigateHome}>
          ← Home
        </NavLinkButton>
      </div>

      <main className="relative mx-auto min-h-[calc(100dvh-3rem)] w-full max-w-[1600px] px-4 pb-20 pt-20 lg:px-6 lg:pt-24">
        {started ? (
          <aside className="mb-10 flex w-full justify-center lg:mb-0 lg:absolute lg:left-12 lg:top-24 lg:z-10 lg:block lg:w-auto lg:justify-start xl:left-20 2xl:left-24">
            <div className="w-full max-w-[260px] sm:max-w-[280px]">
              <StickyScoreboard points={score} wordsFound={wordsFound} lastWord={lastWord} />
            </div>
          </aside>
        ) : null}

        <div className="flex w-full flex-col items-center gap-12">
          {showCountdown ? (
            <div className="flex min-h-[calc(100dvh-7rem)] w-full flex-col items-center justify-center">
              <CountdownPulse value={countdown!} className="w-full" />
            </div>
          ) : null}

          {showPlayfield ? (
            <>
              <div className="flex w-full flex-col items-center gap-4">
                <div className="relative flex h-32 w-32 shrink-0 items-center justify-center">
                  <svg className="pointer-events-none absolute inset-0 h-full w-full -rotate-90" aria-hidden>
                    <circle className="text-outline/20" cx="64" cy="64" fill="none" r="60" stroke="currentColor" strokeWidth="6"></circle>
                    <circle
                      className="text-primary transition-all duration-1000"
                      cx="64"
                      cy="64"
                      fill="none"
                      r="60"
                      stroke="currentColor"
                      strokeDasharray="377"
                      strokeDashoffset={strokeDashoffset}
                      strokeWidth="6"
                    ></circle>
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
                  word={typed}
                  displayRack={displayRack}
                  dealt={dealt}
                  slotRefs={slotRefs}
                  rackBtnRefs={rackBtnRefs}
                  consumedRack={consumedRack}
                  onRackLetter={typeChar}
                />
              </div>

              <div className="game-actions">
                <button className={pressedAction === "shuffle" ? "game-action-pressed" : ""} type="button" onClick={shuffleRack}>
                  <span>Shuffle</span>
                  <span className="game-actions__key">Shift</span>
                </button>
                <button className={`game-submit ${pressedAction === "submit" ? "game-action-pressed" : ""}`.trim()} type="button" onClick={() => void submit()}>
                  <span>Submit</span>
                  <span className="game-actions__key">Enter</span>
                </button>
                <button className={pressedAction === "clear" ? "game-action-pressed" : ""} type="button" onClick={clearWord}>
                  <span>Clear</span>
                  <span className="game-actions__key">Esc</span>
                </button>
              </div>
            </>
          ) : null}

          {flight ? <TileFlightLayer key={flight.id} flight={flight} onComplete={clearFlight} /> : null}
        </div>
      </main>
    </>
  );
}

export default function SoloPage() {
  return (
    <Suspense>
      <SoloPageInner />
    </Suspense>
  );
}
