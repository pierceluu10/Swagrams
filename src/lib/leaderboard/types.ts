/** Swagrams — leaderboard API types */

export type LeaderboardPeriod = "daily" | "weekly" | "alltime";

export type LeaderboardMode = "solo" | "multiplayer";

export type LeaderboardDifficulty = "easy" | "hard";

export type LeaderboardEntryRow = {
  rank: number;
  displayName: string;
  score: number;
  createdAt: string;
  difficulty: LeaderboardDifficulty;
};

export type LeaderboardGetResponse = {
  entries: LeaderboardEntryRow[];
};

export type LeaderboardPostBody = {
  displayName: string;
  score: number;
  mode: LeaderboardMode;
  difficulty: LeaderboardDifficulty;
};
