/** Swagrams — lobby / round persistence */

import { getSupabaseServerClient } from "@/lib/supabase/server";
import { randomCode } from "@/lib/utils/id";
import { generateRound, validateSubmission } from "@/lib/game/engine";

export type OpenLobbySummary = {
  lobbyId: string;
  code: string;
  hostName: string;
  playerCount: number;
  samplePlayers: string[];
  createdAt: string;
};

const STALE_LOBBY_MINUTES = 10;

/** Remove lobbies with no activity for STALE_LOBBY_MINUTES, including after completed rounds. Skips if a round is still in progress (active and timer not expired). */
async function cleanupStaleLobbies() {
  const supabase = getSupabaseServerClient();
  const cutoffIso = new Date(Date.now() - STALE_LOBBY_MINUTES * 60_000).toISOString();
  const nowIso = new Date().toISOString();

  const { data: oldByCreated } = await supabase.from("lobbies").select("id, created_at").lt("created_at", cutoffIso);

  const { data: roundsPastCutoff } = await supabase.from("rounds").select("lobby_id").lt("ends_at", cutoffIso);

  const candidateIds = new Set<string>();
  for (const row of oldByCreated ?? []) candidateIds.add(row.id);
  for (const row of roundsPastCutoff ?? []) candidateIds.add(row.lobby_id);

  if (candidateIds.size === 0) return;

  for (const lobbyId of candidateIds) {
    const { data: running } = await supabase
      .from("rounds")
      .select("id")
      .eq("lobby_id", lobbyId)
      .eq("status", "active")
      .gt("ends_at", nowIso)
      .limit(1)
      .maybeSingle();

    if (running) continue;

    const { data: lobby } = await supabase.from("lobbies").select("created_at").eq("id", lobbyId).maybeSingle();
    if (!lobby) continue;

    let lastActivity = lobby.created_at;

    const { data: rounds } = await supabase.from("rounds").select("ends_at, created_at").eq("lobby_id", lobbyId);
    for (const round of rounds ?? []) {
      if (round.ends_at && round.ends_at > lastActivity) lastActivity = round.ends_at;
      if (round.created_at && round.created_at > lastActivity) lastActivity = round.created_at;
    }

    if (lastActivity < cutoffIso) {
      await supabase.from("lobbies").delete().eq("id", lobbyId);
    }
  }
}

export async function createLobby(displayName: string, sessionId: string) {
  await cleanupStaleLobbies();
  const supabase = getSupabaseServerClient();
  const code = randomCode();

  const { data: lobby, error: lobbyError } = await supabase
    .from("lobbies")
    .insert({ code, status: "waiting" })
    .select("id, code")
    .single();
  if (lobbyError || !lobby) throw new Error("Could not create lobby.");

  const { data: player, error: playerError } = await supabase
    .from("players")
    .insert({ lobby_id: lobby.id, display_name: displayName, session_id: sessionId, score: 0, is_ready: false, connected: true })
    .select("id")
    .single();
  if (playerError || !player) throw new Error("Could not create player.");

  return { lobbyId: lobby.id, code: lobby.code, playerId: player.id };
}

export async function joinLobby(code: string, displayName: string, sessionId: string) {
  await cleanupStaleLobbies();
  const supabase = getSupabaseServerClient();
  const { data: lobby, error: lobbyError } = await supabase.from("lobbies").select("id").eq("code", code).single();
  if (lobbyError || !lobby) throw new Error("Lobby not found.");

  const { data: existing } = await supabase.from("players").select("id").eq("session_id", sessionId).eq("lobby_id", lobby.id).maybeSingle();
  if (existing) {
    await supabase.from("players").update({ connected: true }).eq("id", existing.id);
    return { lobbyId: lobby.id, playerId: existing.id };
  }

  const { data: player, error: playerError } = await supabase
    .from("players")
    .insert({ lobby_id: lobby.id, display_name: displayName, session_id: sessionId, score: 0, is_ready: false, connected: true })
    .select("id")
    .single();

  if (playerError || !player) throw new Error("Could not join lobby.");
  return { lobbyId: lobby.id, playerId: player.id };
}

export async function toggleReady(lobbyId: string, playerId: string, ready: boolean) {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase.from("players").update({ is_ready: ready, connected: true }).eq("id", playerId).eq("lobby_id", lobbyId);
  if (error) throw new Error("Could not update ready state.");
}

export async function startRound(lobbyId: string) {
  const supabase = getSupabaseServerClient();
  const { data: players, error: playerError } = await supabase.from("players").select("id, is_ready").eq("lobby_id", lobbyId);
  if (playerError || !players) throw new Error("Could not load players.");

  const readyCount = players.filter((p) => p.is_ready).length;
  if (readyCount < 2) throw new Error("At least two ready players required.");

  const { data: existing } = await supabase
    .from("rounds")
    .select("id")
    .eq("lobby_id", lobbyId)
    .eq("status", "active")
    .maybeSingle();

  if (existing) return existing;

  const round = generateRound();
  const { data, error } = await supabase
    .from("rounds")
    .insert({
      lobby_id: lobbyId,
      rack: round.rack,
      difficulty: round.difficulty,
      started_at: round.startedAt,
      ends_at: round.endsAt,
      status: "active"
    })
    .select("id")
    .single();

  if (error || !data) throw new Error("Could not start round.");

  await supabase.from("lobbies").update({ status: "in_round" }).eq("id", lobbyId);
  return data;
}

