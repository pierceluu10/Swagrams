"use client";

// Swagrams — home (solo / multiplayer entry)

import { useRouter } from "next/navigation";
import { SlabButton } from "@/components/ui/SlabButton";

export default function Home() {
  const router = useRouter();

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden">
      <main className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center px-6 pb-16 pt-6">
        <div className="flex w-full flex-col items-stretch gap-5">
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
      </main>

      <div className="pointer-events-none absolute -bottom-10 -left-10 h-64 w-64 rounded-full bg-primary/5 blur-[100px]"></div>
      <div className="pointer-events-none absolute top-20 -right-20 h-80 w-80 rounded-full bg-secondary/5 blur-[120px]"></div>
    </div>
  );
}
