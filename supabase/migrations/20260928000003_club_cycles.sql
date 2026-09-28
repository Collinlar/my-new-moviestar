-- Club cycles: admin-managed weekly club picks
create table if not exists club_cycles (
  id            uuid primary key default gen_random_uuid(),
  cycle_number  int  not null,
  movie_id      uuid not null references movies(id) on delete restrict,
  title_override text,          -- optional editorial title override
  starts_at     timestamptz not null,
  ends_at       timestamptz not null,
  status        text not null default 'active'
                  check (status in ('upcoming','active','completed')),
  created_at    timestamptz not null default now(),
  unique (cycle_number)
);

create index if not exists idx_club_cycles_status   on club_cycles(status);
create index if not exists idx_club_cycles_starts   on club_cycles(starts_at);
create index if not exists idx_club_cycles_movie    on club_cycles(movie_id);

alter table club_cycles enable row level security;

-- Public read (everyone can see the club schedule)
create policy "club_cycles_public_read" on club_cycles
  for select using (true);

-- Admin write (uses the existing is_admin() function pattern)
create policy "club_cycles_admin_write" on club_cycles
  for all using (
    exists (
      select 1 from profiles p
      where p.user_id = auth.uid()
        and p.role = 'admin'
    )
    or auth.jwt() ->> 'email' = 'kofcollkcl100@gmail.com'
  );
