-- clear_home (0008) moves the clear moment by the device clock's error,
-- worked out as now() - sent_at. That difference also holds the request's
-- travel time, which isn't clock error: counting it moved the cutoff later,
-- so a row another device added just after the player pressed Clear could
-- be taken. The cutoff now leans a minute earlier instead. Erring that way
-- only leaves a row added just before the press, which the clearing device
-- already cleared if it had it, and which otherwise shows on the Chores
-- screen to remove by hand.
create or replace function public.clear_home(target_home uuid, archive_on date, cleared_before timestamptz, sent_at timestamptz)
returns void language plpgsql security invoker set search_path = '' as $$
declare
  cutoff timestamptz;
  objects uuid[];
begin
  if archive_on is null or cleared_before is null or sent_at is null then
    raise exception 'archive_on, cleared_before and sent_at are required' using errcode = '22023';
  end if;
  cutoff := least(cleared_before + (now() - sent_at), now()) - interval '1 minute';
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
