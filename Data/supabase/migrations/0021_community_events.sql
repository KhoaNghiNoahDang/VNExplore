-- 0021: Events added by travellers. Shown to everyone at once, marked "not confirmed yet",
-- until 5 other people have confirmed them — either by being there during the event (GPS within
-- ~200 m on one of its days: kind 'visit') or by vouching that it is real (kind 'vouch'). A link to
-- the event's own page (Facebook, ticket site…) is required. 3 reports hide an unconfirmed event.
-- Limits: 5 new events per person a day; same name + same first day within 300 m isn't added twice;
-- authors can't confirm their own event. App ids: "ce-<uuid>".

create table public.community_events (
  id             uuid primary key default gen_random_uuid(),
  client_id      uuid not null unique,
  author_id      uuid default auth.uid() references auth.users (id) on delete set null,
  name           text not null check (char_length(trim(name)) between 3 and 160),
  category       text not null check (category in ('music','theatre','film','exhibition','workshop','talk','market','festival','other')),
  kind           text not null check (kind in ('show','open')),
  venue          text not null check (char_length(trim(venue)) between 2 and 120),
  address        text check (char_length(address) <= 200),
  lat            double precision not null check (lat between 20.85 and 21.3),
  lng            double precision not null check (lng between 105.25 and 106.05),
  from_date      date not null,
  to_date        date not null,
  start_time     time not null,
  end_time       time,
  price_min_k    integer check (price_min_k between 0 and 100000),
  price_max_k    integer check (price_max_k between 0 and 100000),
  ticket         boolean not null default false,
  url            text not null check (url ~* '^https?://[^\s]+$' and char_length(url) <= 500),
  description    text check (char_length(description) <= 500),
  confirm_count  integer not null default 0,
  flag_count     integer not null default 0,
  status         text not null default 'live' check (status in ('live','hidden','removed','imported')),
  created_at     timestamptz not null default now(),
  check (to_date >= from_date and to_date <= from_date + 120),
  check (kind = 'show' or end_time is not null),
  check (price_max_k is null or price_min_k is null or price_max_k >= price_min_k)
);
create index community_events_live_idx on public.community_events (status, to_date);
create index community_events_author_idx on public.community_events (author_id, created_at desc);
alter table public.community_events enable row level security;
create policy "read live or own community events" on public.community_events
  for select to anon, authenticated using (status = 'live' or author_id = (select auth.uid()));
grant select on public.community_events to anon, authenticated;

create table public.community_event_confirms (
  event_id    uuid not null references public.community_events (id) on delete cascade,
  user_id     uuid not null references auth.users (id) on delete cascade,
  kind        text not null check (kind in ('visit','vouch')),
  created_at  timestamptz not null default now(),
  primary key (event_id, user_id)
);
alter table public.community_event_confirms enable row level security;
create policy "read own event confirms" on public.community_event_confirms for select to authenticated using (user_id = (select auth.uid()));
grant select on public.community_event_confirms to authenticated;

create table public.community_event_flags (
  event_id    uuid not null references public.community_events (id) on delete cascade,
  user_id     uuid not null references auth.users (id) on delete cascade,
  reason      text not null check (reason in ('not_real','wrong_place','wrong_time','cancelled','spam')),
  note        text check (char_length(note) <= 300),
  created_at  timestamptz not null default now(),
  primary key (event_id, user_id)
);
alter table public.community_event_flags enable row level security;
grant all on public.community_events, public.community_event_confirms, public.community_event_flags to service_role;

create function public.add_community_event(
  p_client_id uuid, p_name text, p_category text, p_kind text, p_venue text, p_address text,
  p_lat double precision, p_lng double precision, p_from date, p_to date, p_start time, p_end time,
  p_price_min_k integer, p_price_max_k integer, p_ticket boolean, p_url text, p_description text
) returns public.community_events
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  r public.community_events;
  today date := (now() at time zone 'Asia/Ho_Chi_Minh')::date;
