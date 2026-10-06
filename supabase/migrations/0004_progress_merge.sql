-- Progress across devices (Phase 7).
--
-- The chore count is now worked out on each device from the completions
-- (src/domain/schedule.ts, countedOccurrences); chore_count is only a cache.
-- counted_from marks where counting starts, so a sample home's seeded history
-- doesn't count.
--
-- Two devices can write the same progress row. Instead of the last write
-- winning, updates are merged here, atomically under the row lock:
-- unlocked rewards are the union, the best streak is the higher one, and
-- counted_from keeps the earliest day set.

alter table progress add column if not exists counted_from date;

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
  new.counted_from := case
    when old.counted_from is null then new.counted_from
    when new.counted_from is null then old.counted_from
    else least(old.counted_from, new.counted_from)
  end;
  return new;
end $$;

drop trigger if exists progress_merge on progress;
create trigger progress_merge
  before update on progress
  for each row execute function merge_progress();
