-- 湯めぐり新潟 — 日帰り入浴の有無
-- 宿泊専用で日帰り入浴を受け付けていない施設もあるため、設備フラグとして持たせる。

alter table public.onsens
  add column has_day_trip boolean not null default true;

comment on column public.onsens.has_day_trip is '日帰り入浴を受け付けているかどうか（falseの場合、日帰り入浴料金・営業時間はアプリ側で非表示にする）';
