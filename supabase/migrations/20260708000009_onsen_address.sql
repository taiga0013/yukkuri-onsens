-- 湯めぐり新潟 — 温泉地詳細画面「住所（テキスト表示）」用のフィールド
-- spec.md「料金・アクセス情報」に準拠

alter table public.onsens
  add column address text;

comment on column public.onsens.address is '詳細画面に表示する住所全文（例: 新潟県新発田市月岡温泉123-45）';
