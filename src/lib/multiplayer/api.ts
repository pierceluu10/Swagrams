/** Swagrams — browser client for lobby HTTP API */

export type LobbySnapshot = {
  lobby: { id: string; code: string; status: string };
  players: Array<{ id: string; display_name: string; score: number; is_ready: boolean; connected: boolean; is_host: boolean; in_lobby: boolean }>;
  round: null | { id: string; rack: string; difficulty: "easy" | "hard"; started_at: string; ends_at: string; status: string };
  submissions: Array<{ id: string; player_id: string; word: string; score: number }>;
};

export type OpenLobby = {
  lobbyId: string;
  code: string;
  hostName: string;
  playerCount: number;
  samplePlayers: string[];
  createdAt: string;
};

async function request<T>(path: string, body?: Record<string, unknown>) {
  const res = await fetch(path, {
    method: body ? "POST" : "GET",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store"
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(json.error || "Request failed");
  }
  return (await res.json()) as T;
}

export const lobbyApi = {
  create(displayName: string, sessionId: string) {
    return request<{ lobbyId: string; code: string; playerId: string }>("/api/lobbies/create", { displayName, sessionId });
  },
  join(code: string, displayName: string, sessionId: string) {
    return request<{ lobbyId: string; playerId: string }>("/api/lobbies/join", { code, displayName, sessionId });
  },
  toggleReady(lobbyId: string, playerId: string, ready: boolean) {
    return request(`/api/lobbies/${lobbyId}/ready`, { playerId, ready });
  },
  start(lobbyId: string, playerId: string) {
    return request(`/api/lobbies/${lobbyId}/start`, { playerId });
  },
  submit(lobbyId: string, playerId: string, word: string) {
    return request<{ score: number; word: string; totalScore: number }>(`/api/lobbies/${lobbyId}/submit`, { playerId, word });
  },
  finalize(lobbyId: string) {
    return request(`/api/lobbies/${lobbyId}/finalize`, {});
  },
  leave(lobbyId: string, playerId: string) {
    return request(`/api/lobbies/${lobbyId}/leave`, { playerId });
  },
  returnToLobby(lobbyId: string, playerId: string) {
    return request(`/api/lobbies/${lobbyId}/return`, { playerId });
  },
  open() {
    return request<OpenLobby[]>("/api/lobbies/open");
  },
  state(lobbyId: string) {
    return request<LobbySnapshot>(`/api/lobbies/${lobbyId}/state`);
  }
};
