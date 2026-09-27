-- Cloud runtime added after the initial account foundation.
-- Contains no secret values. Runtime tokens are generated inside Supabase Vault.

create table if not exists public.user_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null check (event_type in ('target-price','price-drop','restock','new-match','system')),
  title text not null check (char_length(title) between 1 and 240),
  body text check (body is null or char_length(body) <= 1000),
  offer_slug text,
  offer_id text,
  dedupe_key text not null unique,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists user_notifications_user_created_idx
  on public.user_notifications(user_id, created_at desc);
create index if not exists user_notifications_user_unread_idx
  on public.user_notifications(user_id, is_read) where is_read = false;

alter table public.user_notifications enable row level security;
grant select, update, delete on public.user_notifications to authenticated;
revoke all on public.user_notifications from anon;
drop policy if exists user_notifications_select_own on public.user_notifications;
create policy user_notifications_select_own on public.user_notifications
for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists user_notifications_update_own on public.user_notifications;
create policy user_notifications_update_own on public.user_notifications
for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
drop policy if exists user_notifications_delete_own on public.user_notifications;
create policy user_notifications_delete_own on public.user_notifications
for delete to authenticated using ((select auth.uid()) = user_id);

alter table public.saved_offers
  add column if not exists is_available_snapshot boolean;

create or replace function public.verify_alert_cron_token(p_token text)
returns boolean
language sql
security definer
set search_path = ''
as $$
  select coalesce(
    p_token = (
      select decrypted_secret
      from vault.decrypted_secrets
      where name = 'alert_cron_token'
      limit 1
    ),
    false
  );
$$;
revoke all on function public.verify_alert_cron_token(text) from public, anon, authenticated;
grant execute on function public.verify_alert_cron_token(text) to service_role;

do $$
begin
  if not exists (select 1 from vault.secrets where name = 'alert_cron_token') then
    perform vault.create_secret(encode(gen_random_bytes(32), 'hex'), 'alert_cron_token');
  end if;
end
$$;

create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

do $$
declare existing_job bigint;
begin
  select jobid into existing_job from cron.job
  where jobname = 'evaluate-angebotslotse-alerts-hourly' limit 1;
  if existing_job is not null then perform cron.unschedule(existing_job); end if;
end
$$;
select cron.schedule(
  'evaluate-angebotslotse-alerts-hourly',
  '0 * * * *',
  $cron$
  select net.http_post(
    url := 'https://asrklnfcwtgihvyfjiww.supabase.co/functions/v1/evaluate-alerts',
    headers := jsonb_build_object('Content-Type','application/json'),
    body := jsonb_build_object(
      'token',
      (select decrypted_secret from vault.decrypted_secrets where name='alert_cron_token' limit 1)
    )
  );
  $cron$
);

create or replace function private.prune_user_notifications()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare deleted_count integer;
begin
  delete from public.user_notifications
  where (is_read = true and created_at < now() - interval '90 days')
     or created_at < now() - interval '180 days';
  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;
revoke all on function private.prune_user_notifications() from public, anon, authenticated;

do $$
declare existing_job bigint;
begin
  select jobid into existing_job from cron.job
  where jobname = 'prune-angebotslotse-notifications' limit 1;
  if existing_job is not null then perform cron.unschedule(existing_job); end if;
end
$$;
select cron.schedule(
  'prune-angebotslotse-notifications',
  '17 3 * * *',
  $cron$ select private.prune_user_notifications(); $cron$
);

create or replace function private.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare safe_name text;
begin
  safe_name := nullif(trim(coalesce(
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'name',
    ''
  )), '');
  if safe_name is not null then safe_name := left(safe_name, 80); end if;

  insert into public.user_profiles (user_id, display_name)
  values (new.id, safe_name)
  on conflict (user_id) do nothing;

  insert into public.notification_preferences (
    user_id, email_price_alerts, email_new_matches, email_digest,
    push_price_alerts, push_new_matches, digest_frequency
  )
  values (new.id, true, true, false, false, false, 'off')
  on conflict (user_id) do nothing;
  return new;
end;
$$;
revoke all on function private.handle_new_auth_user() from public, anon, authenticated;
drop trigger if exists on_auth_user_created_angebotslotse on auth.users;
create trigger on_auth_user_created_angebotslotse
after insert on auth.users
for each row execute function private.handle_new_auth_user();

create or replace function private.enforce_user_collection_limits()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare item_count integer; item_limit integer;
begin
  if tg_table_name = 'saved_offers' then
    item_limit := 100;
    select count(*) into item_count from public.saved_offers where user_id = new.user_id;
  elsif tg_table_name = 'alert_subscriptions' then
    item_limit := 50;
    select count(*) into item_count from public.alert_subscriptions where user_id = new.user_id;
  else
    return new;
  end if;
  if item_count >= item_limit then
    raise exception 'collection_limit_reached' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
revoke all on function private.enforce_user_collection_limits() from public, anon, authenticated;
drop trigger if exists saved_offers_limit_per_user on public.saved_offers;
create trigger saved_offers_limit_per_user
before insert on public.saved_offers
for each row execute function private.enforce_user_collection_limits();
drop trigger if exists alert_subscriptions_limit_per_user on public.alert_subscriptions;
create trigger alert_subscriptions_limit_per_user
before insert on public.alert_subscriptions
for each row execute function private.enforce_user_collection_limits();

update storage.buckets set file_size_limit = 5242880 where id = 'user-assets';

create or replace function public.can_upload_user_asset()
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select (select auth.uid()) is not null
    and (
      select count(*) from storage.objects
      where bucket_id = 'user-assets'
        and (storage.foldername(name))[1] = (select auth.uid()::text)
    ) < 20;
$$;
revoke all on function public.can_upload_user_asset() from public, anon;
grant execute on function public.can_upload_user_asset() to authenticated;
drop policy if exists "user_assets_insert_own" on storage.objects;
create policy "user_assets_insert_own"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'user-assets'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
  and public.can_upload_user_asset()
);

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'user_notifications'
  ) then
    alter publication supabase_realtime add table public.user_notifications;
  end if;
end
$$;

comment on table public.user_notifications is
  'Per-user notification inbox. Client insert is intentionally disabled; server jobs create notifications.';
