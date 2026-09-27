-- Angebotslotse account + alert foundation.
-- Designed for Supabase Auth with Google / magic-link login.
-- Public tables expose only per-user data through RLS.
-- Newsletter consent, delivery state and push endpoints remain private/server-only.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
revoke all on function private.set_updated_at() from public, anon, authenticated;

create table if not exists public.user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text check (display_name is null or char_length(display_name) <= 80),
  locale text not null default 'de-DE' check (char_length(locale) between 2 and 16),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.saved_offers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  offer_slug text not null check (char_length(offer_slug) between 1 and 180),
  offer_id text,
  title_snapshot text check (title_snapshot is null or char_length(title_snapshot) <= 500),
  merchant_snapshot text check (merchant_snapshot is null or char_length(merchant_snapshot) <= 180),
  current_price_snapshot numeric(12,2) check (current_price_snapshot is null or current_price_snapshot > 0),
  currency text not null default 'EUR' check (currency ~ '^[A-Z]{3}$'),
  target_price numeric(12,2) check (target_price is null or target_price > 0),
  alert_on_target boolean not null default true,
  alert_on_price_drop boolean not null default false,
  alert_on_restock boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, offer_slug)
);

create table if not exists public.alert_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  alert_type text not null check (alert_type in ('product','category','brand','merchant','search')),
  query text check (query is null or char_length(query) <= 240),
  category text check (category is null or char_length(category) <= 120),
  brand text check (brand is null or char_length(brand) <= 180),
  merchant text check (merchant is null or char_length(merchant) <= 180),
  max_price numeric(12,2) check (max_price is null or max_price > 0),
  min_discount smallint check (min_discount is null or min_discount between 1 and 100),
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    query is not null
    or category is not null
    or brand is not null
    or merchant is not null
  )
);

create table if not exists public.notification_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email_price_alerts boolean not null default true,
  email_new_matches boolean not null default true,
  email_digest boolean not null default false,
  push_price_alerts boolean not null default false,
  push_new_matches boolean not null default false,
  digest_frequency text not null default 'weekly' check (digest_frequency in ('daily','weekly','off')),
  quiet_hours_start time,
  quiet_hours_end time,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists private.newsletter_consents (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  status text not null default 'pending' check (status in ('pending','confirmed','unsubscribed')),
  token_hash text,
  requested_at timestamptz not null default now(),
  confirmed_at timestamptz,
  unsubscribed_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists private.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint_hash text not null,
  endpoint_ciphertext text not null,
  p256dh_ciphertext text not null,
  auth_ciphertext text not null,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  unique (user_id, endpoint_hash)
);

create table if not exists private.notification_outbox (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  channel text not null check (channel in ('email','push')),
  template_key text not null check (char_length(template_key) <= 120),
  payload jsonb not null default '{}'::jsonb,
  dedupe_key text not null,
  state text not null default 'queued' check (state in ('queued','sending','sent','failed','cancelled')),
  attempts smallint not null default 0 check (attempts between 0 and 20),
  available_at timestamptz not null default now(),
  sent_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  unique (dedupe_key)
);

create table if not exists private.notification_events (
  id bigint generated always as identity primary key,
  outbox_id uuid references private.notification_outbox(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  channel text not null,
  event_type text not null,
  provider_message_id text,
  occurred_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists saved_offers_user_idx on public.saved_offers(user_id);
create index if not exists saved_offers_target_idx on public.saved_offers(user_id, target_price) where target_price is not null;
create index if not exists alert_subscriptions_user_enabled_idx on public.alert_subscriptions(user_id, enabled);
create index if not exists notification_outbox_queue_idx on private.notification_outbox(state, available_at) where state = 'queued';

alter table public.user_profiles enable row level security;
alter table public.saved_offers enable row level security;
alter table public.alert_subscriptions enable row level security;
alter table public.notification_preferences enable row level security;

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.user_profiles to authenticated;
grant select, insert, update, delete on public.saved_offers to authenticated;
grant select, insert, update, delete on public.alert_subscriptions to authenticated;
grant select, insert, update, delete on public.notification_preferences to authenticated;

revoke all on public.user_profiles from anon;
revoke all on public.saved_offers from anon;
revoke all on public.alert_subscriptions from anon;
revoke all on public.notification_preferences from anon;

drop policy if exists user_profiles_select_own on public.user_profiles;
create policy user_profiles_select_own on public.user_profiles
for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists user_profiles_insert_own on public.user_profiles;
create policy user_profiles_insert_own on public.user_profiles
for insert to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists user_profiles_update_own on public.user_profiles;
create policy user_profiles_update_own on public.user_profiles
for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists user_profiles_delete_own on public.user_profiles;
create policy user_profiles_delete_own on public.user_profiles
for delete to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists saved_offers_own_all on public.saved_offers;
create policy saved_offers_own_all on public.saved_offers
for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists alert_subscriptions_own_all on public.alert_subscriptions;
create policy alert_subscriptions_own_all on public.alert_subscriptions
for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists notification_preferences_own_all on public.notification_preferences;
create policy notification_preferences_own_all on public.notification_preferences
for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop trigger if exists user_profiles_set_updated_at on public.user_profiles;
create trigger user_profiles_set_updated_at before update on public.user_profiles
for each row execute function private.set_updated_at();

drop trigger if exists saved_offers_set_updated_at on public.saved_offers;
create trigger saved_offers_set_updated_at before update on public.saved_offers
for each row execute function private.set_updated_at();

drop trigger if exists alert_subscriptions_set_updated_at on public.alert_subscriptions;
create trigger alert_subscriptions_set_updated_at before update on public.alert_subscriptions
for each row execute function private.set_updated_at();

drop trigger if exists notification_preferences_set_updated_at on public.notification_preferences;
create trigger notification_preferences_set_updated_at before update on public.notification_preferences
for each row execute function private.set_updated_at();

comment on table public.saved_offers is 'Per-user cloud watchlist. RLS restricts every row to auth.uid().';
comment on table public.alert_subscriptions is 'Per-user product/category/brand/merchant/search alerts.';
comment on table private.newsletter_consents is 'Double-opt-in state. Server-only; never exposed to the browser Data API.';
comment on table private.notification_outbox is 'Server-side email/push delivery queue. No browser access.';
