-- Movie reactions, interactions, and tag taxonomy for the Quick Reaction flow

-- Tags taxonomy (static reference data)
create table if not exists reaction_tags (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  label       text not null,
  category    text not null default 'general',
  active      boolean not null default true,
  sort_order  int not null default 0
);

-- Seed the 10 PRD tags
insert into reaction_tags (slug, label, sort_order) values
  ('story',     'Story',     1),
  ('acting',    'Acting',    2),
  ('chemistry', 'Chemistry', 3),
  ('visuals',   'Visuals',   4),
  ('music',     'Music',     5),
  ('culture',   'Culture',   6),
  ('dialogue',  'Dialogue',  7),
  ('pacing',    'Pacing',    8),
  ('direction', 'Direction', 9),
  ('ending',    'Ending',    10)
on conflict (slug) do nothing;

-- One reaction per user per movie
create table if not exists movie_reactions (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  movie_id         uuid not null references movies(id) on delete cascade,
  reaction         text not null check (reaction in ('loved','liked','okay','not_for_me')),
  one_liner        text,
  would_recommend  boolean,
  would_rewatch    boolean,
  spoiler          boolean not null default false,
  status           text not null default 'published' check (status in ('published','pending','hidden')),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (user_id, movie_id)
);

-- Tags on a reaction
create table if not exists movie_reaction_tags (
  reaction_id  uuid not null references movie_reactions(id) on delete cascade,
  tag_id       uuid not null references reaction_tags(id) on delete cascade,
  sentiment    text check (sentiment in ('positive','mixed','negative')),
  primary key (reaction_id, tag_id)
);

-- All swipe-session interactions (seen, unseen, watch_later, not_interested, undo, open_details)
create table if not exists movie_interactions (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  movie_id         uuid not null references movies(id) on delete cascade,
  interaction_type text not null check (interaction_type in (
    'seen','unseen','watch_later','not_interested','open_details','undo'
  )),
  source           text not null default 'swipe',
  created_at       timestamptz not null default now(),
  metadata         jsonb
);

-- Indexes
create index if not exists movie_reactions_user_id   on movie_reactions(user_id);
create index if not exists movie_reactions_movie_id  on movie_reactions(movie_id);
create index if not exists movie_interactions_user_id  on movie_interactions(user_id);
create index if not exists movie_interactions_movie_id on movie_interactions(movie_id);

-- Enable RLS
alter table reaction_tags       enable row level security;
alter table movie_reactions     enable row level security;
alter table movie_reaction_tags enable row level security;
alter table movie_interactions  enable row level security;

-- reaction_tags: public read
create policy "reaction_tags_public_read" on reaction_tags
  for select using (true);

-- movie_reactions: users write only their own; anyone can read published
create policy "movie_reactions_own_write" on movie_reactions
  for all using (auth.uid() = user_id);

create policy "movie_reactions_public_read" on movie_reactions
  for select using (status = 'published');

-- movie_reaction_tags: users write tags for their own reactions; public read
create policy "movie_reaction_tags_own_write" on movie_reaction_tags
  for all using (
    exists (
      select 1 from movie_reactions r
      where r.id = reaction_id and r.user_id = auth.uid()
    )
  );

create policy "movie_reaction_tags_public_read" on movie_reaction_tags
  for select using (true);

-- movie_interactions: users write only their own; no public read (private behaviour data)
create policy "movie_interactions_own_access" on movie_interactions
  for all using (auth.uid() = user_id);
