-- 0016: App content (places, roles, missions, events, quizzes, fares) now ships as JSON with the app
-- and the API (Data/scripts/export_app.mjs → Frontend/src/data/generated + Backend/content).
-- The database keeps user data only, which refers to content by id. Those ids are no longer
-- foreign keys: a place added to the sheets must not need a database copy before people can put
-- it in a quest or report on it. The API checks place ids against the content file instead.
--
-- The old content tables stay for now (an older deployed app may still read them) but are no
-- longer updated; seed_content.sql is not needed any more.

alter table public.quests        drop constraint if exists quests_cover_place_id_fkey;
alter table public.quests        drop constraint if exists quests_role_id_fkey;
alter table public.quest_stops   drop constraint if exists quest_stops_place_id_fkey;
alter table public.journeys      drop constraint if exists journeys_role_id_fkey;
alter table public.place_reports drop constraint if exists place_reports_place_id_fkey;

-- Ids are still short slugs.
alter table public.quest_stops   add constraint quest_stops_place_id_format   check (char_length(place_id) between 1 and 120);
alter table public.place_reports add constraint place_reports_place_id_format check (char_length(place_id) between 1 and 120);
