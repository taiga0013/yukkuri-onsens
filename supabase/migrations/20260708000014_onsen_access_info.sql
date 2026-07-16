-- 湯めぐり新潟 — アクセス（行き方）の手書きテキスト
-- Google Mapsの経路検索リンクの代わりに、管理者が自由記述で行き方を書けるようにする。

alter table public.onsens
  add column access_info text;

comment on column public.onsens.access_info is '行き方の案内文（自由記述。例: 磐越自動車道 安田ICから車で10分）';
