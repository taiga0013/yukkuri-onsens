-- 情報修正提案をAIが自動判定するための拡張。
-- 判定結果は auto_approved / auto_rejected として記録し、ai_reasoning に理由を残す。
-- 判定できなかった場合（APIキー未設定など）は従来通り pending のまま管理者が手動確認する。
alter table public.onsen_edit_suggestions
  drop constraint if exists onsen_edit_suggestions_status_check;

alter table public.onsen_edit_suggestions
  add constraint onsen_edit_suggestions_status_check
  check (status in ('pending', 'approved', 'rejected', 'auto_approved', 'auto_rejected'));

alter table public.onsen_edit_suggestions
  add column if not exists ai_reasoning text;
