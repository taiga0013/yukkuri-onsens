-- 湯めぐり新潟 — チェックイン/チェックアウト・オーナー編集・TTL強制チェックアウト
-- spec.md「GPS・ジオフェンシング実装方式」「管理者・オーナー権限管理」に準拠

-- ============================================================
-- checkin_onsen: 半径100m進入時（またはGPSオフ時の手動ボタン）に呼ぶ
-- 2時間以内の再チェックインをブロックする（誤カウント防止）
-- ============================================================
create function public.checkin_onsen(p_onsen_id uuid, p_source text default 'geofence')
returns public.checkins
language plpgsql
security definer
set search_path = public
as $$
declare
  v_recent public.checkins;
  v_row public.checkins;
begin
  select * into v_row from public.checkins
    where user_id = auth.uid() and onsen_id = p_onsen_id and checked_out_at is null
    limit 1;
  if found then
    return v_row; -- 既にアクティブなチェックインがあればそのまま返す（冪等）
  end if;

  select * into v_recent from public.checkins
    where user_id = auth.uid() and onsen_id = p_onsen_id and checked_out_at is not null
    order by checked_out_at desc
    limit 1;
  if found and v_recent.checked_out_at > now() - interval '2 hours' then
    raise exception 'duplicate_checkin_blocked' using errcode = 'P0001';
  end if;

  insert into public.checkins (user_id, onsen_id, source)
  values (auth.uid(), p_onsen_id, p_source)
  returning * into v_row;

  return v_row;
end;
$$;

grant execute on function public.checkin_onsen(uuid, text) to authenticated;

-- ============================================================
-- checkout_onsen: 半径100m圏外退出時に呼ぶ
-- ============================================================
create function public.checkout_onsen(p_onsen_id uuid)
returns public.checkins
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.checkins;
begin
  update public.checkins
    set checked_out_at = now()
    where user_id = auth.uid() and onsen_id = p_onsen_id and checked_out_at is null
    returning * into v_row;

  if not found then
    raise exception 'no_active_checkin' using errcode = 'P0001';
  end if;

  return v_row;
end;
$$;

grant execute on function public.checkout_onsen(uuid) to authenticated;

-- ============================================================
-- heartbeat_checkin: アプリがフォアグラウンドにある間、定期的に呼ぶ
-- （TTL強制チェックアウトの判定材料。Exitイベント取りこぼし対策）
-- ============================================================
create function public.heartbeat_checkin(p_onsen_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.checkins
    set last_heartbeat_at = now()
    where user_id = auth.uid() and onsen_id = p_onsen_id and checked_out_at is null;
$$;

grant execute on function public.heartbeat_checkin(uuid) to authenticated;

-- ============================================================
-- ttl_auto_checkout: 最終ハートビートから30分経過したアクティブチェックインを強制退場
-- pg_cronで定期実行する
-- ============================================================
create function public.ttl_auto_checkout()
returns void
language sql
security definer
set search_path = public
as $$
  update public.checkins
    set checked_out_at = last_heartbeat_at + interval '30 minutes'
    where checked_out_at is null
      and last_heartbeat_at < now() - interval '30 minutes';
$$;

-- pg_cronが有効な場合のみスケジュール登録（Dashboard > Database > Extensions で
-- pg_cron を先に有効化してから、このブロックを再実行してください）
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule(
      'ttl-auto-checkout',
      '*/10 * * * *',
      $cron$select public.ttl_auto_checkout();$cron$
    );
  end if;
end;
$$;

-- ============================================================
-- owner_update_onsen: 施設オーナーが編集できるのは料金・営業時間・休業情報のみ
-- （NULLを渡したフィールドは変更しない）
-- ============================================================
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
  p_is_temporarily_closed boolean default null
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
    is_temporarily_closed = coalesce(p_is_temporarily_closed, is_temporarily_closed)
  where id = p_onsen_id
  returning * into v_row;

  return v_row;
end;
$$;

grant execute on function public.owner_update_onsen(
  uuid, text, integer, integer, text, text, text, text, boolean, boolean
) to authenticated;
