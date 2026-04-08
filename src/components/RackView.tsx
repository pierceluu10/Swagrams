/** Swagrams — letter rack display */

import type { MutableRefObject } from "react";

type Props = {
  rack: string;
  tileRefs?: MutableRefObject<(HTMLDivElement | null)[]>;
};

export function RackView({ rack, tileRefs }: Props) {
  const letters = rack.toUpperCase().split("");

  return (
    <div className="rack">
      {letters.map((letter, index) => (
        <div
          className="tile"
          key={index}
          ref={tileRefs ? (el) => { tileRefs.current[index] = el; } : undefined}
          data-swagrams-rack-idx={index}
        >
          {letter}
        </div>
      ))}
    </div>
  );
}
