"use client";

import { useLayoutEffect, useRef } from "react";

export type TileFlightPayload = {
  id: number;
  char: string;
  from: DOMRectReadOnly;
  to: DOMRectReadOnly;
  reverse?: boolean;
};

type Props = {
  flight: TileFlightPayload | null;
  onComplete: () => void;
};

/** Flies a rack-styled tile between rack cell and answer slot. */
export function TileFlightLayer({ flight, onComplete }: Props) {
  const elRef = useRef<HTMLDivElement>(null);
  const onCompleteRef = useRef(onComplete);

  useLayoutEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useLayoutEffect(() => {
    if (!flight) return;
    const el = elRef.current;
    if (!el) return;

    const { from, to } = flight;
    const tx = to.left + to.width / 2 - (from.left + from.width / 2);
    const ty = to.top + to.height / 2 - (from.top + from.height / 2);

    el.style.transform = "translate(0px, 0px) scale(1.08)";
    el.style.opacity = "1";

    let innerRaf = 0;
    const outerRaf = requestAnimationFrame(() => {
      innerRaf = requestAnimationFrame(() => {
        el.style.transform = `translate(${tx}px, ${ty}px) scale(1)`;
      });
    });

    const handleEnd = () => onCompleteRef.current();
    el.addEventListener("transitionend", handleEnd, { once: true });

    return () => {
      cancelAnimationFrame(outerRaf);
      cancelAnimationFrame(innerRaf);
      el.removeEventListener("transitionend", handleEnd);
    };
  }, [flight]);

  if (!flight) return null;

  const { from, char } = flight;

  return (
    <div
      ref={elRef}
      className="tile-flight-root"
      style={{
        left: `${from.left}px`,
        top: `${from.top}px`,
        width: `${from.width}px`,
        height: `${from.height}px`,
        transition: "transform 0.28s cubic-bezier(0.25, 0.82, 0.25, 1), opacity 0.25s ease"
      }}
    >
      <div className="flex h-full w-full items-center justify-center rounded-xl bg-secondary shadow-[0_6px_0_#b59a6d]">
        <span className="font-headline text-3xl font-extrabold text-on-secondary">{char.toUpperCase()}</span>
      </div>
    </div>
  );
}
