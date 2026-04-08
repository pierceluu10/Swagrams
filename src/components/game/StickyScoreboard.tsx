/** Swagrams — sticky-note scoreboard (solo + multiplayer) */

type Props = {
  points: number;
  wordsFound: number;
  lastWord: string;
};

export function StickyScoreboard({ points, wordsFound, lastWord }: Props) {
  return (
    <div className="relative flex min-h-[260px] -rotate-2 transform flex-col justify-center rounded-lg bg-tertiary-fixed p-8 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
      <div className="paper-texture absolute inset-0 rounded-lg"></div>
      <div className="absolute -top-3 left-1/2 h-5 w-5 -translate-x-1/2 rounded-full border-2 border-surface-container-highest bg-error shadow-sm"></div>
      <div className="relative z-10 w-full space-y-6">
        <h3 className="border-b border-on-tertiary-fixed-variant/20 pb-3 font-headline text-xl font-bold text-on-tertiary-fixed">Scoreboard</h3>
        <div className="w-full space-y-4">
          <div className="flex w-full min-w-0 items-center justify-between gap-4 text-on-tertiary-fixed-variant">
            <span className="shrink-0 font-label text-base font-medium">Points</span>
            <span className="shrink-0 font-headline text-3xl font-bold tabular-nums">{points}</span>
          </div>
          <div className="flex w-full min-w-0 items-center justify-between gap-4 text-on-tertiary-fixed-variant">
            <span className="shrink-0 font-label text-base font-medium">Words Found</span>
            <span className="shrink-0 font-headline text-2xl font-bold tabular-nums">{wordsFound}</span>
          </div>
        </div>
        <div className="border-t border-on-tertiary-fixed-variant/10 pt-4">
          <p className="text-xs italic tracking-wide text-on-tertiary-fixed-variant/70">Last word: {lastWord}</p>
        </div>
      </div>
    </div>
  );
}
