"use client";

// Word-submit feedback (invalid / duplicate) — fades out after a short hold.

import { useEffect, useState } from "react";

const HOLD_MS = 2200;
const FADE_MS = 500;

type Props = {
  message: string;
  tone?: "error" | "success";
  className?: string;
};

export function SubmissionFeedback({ message, tone = "error", className = "" }: Props) {
  const [text, setText] = useState("");
  const [faded, setFaded] = useState(true);

  useEffect(() => {
    if (!message) {
      setText("");
      setFaded(true);
      return;
    }

    setText(message);
    setFaded(false);

    const fadeTimer = window.setTimeout(() => setFaded(true), HOLD_MS);
    const clearTimer = window.setTimeout(() => {
      setText("");
    }, HOLD_MS + FADE_MS);

    return () => {
      window.clearTimeout(fadeTimer);
      window.clearTimeout(clearTimer);
    };
  }, [message]);

  return (
    <div
      className={`flex min-h-[2.75rem] w-full items-center justify-center px-2 ${className}`}
      role="status"
      aria-live="polite"
    >
      {text ? (
        <p
          className={`text-center text-sm leading-snug transition-opacity ease-out ${
            tone === "success" ? "text-surface-tint" : "text-error"
          } ${faded ? "opacity-0" : "opacity-100"}`}
          style={{ transitionDuration: `${FADE_MS}ms` }}
        >
          {text}
        </p>
      ) : null}
    </div>
  );
}
