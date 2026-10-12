-- Furniture keeps its catalog identity and chores when its look changes.
-- NULL preserves the original art for existing homes and resets custom looks.
alter table public.placed_objects
  add column if not exists appearance jsonb;

alter table public.placed_objects
  add constraint placed_objects_appearance_valid check (
    appearance is null or (
      jsonb_typeof(appearance) = 'object'
      and octet_length(appearance::text) <= 1024
      and appearance - array['style', 'finish', 'fabric', 'pattern', 'details']::text[] = '{}'::jsonb
      and (not appearance ? 'style' or coalesce(appearance->>'style' in ('classic', 'cottage', 'modern', 'nordic', 'industrial', 'playful'), false))
      and (not appearance ? 'finish' or coalesce(appearance->>'finish' in ('natural', 'walnut', 'birch', 'white', 'charcoal', 'sage', 'rose', 'blue'), false))
      and (not appearance ? 'fabric' or coalesce(appearance->>'fabric' in ('blue', 'rose', 'sage', 'cream', 'sunshine', 'lavender', 'terracotta', 'sky', 'charcoal', 'mint'), false))
      and (not appearance ? 'pattern' or coalesce(appearance->>'pattern' in ('plain', 'stripes', 'checks', 'dots'), false))
      and (not appearance ? 'details' or jsonb_typeof(appearance->'details') = 'boolean')
    )
  );
