-- 湯めぐり新潟 — オーナー申請・情報修正提案フロー
-- spec.md「温泉地データの更新フロー」に準拠

-- ============================================================
-- owner_applications: 施設オーナーになりたいユーザーの申請
-- ============================================================
create table public.owner_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  onsen_id uuid not null references public.onsens (id) on delete cascade,
  message text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles (id)
);

create index owner_applications_status_idx on public.owner_applications (status);

alter table public.owner_applications enable row level security;

create policy "owner_applications_select_own_or_admin"
  on public.owner_applications for select
  using (user_id = auth.uid() or public.is_admin());

create policy "owner_applications_insert_own"
  on public.owner_applications for insert
  with check (user_id = auth.uid());

create policy "owner_applications_update_admin_only"
  on public.owner_applications for update
  using (public.is_admin())
  with check (public.is_admin());

-- 承認：owner_onsen_linksを作成し、申請者のroleをownerに昇格する
-- （管理者のみが呼べる。role変更はguard_profile_role_changeトリガーがis_admin()を前提に許可する）
create function public.approve_owner_application(p_application_id uuid)
returns public.owner_applications
language plpgsql
security definer
set search_path = public
as $$
declare
  v_app public.owner_applications;
begin
  if not public.is_admin() then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  select * into v_app from public.owner_applications where id = p_application_id;
  if not found then
    raise exception 'application_not_found' using errcode = 'P0002';
  end if;

  insert into public.owner_onsen_links (owner_id, onsen_id)
  values (v_app.user_id, v_app.onsen_id)
  on conflict do nothing;

  update public.profiles set role = 'owner' where id = v_app.user_id and role = 'user';

  update public.owner_applications
    set status = 'approved', reviewed_at = now(), reviewed_by = auth.uid()
    where id = p_application_id
    returning * into v_app;

  return v_app;
end;
$$;

grant execute on function public.approve_owner_application(uuid) to authenticated;

create function public.reject_owner_application(p_application_id uuid)
returns public.owner_applications
language plpgsql
security definer
set search_path = public
as $$
declare
  v_app public.owner_applications;
begin
  if not public.is_admin() then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  update public.owner_applications
    set status = 'rejected', reviewed_at = now(), reviewed_by = auth.uid()
    where id = p_application_id
    returning * into v_app;

  if not found then
    raise exception 'application_not_found' using errcode = 'P0002';
  end if;

  return v_app;
end;
$$;

grant execute on function public.reject_owner_application(uuid) to authenticated;

-- ============================================================
-- onsen_edit_suggestions: ユーザーからの情報修正提案
-- ============================================================
create table public.onsen_edit_suggestions (
  id uuid primary key default gen_random_uuid(),
  onsen_id uuid not null references public.onsens (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  proposed_changes jsonb not null,
  note text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles (id)
);

create index onsen_edit_suggestions_status_idx on public.onsen_edit_suggestions (status);

alter table public.onsen_edit_suggestions enable row level security;

create policy "edit_suggestions_select_own_or_admin"
  on public.onsen_edit_suggestions for select
  using (user_id = auth.uid() or public.is_admin());

create policy "edit_suggestions_insert_own"
  on public.onsen_edit_suggestions for insert
  with check (user_id = auth.uid());

create policy "edit_suggestions_update_admin_only"
  on public.onsen_edit_suggestions for update
  using (public.is_admin())
  with check (public.is_admin());

-- 承認：proposed_changes（許可済みフィールドのみ）をonsensに反映する
create function public.approve_edit_suggestion(p_suggestion_id uuid)
returns public.onsen_edit_suggestions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_suggestion public.onsen_edit_suggestions;
  v_changes jsonb;
begin
  if not public.is_admin() then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  select * into v_suggestion from public.onsen_edit_suggestions where id = p_suggestion_id;
  if not found then
    raise exception 'suggestion_not_found' using errcode = 'P0002';
  end if;

  v_changes := v_suggestion.proposed_changes;

  update public.onsens set
    hours = coalesce(v_changes->>'hours', hours),
    price_adult = coalesce((v_changes->>'price_adult')::integer, price_adult),
    price_child = coalesce((v_changes->>'price_child')::integer, price_child),
    phone = coalesce(v_changes->>'phone', phone),
    website = coalesce(v_changes->>'website', website),
    regular_holiday = coalesce(v_changes->>'regular_holiday', regular_holiday)
  where id = v_suggestion.onsen_id;

  update public.onsen_edit_suggestions
    set status = 'approved', reviewed_at = now(), reviewed_by = auth.uid()
    where id = p_suggestion_id
    returning * into v_suggestion;

  return v_suggestion;
end;
$$;

grant execute on function public.approve_edit_suggestion(uuid) to authenticated;

create function public.reject_edit_suggestion(p_suggestion_id uuid)
returns public.onsen_edit_suggestions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_suggestion public.onsen_edit_suggestions;
begin
  if not public.is_admin() then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  update public.onsen_edit_suggestions
    set status = 'rejected', reviewed_at = now(), reviewed_by = auth.uid()
    where id = p_suggestion_id
    returning * into v_suggestion;

  if not found then
    raise exception 'suggestion_not_found' using errcode = 'P0002';
  end if;

  return v_suggestion;
end;
$$;

grant execute on function public.reject_edit_suggestion(uuid) to authenticated;
