-- 湯めぐり新潟 — 宿泊プラン料金を自由記述に変更
-- 「8,000〜10,000」のような範囲表記を入力できるよう、整数からテキストに変更する。

alter table public.lodging_plans
  alter column price_per_person_1 type text using price_per_person_1::text,
  alter column price_per_person_2 type text using price_per_person_2::text,
  alter column price_per_person_3 type text using price_per_person_3::text,
  alter column price_per_person_4 type text using price_per_person_4::text;

comment on column public.lodging_plans.price_per_person_1 is '1名利用時の1人あたり料金（自由記述。例: 8,000〜10,000円）';
comment on column public.lodging_plans.price_per_person_4 is '4名以上利用時の1人あたり料金（自由記述。例: 8,000〜10,000円）';
