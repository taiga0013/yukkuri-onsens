-- 湯めぐり新潟 — 宿泊プラン
-- has_lodging=true の温泉地向けに、食事・1〜4名利用時の1人あたり料金・決済方法・写真を持つプランを複数登録できるようにする。
-- 管理者・オーナー（is_owner_of）双方が直接RLSで読み書きできる（onsensと違いRPC経由にしない。丸ごとオーナーの管理範囲のため）。

create table public.lodging_plans (
  id uuid primary key default gen_random_uuid(),
  onsen_id uuid not null references public.onsens (id) on delete cascade,
  name text not null,
  meal_info text,
  payment_method text,
  price_per_person_1 integer,
  price_per_person_2 integer,
  price_per_person_3 integer,
  price_per_person_4 integer,
  photos text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index lodging_plans_onsen_idx on public.lodging_plans (onsen_id);

comment on table public.lodging_plans is '宿泊プラン（has_lodging=trueの温泉地のみ利用想定）。1〜4名利用時の1人あたり料金を段階別に持つ。';
comment on column public.lodging_plans.price_per_person_1 is '1名利用時の1人あたり料金（円）';
comment on column public.lodging_plans.price_per_person_4 is '4名以上利用時の1人あたり料金（円）';

create trigger lodging_plans_set_updated_at before update on public.lodging_plans
  for each row execute function public.set_updated_at();

alter table public.lodging_plans enable row level security;

create policy "lodging_plans_select_authenticated"
  on public.lodging_plans for select
  to authenticated
  using (true);

create policy "lodging_plans_write_admin_or_owner"
  on public.lodging_plans for all
  using (public.is_admin() or public.is_owner_of(onsen_id))
  with check (public.is_admin() or public.is_owner_of(onsen_id));

-- ============================================================
-- 宿泊プラン写真用ストレージバケット
-- パスを {onsen_id}/{uuid}.jpg にし、storage.foldername(name) からonsen_idを取り出して
-- is_owner_of()でオーナー本人の施設かどうかを判定する
-- ============================================================
insert into storage.buckets (id, name, public)
values ('lodging-plan-photos', 'lodging-plan-photos', true)
on conflict (id) do nothing;

create policy "lodging_photos_insert_admin_or_owner"
  on storage.objects for insert
  with check (
    bucket_id = 'lodging-plan-photos'
    and (public.is_admin() or public.is_owner_of(((storage.foldername(name))[1])::uuid))
  );

create policy "lodging_photos_update_admin_or_owner"
  on storage.objects for update
  using (
    bucket_id = 'lodging-plan-photos'
    and (public.is_admin() or public.is_owner_of(((storage.foldername(name))[1])::uuid))
  );

create policy "lodging_photos_delete_admin_or_owner"
  on storage.objects for delete
  using (
    bucket_id = 'lodging-plan-photos'
    and (public.is_admin() or public.is_owner_of(((storage.foldername(name))[1])::uuid))
  );

create policy "lodging_photos_select_public"
  on storage.objects for select
  using (bucket_id = 'lodging-plan-photos');
