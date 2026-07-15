-- 湯めぐり新潟 — 宿泊の有無・宿泊予約リンク

alter table public.onsens
  add column has_lodging boolean not null default false,
  add column lodging_url text;

comment on column public.onsens.has_lodging is '宿泊（日帰りではなく1泊以上の滞在）が可能かどうか';
comment on column public.onsens.lodging_url is '宿泊予約・案内ページのURL（参考サイトとは別に「宿泊はこちら」として表示）';
