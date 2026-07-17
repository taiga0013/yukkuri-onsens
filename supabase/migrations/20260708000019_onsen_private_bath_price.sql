-- 湯めぐり新潟 — 貸し切り風呂の料金

alter table public.onsens
  add column private_bath_price text;

comment on column public.onsens.private_bath_price is '貸し切り風呂の料金（自由記述。例: 1組50分 3,000円）';
