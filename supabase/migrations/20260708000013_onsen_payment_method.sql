-- 湯めぐり新潟 — 日帰り入浴の決済方法
-- 宿泊プラン（lodging_plans.payment_method）と同様、日帰り入浴側にも決済方法を自由記述で持たせる。

alter table public.onsens
  add column payment_method text;

comment on column public.onsens.payment_method is '日帰り入浴の決済方法（自由記述。例: 現金・クレジットカード可）';

-- オーナーが編集できる項目に決済方法を追加（既存関数をp_payment_methodを増やして再定義）
-- 引数の数が変わるためcreate or replaceだけでは別関数として追加されてしまう。先に旧シグネチャを削除する。
drop function if exists public.owner_update_onsen(uuid, text, integer, integer, text, text, text, text, boolean, boolean);

create function public.owner_update_onsen(
  p_onsen_id uuid,
  p_hours text default null,
  p_price_adult integer default null,
  p_price_child integer default null,
  p_price_child_condition text default null,
  p_regular_holiday text default null,
  p_winter_closure_start text default null,
  p_winter_closure_end text default null,
  p_winter_closure_enabled boolean default null,
  p_is_temporarily_closed boolean default null,
  p_payment_method text default null
)
returns public.onsens
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.onsens;
begin
  if not (public.is_owner_of(p_onsen_id) or public.is_admin()) then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  update public.onsens set
    hours = coalesce(p_hours, hours),
    price_adult = coalesce(p_price_adult, price_adult),
    price_child = coalesce(p_price_child, price_child),
    price_child_condition = coalesce(p_price_child_condition, price_child_condition),
    regular_holiday = coalesce(p_regular_holiday, regular_holiday),
    winter_closure_start = coalesce(p_winter_closure_start, winter_closure_start),
    winter_closure_end = coalesce(p_winter_closure_end, winter_closure_end),
    winter_closure_enabled = coalesce(p_winter_closure_enabled, winter_closure_enabled),
    is_temporarily_closed = coalesce(p_is_temporarily_closed, is_temporarily_closed),
    payment_method = coalesce(p_payment_method, payment_method)
  where id = p_onsen_id
  returning * into v_row;

  return v_row;
end;
$$;

grant execute on function public.owner_update_onsen(
  uuid, text, integer, integer, text, text, text, text, boolean, boolean, text
) to authenticated;
