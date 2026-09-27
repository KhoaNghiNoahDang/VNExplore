-- 0006: Street-route cache for the Render backend.
-- A leg (from → to, by profile) is fetched from the routing service once, then served from here.
-- RLS on with NO policies: only the backend (service role) can read or write it.

create table public.route_cache (
  key         text primary key check (char_length(key) <= 200),  -- "<profile>|lng,lat;lng,lat" (6 decimals)
  profile     text not null check (profile in ('foot', 'car')),
  coords      jsonb not null check (jsonb_typeof(coords) = 'array'), -- [[lng, lat], ...]
  distance_m  integer not null check (distance_m >= 0),
  duration_s  integer not null check (duration_s >= 0),
  source      text not null default 'osrm',
  created_at  timestamptz not null default now()
);

create index route_cache_created_idx on public.route_cache (created_at);

alter table public.route_cache enable row level security;
