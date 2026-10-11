-- 0020: Travellers can delete their own account (Account → Delete account).
-- Removing the auth user removes everything that is theirs (profile, quests, likes, journeys,
-- parties, visits, reports — all "on delete cascade"). Places they put on the map stay, without
-- an author (community_places.author_id "on delete set null"), so routes others planned still work.

create function public.delete_my_account() returns void
language sql security definer set search_path = '' as $$
  delete from auth.users where id = auth.uid()
$$;
revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
