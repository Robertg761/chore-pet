-- Every player picks one of three pets. Matches the Species type in src/domain/types.ts.

alter table pets
  add column species text not null default 'mochi'
  check (species in ('mochi', 'bun', 'sprout'));
