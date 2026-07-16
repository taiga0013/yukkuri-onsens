-- 湯めぐり新潟 — 施設の通常の営業時間（日帰り入浴の営業時間とは別に持つ）

alter table public.onsens
  add column regular_hours text;

comment on column public.onsens.regular_hours is '施設の通常の営業時間（フロント受付時間など。日帰り入浴のhoursとは別。自由記述）';
