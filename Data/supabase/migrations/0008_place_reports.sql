-- 0008: Traveller-observed place information. Reports never update verified
-- place content directly; the team reviews them in Supabase first.

create table public.place_reports (
  id               uuid primary key default gen_random_uuid(),
  client_report_id uuid not null unique,
  place_id          text not null references public.places (id) on delete cascade,
  report_type       text not null check (report_type in ('price', 'opening_hours', 'visit_time', 'closed', 'other')),
  price_min_k       integer check (price_min_k between 0 and 100000),
  price_max_k       integer check (price_max_k between 0 and 100000),
  open_time         time,
  close_time        time,
  visit_min         integer check (visit_min between 1 and 600),
  closed_state      text check (closed_state in ('today', 'temporary', 'permanent', 'unknown')),
  note              text check (char_length(note) <= 300),
  observed_at       timestamptz not null,
  language          text not null check (language in ('vi', 'en')),
  status            text not null default 'pending' check (status in ('pending', 'accepted', 'rejected', 'duplicate')),
  review_note       text check (char_length(review_note) <= 1000),
  reviewed_at       timestamptz,
  created_at        timestamptz not null default now(),
  check (price_max_k is null or price_min_k is null or price_max_k >= price_min_k),
  check (
    (report_type = 'price' and (price_min_k is not null or price_max_k is not null)) or
    (report_type = 'opening_hours' and open_time is not null and close_time is not null) or
    (report_type = 'visit_time' and visit_min is not null) or
    (report_type = 'closed' and closed_state is not null) or
    (report_type = 'other' and nullif(trim(note), '') is not null)
  )
);

create index place_reports_pending_idx on public.place_reports (status, created_at);
create index place_reports_place_idx on public.place_reports (place_id, created_at desc);

alter table public.place_reports enable row level security;

-- No public policies: anonymous travellers submit through the rate-limited
-- backend, and only the dashboard/service role may read or moderate reports.
