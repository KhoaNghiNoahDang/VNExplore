-- Phase 1: usernames on profiles + summary columns on quests.

-- ------------------------------------------------------------ profiles.username
alter table public.profiles
  add column username text unique check (username ~ '^[a-z0-9_.]{3,20}$');

-- Sign-up passes display_name / username in user metadata. Google sign-ins have no username:
-- make one from the email and add a short suffix if it is taken.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  uname text := nullif(lower(meta ->> 'username'), '');
  base text;
begin
  if uname is null then
    base := left(regexp_replace(lower(split_part(coalesce(new.email, 'user'), '@', 1)), '[^a-z0-9_.]', '', 'g'), 14);
    if char_length(base) < 3 then base := 'user' || base; end if;
    uname := base;
    while exists (select 1 from public.profiles p where p.username = uname) loop
      uname := base || '_' || substr(md5(random()::text), 1, 4);
    end loop;
  end if;

  insert into public.profiles (id, display_name, username, avatar_url)
  values (
    new.id,
    coalesce(nullif(meta ->> 'display_name', ''), meta ->> 'full_name', meta ->> 'name', uname),
    uname,
    meta ->> 'avatar_url'
  );
  return new;
end;
$$;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- ------------------------------------------------------------ quest summaries (for lists and share pages)
alter table public.quests
  add column people        smallint not null default 1 check (people between 1 and 30),
  add column stop_count    smallint not null default 0,
  add column total_min     integer,
  add column distance_m    integer,
  add column cost_min_k    integer,
  add column cost_max_k    integer,
  add column travel_cost_k integer;
