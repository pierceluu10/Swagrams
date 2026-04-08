-- Multiplayer owner tracking + return-to-lobby presence

alter table public.players
  add column if not exists is_host boolean not null default false,
  add column if not exists in_lobby boolean not null default true;

with ranked as (
  select
    id,
    row_number() over (partition by lobby_id order by created_at asc, id asc) as rn
  from public.players
)
update public.players p
set is_host = ranked.rn = 1
from ranked
where ranked.id = p.id
  and not exists (
    select 1
    from public.players existing_host
    where existing_host.lobby_id = p.lobby_id
      and existing_host.is_host = true
  );

update public.players
set in_lobby = true
where in_lobby is distinct from true;
