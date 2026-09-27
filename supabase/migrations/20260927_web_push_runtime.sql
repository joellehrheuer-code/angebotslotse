-- Free Web Push runtime. No private VAPID key or token is committed here.
-- Required Vault secrets already live in Supabase:
-- push_subscription_crypto_key, web_push_vapid_public,
-- web_push_vapid_private, web_push_vapid_subject, push_cron_token.

create extension if not exists pgcrypto with schema extensions;

create or replace function public.push_store_subscription(
  p_user_id uuid,p_endpoint text,p_p256dh text,p_auth text
)
returns uuid
language plpgsql
security definer
set search_path=''
as $$
declare k text; h text; row_id uuid;
begin
  if p_user_id is null or p_endpoint is null or p_p256dh is null or p_auth is null then
    raise exception 'invalid_subscription';
  end if;
  select decrypted_secret into k from vault.decrypted_secrets
  where name='push_subscription_crypto_key' limit 1;
  if k is null then raise exception 'push_crypto_key_missing'; end if;
  h:=encode(extensions.digest(p_endpoint,'sha256'),'hex');
  insert into private.push_subscriptions(
    user_id,endpoint_hash,endpoint_ciphertext,p256dh_ciphertext,auth_ciphertext,last_seen_at
  ) values(
    p_user_id,h,
    encode(extensions.pgp_sym_encrypt(p_endpoint,k),'base64'),
    encode(extensions.pgp_sym_encrypt(p_p256dh,k),'base64'),
    encode(extensions.pgp_sym_encrypt(p_auth,k),'base64'),now()
  )
  on conflict(user_id,endpoint_hash) do update set
    endpoint_ciphertext=excluded.endpoint_ciphertext,
    p256dh_ciphertext=excluded.p256dh_ciphertext,
    auth_ciphertext=excluded.auth_ciphertext,
    last_seen_at=now()
  returning id into row_id;
  return row_id;
end;
$$;

create or replace function public.push_delete_subscription(p_user_id uuid,p_endpoint text)
returns integer
language plpgsql
security definer
set search_path=''
as $$
declare n integer;
begin
  delete from private.push_subscriptions
  where user_id=p_user_id
    and endpoint_hash=encode(extensions.digest(p_endpoint,'sha256'),'hex');
  get diagnostics n=row_count;
  return n;
end;
$$;

create or replace function public.push_get_subscriptions(p_user_id uuid)
returns table(id uuid,endpoint text,p256dh text,auth text)
language sql
security definer
set search_path=''
as $$
  select s.id,
    extensions.pgp_sym_decrypt(decode(s.endpoint_ciphertext,'base64'),k.secret),
    extensions.pgp_sym_decrypt(decode(s.p256dh_ciphertext,'base64'),k.secret),
    extensions.pgp_sym_decrypt(decode(s.auth_ciphertext,'base64'),k.secret)
  from private.push_subscriptions s
  cross join lateral (
    select decrypted_secret as secret from vault.decrypted_secrets
    where name='push_subscription_crypto_key' limit 1
  ) k
  where s.user_id=p_user_id;
$$;

create or replace function public.push_delete_subscription_by_id(p_id uuid)
returns void
language sql
security definer
set search_path=''
as $$ delete from private.push_subscriptions where id=p_id; $$;

create or replace function public.push_claim_outbox(p_limit integer default 20)
returns table(id uuid,user_id uuid,template_key text,payload jsonb,attempts smallint)
language plpgsql
security definer
set search_path=''
as $$
begin
  return query
  with picked as (
    select o.id from private.notification_outbox o
    where o.channel='push' and o.state in ('queued','failed')
      and o.available_at<=now() and o.attempts<20
    order by o.available_at,o.created_at
    for update skip locked
    limit greatest(1,least(coalesce(p_limit,20),50))
  )
  update private.notification_outbox o
  set state='sending',attempts=o.attempts+1
  from picked
  where o.id=picked.id
  returning o.id,o.user_id,o.template_key,o.payload,o.attempts;
end;
$$;

create or replace function public.push_finish_outbox(
  p_id uuid,p_state text,p_error text default null,p_provider_message_id text default null
)
returns void
language plpgsql
security definer
set search_path=''
as $$
declare uid uuid;
begin
  if p_state not in ('sent','failed','cancelled') then raise exception 'invalid_state'; end if;
  update private.notification_outbox
  set state=p_state,
      sent_at=case when p_state='sent' then now() else sent_at end,
      last_error=left(p_error,1000),
      available_at=case when p_state='failed' then now()+interval '15 minutes' else available_at end
  where id=p_id
  returning user_id into uid;
  if uid is not null then
    insert into private.notification_events(
      outbox_id,user_id,channel,event_type,provider_message_id,metadata
    )
    values(
      p_id,uid,'push',p_state,p_provider_message_id,
      jsonb_build_object('error',left(p_error,500))
    );
  end if;
