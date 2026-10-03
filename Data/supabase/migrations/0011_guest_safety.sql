-- 0011: Guest (anonymous) accounts — limits, merging into a real account, and cleanup.
-- Run after 0010_parties.sql. Follows https://supabase.com/docs/guides/auth/auth-anonymous
--
--  1. Restrictive policies: guests can play (parties, passport) but can't publish or like
--     community quests — that needs a permanent account.
--  2. A guest who signs in to an EXISTING account keeps what they did as a guest: before signing in,
--     the app asks for a one-time claim token (as the guest); after signing in it redeems the token
--     (as the real user) and the guest's journeys / party places move over, then the guest is deleted.
--  3. Cleanup: guests older than 30 days that never became permanent are deleted, with old parties
--     (daily, via pg_cron).
--  4. A guest can't flood the database with parties: at most 5 created per day.

-- ------------------------------------------------------------ 1. restrictive policies
-- (Combined with AND on top of the existing permissive policies.)
create policy "permanent users publish quests" on public.quests as restrictive
  for insert to authenticated with check ((select (auth.jwt() ->> 'is_anonymous')::boolean) is not true);
create policy "permanent users edit quests" on public.quests as restrictive
  for update to authenticated using ((select (auth.jwt() ->> 'is_anonymous')::boolean) is not true);
create policy "permanent users add stops" on public.quest_stops as restrictive
  for insert to authenticated with check ((select (auth.jwt() ->> 'is_anonymous')::boolean) is not true);
create policy "permanent users like quests" on public.quest_likes as restrictive
  for insert to authenticated with check ((select (auth.jwt() ->> 'is_anonymous')::boolean) is not true);

-- ------------------------------------------------------------ 4. party flood limit
create function public.limit_parties_per_day() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if (select count(*) from public.parties where host_id = new.host_id and created_at > now() - interval '1 day') >= 5 then
    raise exception 'too_many_parties';
  end if;
  return new;
end;
$$;
revoke execute on function public.limit_parties_per_day() from public, anon, authenticated;
create trigger parties_limit before insert on public.parties for each row execute function public.limit_parties_per_day();

-- ------------------------------------------------------------ 2. merge a guest into an existing account
create table public.guest_claims (
  token      uuid primary key default gen_random_uuid(),
  anon_id    uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.guest_claims enable row level security;
-- No policies: only the two functions below touch this table.

-- Called while still signed in as the guest. Returns a token valid for one hour.
create function public.create_guest_claim() returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  t uuid;
begin
  if (select auth.uid()) is null or coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) is not true then
    raise exception 'not_a_guest';
  end if;
  delete from public.guest_claims where anon_id = (select auth.uid());
  insert into public.guest_claims (anon_id) values ((select auth.uid())) returning token into t;
  return t;
end;
$$;

-- Called after signing in to the real account. Moves the guest's records, then deletes the guest.
-- Conflicts: the real account's own rows win (a journey or party seat it already has is kept).
create function public.redeem_guest_claim(p_token uuid) returns integer
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := (select auth.uid());
  guest uuid;
  moved integer := 0;
  n integer;
begin
  if uid is null or coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then raise exception 'not_permanent'; end if;
  select anon_id into guest from public.guest_claims where token = p_token and created_at > now() - interval '1 hour';
  if guest is null then raise exception 'claim_invalid'; end if;
  delete from public.guest_claims where token = p_token;
  if guest = uid then return 0; end if;
  -- The token must belong to a guest (never merge two permanent accounts).
  if not exists (select 1 from auth.users where id = guest and is_anonymous) then raise exception 'claim_invalid'; end if;

  update public.journeys set user_id = uid
    where user_id = guest and client_id not in (select client_id from public.journeys where user_id = uid);
  get diagnostics n = row_count; moved := moved + n;

  update public.parties set host_id = uid where host_id = guest;
  -- Seats in parties the real account isn't in yet (their progress follows: on update cascade).
  update public.party_members set user_id = uid
    where user_id = guest and party_id not in (select party_id from public.party_members where user_id = uid);
  get diagnostics n = row_count; moved := moved + n;
  update public.party_puzzles set solved_by = uid where solved_by = guest;

  -- Whatever is left (duplicates) goes with the guest account.
  delete from auth.users where id = guest;
  return moved;
end;
$$;

revoke execute on function public.create_guest_claim() from public, anon;
revoke execute on function public.redeem_guest_claim(uuid) from public, anon;
grant execute on function public.create_guest_claim() to authenticated;
grant execute on function public.redeem_guest_claim(uuid) to authenticated;

-- ------------------------------------------------------------ 3. cleanup (daily)
create function public.cleanup_guests() returns void
language plpgsql security definer set search_path = '' as $$
begin
  -- Guests that never became permanent (their parties, seats and journeys go with them).
  delete from auth.users where is_anonymous is true and created_at < now() - interval '30 days';
  -- Parties nobody touched for 30 days.
  delete from public.parties where created_at < now() - interval '30 days';
  delete from public.guest_claims where created_at < now() - interval '1 day';
end;
$$;
revoke execute on function public.cleanup_guests() from public, anon, authenticated;

create extension if not exists pg_cron;
select cron.schedule('cleanup-guests', '30 3 * * *', 'select public.cleanup_guests()');
