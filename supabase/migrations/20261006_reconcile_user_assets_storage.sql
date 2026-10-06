-- Reconcile the versioned storage contract with the stricter production state.
-- This migration is intentionally idempotent so an already-hardened project is unchanged.
update storage.buckets
set public = false,
    file_size_limit = 5242880
where id = 'user-assets';

create or replace function public.can_upload_user_asset()
returns boolean
language sql
security definer
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

drop policy if exists "user_assets_insert_own" on storage.objects;
create policy "user_assets_insert_own"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'user-assets'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
  and public.can_upload_user_asset()
);

