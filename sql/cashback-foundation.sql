-- Live schema specification for Angebotslotse cashback foundation.
-- Applied to Supabase on 2026-09-30 via the authorized SQL connection.
-- Fail-closed: no merchant is cashback-enabled unless eligibility='allowed'.

create table if not exists public.cashback_programs (
  merchant_key text primary key,
  network text not null,
  advertiser_id text,
  display_name text not null,
  eligibility text not null default 'review' check (eligibility in ('review','allowed','forbidden')),
  commission_share_bps integer not null default 0 check (commission_share_bps between 0 and 10000),
  terms_source_url text,
  terms_checked_at timestamptz,
  notes text,
  updated_at timestamptz not null default now()
);
alter table public.cashback_programs enable row level security;
revoke all on table public.cashback_programs from anon, authenticated;
grant select on table public.cashback_programs to anon, authenticated;
create policy "cashback_programs_public_read" on public.cashback_programs for select to anon, authenticated using (true);

create table if not exists public.cashback_claims (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  merchant_key text not null references public.cashback_programs(merchant_key),
  transaction_ref text not null unique,
  claim_status text not null default 'pending' check (claim_status in ('pending','confirmed','paid','rejected','expired')),
  order_amount numeric(14,2),
  commission_amount numeric(14,2),
  cashback_amount numeric(14,2),
  currency text not null default 'EUR',
  transaction_at timestamptz,
  confirmed_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists cashback_claims_user_id_idx on public.cashback_claims(user_id);
create index if not exists cashback_claims_status_idx on public.cashback_claims(claim_status);
create index if not exists cashback_claims_merchant_key_idx on public.cashback_claims(merchant_key);
alter table public.cashback_claims enable row level security;
revoke all on table public.cashback_claims from anon, authenticated;
grant select on table public.cashback_claims to authenticated;
create policy "cashback_claims_select_own" on public.cashback_claims for select to authenticated using ((select auth.uid()) = user_id);

create table if not exists private.affiliate_transactions (
  id uuid primary key default gen_random_uuid(),
  network text not null,
  external_transaction_id text not null,
  merchant_key text,
  click_ref text,
  order_amount numeric(14,2),
  commission_amount numeric(14,2),
  currency text not null default 'EUR',
  transaction_status text,
  occurred_at timestamptz,
  raw_payload jsonb,
  imported_at timestamptz not null default now(),
  unique(network, external_transaction_id)
);
create index if not exists affiliate_transactions_click_ref_idx on private.affiliate_transactions(click_ref);
create index if not exists affiliate_transactions_merchant_idx on private.affiliate_transactions(merchant_key);
alter table private.affiliate_transactions enable row level security;
revoke all on table private.affiliate_transactions from public, anon, authenticated;

create table if not exists private.cashback_click_tokens (
  token text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  merchant_key text not null,
  offer_id text,
  network text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used_at timestamptz
);
create index if not exists cashback_click_tokens_user_id_idx on private.cashback_click_tokens(user_id);
create index if not exists cashback_click_tokens_merchant_idx on private.cashback_click_tokens(merchant_key);
alter table private.cashback_click_tokens enable row level security;
revoke all on table private.cashback_click_tokens from public, anon, authenticated;
