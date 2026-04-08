"use client";

// Swagrams — solo play

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { usePageTransition } from "@/components/PageTransition";
import { NavLinkButton } from "@/components/ui/NavLinkButton";
import { CountdownPulse } from "@/components/stitch/CountdownPulse";
import { StickyScoreboard } from "@/components/stitch/StickyScoreboard";
import { SubmissionFeedback } from "@/components/stitch/SubmissionFeedback";
import { TileFlightLayer, type TileFlightPayload } from "@/components/stitch/TileFlightLayer";
import { useSoloStitchGame } from "@/lib/hooks/useSoloStitchGame";
import { rackIndicesForTypedWord } from "@/lib/game/engine";

const TIMER_CIRCUMFERENCE = 377;

export default function SoloPage() {
  const router = useRouter();
  const { navigateHome } = usePageTransition();
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
    slotLetters,
    letterButtons,
    displayRack,
    rack,
    typed,
    submittedWords,
    submit,
    clearWord,
    shuffleRack,
    typeChar
  } = useSoloStitchGame({ autoStart: true });

  const [flight, setFlight] = useState<TileFlightPayload | null>(null);
  const flightId = useRef(0);
  const prevTypedLen = useRef(0);
  const prevTypedStr = useRef("");
  const rackBtnRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const slotRefs = useRef<(HTMLDivElement | null)[]>([]);

  const consumedRack = useMemo(() => new Set(rackIndicesForTypedWord(typed, displayRack)), [typed, displayRack]);

  useEffect(() => {
    if (!completed) return;
    sessionStorage.setItem(
      "swagrams_solo_result",
      JSON.stringify({ rack, score, words: submittedWords })
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

  const slotCallbacks = useMemo(
    () => Array.from({ length: 6 }, (_, i) => (el: HTMLDivElement | null) => {
      slotRefs.current[i] = el;
    }),
    []
  );

  const rackCallbacks = useMemo(
    () =>
      Array.from({ length: 6 }, (_, i) => (el: HTMLButtonElement | null) => {
        rackBtnRefs.current[i] = el;
      }),
    []
  );

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
                <SubmissionFeedback message={error} className="w-full" />
                <div className="w-full">
                  <div className="flex justify-center gap-3 rounded-2xl border border-outline-variant/10 bg-surface-container-lowest p-6 shadow-2xl">
                    {slotLetters.map((ch, idx) => (
                      <div
                        key={idx}
                        ref={slotCallbacks[idx]}
                        className={`flex h-20 w-16 items-center justify-center rounded-lg border-b-4 shadow-inner transition-colors duration-150 ${
                          ch
                            ? "border-[#b59a6d] bg-secondary"
                            : "border-surface-container-highest bg-surface-container"
                        }`}
                      >
                        {ch ? (
                          <span className="font-headline text-3xl font-extrabold text-on-secondary letter-pop">{ch}</span>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mx-auto grid w-max grid-cols-6 gap-3 sm:gap-4">
                {letterButtons.map((letter, idx) => {
                  const used = consumedRack.has(idx);
                  return (
                    <button
                      key={`${letter}-${idx}`}
                      ref={rackCallbacks[idx]}
                      type="button"
                      disabled={used}
                      className={`relative flex h-20 w-20 items-center justify-center rounded-xl transition-all duration-150 group ${
                        used
                          ? "scale-90 bg-surface-container-high opacity-30 shadow-none"
                          : "bg-secondary shadow-[0_8px_0_#b59a6d] hover:translate-y-[4px] hover:shadow-[0_4px_0_#b59a6d] active:translate-y-[8px] active:shadow-none"
                      }`}
                      onClick={() => typeChar(letter.toLowerCase())}
                    >
                      {!used ? <div className="grain-overlay absolute inset-0 rounded-xl opacity-5 transition-opacity group-hover:opacity-10"></div> : null}
                      <span className={`font-headline text-3xl font-extrabold ${used ? "text-on-surface-variant/50" : "text-on-secondary"}`}>{letter}</span>
                    </button>
                  );
                })}
              </div>

              <div className="stitch-actions">
                <button type="button" onClick={shuffleRack}>
                  <span>Shuffle</span>
                  <span className="stitch-actions__key">Shift</span>
                </button>
                <button className="stitch-submit" type="button" onClick={() => void submit()}>
                  <span>Submit</span>
                  <span className="stitch-actions__key">Enter</span>
                </button>
                <button type="button" onClick={clearWord}>
                  <span>Clear</span>
                  <span className="stitch-actions__key">Esc</span>
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
