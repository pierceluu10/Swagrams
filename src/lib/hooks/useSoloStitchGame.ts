"use client";

// Swagrams — solo Stitch UI game state

import { useCallback, useEffect, useMemo, useState } from "react";
import { canBuildFromRack, generateRound, validateSubmission } from "@/lib/game/engine";
import { ROUND_SECONDS } from "@/lib/words/pools";

function shuffle(value: string) {
  const chars = value.split("");
  for (let i = chars.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}

function formatTime(ms: number) {
  const sec = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(sec / 60).toString().padStart(2, "0");
  const s = (sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export function useSoloStitchGame() {
  const [round, setRound] = useState(generateRound());
  const [rack, setRack] = useState(round.rack);
  const [typed, setTyped] = useState("");
  const [score, setScore] = useState(0);
  const [submittedWords, setSubmittedWords] = useState<string[]>([]);
  const [lastWord, setLastWord] = useState("—");
  const [error, setError] = useState("");
  const [started, setStarted] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());

  const totalMs = ROUND_SECONDS * 1000;
  const active = started && round.status === "active";
  const completed = started && round.status === "complete";
  const remainingMs = active ? Math.max(0, new Date(round.endsAt).getTime() - nowMs) : 0;
  const timerProgress = active ? remainingMs / totalMs : 0;
  const timerLabel = formatTime(remainingMs);

  const start = useCallback(() => {
    if (started) return;
    setCountdown(3);
  }, [started]);

  const shuffleRack = useCallback(() => {
    if (!active) return;
    setRack((value) => shuffle(value));
  }, [active]);

  const clearWord = useCallback(() => {
    setTyped("");
  }, []);

  const typeChar = useCallback((letter: string) => {
    if (!active) return;
    setTyped((v) => {
      if (v.length >= 6) return v;
      if (!canBuildFromRack(`${v}${letter}`, rack)) return v;
      return `${v}${letter}`;
    });
  }, [active, rack]);

  const submit = useCallback(async () => {
    if (!active) return;
    setError("");
    if (submittedWords.includes(typed.toLowerCase())) {
      setError("Already submitted.");
      return;
    }
    const result = await validateSubmission(typed, round.rack);
    if (!result.valid) {
      setError(result.reason);
      return;
    }
    setScore((v) => v + result.score);
    setSubmittedWords((v) => [...v, result.word]);
    setLastWord(result.word.toUpperCase());
    setTyped("");
  }, [active, round.rack, typed, submittedWords]);

  const letterButtons = useMemo(() => rack.toUpperCase().split(""), [rack]);
  const slotLetters = useMemo(() => {
    const up = typed.toUpperCase().slice(0, 6);
    return Array.from({ length: 6 }, (_, i) => up[i] ?? "");
  }, [typed]);

  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), 250);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!active) return;
    if (remainingMs <= 0) {
      const id = window.setTimeout(() => {
        setRound((prev) => ({ ...prev, status: "complete" }));
      }, 0);
      return () => window.clearTimeout(id);
    }
  }, [active, remainingMs]);

  useEffect(() => {
    if (countdown === null) return;
    if (countdown <= 0) {
      const id = window.setTimeout(() => {
        const next = generateRound();
        setRound(next);
        setRack(next.rack);
        setTyped("");
        setStarted(true);
        setCountdown(null);
      }, 0);
      return () => clearTimeout(id);
    }
    const id = window.setTimeout(() => setCountdown((v) => (v ?? 1) - 1), 1000);
    return () => clearTimeout(id);
  }, [countdown]);

  useEffect(() => {
    if (!active) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Enter") {
        event.preventDefault();
        void submit();
        return;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        clearWord();
        return;
      }
      if (event.key === "Shift") {
        event.preventDefault();
        shuffleRack();
        return;
      }
      if (event.key === "Backspace") {
        event.preventDefault();
        setTyped((v) => v.slice(0, -1));
        return;
      }
      if (/^[a-zA-Z]$/.test(event.key)) {
        event.preventDefault();
        typeChar(event.key.toLowerCase());
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [active, clearWord, shuffleRack, submit, typeChar]);

  return {
    active,
    completed,
    countdown,
    start,
    timerLabel,
    timerProgress,
    score,
    wordsFound: submittedWords.length,
    submittedWords,
    lastWord,
    error,
    slotLetters,
    letterButtons,
    rack: round.rack,
    typed,
    setTyped,
    submit,
    clearWord,
    shuffleRack,
    typeChar
  };
}