end;
$$;

create or replace function public.verify_push_cron_token(p_token text)
returns boolean
language sql
security definer
set search_path=''
as $$
  select coalesce(
    p_token=(select decrypted_secret from vault.decrypted_secrets where name='push_cron_token' limit 1),
    false
  );
$$;

create or replace function public.push_vapid_config()
returns jsonb
language sql
security definer
set search_path=''
as $$
  select jsonb_build_object(
    'publicKey',(select decrypted_secret from vault.decrypted_secrets where name='web_push_vapid_public' limit 1),
    'privateKey',(select decrypted_secret from vault.decrypted_secrets where name='web_push_vapid_private' limit 1),
    'subject',(select decrypted_secret from vault.decrypted_secrets where name='web_push_vapid_subject' limit 1)
  );
$$;

create or replace function private.queue_push_for_user_notification()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
declare allowed boolean;
begin
  select case when new.event_type='new-match' then push_new_matches else push_price_alerts end
    into allowed
  from public.notification_preferences
  where user_id=new.user_id;

  if coalesce(allowed,false)
     and exists(select 1 from private.push_subscriptions where user_id=new.user_id) then
    insert into private.notification_outbox(user_id,channel,template_key,payload,dedupe_key)
    values(
      new.user_id,'push',new.event_type,
      jsonb_build_object(
        'title',new.title,
        'body',coalesce(new.body,''),
        'url',case when new.offer_slug is null then '/konto.html' else '/angebote/'||new.offer_slug||'.html' end,
        'tag','angebotslotse-'||new.event_type||'-'||coalesce(new.offer_id,new.id::text)
      ),
      'push:'||new.dedupe_key
    )
    on conflict(dedupe_key) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists user_notifications_queue_push on public.user_notifications;
create trigger user_notifications_queue_push
after insert on public.user_notifications
for each row execute function private.queue_push_for_user_notification();

revoke all on function public.push_store_subscription(uuid,text,text,text) from public,anon,authenticated;
revoke all on function public.push_delete_subscription(uuid,text) from public,anon,authenticated;
revoke all on function public.push_get_subscriptions(uuid) from public,anon,authenticated;
revoke all on function public.push_delete_subscription_by_id(uuid) from public,anon,authenticated;
revoke all on function public.push_claim_outbox(integer) from public,anon,authenticated;
revoke all on function public.push_finish_outbox(uuid,text,text,text) from public,anon,authenticated;
revoke all on function public.verify_push_cron_token(text) from public,anon,authenticated;
revoke all on function public.push_vapid_config() from public,anon,authenticated;
grant execute on function public.push_store_subscription(uuid,text,text,text) to service_role;
grant execute on function public.push_delete_subscription(uuid,text) to service_role;
grant execute on function public.push_get_subscriptions(uuid) to service_role;
grant execute on function public.push_delete_subscription_by_id(uuid) to service_role;
grant execute on function public.push_claim_outbox(integer) to service_role;
grant execute on function public.push_finish_outbox(uuid,text,text,text) to service_role;
grant execute on function public.verify_push_cron_token(text) to service_role;
grant execute on function public.push_vapid_config() to service_role;

do $$
begin
  if not exists(select 1 from vault.secrets where name='push_subscription_crypto_key') then
    perform vault.create_secret(encode(gen_random_bytes(32),'hex'),'push_subscription_crypto_key');
  end if;
  if not exists(select 1 from vault.secrets where name='push_cron_token') then
    perform vault.create_secret(encode(gen_random_bytes(32),'hex'),'push_cron_token');
  end if;
end
$$;

do $$
declare existing_job bigint;
begin
  select jobid into existing_job from cron.job
  where jobname='send-angebotslotse-push' limit 1;
  if existing_job is not null then perform cron.unschedule(existing_job); end if;
end
$$;

select cron.schedule(
  'send-angebotslotse-push',
  '*/5 * * * *',
  $cron$
  select net.http_post(
    url := 'https://asrklnfcwtgihvyfjiww.supabase.co/functions/v1/send-push',
    headers := jsonb_build_object('Content-Type','application/json'),
    body := jsonb_build_object(
      'token',(select decrypted_secret from vault.decrypted_secrets where name='push_cron_token' limit 1)
    )
  );
  $cron$
);
