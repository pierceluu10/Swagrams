/** Swagrams — circular countdown ring driven by parent tick */

type Props = {
  remainingMs: number;
  totalMs: number;
};

export function TimerRing({ remainingMs, totalMs }: Props) {
  const safeTotal = Math.max(1, totalMs);
  const ratio = Math.min(1, Math.max(0, remainingMs / safeTotal));
  const circumference = 2 * Math.PI * 42;
  const dashOffset = circumference * (1 - ratio);

  const sec = Math.max(0, Math.floor(remainingMs / 1000));
  const m = Math.floor(sec / 60).toString().padStart(2, "0");
  const s = (sec % 60).toString().padStart(2, "0");
  const label = `${m}:${s}`;

  return (
    <div className="game-timer" role="timer" aria-live="polite">
      <svg className="game-timer__svg" viewBox="0 0 100 100" aria-hidden>
        <circle className="game-timer__track" cx="50" cy="50" r="42" />
        <circle
          className="game-timer__progress"
          cx="50"
          cy="50"
          r="42"
          strokeDasharray={`${circumference}`}
          strokeDashoffset={dashOffset}
          transform="rotate(-90 50 50)"
        />
      </svg>
      <div className="game-timer__label">
        <span className="game-timer__label-caption">Timer</span>
        <span className="game-timer__label-time">{label}</span>
      </div>
    </div>
  );
}
