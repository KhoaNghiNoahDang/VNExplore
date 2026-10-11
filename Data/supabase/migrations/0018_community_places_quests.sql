-- 0018: Places and quests from the community, checked by the people who go there.
--
-- A place a traveller adds is on the map for everyone at once, marked "not confirmed yet". Each
-- signed-in traveller who reaches it (the app's GPS check, repeated here: within ~150 m) counts
-- once; at 10 people it is confirmed and the mark goes away. Three "this isn't right" reports
-- hide a place that isn't confirmed yet. The team can still hide anything (status = 'hidden').
--
-- Public quests work the same way: listed at once, "not confirmed yet" until 10 people have
-- walked them (a finished journey of that quest with at least half its stops reached).
-- review_status keeps its meaning for the team: 'approved' confirms a quest straight away,
-- 'rejected' takes it out of the Quest tab.

-- ------------------------------------------------------------ places
create table public.community_places (
  id             uuid primary key default gen_random_uuid(),
  client_id      uuid not null unique,
  author_id      uuid default auth.uid() references auth.users (id) on delete set null,
  name           text not null check (char_length(trim(name)) between 2 and 120),
  kind           text not null check (kind in ('food', 'sight', 'fun')),
  lat            double precision not null check (lat between 8 and 24),
  lng            double precision not null check (lng between 102 and 110),
  address        text check (char_length(address) <= 200),
  description    text check (char_length(description) <= 500),
  opening_hours  text check (char_length(opening_hours) <= 100),
  price_min_k    integer check (price_min_k between 0 and 100000),
  price_max_k    integer check (price_max_k between 0 and 100000),
  contact        text check (char_length(contact) <= 200),
  language       text not null check (language in ('vi', 'en')),
  visit_min      smallint not null default 45 check (visit_min between 5 and 600),
  visit_count    integer not null default 0,
  flag_count     integer not null default 0,
  -- live: on the map · hidden: reported or taken down · imported: now a catalogue place (place_id)
  status         text not null default 'live' check (status in ('live', 'hidden', 'removed', 'imported')),
  place_id       text,
  created_at     timestamptz not null default now(),
  check (price_max_k is null or price_min_k is null or price_max_k >= price_min_k)
);
create index community_places_live_idx on public.community_places (status, created_at desc);
create index community_places_author_idx on public.community_places (author_id, created_at desc);

alter table public.community_places enable row level security;
-- Everyone sees what's live; authors also see their own hidden ones. Writes go through the functions below.
create policy "read live or own community places" on public.community_places
  for select to anon, authenticated using (status = 'live' or author_id = (select auth.uid()));

-- One row per (place, person) who got there. place_id is the app's stop id ("cp:<uuid>").
create table public.place_visits (
  place_id    text not null check (char_length(place_id) <= 80),
  user_id     uuid not null references auth.users (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (place_id, user_id)
);
alter table public.place_visits enable row level security;
create policy "read own visits" on public.place_visits for select to authenticated using (user_id = (select auth.uid()));

create table public.community_place_flags (
  place_id    uuid not null references public.community_places (id) on delete cascade,
  user_id     uuid not null references auth.users (id) on delete cascade,
  reason      text not null check (reason in ('not_real', 'wrong_place', 'closed', 'spam')),
  note        text check (char_length(note) <= 300),
  created_at  timestamptz not null default now(),
  primary key (place_id, user_id)
);
alter table public.community_place_flags enable row level security;
-- No policies: only through flag_community_place(); the team reads them in the dashboard.

create function public.metres_between(lat1 double precision, lng1 double precision, lat2 double precision, lng2 double precision)
returns double precision language sql immutable set search_path = '' as $$
  select 6371000 * 2 * asin(sqrt(
    power(sin(radians(lat2 - lat1) / 2), 2) +
    cos(radians(lat1)) * cos(radians(lat2)) * power(sin(radians(lng2 - lng1) / 2), 2)))
$$;

-- Add a place. Safe to retry (same client_id → same row). A place with the same name within 80 m
-- is not added twice: the existing one comes back. The author counts as the first visitor when
-- they are standing there (p_here within 150 m).
create function public.add_community_place(
  p_client_id uuid, p_name text, p_kind text, p_lat double precision, p_lng double precision,
  p_address text, p_description text, p_opening_hours text, p_price_min_k integer, p_price_max_k integer,
  p_contact text, p_language text, p_visit_min integer, p_here_lat double precision, p_here_lng double precision
) returns public.community_places
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  r public.community_places;
begin
  if uid is null then raise exception 'sign_in_required'; end if;
  select * into r from public.community_places where client_id = p_client_id;
  if found then return r; end if;
  select * into r from public.community_places
    where status = 'live' and lower(trim(name)) = lower(trim(p_name))
      and public.metres_between(lat, lng, p_lat, p_lng) <= 80
    limit 1;
  if found then return r; end if;
  if (select count(*) from public.community_places where author_id = uid and created_at > now() - interval '1 day') >= 10 then
    raise exception 'too_many_places';
  end if;
  insert into public.community_places (client_id, author_id, name, kind, lat, lng, address, description,
      opening_hours, price_min_k, price_max_k, contact, language, visit_min)
    values (p_client_id, uid, trim(p_name), p_kind, p_lat, p_lng, nullif(trim(p_address), ''),
      nullif(trim(p_description), ''), nullif(trim(p_opening_hours), ''), p_price_min_k, p_price_max_k,
      nullif(trim(p_contact), ''), p_language, coalesce(p_visit_min, 45))
    returning * into r;
  if p_here_lat is not null and p_here_lng is not null
     and public.metres_between(r.lat, r.lng, p_here_lat, p_here_lng) <= 150 then
    insert into public.place_visits (place_id, user_id) values ('cp:' || r.id, uid) on conflict do nothing;
    update public.community_places set visit_count = 1 where id = r.id returning * into r;
  end if;
  return r;
end;
$$;

-- "I got there" at a community place, from where the phone says it is. Returns the visit count.
create function public.record_place_visit(p_place_id text, p_lat double precision, p_lng double precision, p_accuracy double precision)
returns integer
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  r public.community_places;
  n integer;
begin
  if uid is null then raise exception 'sign_in_required'; end if;
  if p_place_id !~ '^cp:[0-9a-f-]{36}$' then raise exception 'not_a_community_place'; end if;
  select * into r from public.community_places where id = substr(p_place_id, 4)::uuid and status = 'live';
  if not found then raise exception 'not_found'; end if;
  if public.metres_between(r.lat, r.lng, p_lat, p_lng) > 150 + least(greatest(coalesce(p_accuracy, 0), 0), 50) then
    raise exception 'too_far';
  end if;
  insert into public.place_visits (place_id, user_id) values (p_place_id, uid) on conflict do nothing;
  get diagnostics n = row_count;
  if n > 0 then
    update public.community_places set visit_count = visit_count + 1 where id = r.id returning visit_count into n;
    return n;
  end if;
  return r.visit_count;
end;
$$;

-- "This isn't right". Three reports hide a place that fewer than 10 people have confirmed.
create function public.flag_community_place(p_id uuid, p_reason text, p_note text)
returns text
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  r public.community_places;
  n integer;
begin
  if uid is null then raise exception 'sign_in_required'; end if;
  insert into public.community_place_flags (place_id, user_id, reason, note)
    values (p_id, uid, p_reason, nullif(trim(p_note), ''))
    on conflict (place_id, user_id) do update set reason = excluded.reason, note = excluded.note;
  select count(*) into n from public.community_place_flags where place_id = p_id;
  update public.community_places
    set flag_count = n,
        status = case when status = 'live' and n >= 3 and visit_count < 10 then 'hidden' else status end
    where id = p_id
    returning * into r;
  return r.status;
end;
$$;

-- Authors may take back their own place while nobody else has been there.
create function public.remove_community_place(p_id uuid)
returns void
language sql security definer set search_path = '' as $$
  update public.community_places set status = 'removed'
    where id = p_id and author_id = auth.uid() and visit_count <= 1 and status = 'live'
$$;

revoke execute on function public.add_community_place(uuid, text, text, double precision, double precision, text, text, text, integer, integer, text, text, integer, double precision, double precision) from public, anon;
revoke execute on function public.record_place_visit(text, double precision, double precision, double precision) from public, anon;
revoke execute on function public.flag_community_place(uuid, text, text) from public, anon;
revoke execute on function public.remove_community_place(uuid) from public, anon;
grant execute on function public.add_community_place(uuid, text, text, double precision, double precision, text, text, text, integer, integer, text, text, integer, double precision, double precision) to authenticated;
grant execute on function public.record_place_visit(text, double precision, double precision, double precision) to authenticated;
grant execute on function public.flag_community_place(uuid, text, text) to authenticated;
grant execute on function public.remove_community_place(uuid) to authenticated;

-- ------------------------------------------------------------ quests
alter table public.quests add column if not exists run_count integer not null default 0;

create table public.quest_runs (
  quest_id    uuid not null references public.quests (id) on delete cascade,
  user_id     uuid not null references auth.users (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (quest_id, user_id)
);
alter table public.quest_runs enable row level security;
-- No policies: filled by the trigger below.

-- A finished journey of a quest, with at least half its stops reached, is one more person who walked it.
create function public.count_quest_run() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  n integer;
begin
  if new.quest_id is null then return new; end if;
  if (select count(*) from jsonb_object_keys(new.arrived)) * 2 < cardinality(new.stop_ids) then return new; end if;
  insert into public.quest_runs (quest_id, user_id) values (new.quest_id, new.user_id) on conflict do nothing;
  get diagnostics n = row_count;
  if n > 0 then
    update public.quests set run_count = run_count + 1 where id = new.quest_id;
  end if;
  return new;
end;
$$;
create trigger count_quest_run after insert on public.journeys
  for each row execute function public.count_quest_run();
revoke execute on function public.count_quest_run() from public, anon, authenticated;

-- Public quests show at once (unless the team rejected them).
alter policy "read shared or own quests" on public.quests using (
  author_id = (select auth.uid())
  or (status = 'published' and (visibility = 'unlisted' or (visibility = 'public' and review_status <> 'rejected')))
);

-- ------------------------------------------------------------ grants
-- Explicit, as new tables need from 30/10/2026 (RLS still decides which rows).
grant select on public.community_places to anon, authenticated;
grant select on public.place_visits to authenticated;
grant all on public.community_places, public.place_visits, public.community_place_flags, public.quest_runs to service_role;