begin
  if uid is null then raise exception 'sign_in_required'; end if;
  select * into r from public.community_events where client_id = p_client_id;
  if found then return r; end if;
  if p_to < today then raise exception 'in_the_past'; end if;
  if p_from > today + 365 then raise exception 'too_far_ahead'; end if;
  select * into r from public.community_events
    where status = 'live' and lower(trim(name)) = lower(trim(p_name)) and from_date = p_from
      and public.metres_between(lat, lng, p_lat, p_lng) <= 300
    limit 1;
  if found then return r; end if;
  if (select count(*) from public.community_events where author_id = uid and created_at > now() - interval '1 day') >= 5 then
    raise exception 'too_many_events';
  end if;
  insert into public.community_events (client_id, author_id, name, category, kind, venue, address, lat, lng,
      from_date, to_date, start_time, end_time, price_min_k, price_max_k, ticket, url, description)
    values (p_client_id, uid, trim(p_name), p_category, p_kind, trim(p_venue), nullif(trim(p_address), ''), p_lat, p_lng,
      p_from, p_to, p_start, p_end, p_price_min_k, p_price_max_k, coalesce(p_ticket, false), trim(p_url), nullif(trim(p_description), ''))
    returning * into r;
  return r;
end;
$$;

-- With a position near the event on one of its days it counts as having been there ('visit'),
-- otherwise as vouching that it is real ('vouch'). One per person; a later visit upgrades a vouch.
create function public.confirm_community_event(p_id uuid, p_lat double precision, p_lng double precision, p_accuracy double precision)
returns integer
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  r public.community_events;
  today date := (now() at time zone 'Asia/Ho_Chi_Minh')::date;
  k text := 'vouch';
  n integer;
begin
  if uid is null then raise exception 'sign_in_required'; end if;
  select * into r from public.community_events where id = p_id and status = 'live';
  if not found then raise exception 'not_found'; end if;
  if r.author_id = uid then raise exception 'own_event'; end if;
  if p_lat is not null and p_lng is not null and today between r.from_date and r.to_date
     and public.metres_between(r.lat, r.lng, p_lat, p_lng) <= 200 + least(greatest(coalesce(p_accuracy, 0), 0), 50) then
    k := 'visit';
  end if;
  insert into public.community_event_confirms (event_id, user_id, kind) values (p_id, uid, k)
    on conflict (event_id, user_id) do update set kind = case when excluded.kind = 'visit' then 'visit' else public.community_event_confirms.kind end;
  select count(*) into n from public.community_event_confirms where event_id = p_id;
  update public.community_events set confirm_count = n where id = p_id;
  return n;
end;
$$;

create function public.flag_community_event(p_id uuid, p_reason text, p_note text)
returns text
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  r public.community_events;
  n integer;
begin
  if uid is null then raise exception 'sign_in_required'; end if;
  insert into public.community_event_flags (event_id, user_id, reason, note)
    values (p_id, uid, p_reason, nullif(trim(p_note), ''))
    on conflict (event_id, user_id) do update set reason = excluded.reason, note = excluded.note;
  select count(*) into n from public.community_event_flags where event_id = p_id;
  update public.community_events
    set flag_count = n,
        status = case when status = 'live' and n >= 3 and confirm_count < 5 then 'hidden' else status end
    where id = p_id
    returning * into r;
  return r.status;
end;
$$;

revoke execute on function public.add_community_event(uuid, text, text, text, text, text, double precision, double precision, date, date, time, time, integer, integer, boolean, text, text) from public, anon;
revoke execute on function public.confirm_community_event(uuid, double precision, double precision, double precision) from public, anon;
revoke execute on function public.flag_community_event(uuid, text, text) from public, anon;
grant execute on function public.add_community_event(uuid, text, text, text, text, text, double precision, double precision, date, date, time, time, integer, integer, boolean, text, text) to authenticated;
grant execute on function public.confirm_community_event(uuid, double precision, double precision, double precision) to authenticated;
grant execute on function public.flag_community_event(uuid, text, text) to authenticated;
