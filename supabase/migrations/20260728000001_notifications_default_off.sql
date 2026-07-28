-- プッシュ通知はデフォルトでオフにする（新規ユーザーのみ対象。既存ユーザーの設定は変更しない）
alter table public.profiles
  alter column notifications_enabled set default false;
