-- Restrict SECURITY DEFINER helper functions to the server-only service role.

do $$
begin
  if to_regprocedure('public.increment_player_score(uuid, integer)') is not null then
    revoke all on function public.increment_player_score(uuid, integer) from public, anon, authenticated;
    grant execute on function public.increment_player_score(uuid, integer) to service_role;
  end if;

  if to_regprocedure('public.submit_round_word(uuid, uuid, uuid, text, integer)') is not null then
    revoke all on function public.submit_round_word(uuid, uuid, uuid, text, integer) from public, anon, authenticated;
    grant execute on function public.submit_round_word(uuid, uuid, uuid, text, integer) to service_role;
  end if;
end;
$$;
