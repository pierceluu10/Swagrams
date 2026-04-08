"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type GameActionPress = "shuffle" | "submit" | "clear";

const ACTION_PRESS_DURATION_MS = 80;

export function useGameActionPress() {
  const [pressedAction, setPressedAction] = useState<GameActionPress | null>(null);
  const clearTimerRef = useRef<number | null>(null);

  const clearPendingRelease = useCallback(() => {
    if (clearTimerRef.current !== null) {
      window.clearTimeout(clearTimerRef.current);
      clearTimerRef.current = null;
    }
  }, []);

  const pressAction = useCallback((action: GameActionPress) => {
    clearPendingRelease();
    setPressedAction(action);
  }, [clearPendingRelease]);

  const releaseAction = useCallback((action: GameActionPress) => {
    setPressedAction((currentAction) => (currentAction === action ? null : currentAction));
  }, []);

  const flashAction = useCallback((action: GameActionPress) => {
    pressAction(action);
    clearTimerRef.current = window.setTimeout(() => {
      clearTimerRef.current = null;
      releaseAction(action);
    }, ACTION_PRESS_DURATION_MS);
  }, [pressAction, releaseAction]);

  useEffect(() => {
    return () => {
      clearPendingRelease();
    };
  }, [clearPendingRelease]);

  return { pressedAction, pressAction, releaseAction, flashAction };
}
