-- 0006: tenant integrity, size limits and account deletion.
--
-- 1. A row may only point at a parent with the same owner. Row-level security
--    checks owner_id on the row itself, but foreign keys are checked without
--    RLS, so before this a user could attach rooms, chores, completions, a pet
--    or a progress row to someone else's home (and squat its unique pet and
--    progress slots) if they knew its id. Composite foreign keys on
--    (parent id, owner_id) make the database refuse that, and also stop the
--    FK error from revealing whether another user's id exists.
-- 2. Policies are scoped to the authenticated role (anonymous guests are
--    authenticated too) and call auth.uid() once per statement.
-- 3. Size, range and shape limits, generous next to what the app writes, so
--    one account can't store unbounded data. NOT VALID: enforced on every new
--    write, without failing on rows already stored.
-- 4. delete_my_account(): a player can delete their account and everything in it.
--
-- Tested in supabase/migrations.test.ts (fresh install and upgrade from 0005).

-- 1a. Remove rows that point at another owner's parent. The app never makes
--     them: owner_id is never sent by the client (it defaults to auth.uid()),
--     RLS only lets a user write rows they own, and signing in to a different
--     account starts from an empty local copy (src/data/state.ts, claim). So
--     only planted rows match, plus whatever hangs below a planted row (for
--     example the completions of a chore planted in someone else's home),
--     which the cascades remove with it. Rows whose parent has the same owner
--     are never touched.
--
--     To see what would go before applying, run:
--       select 'completions', count(*) from completions x join chores c on c.id = x.chore_id where x.owner_id <> c.owner_id
--       union all select 'chores.object_id', count(*) from chores c join placed_objects o on o.id = c.object_id where c.owner_id <> o.owner_id
--       union all select 'chores', count(*) from chores c join homes h on h.id = c.home_id where c.owner_id <> h.owner_id
--       union all select 'placed_objects', count(*) from placed_objects o join rooms r on r.id = o.room_id where o.owner_id <> r.owner_id
--       union all select 'rooms', count(*) from rooms r join homes h on h.id = r.home_id where r.owner_id <> h.owner_id
--       union all select 'pets', count(*) from pets p join homes h on h.id = p.home_id where p.owner_id <> h.owner_id
--       union all select 'progress', count(*) from progress p join homes h on h.id = p.home_id where p.owner_id <> h.owner_id;
delete from completions x using chores c where x.chore_id = c.id and x.owner_id <> c.owner_id;
-- A chore of one owner tied to another owner's object: keep the chore, untie it.
update chores c set object_id = null from placed_objects o where c.object_id = o.id and c.owner_id <> o.owner_id;
delete from chores c using homes h where c.home_id = h.id and c.owner_id <> h.owner_id;
delete from placed_objects o using rooms r where o.room_id = r.id and o.owner_id <> r.owner_id;
delete from rooms r using homes h where r.home_id = h.id and r.owner_id <> h.owner_id;
delete from pets p using homes h where p.home_id = h.id and p.owner_id <> h.owner_id;
delete from progress p using homes h where p.home_id = h.id and p.owner_id <> h.owner_id;

-- 1b. Parents expose (id, owner_id) as a key.
alter table homes add constraint homes_id_owner_key unique (id, owner_id);
alter table rooms add constraint rooms_id_owner_key unique (id, owner_id);
alter table placed_objects add constraint placed_objects_id_owner_key unique (id, owner_id);
alter table chores add constraint chores_id_owner_key unique (id, owner_id);

-- 1c. Children reference (parent id, their own owner_id). Same cascades as before
--     (src/data/tables.ts, CASCADES, mirrors them). MATCH SIMPLE: a chore with
--     no object (object_id null) is not checked against placed_objects.
alter table rooms
  drop constraint rooms_home_id_fkey,
  add constraint rooms_home_fkey foreign key (home_id, owner_id) references homes (id, owner_id) on delete cascade;
alter table placed_objects
  drop constraint placed_objects_room_id_fkey,
  add constraint placed_objects_room_fkey foreign key (room_id, owner_id) references rooms (id, owner_id) on delete cascade;
alter table chores
  drop constraint chores_home_id_fkey,
  drop constraint chores_object_id_fkey,
  add constraint chores_home_fkey foreign key (home_id, owner_id) references homes (id, owner_id) on delete cascade,
  add constraint chores_object_fkey foreign key (object_id, owner_id) references placed_objects (id, owner_id) on delete cascade;
alter table completions
  drop constraint completions_chore_id_fkey,
  add constraint completions_chore_fkey foreign key (chore_id, owner_id) references chores (id, owner_id) on delete cascade;
alter table pets
  drop constraint pets_home_id_fkey,
  add constraint pets_home_fkey foreign key (home_id, owner_id) references homes (id, owner_id) on delete cascade;
alter table progress
  drop constraint progress_home_id_fkey,
  add constraint progress_home_fkey foreign key (home_id, owner_id) references homes (id, owner_id) on delete cascade;

-- Indexes for the owner filter every request runs, and for the cascades.
create index if not exists homes_owner_idx on homes (owner_id);
create index if not exists rooms_owner_idx on rooms (owner_id);
create index if not exists rooms_home_idx on rooms (home_id, owner_id);
create index if not exists placed_objects_owner_idx on placed_objects (owner_id);
create index if not exists placed_objects_room_idx on placed_objects (room_id, owner_id);
create index if not exists chores_owner_idx on chores (owner_id);
create index if not exists chores_home_idx on chores (home_id, owner_id);
create index if not exists chores_object_idx on chores (object_id, owner_id);
create index if not exists completions_owner_idx on completions (owner_id);
create index if not exists pets_owner_idx on pets (owner_id);
create index if not exists progress_owner_idx on progress (owner_id);

-- 2. Policies: authenticated only, auth.uid() evaluated once per statement.
do $$
declare t text;
begin
  foreach t in array array['homes','rooms','placed_objects','chores','completions','pets','progress'] loop
    execute format('drop policy if exists "%1$s owner select" on %1$I', t);
    execute format('drop policy if exists "%1$s owner insert" on %1$I', t);
    execute format('drop policy if exists "%1$s owner update" on %1$I', t);
    execute format('drop policy if exists "%1$s owner delete" on %1$I', t);
    execute format('create policy "%1$s owner select" on %1$I for select to authenticated using (owner_id = (select auth.uid()))', t);
    execute format('create policy "%1$s owner insert" on %1$I for insert to authenticated with check (owner_id = (select auth.uid()))', t);
    execute format('create policy "%1$s owner update" on %1$I for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()))', t);
    execute format('create policy "%1$s owner delete" on %1$I for delete to authenticated using (owner_id = (select auth.uid()))', t);
  end loop;
end $$;

-- The trigger function is never called directly (triggers still fire).
revoke execute on function public.merge_progress() from public, anon, authenticated;

-- 3. Limits. Each is well above what the app writes, so no real write is refused:
--    - names: home 100 (the app writes "Home" or "Sample home"), chore 100
--      (the form allows 40), pet 60 (the app allows 40);
--    - style and catalog ids: lowercase-with-dashes today, letters, digits,
--      "_" and "-" allowed;
--    - tiles: the room is 8x8 (0-7), limit 63;
--    - schedule: any JSON object (kinds may gain fields, like "since"), 2 KB;
--    - dates: 1970 to 2999, so a device with a wrong clock still syncs;
--    - retired: an object of whole numbers from 0 to 1,000,000.
alter table homes
  add constraint homes_name_len check (char_length(name) <= 100) not valid,
  add constraint homes_vacations_shape check (
    case when jsonb_typeof(vacations) = 'array' then
      jsonb_array_length(vacations) <= 500
      and octet_length(vacations::text) <= 32768
      and not jsonb_path_exists(vacations, '$[*] ? (@.type() != "object")')
    else false end
  ) not valid;
alter table rooms
  add constraint rooms_floor_style_fmt check (floor_style ~ '^[A-Za-z0-9_-]{1,40}$') not valid,
  add constraint rooms_wall_style_fmt check (wall_style ~ '^[A-Za-z0-9_-]{1,40}$') not valid;
alter table placed_objects
  add constraint placed_objects_catalog_fmt check (catalog_id ~ '^[A-Za-z0-9_-]{1,64}$') not valid,
  add constraint placed_objects_tiles check (tile_x between 0 and 63 and tile_y between 0 and 63) not valid;
alter table chores
  add constraint chores_name_len check (char_length(name) <= 100) not valid,
  add constraint chores_schedule_shape check (jsonb_typeof(schedule) = 'object' and octet_length(schedule::text) <= 2048) not valid,
  add constraint chores_created_on_range check (created_on between date '1970-01-01' and date '2999-12-31') not valid;
alter table completions
  add constraint completions_on_range check (completed_on between date '1970-01-01' and date '2999-12-31') not valid;
alter table pets
  add constraint pets_name_len check (char_length(name) <= 60) not valid,
  add constraint pets_body_colour_hex check (body_colour ~ '^#[0-9A-Fa-f]{3,8}$') not valid,
  add constraint pets_equipped_shape check (jsonb_typeof(equipped) = 'object' and octet_length(equipped::text) <= 4096) not valid,
  add constraint pets_outfits_shape check (jsonb_typeof(outfits) = 'array' and octet_length(outfits::text) <= 32768) not valid;
alter table progress
  add constraint progress_counts_nonneg check (chore_count >= 0 and current_streak >= 0 and best_streak >= 0) not valid,
  add constraint progress_unlocked_size check (cardinality(unlocked_items) <= 1000 and octet_length(array_to_string(unlocked_items, ',')) <= 32768) not valid,
  -- merge_progress casts each value to int: refuse anything else up front.
  add constraint progress_retired_shape check (
    jsonb_typeof(retired) = 'object'
    and octet_length(retired::text) <= 262144
    and not jsonb_path_exists(retired, '$.* ? (@.type() != "number" || @ < 0 || @ > 1000000 || @ != @.floor())')
  ) not valid;

-- 4. Let a player delete their account and everything in it. Every table's
--    owner_id references auth.users on delete cascade, so one delete removes
--    the home, rooms, objects, chores, history, pet and progress. The client
--    calls supabase.rpc('delete_my_account'), then signs out.
create or replace function public.delete_my_account() returns void
language sql volatile security definer set search_path = '' as $$
  delete from auth.users where id = (select auth.uid());
$$;
revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

-- 5. Optional, NOT enabled: clean up abandoned guest accounts.
--
--    Every visit signs in a guest (an anonymous user) and keeps it until the
--    player saves with email or Google. Guests who never come back stay in
--    auth.users with their homes. To delete the ones nobody has used for 180
--    days:
--      1. Database > Extensions: enable pg_cron.
--      2. Check the columns below exist in your project (auth.users.is_anonymous,
--         auth.sessions.refreshed_at / updated_at).
--      3. Run the block below in the SQL editor, without the leading "-- ".
--    A guest who comes back after that finds an empty home on the device
--    too (the app starts a new guest, and a new account starts empty), so
--    keep the window long. last_sign_in_at alone is not enough: a guest
--    refreshes their session but never signs in again, so it stays at the
--    first visit. Check activity on sessions and completions instead.
--    To stop it: select cron.unschedule('delete-abandoned-guests');
--
-- select cron.schedule('delete-abandoned-guests', '17 3 * * *', $cron$
--   delete from auth.users u
--   where u.is_anonymous
--     and u.created_at < now() - interval '180 days'
--     and not exists (
--       select 1 from auth.sessions s
--       where s.user_id = u.id
--         and greatest(s.created_at, s.updated_at, s.refreshed_at) > now() - interval '180 days'
--     )
--     and not exists (
--       select 1 from public.completions c
--       where c.owner_id = u.id and c.completed_at > now() - interval '180 days'
--     )
-- $cron$);
