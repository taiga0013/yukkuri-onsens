-- 湯めぐり新潟 — コアスキーマ
-- spec.md のデータ構造・決定事項サマリーに準拠

create extension if not exists pgcrypto;

-- ============================================================
-- profiles（auth.users の 1:1 拡張）
-- ============================================================
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '湯めぐりユーザー',
  avatar_url text,
  gender text not null default 'unspecified' check (gender in ('male', 'female', 'unspecified')),
  role text not null default 'user' check (role in ('user', 'owner', 'admin')),
  gps_enabled boolean not null default true,
  notifications_enabled boolean not null default true,
  expo_push_token text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is 'auth.users を1:1で拡張するユーザープロフィール。role で user/owner/admin を区別する。';

-- ============================================================
-- onsens（温泉地＝個別入浴施設単位。spec.mdの「粒度」決定に準拠）
-- ============================================================
create table public.onsens (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  area_name text not null, -- 温泉街名（例: 月岡温泉）グルーピング表示用
  prefecture text not null default '新潟県',
  city text not null,
  area text not null,
  region text not null check (region in ('上越', '中越', '下越')),
  latitude double precision not null,
  longitude double precision not null,
  hours text,
  rotenburo boolean not null default false,
  sauna boolean not null default false,
  restaurant boolean not null default false,
  parking boolean not null default false,
  description text,
  components text,
  effects text,
  price_adult integer,
  price_child integer,
  price_child_condition text,
  capacity_total integer not null default 0,
  capacity_male integer not null default 0,
  capacity_female integer not null default 0,
  phone text,
  website text,
  regular_holiday text,
  winter_closure_start text, -- "MM-DD"
  winter_closure_end text,
  winter_closure_enabled boolean not null default false,
  is_temporarily_closed boolean not null default false,
  photos text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index onsens_region_idx on public.onsens (region);
create index onsens_area_name_idx on public.onsens (area_name);

-- 管理者ダッシュボードでの近接施設チェック用（300m以内警告）に使う簡易距離検索を高速化
create index onsens_lat_lng_idx on public.onsens (latitude, longitude);

comment on table public.onsens is '個別入浴施設。area_name は温泉街単位のグルーピング表示に使う。';

-- ============================================================
-- owner_onsen_links（施設オーナー ⇔ 施設の多対多）
-- ============================================================
create table public.owner_onsen_links (
  owner_id uuid not null references public.profiles (id) on delete cascade,
  onsen_id uuid not null references public.onsens (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (owner_id, onsen_id)
);

-- ============================================================
-- checkins（チェックイン履歴。アクティブ在館者は checked_out_at is null で判定）
-- ============================================================
create table public.checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  onsen_id uuid not null references public.onsens (id) on delete cascade,
  source text not null default 'geofence' check (source in ('geofence', 'manual')),
  checked_in_at timestamptz not null default now(),
  checked_out_at timestamptz,
  last_heartbeat_at timestamptz not null default now()
);

create index checkins_active_by_onsen_idx on public.checkins (onsen_id) where checked_out_at is null;
create index checkins_user_idx on public.checkins (user_id, checked_in_at desc);

-- 同一ユーザー・同一施設のアクティブなチェックインは1件のみ（重複チェックイン防止の土台）
create unique index checkins_one_active_per_user_onsen on public.checkins (user_id, onsen_id) where checked_out_at is null;

comment on table public.checkins is '在館中は checked_out_at が null。混雑集計は onsen_live_status ビューで行う。';

-- ============================================================
-- favorites
-- ============================================================
create table public.favorites (
  user_id uuid not null references public.profiles (id) on delete cascade,
  onsen_id uuid not null references public.onsens (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, onsen_id)
);

-- ============================================================
-- reviews
-- ============================================================
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  onsen_id uuid not null references public.onsens (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  comment text not null,
  status text not null default 'visible' check (status in ('visible', 'pending', 'removed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index reviews_onsen_idx on public.reviews (onsen_id, created_at desc);

-- ============================================================
-- review_reports（3件到達 or 誹謗中傷カテゴリ1件でreviews.statusを'pending'に自動遷移）
-- ============================================================
create table public.review_reports (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references public.reviews (id) on delete cascade,
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  category text not null check (category in ('spam', 'abusive', 'irrelevant', 'other')),
  created_at timestamptz not null default now(),
  unique (review_id, reporter_id)
);

-- ============================================================
-- updated_at 自動更新トリガー
-- ============================================================
create function public.set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger onsens_set_updated_at before update on public.onsens
  for each row execute function public.set_updated_at();
create trigger reviews_set_updated_at before update on public.reviews
  for each row execute function public.set_updated_at();

-- ============================================================
-- 新規ユーザー登録時に profiles 行を自動作成
-- ============================================================
create function public.handle_new_user() returns trigger as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', '湯めぐりユーザー'),
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- レビュー通報の自動モデレーション（3件到達 or 誹謗中傷1件でpendingへ）
-- ============================================================
create function public.handle_review_report() returns trigger as $$
declare
  report_count integer;
begin
  select count(*) into report_count from public.review_reports where review_id = new.review_id;

  if new.category = 'abusive' or report_count >= 3 then
    update public.reviews set status = 'pending' where id = new.review_id and status = 'visible';
  end if;

  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger on_review_reported
  after insert on public.review_reports
  for each row execute function public.handle_review_report();

-- ============================================================
-- onsen_live_status（混雑状況の集計ビュー。5分ごとのクライアントポーリング or Realtime購読で利用）
-- 実装メモ: 「組数」は spec.md 上も集計方法が明示されていないため、
-- MVPでは 1チェックイン = 1組（groups_count = users_count）として扱う簡略化。
-- ============================================================
create view public.onsen_live_status as
select
  o.id as onsen_id,
  o.capacity_total,
  o.capacity_male,
  o.capacity_female,
  count(c.id) as users_count,
  count(c.id) as groups_count,
  count(c.id) filter (where p.gender = 'male') as male_count,
  count(c.id) filter (where p.gender = 'female') as female_count,
  count(c.id) filter (where p.gender = 'unspecified') as unknown_count,
  case when o.capacity_total > 0
    then round(count(c.id)::numeric / o.capacity_total * 100)
    else 0 end as congestion_rate,
  case when o.capacity_male > 0
    then round(count(c.id) filter (where p.gender = 'male')::numeric / o.capacity_male * 100)
    else 0 end as male_congestion_rate,
  case when o.capacity_female > 0
    then round(count(c.id) filter (where p.gender = 'female')::numeric / o.capacity_female * 100)
    else 0 end as female_congestion_rate,
  now() as updated_at
from public.onsens o
left join public.checkins c on c.onsen_id = o.id and c.checked_out_at is null
left join public.profiles p on p.id = c.user_id
group by o.id, o.capacity_total, o.capacity_male, o.capacity_female;
