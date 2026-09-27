-- Performance advisor fixes.

-- Index every foreign key (joins and cascading deletes).
create index missions_place_id_idx     on public.missions (place_id);
create index quest_likes_user_id_idx   on public.quest_likes (user_id);
create index quest_stops_place_id_idx  on public.quest_stops (place_id);
create index quests_author_id_idx      on public.quests (author_id);
create index quests_role_id_idx        on public.quests (role_id);

-- One SELECT policy per table: split "manage own stops" (was FOR ALL) into write-only policies.
drop policy "manage stops of own quests" on public.quest_stops;
create policy "add stops to own quests" on public.quest_stops for insert
  with check (exists (select 1 from public.quests q where q.id = quest_id and q.author_id = (select auth.uid())));
create policy "edit stops of own quests" on public.quest_stops for update
  using (exists (select 1 from public.quests q where q.id = quest_id and q.author_id = (select auth.uid())));
create policy "remove stops of own quests" on public.quest_stops for delete
  using (exists (select 1 from public.quests q where q.id = quest_id and q.author_id = (select auth.uid())));
