-- 湯めぐり新潟 — 宿泊プランのチェックイン・チェックアウト時間

alter table public.lodging_plans
  add column check_in_time text,
  add column check_out_time text;

comment on column public.lodging_plans.check_in_time is 'チェックイン時間（自由記述。例: 15:00〜）';
comment on column public.lodging_plans.check_out_time is 'チェックアウト時間（自由記述。例: 〜10:00）';
