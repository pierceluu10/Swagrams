"use client";

// Swagrams — solo round state (countdown, rack, scoring)

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { canBuildFromRack } from "@/lib/game/engine";
import { fetchRandomRound, validateWord } from "@/lib/words/api";
import { ROUND_SECONDS, RECENT_RACK_WINDOW } from "@/lib/words/constants";
import { rackMultisetKey } from "@/lib/words/rackMultisetKey";
import type { GameActionPress } from "@/lib/hooks/useGameActionPress";
import type { RoundState } from "@/lib/game/types";

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

type SoloGameOptions = {
  /** When true (solo route), skip the start screen and begin the 3–2–1 countdown immediately. */
  autoStart?: boolean;
  onActionFlash?: (action: GameActionPress) => void;
};

export function useSoloGame(options: SoloGameOptions = {}) {
  const { autoStart = false, onActionFlash } = options;
  const [round, setRound] = useState<RoundState | null>(null);
  const [rack, setRack] = useState("");
  const [typed, setTyped] = useState("");
  const [score, setScore] = useState(0);
  const [submittedWords, setSubmittedWords] = useState<string[]>([]);
  const [lastWord, setLastWord] = useState("—");
  const [error, setError] = useState("");
  const [successFlash, setSuccessFlash] = useState("");
  const [started, setStarted] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(autoStart ? 3 : null);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const recentRackKeysRef = useRef<string[]>([]);

  const totalMs = ROUND_SECONDS * 1000;
  const active = started && round?.status === "active";
  const completed = started && round?.status === "complete";
  const remainingMs = active && round ? Math.max(0, new Date(round.endsAt).getTime() - nowMs) : 0;
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
    const pending = typed.trim();
    setError("");
    setSuccessFlash("");
    setTyped("");
    if (pending.length < 3 || pending.length > 6) {
      setError("Words must be 3-6 letters.");
      return;
    }
    if (!round || !canBuildFromRack(pending, round.rack)) {
      setError("Word cannot be built from this rack.");
      return;
    }
    if (submittedWords.includes(pending.toLowerCase())) {
      setError("Already used.");
      return;
    }
    try {
      const result = await validateWord(pending, round.rack);
      if (!result.valid) {
        setError(result.reason);
        return;
      }
      setScore((v) => v + result.score);
      setSubmittedWords((v) => [...v, result.word]);
      setLastWord(result.word.toUpperCase());
      setSuccessFlash(`+${result.score}`);
    } catch (validationError) {
      setError((validationError as Error).message);
    }
  }, [active, round, submittedWords, typed]);

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
    if (!round?.rack) return;
    const key = rackMultisetKey(round.rack);
    recentRackKeysRef.current = [key, ...recentRackKeysRef.current.filter((v) => v !== key)].slice(0, RECENT_RACK_WINDOW);
  }, [round?.rack]);

  useEffect(() => {
    if (!active) return;
    if (remainingMs <= 0) {
      const id = window.setTimeout(() => {
        setRound((prev) => (prev ? { ...prev, status: "complete" } : prev));
      }, 0);
      return () => window.clearTimeout(id);
    }
  }, [active, remainingMs]);

  useEffect(() => {
    if (countdown === null) return;
    if (countdown <= 0) {
      const id = window.setTimeout(() => {
        void fetchRandomRound(recentRackKeysRef.current)
          .then((next) => {
            setRound(next);
            setRack(next.rack);
            setTyped("");
            setStarted(true);
            setError("");
          })
          .catch((nextError) => {
            setError((nextError as Error).message);
            setStarted(false);
          })
          .finally(() => setCountdown(null));
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
        onActionFlash?.("submit");
        void submit();
        return;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        onActionFlash?.("clear");
        clearWord();
        return;
      }
      if (event.key === "Shift") {
        event.preventDefault();
        onActionFlash?.("shuffle");
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
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [active, clearWord, onActionFlash, shuffleRack, submit, typeChar]);

  return {
    active,
    started,
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
    successFlash,
    slotLetters,
    letterButtons,
    rack: round?.rack ?? "",
    displayRack: rack,
    typed,
    setTyped,
    submit,
    clearWord,
    shuffleRack,
    typeChar
  };
}
