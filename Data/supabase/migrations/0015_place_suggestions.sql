-- 0015: Places suggested by travellers ("Thêm địa điểm"). Suggestions never reach the app
-- directly: they wait here until the team pulls them into Data/sheets/places.csv as drafts
-- (Data/scripts/pull_place_suggestions.mjs), fills in the details and approves them.

create table public.place_suggestions (
  id                     uuid primary key default gen_random_uuid(),
  client_suggestion_id   uuid not null unique,
  name                   text not null check (char_length(trim(name)) between 2 and 120),
  kind                   text not null check (kind in ('food', 'sight', 'fun')),
  lat                    double precision not null check (lat between 8 and 24),
  lng                    double precision not null check (lng between 102 and 110),
  address                text check (char_length(address) <= 200),
  description            text check (char_length(description) <= 500),
  opening_hours          text check (char_length(opening_hours) <= 100),
  price_min_k            integer check (price_min_k between 0 and 100000),
  price_max_k            integer check (price_max_k between 0 and 100000),
  contact                text check (char_length(contact) <= 200),
  language               text not null check (language in ('vi', 'en')),
  status                 text not null default 'pending' check (status in ('pending', 'imported', 'rejected', 'duplicate')),
  place_id               text,
  review_note            text check (char_length(review_note) <= 1000),
  reviewed_at            timestamptz,
  created_at             timestamptz not null default now(),
  check (price_max_k is null or price_min_k is null or price_max_k >= price_min_k)
);

create index place_suggestions_pending_idx on public.place_suggestions (status, created_at);

alter table public.place_suggestions enable row level security;

-- No public policies: travellers submit through the rate-limited backend; only the
-- dashboard/service role may read or moderate suggestions.
