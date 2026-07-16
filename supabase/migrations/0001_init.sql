-- almanac 0001 — media items (shared metadata cache) + log entries (per-user)

create table public.media_items (
  id uuid primary key default gen_random_uuid(),
  media_type text not null
    check (media_type in ('film', 'tv_show', 'tv_season', 'game', 'book', 'album')),
  parent_id uuid references public.media_items (id) on delete cascade,
  external_source text not null,
  external_id text not null,
  title text not null,
  year int,
  creator text,
  cover_url text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (external_source, external_id, media_type)
);

create index media_items_parent_idx on public.media_items (parent_id);

create table public.log_entries (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.media_items (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  logged_at date not null default current_date,
  -- 5 stars, half steps, stored numeric so a future rescale stays cheap
  rating numeric(2, 1)
    check (rating between 0.5 and 5.0 and (rating * 2) = trunc(rating * 2)),
  review text,
  status text not null default 'done'
    check (status in ('done', 'in_progress', 'abandoned')),
  created_at timestamptz not null default now()
);

create index log_entries_user_logged_idx on public.log_entries (user_id, logged_at desc);
create index log_entries_item_idx on public.log_entries (item_id);

alter table public.media_items enable row level security;
alter table public.log_entries enable row level security;

-- media_items are cached copies of external lookups, shared across users.
-- Signed-in users can read and refresh the cache; no client deletes.
create policy "items readable by authenticated" on public.media_items
  for select to authenticated using (true);
create policy "items insertable by authenticated" on public.media_items
  for insert to authenticated with check (true);
create policy "items updatable by authenticated" on public.media_items
  for update to authenticated using (true) with check (true);

-- log_entries are the real user data — strictly per-user.
create policy "own log entries" on public.log_entries
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
