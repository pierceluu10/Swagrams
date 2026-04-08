-- Atomic multiplayer submission write path:
-- insert the word, increment the player's score, and return the new total score

create or replace function public.submit_round_word(
  p_lobby_id uuid,
  p_round_id uuid,
  p_player_id uuid,
  p_word text,
  p_score integer
)
returns table(total_score integer)
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.submissions (lobby_id, round_id, player_id, word, score)
  values (p_lobby_id, p_round_id, p_player_id, p_word, p_score);

  return query
  update public.players
  set score = coalesce(score, 0) + p_score
  where id = p_player_id
    and lobby_id = p_lobby_id
  returning score;

exception
  when unique_violation then
    raise exception 'Already used.';
end;
$$;

grant execute on function public.submit_round_word(uuid, uuid, uuid, text, integer) to service_role;
