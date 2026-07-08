-- 湯めぐり新潟 — ホーム画面（おすすめ・人気ランキング）向けの補助スキーマ

alter table public.onsens
  add column is_recommended boolean not null default false;

comment on column public.onsens.is_recommended is '管理者ダッシュボードで編集するおすすめフラグ（ホーム画面「おすすめの温泉地」に表示）';

-- 人気ランキング：直近7日間のチェックイン数
create view public.onsen_popularity_7d as
select
  onsen_id,
  count(*) as checkin_count
from public.checkins
where checked_in_at > now() - interval '7 days'
group by onsen_id
order by checkin_count desc;

grant select on public.onsen_popularity_7d to authenticated;
