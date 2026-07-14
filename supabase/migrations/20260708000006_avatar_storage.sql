-- 湯めぐり新潟 — ユーザーアイコン用Supabase Storageバケット
-- spec.md「ユーザーアイコン画像：端末内フォトライブラリから選択→圧縮処理後にSupabase Storageにアップロード」に対応

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- パスは "{auth.uid()}/avatar.jpg" の形式を前提とし、
-- storage.foldername(name) の先頭セグメント（=フォルダ名）が自分のuidと一致する場合のみ書き込み可能にする
create policy "avatar_insert_own"
  on storage.objects for insert
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "avatar_update_own"
  on storage.objects for update
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "avatar_delete_own"
  on storage.objects for delete
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- バケット自体がpublicなので読み取りはURL直アクセスで可能だが、
-- Storage APIの一覧・取得系操作にも念のため明示的なSELECTポリシーを付与しておく
create policy "avatar_select_public"
  on storage.objects for select
  using (bucket_id = 'avatars');
