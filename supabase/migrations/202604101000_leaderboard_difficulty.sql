alter table public.leaderboard_entries
  add column if not exists difficulty text not null default 'hard'
    check (difficulty in ('easy', 'hard'));
