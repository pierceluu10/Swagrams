-- Atomic score updates for concurrent word submissions (avoids read-modify-write races)

create or replace function public.increment_player_score(p_player_id uuid, p_delta integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_delta is null or p_delta = 0 then
    return;
  end if;
  update public.players
  set score = coalesce(score, 0) + p_delta
  where id = p_player_id;
end;
$$;

grant execute on function public.increment_player_score(uuid, integer) to service_role;
