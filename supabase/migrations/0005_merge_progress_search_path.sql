-- Pin the trigger function's search_path (Supabase security advisor 0011).
-- It only calls built-ins from pg_catalog, which is always searched.
alter function public.merge_progress() set search_path = '';
