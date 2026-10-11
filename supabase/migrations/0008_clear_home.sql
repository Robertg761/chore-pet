-- Clear room and chores, and removals that settle on the earliest end date.
-- Safe to apply before or after the client that uses it: until it runs, the
-- app clears what each device has, row by row, and keeps the server-wide clear
-- queued (without holding up other changes or pulls) until it can be sent.

-- A chore's end date can now move earlier, never later and never back to open.
-- Removals from several devices (one with its clock set ahead) settle on the
-- earliest, whatever order they arrive in; a stale whole-row upsert still can't
-- reopen a chore or rewrite its schedule.
create or replace function public.preserve_chore_archive() returns trigger
language plpgsql set search_path = '' as $$
declare end_on date := new.archived_on; detach boolean := new.object_id is null;
begin
  if old.archived_on is not null or end_on is not null then
    new := old;
    new.archived_on := case
      when end_on is null then old.archived_on
      when old.archived_on is null then greatest(end_on, old.created_on)
      else least(old.archived_on, greatest(end_on, old.created_on))
    end;
    if detach then new.object_id := null; end if;
  end if;
  return new;
end;
$$;

-- Same as 0007's, except that an end date already set (in the future) is
-- brought forward to this removal by the trigger above.
create or replace function public.remove_objects(object_ids uuid[], archive_on date, keep_chores boolean default false)
returns void language plpgsql security invoker set search_path = '' as $$
declare object_row record;
begin
  if archive_on is null then raise exception 'archive_on is required' using errcode = '22023'; end if;
  for object_row in select id from public.placed_objects where id = any(object_ids) order by id for update loop
    update public.chores
      set object_id = null,
          archived_on = case when keep_chores then archived_on else greatest(archive_on, created_on) end
      where object_id = object_row.id;
    delete from public.placed_objects where id = object_row.id;
  end loop;
end;
$$;

-- Clear room and chores: every object in the home goes and every chore ends on
-- archive_on, including rows the clearing device hadn't pulled yet, but only
-- rows stored before the player pressed Clear, so a clear that syncs late
-- never takes what another device added since. cleared_before is the device's
-- clock at the clear and sent_at its clock when sending, so the server moves
-- the cutoff by the device clock's error (assumed steady in between). A chore
-- added since to furniture that existed before stays on the list, detached.
-- A clear more than a day old by then (a device offline that long, or waiting
-- for this migration) does nothing: rows from before it may have been in use
-- on other devices since, and the device that cleared already cleared what it
-- had. Leftovers show up there and can be removed by hand.
-- 0007's legacy delete triggers keep their coalesce: those old clients send no
-- local date, so their server-date guess never overrides one already recorded.
-- SECURITY INVOKER: row-level security limits it to the caller's own home.
create function public.clear_home(target_home uuid, archive_on date, cleared_before timestamptz, sent_at timestamptz)
returns void language plpgsql security invoker set search_path = '' as $$
declare
  cutoff timestamptz;
  objects uuid[];
begin
  if archive_on is null or cleared_before is null or sent_at is null then
    raise exception 'archive_on, cleared_before and sent_at are required' using errcode = '22023';
  end if;
  cutoff := least(cleared_before + (now() - sent_at), now());
  if cutoff < now() - interval '1 day' then return; end if;
  select array_agg(o.id order by o.id) into objects
    from public.placed_objects o join public.rooms r on r.id = o.room_id
    where r.home_id = target_home and o.created_at <= cutoff;
  -- Lock first, as remove_objects does: a chore being attached concurrently either lands before this or fails after.
  perform 1 from public.placed_objects where id = any(objects) order by id for update;
  update public.chores
    set object_id = null, archived_on = greatest(archive_on, created_on)
    where home_id = target_home and created_at <= cutoff
      and (archived_on is null or archived_on > greatest(archive_on, created_on));
  update public.chores set object_id = null where object_id = any(objects);
  delete from public.placed_objects where id = any(objects);
end;
$$;
revoke all on function public.clear_home(uuid, date, timestamptz, timestamptz) from public, anon;
grant execute on function public.clear_home(uuid, date, timestamptz, timestamptz) to authenticated;
