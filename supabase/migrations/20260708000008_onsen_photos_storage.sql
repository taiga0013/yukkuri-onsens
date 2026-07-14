-- 湯めぐり新潟 — 管理者ダッシュボードからの温泉地写真アップロード用バケット
-- spec.md「管理者ダッシュボードから写真をアップロード（最大1280px・品質80%に自動圧縮）→
-- URLをDBのphotos配列に保存」に対応

insert into storage.buckets (id, name, public)
values ('onsen-photos', 'onsen-photos', true)
on conflict (id) do nothing;

create policy "onsen_photos_write_admin_only"
  on storage.objects for insert
  with check (bucket_id = 'onsen-photos' and public.is_admin());

create policy "onsen_photos_update_admin_only"
  on storage.objects for update
  using (bucket_id = 'onsen-photos' and public.is_admin());

create policy "onsen_photos_delete_admin_only"
  on storage.objects for delete
  using (bucket_id = 'onsen-photos' and public.is_admin());

create policy "onsen_photos_select_public"
  on storage.objects for select
  using (bucket_id = 'onsen-photos');
