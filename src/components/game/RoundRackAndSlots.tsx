"use client";

/** Shared solo + multiplayer rack + answer slots (same layout and deal-in as solo). */

import { useMemo, type MutableRefObject } from "react";

type Props = {
  word: string;
  displayRack: string;
  dealt: boolean;
  slotRefs: MutableRefObject<(HTMLDivElement | null)[]>;
  rackBtnRefs: MutableRefObject<(HTMLButtonElement | null)[]>;
  consumedRack: Set<number>;
  onRackLetter: (letter: string) => void;
};

export function RoundRackAndSlots({
  word,
  displayRack,
  dealt,
  slotRefs,
  rackBtnRefs,
  consumedRack,
  onRackLetter
}: Props) {
  const upper = word.toUpperCase().slice(0, 6);
  const slotChars = useMemo(
    () => Array.from({ length: 6 }, (_, i) => upper[i] ?? ""),
    [upper]
  );

  const letterButtons = useMemo(() => displayRack.toUpperCase().split(""), [displayRack]);

  const slotCallbacks = useMemo(
    () =>
      Array.from({ length: 6 }, (_, i) => (el: HTMLDivElement | null) => {
        slotRefs.current[i] = el;
      }),
    [slotRefs]
  );

  const rackCallbacks = useMemo(
    () =>
      Array.from({ length: 6 }, (_, i) => (el: HTMLButtonElement | null) => {
        rackBtnRefs.current[i] = el;
      }),
    [rackBtnRefs]
  );

  return (
    <>
      <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-2">
        <div className="w-full">
          <div className="flex justify-center gap-3 rounded-2xl border border-outline-variant/10 bg-surface-container-lowest p-6 shadow-2xl">
            {slotChars.map((ch, idx) => (
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
          const dealClass = !dealt ? `deal-in deal-delay-${idx}` : "";
          return (
            <button
              key={idx}
              ref={rackCallbacks[idx]}
              type="button"
              disabled={used}
              className={`group relative flex h-20 w-20 items-center justify-center rounded-xl transition-all duration-150 ${dealClass} ${
                used
                  ? "scale-90 bg-surface-container-high opacity-30 shadow-none"
                  : "bg-secondary shadow-[0_8px_0_#b59a6d] hover:translate-y-[4px] hover:shadow-[0_4px_0_#b59a6d] active:translate-y-[8px] active:shadow-none"
              }`}
              onClick={() => onRackLetter(letter.toLowerCase())}
            >
              {!used ? (
                <div className="grain-overlay absolute inset-0 rounded-xl opacity-5 transition-opacity group-hover:opacity-10"></div>
              ) : null}
              <span
                className={`font-headline text-3xl font-extrabold ${used ? "text-on-surface-variant/50" : "text-on-secondary"}`}
              >
                {letter}
              </span>
            </button>
          );
        })}
      </div>
    </>
  );
}
