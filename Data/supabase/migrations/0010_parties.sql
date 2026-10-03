-- 0010: Group play ("parties") — friends walk the same route together, each with their own role,
-- like a real-life escape room.
--   * A host creates a party from a route; friends join with a 6-letter code (a name is enough:
--     the app signs them in anonymously — enable Anonymous sign-ins in Supabase Auth).
--   * Each member picks a different role, stamps each stop themselves and does their own missions.
--   * Some puzzles are shared: the clues are split between members and one answer counts for all.
--   * Optional timer: off, stopwatch, or a countdown sized from the trip request.
-- Realtime keeps everyone's screen in sync (tables added to the supabase_realtime publication).

create table public.parties (
  id             uuid primary key default gen_random_uuid(),
  code           text not null unique check (code ~ '^[A-Z2-9]{6}$'),
  host_id        uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title          text check (char_length(title) <= 120),
  area           text not null default 'hoan-kiem' check (area in ('hoan-kiem', 'ba-vi')),
  stop_ids       text[] not null check (cardinality(stop_ids) between 1 and 12),
  transport      text not null default 'walk' check (transport in ('walk', 'motorbike', 'grabbike', 'car')),
  hours          numeric(4, 1) not null default 3 check (hours between 0.5 and 24),
  timer_mode     text not null default 'stopwatch' check (timer_mode in ('off', 'stopwatch', 'countdown')),
  time_limit_min integer check (time_limit_min between 10 and 1440),
  max_members    smallint not null default 5 check (max_members between 2 and 8),
  status         text not null default 'lobby' check (status in ('lobby', 'playing', 'finished')),
  started_at     timestamptz,
  finished_at    timestamptz,
  created_at     timestamptz not null default now(),
  check (timer_mode <> 'countdown' or time_limit_min is not null)
);

create table public.party_members (
  party_id     uuid not null references public.parties (id) on delete cascade,
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  display_name text not null check (char_length(trim(display_name)) between 1 and 30),
  role_id      text,
  joined_at    timestamptz not null default now(),
  finished_at  timestamptz,
  primary key (party_id, user_id)
);
-- One role per person in a party.
create unique index party_members_role_uidx on public.party_members (party_id, role_id) where role_id is not null;
create index party_members_user_idx on public.party_members (user_id);

-- Each member's own progress: stamp (arrived) and their role mission per stop.
create table public.party_progress (
  party_id     uuid not null references public.parties (id) on delete cascade,
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  place_id     text not null,
  arrived_at   timestamptz,
  mission_done boolean not null default false,
  updated_at   timestamptz not null default now(),
  primary key (party_id, user_id, place_id),
  -- on update cascade: when a guest's progress is merged into their real account (0011), it follows.
  foreign key (party_id, user_id) references public.party_members (party_id, user_id) on delete cascade on update cascade
);

-- Shared puzzles: solved once, for the whole party.
create table public.party_puzzles (
  party_id   uuid not null references public.parties (id) on delete cascade,
  place_id   text not null,
  solved_by  uuid not null default auth.uid() references auth.users (id) on delete cascade,
  solved_at  timestamptz not null default now(),
  primary key (party_id, place_id)
);

-- ------------------------------------------------------------ helpers
-- security definer so policies can ask "is this user in that party?" without recursing.
create function public.is_party_member(pid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.party_members m where m.party_id = pid and m.user_id = (select auth.uid()))
$$;

-- Join by code (members can't read a party before joining, so this is the only way in).
-- Rejoining keeps the member's role; a full or finished party refuses new members.
create function public.join_party(p_code text, p_name text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  p public.parties;
  n int;
begin
  if (select auth.uid()) is null then raise exception 'not_signed_in'; end if;
  select * into p from public.parties where code = upper(trim(p_code));
  if p.id is null then raise exception 'party_not_found'; end if;
  if exists (select 1 from public.party_members where party_id = p.id and user_id = (select auth.uid())) then
    update public.party_members set display_name = left(trim(p_name), 30)
      where party_id = p.id and user_id = (select auth.uid()) and nullif(trim(p_name), '') is not null;
    return p.id;
  end if;
  if p.status = 'finished' then raise exception 'party_finished'; end if;
  select count(*) into n from public.party_members where party_id = p.id;
  if n >= p.max_members then raise exception 'party_full'; end if;
  insert into public.party_members (party_id, user_id, display_name)
    values (p.id, (select auth.uid()), left(trim(p_name), 30));
  return p.id;
end;
$$;

revoke execute on function public.is_party_member(uuid) from public, anon;
revoke execute on function public.join_party(text, text) from public, anon;
grant execute on function public.is_party_member(uuid) to authenticated;
grant execute on function public.join_party(text, text) to authenticated;

-- ------------------------------------------------------------ row level security
alter table public.parties enable row level security;
alter table public.party_members enable row level security;
alter table public.party_progress enable row level security;
alter table public.party_puzzles enable row level security;

create policy "members read party" on public.parties
  for select to authenticated using (host_id = (select auth.uid()) or public.is_party_member(id));
create policy "create own party" on public.parties
  for insert to authenticated with check (host_id = (select auth.uid()));
create policy "host updates party" on public.parties
  for update to authenticated using (host_id = (select auth.uid()));
create policy "host deletes party" on public.parties
  for delete to authenticated using (host_id = (select auth.uid()));

create policy "members read members" on public.party_members
  for select to authenticated using (public.is_party_member(party_id));
-- The host adds themselves right after creating the party; everyone else joins via join_party().
create policy "host joins own party" on public.party_members
  for insert to authenticated with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.parties p where p.id = party_id and p.host_id = (select auth.uid()))
  );
create policy "update own membership" on public.party_members
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "leave party" on public.party_members
  for delete to authenticated using (user_id = (select auth.uid()));

create policy "members read progress" on public.party_progress
  for select to authenticated using (public.is_party_member(party_id));
create policy "write own progress" on public.party_progress
  for insert to authenticated with check (user_id = (select auth.uid()) and public.is_party_member(party_id));
create policy "update own progress" on public.party_progress
  for update to authenticated using (user_id = (select auth.uid()));

create policy "members read puzzles" on public.party_puzzles
  for select to authenticated using (public.is_party_member(party_id));
create policy "members solve puzzles" on public.party_puzzles
  for insert to authenticated with check (solved_by = (select auth.uid()) and public.is_party_member(party_id));

-- ------------------------------------------------------------ realtime
alter publication supabase_realtime add table public.parties, public.party_members, public.party_progress, public.party_puzzles;
