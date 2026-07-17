-- 湯めぐり新潟 — 宿泊者の入浴時間・貸し切り風呂の営業時間

alter table public.onsens
  add column lodger_bath_hours text,
  add column private_bath_hours text;

comment on column public.onsens.lodger_bath_hours is '宿泊者の入浴時間（自由記述。例: 15:00〜24:00、6:00〜9:00）';
comment on column public.onsens.private_bath_hours is '貸し切り風呂の営業時間（自由記述。例: 16:00〜22:00（1組50分制））';
