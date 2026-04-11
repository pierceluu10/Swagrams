"use client";

// Swagrams — home layout below <main> (client: routing)

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { HomeLeaderboard } from "@/components/leaderboard/HomeLeaderboard";
import { SlabButton } from "@/components/ui/SlabButton";

export function HomePageContent() {
  const HOME_FLASH_KEY = "swagrams_home_flash";
  const router = useRouter();
  const [flashMessage, setFlashMessage] = useState("");
  const [flashFading, setFlashFading] = useState(false);
  const [soloHovered, setSoloHovered] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const flash = sessionStorage.getItem(HOME_FLASH_KEY);
    if (flash === "lobby_not_found") {
      setFlashFading(false);
      setFlashMessage("Lobby not found. It may have been disbanded.");
      sessionStorage.removeItem(HOME_FLASH_KEY);
    }
  }, []);

  useEffect(() => {
    if (!flashMessage) return;

    const fadeTimer = window.setTimeout(() => setFlashFading(true), 3000);
    const clearTimer = window.setTimeout(() => {
      setFlashMessage("");
      setFlashFading(false);
    }, 3400);

    return () => {
      window.clearTimeout(fadeTimer);
      window.clearTimeout(clearTimer);
    };
  }, [flashMessage]);

  const subButtonsClass = mounted && soloHovered
    ? "grid grid-rows-[1fr] opacity-100 transition-all duration-300 ease-out"
    : "grid grid-rows-[0fr] opacity-0 pointer-events-none transition-all duration-300 ease-out";

  return (
    <div className="grid w-full grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:items-center lg:gap-8">
      <div className="hidden min-h-0 lg:block" aria-hidden />

      <div className="mx-auto flex w-full max-w-md flex-col items-stretch gap-5 lg:mx-0 lg:justify-self-center">
        {flashMessage ? (
          <p
            className={`rounded-lg border border-error/35 bg-error/10 px-3 py-2 text-center font-body text-sm text-error transition-opacity duration-400 ${
              flashFading ? "opacity-0" : "opacity-100"
            }`}
          >
            {flashMessage}
          </p>
        ) : null}
        <div className="space-y-2 text-center">
          <h1 className="font-headline text-4xl font-bold italic tracking-tighter text-[#cec1e1] sm:text-5xl">
            Swagrams
          </h1>
          <p className="font-body text-sm leading-relaxed text-on-surface-variant sm:text-base">
            Play 6-letter anagrams solo or with others
          </p>
        </div>
        <div className="flex w-full flex-col gap-6">
          {/* Solo card with hover-reveal EASY/HARD sub-buttons */}
          <div
            className="relative w-full overflow-hidden rounded-xl font-headline font-extrabold uppercase tracking-wide bg-[var(--slab-tan-bg)] text-[var(--slab-tan-fg)] shadow-[0_12px_0_var(--slab-tan-shadow)]"
            onMouseEnter={() => setSoloHovered(true)}
            onMouseLeave={() => setSoloHovered(false)}
            onFocus={() => setSoloHovered(true)}
            onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setSoloHovered(false); }}
          >
            <div className="grain-overlay pointer-events-none absolute inset-0 opacity-5" aria-hidden />
            <div className="flex flex-col items-center justify-center gap-4 px-8 py-10 text-xl sm:text-2xl">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--slab-tan-icon-bg)]">
                <span className="material-symbols-outlined text-4xl" data-icon="person">person</span>
              </div>
              <span>Play Solo</span>
            </div>
            <div className={subButtonsClass}>
              <div className="overflow-hidden">
                <div className="flex gap-3 px-6 pb-6">
                  <button
                    type="button"
                    onClick={() => router.push("/solo?difficulty=easy")}
                    className="active:translate-y-[4px] flex flex-1 items-center justify-center rounded-xl px-4 py-3 text-base uppercase transition-all duration-100 bg-[#ceab78] text-[var(--slab-tan-fg)] shadow-[0_5px_0_var(--slab-tan-shadow)] active:shadow-[0_1px_0_var(--slab-tan-shadow)]"
                  >
                    Easy
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push("/solo?difficulty=hard")}
                    className="active:translate-y-[4px] flex flex-1 items-center justify-center rounded-xl px-4 py-3 text-base uppercase transition-all duration-100 bg-[#ceab78] text-[var(--slab-tan-fg)] shadow-[0_5px_0_var(--slab-tan-shadow)] active:shadow-[0_1px_0_var(--slab-tan-shadow)]"
                  >
                    Hard
                  </button>
                </div>
              </div>
            </div>
          </div>

          <SlabButton variant="lavender" size="hero" type="button" onClick={() => router.push("/lobby")}>
            <span className="material-symbols-outlined text-4xl" data-icon="groups">groups</span>
            <span>Play with others</span>
          </SlabButton>
        </div>
      </div>

      <div className="w-full max-w-sm justify-self-center lg:w-[min(20rem,100%)] lg:max-w-none lg:justify-self-end">
        <HomeLeaderboard />
      </div>
    </div>
  );
}
