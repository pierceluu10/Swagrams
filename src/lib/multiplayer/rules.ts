/** Swagrams — pure multiplayer lobby rules shared by UI + DB */

export type LobbyPlayerRuleState = {
  id: string;
  is_host: boolean;
  in_lobby: boolean;
};

export function canOwnerStartRound(players: LobbyPlayerRuleState[], playerId: string | null | undefined) {
  if (!playerId) return false;
  if (players.length < 2) return false;

  const caller = players.find((player) => player.id === playerId);
  if (!caller?.is_host) return false;

  return players.every((player) => player.in_lobby);
}
