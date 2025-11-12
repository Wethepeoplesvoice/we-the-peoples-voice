-- SUPABASE SCHEMA
create table if not exists public.users_profile (
  id uuid primary key default gen_random_uuid(),
  phone text,
  state text,
  created_at timestamp with time zone default now()
);
create table if not exists public.issues (
  id text primary key,
  title text not null,
  detail text not null,
  tags text[] default '{}',
  created_at timestamp with time zone default now()
);
create table if not exists public.votes (
  id uuid primary key default gen_random_uuid(),
  issue_id text references public.issues(id) on delete cascade,
  choice text check (choice in ('yes','no','unsure')) not null,
  user_hash text,
  created_at timestamp with time zone default now()
);
create index if not exists votes_issue_idx on public.votes(issue_id);
create table if not exists public.proposals (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  summary text not null,
  category text default 'General',
  created_at timestamp with time zone default now()
);
alter table public.votes enable row level security;
create policy "insert_votes" on public.votes for insert to anon using (true) with check (true);
alter table public.proposals enable row level security;
create policy "insert_proposals" on public.proposals for insert to anon using (true) with check (true);
create unique index if not exists one_vote_per_issue on public.votes(issue_id, user_hash);
