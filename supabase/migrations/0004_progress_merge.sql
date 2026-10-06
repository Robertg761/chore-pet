-- Progress across devices (Phase 7).
--
-- The chore count is worked out on each device (src/domain/unlocks.ts,
-- choreCountOf) from completions that counted when they were recorded, plus
-- the banked counts of deleted chores; chore_count is only a cache.
--
-- completions.counts: false for a sample home's seeded history. Completion
-- rows are never edited, so devices can't overwrite each other's count.
--
-- progress.retired: counted chores of deleted chores, by chore id, so
-- removing a chore never takes progress away.
--
-- Two devices can write the same progress row. Instead of the last write
-- winning, updates are merged here, atomically under the row lock: unlocked
-- rewards are the union, the best streak is the higher one, and retired
-- keeps the higher count per chore.

alter table completions add column if not exists counts boolean not null default true;
alter table progress add column if not exists retired jsonb not null default '{}';

create or replace function merge_progress() returns trigger
language plpgsql as $$
begin
  new.unlocked_items := array(
    select item from (
      select item, min(ord) as ord
      from unnest(old.unlocked_items || new.unlocked_items) with ordinality as u(item, ord)
      group by item
    ) merged
    order by ord
  );
  new.best_streak := greatest(old.best_streak, new.best_streak);
  new.chore_count := greatest(old.chore_count, new.chore_count);
  new.retired := coalesce((
    select jsonb_object_agg(key, count)
    from (
      select key, max(value::int) as count
      from (
        select key, value from jsonb_each_text(old.retired)
        union all
        select key, value from jsonb_each_text(new.retired)
      ) both_sides
      group by key
    ) merged
  ), '{}'::jsonb);
  return new;
end $$;

drop trigger if exists progress_merge on progress;
create trigger progress_merge
  before update on progress
  for each row execute function merge_progress();
