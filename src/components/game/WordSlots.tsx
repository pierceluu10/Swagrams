/** Swagrams — in-progress answer slots */

import type { MutableRefObject } from "react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

type Props = {
  word: string;
  maxLen?: number;
  /** Filled with slot cells in display order for layout / flight animations. */
  slotRefs?: MutableRefObject<(HTMLDivElement | null)[]>;
};

export function WordSlots({ word, maxLen = 6, slotRefs }: Props) {
  const upper = word.toUpperCase().slice(0, maxLen);
  const slots = Array.from({ length: maxLen }, (_, i) => upper[i] ?? "");
  const [pop, setPop] = useState<number[]>([]);
  const prevWordRef = useRef<string>("");
  const slotRefsRef = useRef(slotRefs);
  useLayoutEffect(() => {
    slotRefsRef.current = slotRefs;
  }, [slotRefs]);

  const slotCallbacks = useMemo(
    () =>
      Array.from({ length: maxLen }, (_, i) => (el: HTMLDivElement | null) => {
        const r = slotRefsRef.current;
        if (r) r.current[i] = el;
      }),
    [maxLen]
  );

  useEffect(() => {
    const prev = prevWordRef.current;
    const indices: number[] = [];
    for (let i = 0; i < maxLen; i += 1) {
      const currentChar = upper[i] ?? "";
      const prevChar = prev[i] ?? "";
      if (currentChar && currentChar !== prevChar) {
        indices.push(i);
      }
    }

    if (indices.length > 0) {
      const timer = window.setTimeout(() => {
        setPop(indices);
        window.setTimeout(() => setPop([]), 140);
      }, 0);
      prevWordRef.current = upper;
      return () => clearTimeout(timer);
    }
    prevWordRef.current = upper;
  }, [upper, maxLen]);

  return (
    <div className="word-slots" aria-hidden>
      {slots.map((ch, i) => (
        <div key={i} ref={slotRefs ? slotCallbacks[i] : undefined} className={`word-slot ${pop.includes(i) ? "word-slot--pop" : ""}`}>
          {ch}
        </div>
      ))}
    </div>
  );
}
