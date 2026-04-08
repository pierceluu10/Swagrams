-- Swagrams: public leaderboard (writes via service-role API only)

create table if not exists public.leaderboard_entries (
  id uuid primary key default gen_random_uuid(),
  display_name text not null,
  score integer not null,
  mode text not null check (mode in ('solo', 'multiplayer')),
  created_at timestamptz not null default now(),
  constraint leaderboard_display_name_len check (
    char_length(trim(display_name)) >= 2
    and char_length(trim(display_name)) <= 24
  ),
  constraint leaderboard_score_range check (score >= 0 and score <= 1000000)
);

alter table public.leaderboard_entries enable row level security;

-- Public read for future client-side queries; app currently reads via API + service role.
create policy "read_leaderboard_entries"
  on public.leaderboard_entries
  for select
  using (true);

-- No insert/update/delete for anon — only service role (API routes).

create index if not exists leaderboard_entries_created_at_idx
  on public.leaderboard_entries (created_at desc);

create index if not exists leaderboard_entries_score_created_idx
  on public.leaderboard_entries (score desc, created_at asc);
