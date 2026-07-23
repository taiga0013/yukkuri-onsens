-- 湯めぐり新潟 — 初回ログイン後の性別設定を1回だけ促すためのフラグ
-- 男湯・女湯別の混雑可視化の精度を上げるため、初回ログイン直後に性別設定画面を挟む。
-- 一度案内した（「設定しない」を選んだ場合も含む）ユーザーには再度出さないようにする。

alter table public.profiles
  add column gender_prompted boolean not null default false;

comment on column public.profiles.gender_prompted is '初回ログイン後の性別設定案内を表示済みかどうか（trueなら再表示しない）';
