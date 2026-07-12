-- CA M&E — one-time setup. Run this in the Supabase dashboard:
-- https://supabase.com/dashboard/project/ummjwbgkxkgfnqqnidzu/sql/new

-- One row per user holding their whole app state as jsonb.
create table if not exists public.mne_state (
  user_id uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.mne_state enable row level security;

create policy "Users read own state"
  on public.mne_state for select
  using (auth.uid() = user_id);

create policy "Users insert own state"
  on public.mne_state for insert
  with check (auth.uid() = user_id);

create policy "Users update own state"
  on public.mne_state for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users delete own state"
  on public.mne_state for delete
  using (auth.uid() = user_id);
