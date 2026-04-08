/** Swagrams — leaderboard API types */

export type LeaderboardPeriod = "daily" | "weekly" | "alltime";

export type LeaderboardMode = "solo" | "multiplayer";

export type LeaderboardEntryRow = {
  rank: number;
  displayName: string;
  score: number;
  createdAt: string;
};

export type LeaderboardGetResponse = {
  entries: LeaderboardEntryRow[];
};

export type LeaderboardPostBody = {
  displayName: string;
  score: number;
  mode: LeaderboardMode;
};
