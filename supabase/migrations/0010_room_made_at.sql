-- When the device that made a room made it, so every device orders rooms (and
-- names two kitchens "Kitchen" and "Kitchen 2") the same way. Rooms sent up in
-- one batch get the same created_at (default now() is the transaction time), so
-- before this the order between them was only known to the device that made
-- them; another device fell back to the room's id.
--
-- Nullable: rooms made before this, or by an older client, have none and sort
-- as before. It is a tie-break only. It is never compared with created_at (the
-- two clocks differ), so it needs no range check: timestamptz holds any date a
-- device clock can produce.
alter table public.rooms add column made_at timestamptz;

-- Write once. The client upserts whole rows, and PostgREST fills a column that
-- one row of a batch leaves out with null, so a device that never saw made_at
-- (an older client, or a pull from before this migration) must not erase it,
-- nor may a later write move it and reorder the rooms. Policies and grants
-- already cover the column: they are per table, not per column.
create function public.keep_room_made_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.made_at := coalesce(old.made_at, new.made_at);
  return new;
end;
$$;
create trigger keep_room_made_at before update on public.rooms
  for each row execute function public.keep_room_made_at();
-- Never called directly (triggers still fire).
revoke all on function public.keep_room_made_at() from public, anon, authenticated;
