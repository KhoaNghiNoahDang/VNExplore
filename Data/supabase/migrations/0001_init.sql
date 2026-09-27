-- VNExplore — initial schema
-- Content (places, roles, missions, fares) is edited by the team and read by everyone.
-- User features (profiles, user-made quests, likes) are ready for Supabase Auth.

-- ============================================================ content
create table public.places (
  id               text primary key,
  status           text not null default 'draft' check (status in ('draft', 'approved', 'hidden')),
  area             text,
  name_vi          text not null,
  name_en          text not null,
  name_vi_short    text,
  lat              double precision not null,
  lng              double precision not null,
  address          text,
  opening_hours    text,
  themes           text[] not null default '{}',
  tags             text[] not null default '{}',
  visit_min        integer not null default 20,
  price_min_k      integer not null default 0,
  price_max_k      integer not null default 0,
  price_checked_on date,
  tone             text not null default 'teal' check (tone in ('brick', 'butter', 'teal', 'leaf')),
  blurb_vi text, blurb_en text,
  story_vi text, story_en text,
  why_vi text, why_en text,
  photo_tip_vi text, photo_tip_en text,
  etiquette_vi text, etiquette_en text,
  challenge_vi text, challenge_en text,
  option1_vi text, option1_en text,
  option2_vi text, option2_en text,
  option3_vi text, option3_en text,
  answer           smallint check (answer between 1 and 3),
  hint_vi text, hint_en text,
  wikidata         text,
  sources          text[] not null default '{}',
  review_notes     text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  check (price_max_k >= price_min_k)
);
create index places_status_idx on public.places (status);

-- Raw places from OpenStreetMap, not yet written up. Internal: never exposed to the app.
create table public.candidates (
  id                 text primary key,
  area               text not null,
  "group"            text not null check ("group" in ('sight', 'food', 'fun')),
  status             text not null default 'candidate',
  sensitivity        text not null check (sensitivity in ('ok', 'religious', 'review', 'adult')),
  sensitivity_reason text,
  category           text,
  cuisine            text,
  brand              text,
  name_vi            text not null,
  name_en            text,
  lat                double precision not null,
  lng                double precision not null,
  osm_kind           text,
  address            text,
  opening_hours      text,
  website            text,
  wikidata           text,
  wikipedia_vi       text,
  wikipedia_en       text,
  inception          text,
  commons_image      text,
  osm_url            text,
  score              real,
  decision           text check (decision in ('keep', 'drop') or decision is null),
  updated_at         timestamptz not null default now()
);
create index candidates_area_group_idx on public.candidates (area, "group");

create table public.roles (
  id               text primary key,
  name_vi text not null, name_en text not null,
  intro_vi text, intro_en text,
  goal_vi text, goal_en text,
  item_noun_vi text, item_noun_en text,
  fav_places       text[] not null default '{}',
  fallback_task_vi text, fallback_task_en text,
  fallback_item_vi text, fallback_item_en text,
  ending_vi text, ending_en text,
  tone             text not null default 'teal'
);

create table public.missions (
  role_id  text not null references public.roles (id) on delete cascade,
  place_id text not null references public.places (id) on delete cascade,
  status   text not null default 'draft' check (status in ('draft', 'approved')),
  task_vi text, task_en text,
  item_vi text, item_en text,
  primary key (role_id, place_id)
);

create table public.transport_fares (
  transport         text not null check (transport in ('walk', 'motorbike', 'grabbike', 'car')),
  seats             integer not null default 1,
  base_k            real,
  base_km           real,
  per_km_k          real,
  peak_fare         real,
  fuel_per_km_k     real,
  parking_k         real,
  speed_normal_kmh  real not null,
  speed_peak_kmh    real not null,
  overhead_min      real not null default 0,
  min_leg_m         real not null default 0,
  detour            real not null default 1,
  walking_street_ok boolean not null default false,
  maps_mode         text not null,
  checked_on        date,
  primary key (transport, seats)
);

-- ============================================================ users (Supabase Auth)
create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  avatar_url   text,
  lang         text not null default 'vi' check (lang in ('vi', 'en')),
  created_at   timestamptz not null default now()
);

