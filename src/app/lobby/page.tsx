"use client";

// Swagrams — multiplayer lobby entry

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { usePageTransition } from "@/components/PageTransition";
import { SessionNameForm } from "@/components/SessionNameForm";
import { NavLinkButton } from "@/components/ui/NavLinkButton";
import { SlabButton } from "@/components/ui/SlabButton";
import { SurfaceCard } from "@/components/ui/SurfaceCard";
import { lobbyApi } from "@/lib/multiplayer/api";
import { getOrCreateBrowserMultiplayerSessionId, setBrowserLobbyPlayerId } from "@/lib/multiplayer/storage";

export default function LobbyPage() {
  const router = useRouter();
  const { navigateHome, navigateWithTransition } = usePageTransition();
  const [step, setStep] = useState<"choose" | "create" | "join">("choose");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const sessionId = useMemo(() => getOrCreateBrowserMultiplayerSessionId(), []);

  const goBackToChoose = () => {
    setStep("choose");
    setError("");
  };

  const handleCreate = async (name: string) => {
    try {
      setError("");
      const data = await lobbyApi.create(name, sessionId);
      setBrowserLobbyPlayerId(data.lobbyId, data.playerId);
      navigateWithTransition(`/match/${data.lobbyId}`);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const handleJoin = async (name: string) => {
    try {
      setError("");
      const data = await lobbyApi.join(code.toUpperCase(), name, sessionId);
      setBrowserLobbyPlayerId(data.lobbyId, data.playerId);
      navigateWithTransition(`/match/${data.lobbyId}`);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden">
      <header className="fixed top-0 left-0 z-50 w-full">
        <div className="flex items-center justify-start px-6 py-4">
          {step === "choose" ? (
            <NavLinkButton type="button" onClick={navigateHome}>
              ← Home
            </NavLinkButton>
          ) : (
            <NavLinkButton type="button" onClick={goBackToChoose}>
              ← Back
            </NavLinkButton>
          )}
        </div>
      </header>

      <main className="mx-auto flex min-h-[calc(100vh-6rem)] w-full max-w-md flex-col items-center justify-center px-6 pb-12 pt-24">
        <SurfaceCard className="space-y-4">
          {step === "choose" ? (
            <div className="space-y-2 text-center">
              <h2 className="font-headline text-2xl font-bold text-on-surface">Multiplayer</h2>
              <p className="font-body text-sm leading-relaxed text-on-surface-variant">
                Create or join a lobby
              </p>
            </div>
          ) : null}

          {step === "choose" ? (
            <div className="flex w-full flex-col gap-4">
              <SlabButton variant="tan" type="button" onClick={() => setStep("create")}>
                <span>Create lobby</span>
              </SlabButton>
              <SlabButton variant="lavender" type="button" onClick={() => setStep("join")}>
                <span>Join with code</span>
              </SlabButton>
              <SlabButton variant="muted" type="button" onClick={() => router.push("/lobbies")}>
                <span>Browse lobbies</span>
              </SlabButton>
            </div>
          ) : null}

          {step === "create" ? (
            <div className="space-y-4">
              <SessionNameForm onSubmit={handleCreate} buttonLabel="Create" />
            </div>
          ) : null}

          {step === "join" ? (
            <div className="space-y-4">
              <div className="flex w-full flex-col gap-3.5">
                <label
                  className="block w-full text-left font-label text-xs uppercase tracking-wider text-on-surface-variant"
                  htmlFor="lobby-code"
                >
                  Lobby code
                </label>
                <input
                  id="lobby-code"
                  className="w-full rounded-xl border border-outline-variant/30 bg-surface-container px-4 py-3 font-headline uppercase tracking-wide text-on-surface placeholder:text-on-surface-variant/50"
                  placeholder="ABCDEF"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  maxLength={6}
                  aria-label="Lobby code"
                  autoComplete="off"
                />
              </div>
              <SessionNameForm onSubmit={handleJoin} buttonLabel="Join lobby" inputId="join-display-name" />
            </div>
          ) : null}

          {error ? <p className="text-center text-sm text-error">{error}</p> : null}
        </SurfaceCard>
      </main>

      <div className="pointer-events-none absolute -bottom-10 -left-10 h-64 w-64 rounded-full bg-primary/5 blur-[100px]"></div>
      <div className="pointer-events-none absolute top-20 -right-20 h-80 w-80 rounded-full bg-secondary/5 blur-[120px]"></div>
    </div>
  );
}
