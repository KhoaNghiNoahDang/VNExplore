-- 0005: Passport — finished journeys (stamps + items), private to their owner.
-- One row per finished journey. client_id = the journey's start time on the device, so
-- saving the same journey twice (retry, local → account sync) is a no-op.

create table public.journeys (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  client_id    text not null check (char_length(client_id) between 1 and 40),
  started_at   timestamptz not null,
  finished_at  timestamptz not null default now(),
  mode         text not null check (mode in ('explore', 'listen', 'easy')),
  role_id      text references public.roles (id) on delete set null,
  quest_id     uuid references public.quests (id) on delete set null,
  quest_title  text check (char_length(quest_title) <= 120),
  stop_ids     text[] not null check (cardinality(stop_ids) between 1 and 20),
  -- placeId → mode the traveller was in when they got the stamp
  arrived      jsonb not null default '{}' check (jsonb_typeof(arrived) = 'object'),
  -- placeIds whose Explore mission was completed (gold seal + item)
  items        text[] not null default '{}' check (cardinality(items) <= 20),
  people       smallint not null default 1 check (people between 1 and 50),
  transport    text not null default 'walk' check (transport in ('walk', 'motorbike', 'grabbike', 'car')),
  total_min    integer check (total_min between 0 and 2000),
  distance_m   integer check (distance_m between 0 and 500000),
  cost_min_k   integer check (cost_min_k between 0 and 100000),
  cost_max_k   integer check (cost_max_k between 0 and 100000),
  start_lat    double precision,
  start_lng    double precision,
  unique (user_id, client_id)
);

create index journeys_user_finished_idx on public.journeys (user_id, finished_at desc);
create index journeys_role_idx on public.journeys (role_id);
create index journeys_quest_idx on public.journeys (quest_id);

alter table public.journeys enable row level security;

-- Only the owner can see, add or remove their journeys. No update: a finished journey is a record.
create policy "read own journeys" on public.journeys
  for select to authenticated using (user_id = (select auth.uid()));
create policy "add own journeys" on public.journeys
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "delete own journeys" on public.journeys
  for delete to authenticated using (user_id = (select auth.uid()));
