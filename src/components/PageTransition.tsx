"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { useRouter } from "next/navigation";

type TransitionContextValue = {
  navigateHome: () => void;
  navigateWithTransition: (path: string) => void;
};

const TransitionContext = createContext<TransitionContextValue>({
  navigateHome: () => {},
  navigateWithTransition: () => {}
});

export function usePageTransition() {
  return useContext(TransitionContext);
}

const ENTER_MS = 500;
const HOLD_MS = 300;
const EXIT_MS = 500;

export function PageTransitionProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [phase, setPhase] = useState<"idle" | "enter" | "hold" | "exit">("idle");

  const runTransition = useCallback((path: string) => {
    if (phase !== "idle") return;

    setPhase("enter");

    setTimeout(() => {
      setPhase("hold");
      router.push(path);

      setTimeout(() => {
        setPhase("exit");

        setTimeout(() => {
          setPhase("idle");
        }, EXIT_MS);
      }, HOLD_MS);
    }, ENTER_MS);
  }, [phase, router]);

  const navigateHome = useCallback(() => runTransition("/"), [runTransition]);
  const navigateWithTransition = useCallback((path: string) => runTransition(path), [runTransition]);

  return (
    <TransitionContext.Provider value={{ navigateHome, navigateWithTransition }}>
      {children}

      {phase !== "idle" ? (
        <div
          className={`page-transition-overlay ${
            phase === "enter"
              ? "page-transition--enter"
              : phase === "hold"
                ? "page-transition--hold"
                : "page-transition--exit"
          }`}
          aria-hidden
        >
          <span className="page-transition-text">Swagrams</span>
        </div>
      ) : null}
    </TransitionContext.Provider>
  );
}
