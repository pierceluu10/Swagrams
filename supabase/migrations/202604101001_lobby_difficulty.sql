alter table public.lobbies
  add column if not exists difficulty text not null default 'hard'
    check (difficulty in ('easy', 'hard'));
