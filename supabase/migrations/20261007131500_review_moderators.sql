create table if not exists public.review_moderators (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.review_moderators enable row level security;
revoke all on table public.review_moderators from public, anon, authenticated;
grant select, insert, update, delete on table public.review_moderators to service_role;
