-- 0009: Dated events (concerts, exhibitions, the weekend walking street…) that a traveller can add
-- to a quest as a stop with a fixed time. Source: Data/sheets/events.csv (export_sql.mjs).
-- Times are Hanoi local time (UTC+7); the app turns them into instants itself.

create table public.events (
  id            text primary key,
  status        text not null default 'draft' check (status in ('draft', 'approved')),
  -- hoan-kiem / ba-vi, or hanoi for anywhere else in the city
  area          text not null check (area in ('hoan-kiem', 'ba-vi', 'hanoi')),
  -- show: arrive before a start time · open: drop in any time between start and end
  kind          text not null check (kind in ('show', 'open')),
  category      text not null default 'other'
                check (category in ('music', 'theatre', 'film', 'exhibition', 'workshop', 'talk', 'market', 'festival', 'other')),
  sensitivity   text not null default 'ok' check (sensitivity in ('ok', 'adult')),
  name_vi       text not null,
  name_en       text,
  blurb_vi      text,
  blurb_en      text,
  place_id      text references public.places (id) on delete set null,
  venue         text,
  address       text,
  lat           double precision not null,
  lng           double precision not null,
  from_date     date not null,
  to_date       date not null,
  -- e.g. {fri,sat,sun}; empty = every day between the dates
  weekdays      text[] not null default '{}',
  -- local HH:MM start times; several for shows with more than one performance a day
  start_times   text[] not null default '{}',
  end_time      text,
  visit_min     integer not null default 120 check (visit_min between 5 and 720),
  price_min_k   integer check (price_min_k >= 0),
  price_max_k   integer check (price_max_k >= 0),
  needs_ticket  boolean not null default false,
  event_url     text check (event_url is null or event_url like 'https://%'),
  host_name     text,
  host_url      text,
  source        text,
  checked_on    date,
  review_notes  text,
  updated_at    timestamptz not null default now(),
  check (to_date >= from_date),
  check (price_max_k is null or price_min_k is null or price_max_k >= price_min_k),
  check (status = 'draft' or cardinality(start_times) > 0),
  check (kind = 'show' or end_time is not null)
);

create index events_window_idx on public.events (area, to_date) where status = 'approved';
create index events_place_idx on public.events (place_id);

alter table public.events enable row level security;
create policy "read approved events" on public.events for select using (status = 'approved');
