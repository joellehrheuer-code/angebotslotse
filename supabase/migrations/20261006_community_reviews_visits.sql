create table if not exists public.site_reviews (
  id uuid primary key default gen_random_uuid(),
  display_name text not null default 'Anonym' check (char_length(display_name) between 1 and 60),
  rating smallint not null check (rating between 1 and 5),
  comment text not null check (char_length(comment) between 3 and 600),
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  source text not null default 'website',
  fingerprint text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  moderated_at timestamptz
);

create unique index if not exists site_reviews_fingerprint_idx on public.site_reviews(fingerprint);
create index if not exists site_reviews_status_created_idx on public.site_reviews(status, created_at desc);

alter table public.site_reviews enable row level security;
revoke all on table public.site_reviews from public, anon, authenticated;
grant select, insert, update, delete on table public.site_reviews to service_role;

create table if not exists public.site_traffic (
  singleton smallint primary key default 1 check (singleton = 1),
  visits bigint not null default 0 check (visits >= 0),
  started_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.site_traffic(singleton, visits)
values (1, 0)
on conflict (singleton) do nothing;

alter table public.site_traffic enable row level security;
revoke all on table public.site_traffic from public, anon, authenticated;
grant select, insert, update on table public.site_traffic to service_role;

create or replace function public.increment_site_visit()
returns bigint
language sql
security definer
set search_path = public
as $$
  update public.site_traffic
  set visits = visits + 1,
      updated_at = now()
  where singleton = 1
  returning visits;
$$;

revoke all on function public.increment_site_visit() from public, anon, authenticated;
grant execute on function public.increment_site_visit() to service_role;
