-- 0007: Two kinds of place content, and areas.
--   depth = 'full'  → story, "why", photo tip, etiquette, challenge (all 3 modes)
--   depth = 'quick' → name, short intro, price, time (food / fun stops; no story or challenge)
--   kind  = sight / food / fun (same groups as candidates)
--   area  = hoan-kiem / ba-vi (a route never mixes areas)

alter table public.places
  add column kind  text not null default 'sight' check (kind in ('sight', 'food', 'fun')),
  add column depth text not null default 'full'  check (depth in ('full', 'quick'));

update public.places set area = 'hoan-kiem' where area is null;
alter table public.places
  alter column area set default 'hoan-kiem',
  alter column area set not null,
  add constraint places_area_check check (area in ('hoan-kiem', 'ba-vi'));

-- Full places must have their story and challenge; quick places may leave them empty.
alter table public.places add constraint places_full_content_check check (
  depth = 'quick' or status <> 'approved' or (
    coalesce(story_vi, '') <> '' and coalesce(story_en, '') <> ''
    and coalesce(challenge_vi, '') <> '' and answer is not null
  )
);

create index places_area_status_idx on public.places (area, status);
