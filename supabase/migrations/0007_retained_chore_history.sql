-- Apply before deploying the archive-aware client. Legacy DELETE requests are
-- intercepted too; a cached count cannot destroy unseen completion rows.
alter table public.chores add column archived_on date;
-- Match 0006's accepted creation range, including dates from a bad device clock.
alter table public.chores add constraint chores_archive_date
  check (archived_on is null or (archived_on >= created_on and archived_on <= date '2999-12-31')) not valid;

-- Keep the composite tenant FK, but furniture removal must not delete tasks.
alter table public.chores drop constraint chores_object_fkey;
alter table public.chores add constraint chores_object_fkey
  foreign key (object_id, owner_id) references public.placed_objects (id, owner_id)
  on delete set null (object_id);

-- Archival is terminal. An old whole-row upsert cannot reopen the chore or
-- replace its authoritative schedule with the deleting device's stale copy.
create function public.preserve_chore_archive() returns trigger
language plpgsql set search_path = '' as $$
declare end_on date := new.archived_on; detach boolean := new.object_id is null;
begin
  if old.archived_on is not null or end_on is not null then
    new := old;
    new.archived_on := coalesce(old.archived_on, greatest(end_on, old.created_on));
    if detach then new.object_id := null; end if;
  end if;
  return new;
end;
$$;
create trigger preserve_chore_archive before update on public.chores
  for each row execute function public.preserve_chore_archive();
revoke all on function public.preserve_chore_archive() from public, anon, authenticated;

-- Definer only to inspect parent existence during auth/home cascades. The
-- outer DELETE still uses owner RLS; callers cannot invoke this trigger.
create function public.archive_deleted_chore() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.homes where id = old.home_id and owner_id = old.owner_id)
     or not exists (select 1 from auth.users where id = old.owner_id) then
    return old; -- genuine home/account deletion erases all history
  end if;
  update public.chores set archived_on = coalesce(archived_on, greatest(current_date, created_on))
    where id = old.id and owner_id = old.owner_id;
  return null;
end;
$$;
create trigger archive_deleted_chore before delete on public.chores
  for each row execute function public.archive_deleted_chore();
revoke all on function public.archive_deleted_chore() from public, anon, authenticated;

-- Legacy furniture/room deletes have no local end date. Archive all attached
-- tasks using the server calendar date before the FK detaches them.
create function public.archive_object_chores() returns trigger
language plpgsql set search_path = '' as $$
begin
  update public.chores set archived_on = coalesce(archived_on, greatest(current_date, created_on)), object_id = null
    where object_id = old.id and owner_id = old.owner_id;
  return old;
end;
$$;
create trigger archive_object_chores before delete on public.placed_objects
  for each row execute function public.archive_object_chores();
revoke all on function public.archive_object_chores() from public, anon, authenticated;

-- Lock first: concurrent FK writers either attach before this transaction and
-- are included, or wait and fail after the object is gone. Keep applies even
-- to chores the removing device hasn't pulled yet. SECURITY INVOKER preserves
-- RLS and composite owner checks throughout.
create function public.remove_objects(object_ids uuid[], archive_on date, keep_chores boolean default false)
returns void language plpgsql security invoker set search_path = '' as $$
declare object_row record;
begin
  if archive_on is null then raise exception 'archive_on is required' using errcode = '22023'; end if;
  for object_row in select id from public.placed_objects where id = any(object_ids) order by id for update loop
    update public.chores
      set object_id = null,
          archived_on = case when keep_chores then archived_on else coalesce(archived_on, greatest(archive_on, created_on)) end
      where object_id = object_row.id;
    delete from public.placed_objects where id = object_row.id;
  end loop;
end;
$$;
revoke all on function public.remove_objects(uuid[], date, boolean) from public, anon;
grant execute on function public.remove_objects(uuid[], date, boolean) to authenticated;

-- Completion facts survive stale upserts as well as parent removal. Explicit
-- completion DELETE remains supported for the user's Undo/correction action.
create function public.preserve_completion() returns trigger
language plpgsql set search_path = '' as $$
begin return old; end;
$$;
create trigger preserve_completion before update on public.completions
  for each row execute function public.preserve_completion();
revoke all on function public.preserve_completion() from public, anon, authenticated;
