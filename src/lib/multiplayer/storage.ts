/** Swagrams — multiplayer browser identity storage (tab-scoped session, lobby-scoped player) */

const TAB_SESSION_KEY = "swagrams_mp_tab_session_id";
const PLAYER_KEY_PREFIX = "swagrams_mp_player_id:";

export type BrowserStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export function getLobbyPlayerStorageKey(lobbyId: string) {
  return `${PLAYER_KEY_PREFIX}${lobbyId}`;
}

export function getOrCreateMultiplayerSessionId(storage: BrowserStorage, createId: () => string) {
  const existing = storage.getItem(TAB_SESSION_KEY);
  if (existing) return existing;

  const next = createId();
  storage.setItem(TAB_SESSION_KEY, next);
  return next;
}

export function getLobbyPlayerId(storage: BrowserStorage, lobbyId: string) {
  return storage.getItem(getLobbyPlayerStorageKey(lobbyId));
}

export function setLobbyPlayerId(storage: BrowserStorage, lobbyId: string, playerId: string) {
  storage.setItem(getLobbyPlayerStorageKey(lobbyId), playerId);
}

export function clearLobbyPlayerId(storage: BrowserStorage, lobbyId: string) {
  storage.removeItem(getLobbyPlayerStorageKey(lobbyId));
}

function getBrowserSessionStorage() {
  if (typeof window === "undefined") return null;
  return window.sessionStorage;
}

export function getOrCreateBrowserMultiplayerSessionId() {
  const storage = getBrowserSessionStorage();
  if (!storage) return "";
  return getOrCreateMultiplayerSessionId(storage, () => crypto.randomUUID());
}

export function getBrowserLobbyPlayerId(lobbyId: string) {
  const storage = getBrowserSessionStorage();
  if (!storage) return null;
  return getLobbyPlayerId(storage, lobbyId);
}

export function setBrowserLobbyPlayerId(lobbyId: string, playerId: string) {
  const storage = getBrowserSessionStorage();
  if (!storage) return;
  setLobbyPlayerId(storage, lobbyId, playerId);
}

export function clearBrowserLobbyPlayerId(lobbyId: string) {
  const storage = getBrowserSessionStorage();
  if (!storage) return;
  clearLobbyPlayerId(storage, lobbyId);
}
