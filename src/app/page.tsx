// Swagrams — home (solo / multiplayer entry)

import { HomePageContent } from "@/components/home/HomePageContent";

/** Avoid stale prerendered HTML vs updated client bundles (hydration mismatches on HomeLeaderboard, etc.). */
export const dynamic = "force-dynamic";

export default function Home() {
  return (
    <div className="relative min-h-screen w-full overflow-x-hidden">
      <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col items-center justify-center px-6 pb-16 pt-6">
        <HomePageContent />
      </main>

      <div className="pointer-events-none absolute -bottom-10 -left-10 h-64 w-64 rounded-full bg-primary/5 blur-[100px]"></div>
      <div className="pointer-events-none absolute top-20 -right-20 h-80 w-80 rounded-full bg-secondary/5 blur-[100px]"></div>
    </div>
  );
}