-- A profile row is created automatically when someone signs up.
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)));
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Quests made and shared by users.
create table public.quests (
  id          uuid primary key default gen_random_uuid(),
  author_id   uuid not null references public.profiles (id) on delete cascade,
  title       text not null check (char_length(title) between 3 and 120),
  description text check (char_length(description) <= 2000),
  mode        text not null default 'listen' check (mode in ('explore', 'listen', 'easy')),
  role_id     text references public.roles (id),
  transport   text not null default 'walk',
  visibility  text not null default 'private' check (visibility in ('private', 'unlisted', 'public')),
  status      text not null default 'draft' check (status in ('draft', 'published', 'removed')),
  like_count  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index quests_public_idx on public.quests (status, visibility, created_at desc);

create table public.quest_stops (
  quest_id  uuid not null references public.quests (id) on delete cascade,
  position  smallint not null,
  place_id  text not null references public.places (id),
  note      text check (char_length(note) <= 500),   -- the author's own tip for this stop
  primary key (quest_id, position)
);

create table public.quest_likes (
  quest_id   uuid not null references public.quests (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (quest_id, user_id)
);

-- Keep quests.like_count in sync.
create function public.bump_like_count() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    update public.quests set like_count = like_count + 1 where id = new.quest_id;
  else
    update public.quests set like_count = like_count - 1 where id = old.quest_id;
  end if;
  return null;
end;
$$;
create trigger quest_likes_count after insert or delete on public.quest_likes
  for each row execute function public.bump_like_count();

-- updated_at on edit
create function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end;
$$;

-- Trigger functions are internal: nobody should call them through the API.
revoke execute on function public.handle_new_user()  from public, anon, authenticated;
revoke execute on function public.bump_like_count()  from public, anon, authenticated;
revoke execute on function public.touch_updated_at() from public, anon, authenticated;
create trigger places_touch before update on public.places for each row execute function public.touch_updated_at();
create trigger candidates_touch before update on public.candidates for each row execute function public.touch_updated_at();
create trigger quests_touch before update on public.quests for each row execute function public.touch_updated_at();

-- ============================================================ row level security
alter table public.places          enable row level security;
alter table public.candidates      enable row level security;
alter table public.roles           enable row level security;
alter table public.missions        enable row level security;
alter table public.transport_fares enable row level security;
alter table public.profiles        enable row level security;
alter table public.quests          enable row level security;
alter table public.quest_stops     enable row level security;
alter table public.quest_likes     enable row level security;

-- Content: everyone may read approved rows. Writes only via the dashboard / service role.
create policy "read approved places"   on public.places          for select using (status = 'approved');
create policy "read roles"             on public.roles           for select using (true);
create policy "read approved missions" on public.missions        for select using (status = 'approved');
create policy "read fares"             on public.transport_fares for select using (true);
-- candidates: no policy → not readable through the public API.

-- Profiles: public names/avatars; you edit only your own.
-- (select auth.uid()) is evaluated once per query instead of once per row.
create policy "read profiles"      on public.profiles for select using (true);
create policy "update own profile" on public.profiles for update using ((select auth.uid()) = id);

-- Quests: public+published ones (and unlisted by link) are readable; authors manage their own.
create policy "read shared or own quests" on public.quests for select
  using ((status = 'published' and visibility in ('public', 'unlisted')) or author_id = (select auth.uid()));
create policy "create own quests" on public.quests for insert with check (author_id = (select auth.uid()));
create policy "edit own quests"   on public.quests for update using (author_id = (select auth.uid()));
create policy "delete own quests" on public.quests for delete using (author_id = (select auth.uid()));

create policy "read stops of visible quests" on public.quest_stops for select
  using (exists (select 1 from public.quests q where q.id = quest_id));  -- quests RLS applies inside
create policy "manage stops of own quests" on public.quest_stops for all
  using (exists (select 1 from public.quests q where q.id = quest_id and q.author_id = (select auth.uid())))
  with check (exists (select 1 from public.quests q where q.id = quest_id and q.author_id = (select auth.uid())));

create policy "read likes"   on public.quest_likes for select using (true);
create policy "like as self" on public.quest_likes for insert with check (user_id = (select auth.uid()));
create policy "unlike own"   on public.quest_likes for delete using (user_id = (select auth.uid()));
