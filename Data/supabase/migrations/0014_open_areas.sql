-- 0014: Places are no longer limited to Hoan Kiem and Ba Vi. The app plans around the traveller's
-- start point (or a region named in the request), so `area` is now only a label for sorting the
-- catalogue: any lowercase-with-dashes name (hoan-kiem, ba-vi, nam-tu-liem, hanoi, near-start…).

alter table public.places drop constraint if exists places_area_check;
alter table public.places
  add constraint places_area_check check (area ~ '^[a-z0-9]+(-[a-z0-9]+)*$');

alter table public.events drop constraint if exists events_area_check;
alter table public.events
  add constraint events_area_check check (area ~ '^[a-z0-9]+(-[a-z0-9]+)*$');

alter table public.parties drop constraint if exists parties_area_check;
alter table public.parties
  add constraint parties_area_check check (area ~ '^[a-z0-9]+(-[a-z0-9]+)*$');
