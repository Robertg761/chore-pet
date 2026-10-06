-- Phase 6 personalization: face options and saved outfits on the pet.
-- Matches EyeStyle, CheekStyle and SavedOutfit in src/domain/types.ts.

alter table pets
  add column eyes text not null default 'classic' check (eyes in ('classic', 'sparkly', 'button', 'lashes')),
  add column cheeks text not null default 'round' check (cheeks in ('round', 'hearts', 'freckles', 'none')),
  add column outfits jsonb not null default '[]'::jsonb; -- [{ "id", "name", "equipped": { slot: item id } }]
