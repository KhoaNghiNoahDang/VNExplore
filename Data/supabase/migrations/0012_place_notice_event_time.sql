-- 0012: A prominent notice + phone on places (workshops: "contact them before you go"), and whether
-- an event's time is confirmed by its source (false → the app labels the time as an estimate).
-- Run before seed_content.sql (the seed writes these columns).

alter table public.places
  add column if not exists notice_vi text,
  add column if not exists notice_en text,
  add column if not exists phone     text check (phone is null or phone ~ '^\+?[0-9]{8,13}$');

alter table public.events
  add column if not exists time_confirmed boolean not null default true;
