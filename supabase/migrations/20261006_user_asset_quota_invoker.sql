-- The quota check only needs rows already visible through the caller's storage RLS.
-- SECURITY INVOKER avoids exposing a definer-rights RPC in the public schema.
create or replace function public.can_upload_user_asset()
returns boolean
language sql
security invoker
stable
set search_path = ''
as $$
  select (select auth.uid()) is not null
    and (
      select count(*)
      from storage.objects
      where bucket_id = 'user-assets'
        and (storage.foldername(name))[1] = (select auth.uid()::text)
    ) < 20;
$$;

revoke all on function public.can_upload_user_asset() from public, anon;
grant execute on function public.can_upload_user_asset() to authenticated;

