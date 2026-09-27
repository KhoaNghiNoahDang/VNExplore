-- Community quests: supported modes, per-stop tips, review before going public.

-- ------------------------------------------------------------ quests
alter table public.quests
  add column modes          text[] not null default '{listen,easy}'
    check (cardinality(modes) >= 1 and modes <@ array['explore', 'listen', 'easy']),
  add column themes         text[] not null default '{}',
  add column suitable_for   text[] not null default '{}',   -- family, couple, friends, solo
  add column best_time      text not null default 'any' check (best_time in ('any', 'morning', 'afternoon', 'evening')),
  add column cover_place_id text references public.places (id),
  add column area           text not null default 'hoan-kiem',
  add column review_status  text not null default 'none' check (review_status in ('none', 'pending', 'approved', 'rejected')),
  add column review_note    text;
create index quests_feed_idx on public.quests (visibility, review_status, status, created_at desc);
create index quests_cover_place_idx on public.quests (cover_place_id);

-- ------------------------------------------------------------ quest_stops: the author's tip for each stop
alter table public.quest_stops
  add column tip_kind    text check (tip_kind in ('try', 'photo', 'see', 'tip')),
  add column custom_task text check (char_length(custom_task) <= 300);  -- Explore mission override

-- ------------------------------------------------------------ review guard
-- Authors can never approve their own quest. Any change to a public quest's content sends it
-- back to review; only the team (dashboard / service role) sets 'approved' or 'rejected'.
create function public.quests_review_guard() returns trigger
language plpgsql set search_path = '' as $$
begin
  if coalesce(auth.role(), '') not in ('authenticated', 'anon') then
    return new;  -- dashboard / service role: moderators decide
  end if;
  if tg_op = 'INSERT' then
    new.review_status := case when new.visibility = 'public' then 'pending' else 'none' end;
    new.review_note := null;
    new.like_count := 0;
  else
    if (new.title, new.description, new.modes, new.visibility, new.role_id, new.themes, new.suitable_for,
        new.best_time, new.cover_place_id, new.review_status, new.review_note)
       is distinct from
       (old.title, old.description, old.modes, old.visibility, old.role_id, old.themes, old.suitable_for,
        old.best_time, old.cover_place_id, old.review_status, old.review_note) then
      new.review_status := case when new.visibility = 'public' then 'pending' else 'none' end;
      new.review_note := null;
    end if;
    -- Counters only move through their own triggers (nested), never by a direct update.
    if pg_trigger_depth() = 1 then
      new.like_count := old.like_count;
    end if;
  end if;
  return new;
end;
$$;
create trigger quests_review_guard before insert or update on public.quests
  for each row execute function public.quests_review_guard();

-- Editing the stops of a public quest also sends it back to review.
create function public.quest_stops_review_guard() returns trigger
language plpgsql set search_path = '' as $$
begin
  if coalesce(auth.role(), '') in ('authenticated', 'anon') then
    update public.quests set review_status = 'pending'
      where id = coalesce(new.quest_id, old.quest_id) and visibility = 'public' and review_status <> 'pending';
  end if;
  return null;
end;
$$;
create trigger quest_stops_review_guard after insert or update or delete on public.quest_stops
  for each row execute function public.quest_stops_review_guard();

revoke execute on function public.quests_review_guard()      from public, anon, authenticated;
revoke execute on function public.quest_stops_review_guard() from public, anon, authenticated;

-- ------------------------------------------------------------ who can read what
-- Public quests appear only after approval; link-only quests work with the link; authors see their own.
drop policy "read shared or own quests" on public.quests;
create policy "read shared or own quests" on public.quests for select using (
  author_id = (select auth.uid())
  or (status = 'published' and (visibility = 'unlisted' or (visibility = 'public' and review_status = 'approved')))
);

-- Likes only on quests you can see.
drop policy "like as self" on public.quest_likes;
create policy "like as self" on public.quest_likes for insert with check (
  user_id = (select auth.uid()) and exists (select 1 from public.quests q where q.id = quest_id)
);
