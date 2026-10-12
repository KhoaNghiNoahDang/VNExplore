-- 0013: Several quiz questions per place, each with an explanation and its sources.
-- The main "find a real detail" question stays on places (challenge_*); it gains a kind and an
-- explanation. Extra questions live in place_quizzes. Run before seed_content.sql.

alter table public.places
  add column if not exists challenge_kind text
    check (challenge_kind is null or challenge_kind in ('look', 'history', 'legend', 'culture', 'architecture', 'nature')),
  add column if not exists explain_vi text,
  add column if not exists explain_en text;

create table if not exists public.place_quizzes (
  id           text primary key,
  place_id     text not null references public.places (id) on delete cascade,
  status       text not null default 'draft' check (status in ('draft', 'approved')),
  kind         text not null check (kind in ('look', 'history', 'legend', 'culture', 'architecture', 'nature')),
  question_vi  text not null,
  question_en  text not null,
  option1_vi   text not null,
  option1_en   text not null,
  option2_vi   text not null,
  option2_en   text not null,
  option3_vi   text not null,
  option3_en   text not null,
  answer       smallint not null check (answer between 1 and 3),
  hint_vi      text not null,
  hint_en      text not null,
  explain_vi   text not null,
  explain_en   text not null,
  -- Every question must say where its facts come from.
  sources      text[] not null check (cardinality(sources) > 0),
  checked_on   date,
  review_notes text,
  updated_at   timestamptz not null default now()
);

create index if not exists place_quizzes_place_idx on public.place_quizzes (place_id);

alter table public.place_quizzes enable row level security;
create policy "read approved quizzes" on public.place_quizzes for select using (status = 'approved');
