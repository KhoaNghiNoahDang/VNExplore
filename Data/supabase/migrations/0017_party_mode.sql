-- 0017: Parties for the easy ("Thong thả") mode too. An easy party is just friends following the
-- same route: no roles, no shared puzzles, no timer — everyone stamps the stops they reach.
-- Plus a preview of a party for people who only have its link (before joining).

alter table public.parties
  add column if not exists mode text not null default 'explore' check (mode in ('explore', 'easy'));

-- What someone holding the link may see before joining: the route and how full it is.
-- No member names or ids. Callable without signing in (anon) — knowing the code is the key.
create or replace function public.party_preview(p_code text)
returns table (title text, mode text, stop_ids text[], transport text, hours numeric, status text, members int, max_members smallint)
language sql stable security definer set search_path = '' as $$
  select p.title, p.mode, p.stop_ids, p.transport, p.hours, p.status,
         (select count(*)::int from public.party_members m where m.party_id = p.id), p.max_members
  from public.parties p
  where p.code = upper(trim(p_code))
$$;

revoke execute on function public.party_preview(text) from public;
grant execute on function public.party_preview(text) to anon, authenticated;
