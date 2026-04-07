"use client";

// Swagrams — solo play

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { StickyScoreboard } from "@/components/stitch/StickyScoreboard";
import { useSoloStitchGame } from "@/lib/hooks/useSoloStitchGame";

const TIMER_CIRCUMFERENCE = 377;

export default function SoloPage() {
  const router = useRouter();
  const {
    active,
    completed,
    countdown,
    start,
    timerLabel,
    timerProgress,
    score,
    wordsFound,
    lastWord,
    slotLetters,
    letterButtons,
    rack,
    submittedWords,
    submit,
    clearWord,
    shuffleRack,
    typeChar
  } = useSoloStitchGame();

  useEffect(() => {
    if (!completed) return;
    sessionStorage.setItem(
      "swagrams_solo_result",
      JSON.stringify({ rack, score, words: submittedWords })
    );
    router.push("/results");
  }, [completed, rack, score, submittedWords, router]);

  const strokeDashoffset = String((1 - timerProgress) * TIMER_CIRCUMFERENCE);

  return (
    <main className="w-full max-w-6xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        <div className="lg:col-span-3">
          <StickyScoreboard points={score} wordsFound={wordsFound} lastWord={lastWord} />
        </div>

        <div className="lg:col-span-9 flex flex-col items-center gap-12">
          {!active && countdown === null ? (
            <button className="px-16 py-4 bg-primary text-on-primary font-headline font-bold rounded-xl hover:opacity-90 active:scale-95 transition-all shadow-xl shadow-primary/20 text-lg" onClick={start} type="button">
              Start
            </button>
          ) : null}
          {countdown !== null ? <p className="font-headline font-extrabold text-7xl text-primary">{countdown}</p> : null}

          <div className="flex flex-col items-center gap-4">
            <div className="relative flex h-32 w-32 shrink-0 items-center justify-center">
              <svg className="pointer-events-none absolute inset-0 h-full w-full -rotate-90" aria-hidden>
                <circle className="text-outline/20" cx="64" cy="64" fill="none" r="60" stroke="currentColor" strokeWidth="6"></circle>
                <circle className="text-primary transition-all duration-1000" cx="64" cy="64" fill="none" r="60" stroke="currentColor" strokeDasharray="377" strokeDashoffset={strokeDashoffset} strokeWidth="6"></circle>
              </svg>
              <div className="relative z-10 flex flex-col items-center justify-center gap-1 px-1 text-center">
                <span className="text-[11px] font-label uppercase tracking-[0.2em] text-on-surface-variant">Timer</span>
                <span className="font-headline text-3xl font-bold tabular-nums leading-none text-on-surface">{timerLabel}</span>
              </div>
            </div>
          </div>

          <div className="w-full max-w-2xl">
            <div className="flex justify-center gap-3 p-6 bg-surface-container-lowest rounded-2xl border border-outline-variant/10 shadow-2xl">
              {slotLetters.map((ch, idx) => (
                <div key={idx} className="w-16 h-20 bg-surface-container rounded-lg flex items-center justify-center border-b-4 border-surface-container-highest shadow-inner">
                  <span className="text-primary font-headline font-bold text-3xl letter-pop">{ch}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-6 gap-4">
            {letterButtons.map((letter, idx) => (
              <button key={`${letter}-${idx}`} className="relative w-20 h-20 bg-secondary flex items-center justify-center rounded-xl shadow-[0_8px_0_#b59a6d] hover:shadow-[0_4px_0_#b59a6d] hover:translate-y-[4px] active:translate-y-[8px] active:shadow-none transition-all duration-100 group" type="button" onClick={() => typeChar(letter.toLowerCase())}>
                <div className="absolute inset-0 grain-overlay rounded-xl"></div>
                <span className="text-on-secondary font-headline font-extrabold text-3xl">{letter}</span>
              </button>
            ))}
          </div>

          <div className="flex w-full flex-wrap justify-center gap-4 sm:gap-6">
            <button
              className="flex min-w-[140px] flex-col items-center gap-0.5 rounded-xl bg-surface-container-high px-8 py-4 font-headline text-lg font-bold text-on-surface transition-all hover:bg-surface-container-highest active:scale-95"
              type="button"
              onClick={shuffleRack}
            >
              <span>Shuffle</span>
              <span className="font-label text-[10px] font-semibold uppercase tracking-[0.2em] text-on-surface-variant/85">Shift</span>
            </button>
            <button
              className="flex min-w-[160px] flex-col items-center gap-0.5 rounded-xl bg-primary px-10 py-4 font-headline text-lg font-bold text-on-primary shadow-xl shadow-primary/20 transition-all hover:opacity-90 active:scale-95"
              type="button"
              onClick={() => void submit()}
            >
              <span>Submit</span>
              <span className="font-label text-[10px] font-semibold uppercase tracking-[0.2em] text-on-primary/80">Enter</span>
            </button>
            <button
              className="flex min-w-[140px] flex-col items-center gap-0.5 rounded-xl bg-surface-container-low px-8 py-4 font-headline text-lg font-bold text-on-surface-variant transition-all hover:bg-surface-container-high active:scale-95"
              type="button"
              onClick={clearWord}
            >
              <span>Clear</span>
              <span className="font-label text-[10px] font-semibold uppercase tracking-[0.2em] text-on-surface-variant/80">Esc</span>
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
