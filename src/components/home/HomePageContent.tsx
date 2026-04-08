"use client";

// Swagrams — home layout below <main> (client: routing)

import { useRouter } from "next/navigation";
import { HomeLeaderboard } from "@/components/leaderboard/HomeLeaderboard";
import { SlabButton } from "@/components/ui/SlabButton";

export function HomePageContent() {
  const router = useRouter();

  return (
    <div className="grid w-full grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:items-center lg:gap-8">
      <div className="hidden min-h-0 lg:block" aria-hidden />

      <div className="mx-auto flex w-full max-w-md flex-col items-stretch gap-5 lg:mx-0 lg:justify-self-center">
        <div className="space-y-2 text-center">
          <h1 className="font-headline text-4xl font-bold italic tracking-tighter text-[#cec1e1] sm:text-5xl">
            Swagrams
          </h1>
          <p className="font-body text-sm leading-relaxed text-on-surface-variant sm:text-base">
            Play 6-letter anagrams solo or with others
          </p>
        </div>
        <div className="flex w-full flex-col gap-6">
          <SlabButton variant="tan" size="hero" type="button" onClick={() => router.push("/solo")}>
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--slab-tan-icon-bg)]">
              <span className="material-symbols-outlined text-4xl" data-icon="person">
                person
              </span>
            </div>
            <span>Play Solo</span>
          </SlabButton>

          <SlabButton variant="lavender" size="hero" type="button" onClick={() => router.push("/lobby")}>
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--slab-lavender-icon-bg)]">
              <span className="material-symbols-outlined text-4xl" data-icon="groups">
                groups
              </span>
            </div>
            <span className="text-center">Play with others</span>
          </SlabButton>
        </div>
      </div>

      <div className="w-full max-w-sm justify-self-center lg:w-[min(20rem,100%)] lg:max-w-none lg:justify-self-end">
        <HomeLeaderboard />
      </div>
    </div>
  );
}
