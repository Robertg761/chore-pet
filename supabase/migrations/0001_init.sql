-- Phase 1 schema. Every row is owned by the signed-in user (anonymous users
-- included) and protected by row-level security.

create table homes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null default 'Home',
  vacations jsonb not null default '[]'::jsonb, -- [{ "start": "YYYY-MM-DD", "end": "YYYY-MM-DD" }]
  created_at timestamptz not null default now()
);

create table rooms (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users on delete cascade,
  home_id uuid not null references homes on delete cascade,
  type text not null check (type in ('kitchen', 'bedroom', 'bathroom', 'living', 'other')),
  floor_style text not null default 'wood',
  wall_style text not null default 'peach',
  created_at timestamptz not null default now()
);

create table placed_objects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users on delete cascade,
  room_id uuid not null references rooms on delete cascade,
  catalog_id text not null,
  tile_x int not null,
  tile_y int not null,
  rotation smallint not null default 0 check (rotation between 0 and 3),
  created_at timestamptz not null default now()
);

create table chores (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users on delete cascade,
  home_id uuid not null references homes on delete cascade,
  object_id uuid references placed_objects on delete cascade,
  name text not null,
  schedule jsonb not null, -- matches the Schedule type in src/domain/types.ts
  created_on date not null default current_date,
  photo_proof boolean not null default false,
  created_at timestamptz not null default now()
);

create table completions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users on delete cascade,
  chore_id uuid not null references chores on delete cascade,
  completed_at timestamptz not null default now(),
  completed_on date not null -- the user's local calendar date
);
create index completions_chore_idx on completions (chore_id, completed_on);

create table pets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users on delete cascade,
  home_id uuid not null unique references homes on delete cascade,
  name text not null default 'Pip',
  body_colour text not null default '#FFD65C',
  equipped jsonb not null default '{}'::jsonb -- { "head": "beanie", ... }
);

create table progress (
  home_id uuid primary key references homes on delete cascade,
  owner_id uuid not null default auth.uid() references auth.users on delete cascade,
  chore_count int not null default 0,
  current_streak int not null default 0,
  best_streak int not null default 0,
  unlocked_items text[] not null default '{}'
);

-- Row-level security: owners only.
do $$
declare t text;
begin
  foreach t in array array['homes','rooms','placed_objects','chores','completions','pets','progress'] loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy "%1$s owner select" on %1$I for select using (owner_id = auth.uid())', t);
    execute format('create policy "%1$s owner insert" on %1$I for insert with check (owner_id = auth.uid())', t);
    execute format('create policy "%1$s owner update" on %1$I for update using (owner_id = auth.uid()) with check (owner_id = auth.uid())', t);
    execute format('create policy "%1$s owner delete" on %1$I for delete using (owner_id = auth.uid())', t);
  end loop;
end $$;
