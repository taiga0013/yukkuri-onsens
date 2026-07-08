-- 湯めぐり新潟 — RLSポリシー
-- spec.md「管理者・オーナー権限管理（RBAC）」に準拠

-- ============================================================
-- ヘルパー関数（SECURITY DEFINERでprofilesを参照し、RLSの再帰を回避）
-- ============================================================
create function public.is_admin() returns boolean as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$ language sql stable security definer set search_path = public;

create function public.is_owner_of(target_onsen_id uuid) returns boolean as $$
  select exists (
    select 1 from public.owner_onsen_links
    where onsen_id = target_onsen_id and owner_id = auth.uid()
  );
$$ language sql stable security definer set search_path = public;

-- ============================================================
-- profiles
-- ============================================================
alter table public.profiles enable row level security;

create policy "profiles_select_own_or_admin"
  on public.profiles for select
  using (id = auth.uid() or public.is_admin());

create policy "profiles_update_own_or_admin"
  on public.profiles for update
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

-- 自分自身の role を昇格させることを防ぐ（adminだけがroleを変更できる）
create function public.guard_profile_role_change() returns trigger as $$
begin
  if new.role <> old.role and not public.is_admin() then
    raise exception 'role を変更できるのは管理者のみです';
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger profiles_guard_role_change
  before update on public.profiles
  for each row execute function public.guard_profile_role_change();

-- レビュー等で他ユーザーに公開してよい最小限のプロフィール情報
create view public.public_profiles as
select id, display_name, avatar_url
from public.profiles;

grant select on public.public_profiles to authenticated;

-- ============================================================
-- onsens（読み取りは全ログインユーザー、書き込みは管理者のみ。
-- オーナーの限定編集は owner_update_onsen() RPC 経由に限定する）
-- ============================================================
alter table public.onsens enable row level security;

create policy "onsens_select_authenticated"
  on public.onsens for select
  to authenticated
  using (true);

create policy "onsens_write_admin_only"
  on public.onsens for all
  using (public.is_admin())
  with check (public.is_admin());

-- ============================================================
-- owner_onsen_links
-- ============================================================
alter table public.owner_onsen_links enable row level security;

create policy "owner_links_select_own_or_admin"
  on public.owner_onsen_links for select
  using (owner_id = auth.uid() or public.is_admin());

create policy "owner_links_write_admin_only"
  on public.owner_onsen_links for all
  using (public.is_admin())
  with check (public.is_admin());

-- ============================================================
-- checkins（直接の書き込みは禁止。checkin_onsen/checkout_onsen/heartbeat_checkin
-- のSECURITY DEFINER関数経由でのみ作成・更新する）
-- ============================================================
alter table public.checkins enable row level security;

create policy "checkins_select_own_or_admin"
  on public.checkins for select
  using (user_id = auth.uid() or public.is_admin());

-- onsen_live_status ビューは定義者権限で実行されるため、
-- checkins に select ポリシーが無くても集計は可能（本人以外の行は直接は見えない）。

-- ============================================================
-- favorites
-- ============================================================
alter table public.favorites enable row level security;

create policy "favorites_manage_own"
  on public.favorites for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ============================================================
-- reviews
-- ============================================================
alter table public.reviews enable row level security;

create policy "reviews_select_own_or_admin"
  on public.reviews for select
  using (user_id = auth.uid() or public.is_admin());

create policy "reviews_insert_own"
  on public.reviews for insert
  with check (user_id = auth.uid());

create policy "reviews_update_own_or_admin"
  on public.reviews for update
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

create policy "reviews_delete_own_or_admin"
  on public.reviews for delete
  using (user_id = auth.uid() or public.is_admin());

-- 一覧表示用の公開ビュー：status='visible' でも投稿者/管理者以外にはcommentを見せない、
-- という制御はここでは不要（visibleは全員に公開）。
-- pending/removed のレビューは、投稿者本人・管理者のみ本文を閲覧でき、
-- それ以外のユーザーには comment を null にして「審査中/削除されました」プレースホルダー用に返す。
create view public.public_reviews as
select
  r.id,
  r.onsen_id,
  r.user_id,
  r.rating,
  case
    when r.status = 'visible' or r.user_id = auth.uid() or public.is_admin() then r.comment
    else null
  end as comment,
  r.status,
  r.created_at,
  r.updated_at
from public.reviews r;
-- status に関わらず行自体は全員に見せ、comment のみ上のCASEで条件付き秘匿する
-- （pending/removedでも「審査中/削除されました」プレースホルダーをクライアント側で描画するため）

grant select on public.public_reviews to authenticated;

-- ============================================================
-- review_reports
-- ============================================================
alter table public.review_reports enable row level security;

create policy "review_reports_select_own_or_admin"
  on public.review_reports for select
  using (reporter_id = auth.uid() or public.is_admin());

create policy "review_reports_insert_own"
  on public.review_reports for insert
  with check (reporter_id = auth.uid());

-- 自分自身のレビューへの通報を禁止
create function public.guard_no_self_report() returns trigger as $$
begin
  if exists (
    select 1 from public.reviews where id = new.review_id and user_id = new.reporter_id
  ) then
    raise exception '自分のレビューを通報することはできません';
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger review_reports_guard_self
  before insert on public.review_reports
  for each row execute function public.guard_no_self_report();

-- ============================================================
-- onsen_live_status ビューは authenticated に公開
-- ============================================================
grant select on public.onsen_live_status to authenticated;
