-- 長風呂・サウナ休憩などでアプリを閉じたままでも誤って自動チェックアウトされないよう、
-- TTL猶予（最終ハートビートからの経過時間）を30分から1時間に延長する
create or replace function public.ttl_auto_checkout()
returns void
language sql
security definer
set search_path = public
as $$
  update public.checkins
    set checked_out_at = last_heartbeat_at + interval '1 hour'
    where checked_out_at is null
      and last_heartbeat_at < now() - interval '1 hour';
$$;