export async function submitWord(lobbyId: string, playerId: string, word: string) {
  const supabase = getSupabaseServerClient();

  const { data: round, error: roundError } = await supabase
    .from("rounds")
    .select("id, rack, status")
    .eq("lobby_id", lobbyId)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (roundError || !round) throw new Error("No active round.");

  const valid = await validateSubmission(word, round.rack);
  if (!valid.valid) throw new Error(valid.reason);

  const { data: existing } = await supabase
    .from("submissions")
    .select("id")
    .eq("round_id", round.id)
    .eq("player_id", playerId)
    .eq("word", valid.word)
    .maybeSingle();

    if (existing) throw new Error("Already used.");

  const { error: insertError } = await supabase
    .from("submissions")
    .insert({ round_id: round.id, player_id: playerId, word: valid.word, score: valid.score, lobby_id: lobbyId });
  if (insertError) throw new Error("Could not save submission.");

  const { data: player, error: playerError } = await supabase.from("players").select("score").eq("id", playerId).single();
  if (playerError || !player) throw new Error("Could not load score.");

  const { error: updateError } = await supabase.from("players").update({ score: player.score + valid.score }).eq("id", playerId);
  if (updateError) throw new Error("Could not update score.");

  return { score: valid.score, word: valid.word };
}

export async function finalizeRound(lobbyId: string) {
  const supabase = getSupabaseServerClient();
  const { data: round } = await supabase
    .from("rounds")
    .select("id, ends_at")
    .eq("lobby_id", lobbyId)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!round) return { ok: true };
  if (new Date(round.ends_at).getTime() > Date.now()) {
    return { ok: true };
  }

  await supabase.from("rounds").update({ status: "complete" }).eq("id", round.id);
  await supabase.from("players").update({ is_ready: false }).eq("lobby_id", lobbyId);
  await supabase.from("lobbies").update({ status: "waiting" }).eq("id", lobbyId);
  return { ok: true };
}

export async function leaveLobby(lobbyId: string, playerId: string) {
  const supabase = getSupabaseServerClient();
  await supabase.from("players").delete().eq("id", playerId).eq("lobby_id", lobbyId);

  const { data: remaining } = await supabase
    .from("players")
    .select("id")
    .eq("lobby_id", lobbyId);

  if (!remaining || remaining.length === 0) {
    await supabase.from("submissions").delete().eq("lobby_id", lobbyId);
    await supabase.from("rounds").delete().eq("lobby_id", lobbyId);
    await supabase.from("lobbies").delete().eq("id", lobbyId);
  }
}

export async function getOpenLobbies(): Promise<OpenLobbySummary[]> {
  await cleanupStaleLobbies();
  const supabase = getSupabaseServerClient();

  const { data: lobbies, error: lobbiesError } = await supabase
    .from("lobbies")
    .select("id, code, created_at")
    .eq("status", "waiting")
    .order("created_at", { ascending: false });

  if (lobbiesError || !lobbies) {
    throw new Error("Could not load open lobbies.");
  }

  if (!lobbies.length) return [];

  const lobbyIds = lobbies.map((l) => l.id);
  const { data: players, error: playersError } = await supabase
    .from("players")
    .select("lobby_id, display_name, created_at")
    .in("lobby_id", lobbyIds)
    .order("created_at", { ascending: true });

  if (playersError || !players) {
    throw new Error("Could not load open lobbies.");
  }

  const playerMap = new Map<string, { count: number; names: string[]; host: string }>();
  for (const row of players) {
    const current = playerMap.get(row.lobby_id) ?? { count: 0, names: [] as string[], host: row.display_name };
    current.count += 1;
    if (current.names.length < 3) current.names.push(row.display_name);
    playerMap.set(row.lobby_id, current);
  }

  return lobbies
    .map((lobby) => {
      const info = playerMap.get(lobby.id);
      if (!info || info.count < 1) return null;
      return {
        lobbyId: lobby.id,
        code: lobby.code,
        hostName: info.host,
        playerCount: info.count,
        samplePlayers: info.names,
        createdAt: lobby.created_at
      } satisfies OpenLobbySummary;
    })
    .filter((v): v is OpenLobbySummary => v !== null);
}

export async function getLobbyState(lobbyId: string) {
  const supabase = getSupabaseServerClient();
  const { data: lobby } = await supabase.from("lobbies").select("id, code, status").eq("id", lobbyId).single();
  if (!lobby) throw new Error("Lobby not found");

  const { data: players } = await supabase
    .from("players")
    .select("id, display_name, score, is_ready, connected")
    .eq("lobby_id", lobbyId)
    .order("score", { ascending: false });

  const { data: round } = await supabase
    .from("rounds")
    .select("id, rack, difficulty, started_at, ends_at, status")
    .eq("lobby_id", lobbyId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const submissions = round
    ? (
        await supabase
          .from("submissions")
          .select("id, player_id, word, score")
          .eq("round_id", round.id)
          .order("created_at", { ascending: false })
      ).data || []
    : [];

  return { lobby, players: players || [], round: round || null, submissions };
}
