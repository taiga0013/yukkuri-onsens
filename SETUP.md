# セットアップ手順（湯めぐり新潟）

コード側の実装（Supabase連携・GPSジオフェンシング・Google認証）はすべて完了していますが、
以下はあなたのアカウントでの作業が必要なため、私からは代行できません。順番に進めてください。

---

## 1. Supabaseプロジェクトを作成する

1. [supabase.com](https://supabase.com) で新規プロジェクトを作成（リージョンは `Northeast Asia (Tokyo)` 推奨）
2. Project Settings > API から以下をメモ
   - Project URL
   - `anon` `public` キー
3. Project Settings > API から `service_role` キーもメモ（Edge Functionのみで使用、クライアントには絶対に埋め込まない）

## 2. DBスキーマを適用する

リポジトリ直下（`onsen/`）で:

```bash
npx supabase login
npx supabase link --project-ref <あなたのproject ref>
npx supabase db push
```

`supabase/migrations/` 配下の5つのマイグレーションが順番に適用されます:
- `20260708000001_schema.sql` — テーブル定義・onsen_live_statusビュー
- `20260708000002_rls.sql` — RLSポリシー・公開ビュー
- `20260708000003_functions.sql` — checkin/checkout/heartbeat・TTL自動チェックアウト・オーナー編集RPC
- `20260708000004_home_queries.sql` — おすすめ/人気ランキング用の補助スキーマ
- `20260708000005_seed_onsens.sql` — 初期シードデータ（主要温泉地10件）

CLIでのpushが失敗する場合は、各SQLファイルの中身をDashboard > SQL Editorに順番に貼り付けて実行してください。

CLI実行時、Windows環境（特にGit Bash/WSL）では作業ディレクトリの認識に注意してください。
`supabase/.temp/project-ref` にリンク情報が保存されるため、**必ずリポジトリ直下（`onsen/`）に`cd`してから**
コマンドを実行する必要があります。WSLの場合はパスが `/mnt/c/Users/<ユーザー名>/...` になります
（Git Bashの `/c/Users/...` とは異なります）。

### pg_cronの有効化（TTL自動チェックアウトに必要）

Dashboard > Database > Extensions で検索しても `pg_cron` が見つからない場合は、SQL Editorで直接有効化できます:

```sql
create extension if not exists pg_cron schema cron;

select cron.schedule(
  'ttl-auto-checkout',
  '*/10 * * * *',
  $$select public.ttl_auto_checkout();$$
);
```

（`20260708000003_functions.sql`内の`do $$ ... end $$`ブロックは、pg_cronが未有効の状態でpushすると
自動的にスキップされる仕組みになっているため、有効化後は上記のように手動でスケジュール登録が必要です。）

確認は以下のSQLで:
```sql
select jobid, jobname, schedule, active from cron.job;
```

## 3. Google OAuthを設定する

### 3-1. Google Cloud ConsoleでOAuthクライアントを作成

[Google Cloud Console](https://console.cloud.google.com/apis/credentials) で以下を作成:
- **Web client**（Supabase Authに登録する用）
- **iOS client**（バンドルID: `app.json` の `ios.bundleIdentifier` を先に設定してから作成）
- **Android client**（パッケージ名 + SHA-1証明書フィンガープリント）

### 3-2. Supabase AuthにGoogleプロバイダを設定

Dashboard > Authentication > Providers > Google を有効化し、Web clientの Client ID / Secret を入力。

### 3-3. アプリ側の設定

`mobile/.env.example` を `mobile/.env.local` としてコピーし、値を埋める:

```
EXPO_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=xxxxxxxxxx
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=xxxxxxxxxx.apps.googleusercontent.com
```

`EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` は **Web client** のIDです（iOS/Android clientではありません）。
ネイティブGoogleサインインはWeb clientのIDでID Tokenを要求し、そのトークンをSupabaseに渡す方式のためです。

iOSの場合、`app.json` の `@react-native-google-signin/google-signin` プラグイン設定に
`iosUrlScheme`（iOS clientの逆引きURLスキーム、`GoogleService-Info.plist` や Cloud Console上で確認可能）を追加する必要があります:

```json
["@react-native-google-signin/google-signin", { "iosUrlScheme": "com.googleusercontent.apps.xxxxxxxx" }]
```

## 4. プッシュ通知（Database Webhooks + Edge Function）

```bash
npx supabase functions deploy notify
```

`SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` は手動設定不要です。Supabaseが全Edge Functionに
自動的に注入する予約済み環境変数のため、`supabase secrets set`では設定できません（設定しようとすると
「Env name cannot start with SUPABASE_」というエラーになりますが、これは正常な仕様です）。

Database Webhooksの作成場所は **Dashboard > Integrations > Database Webhooks**（「Database」メニュー内の
「Webhooks」ではありません。Database内の「Triggers」でもありません）。以下を2つ作成:

1. **名前**: `notify-checkin` / **テーブル**: `public.checkins` / **イベント**: Insert・Update /
   **Webhookの種類**: Supabase Edge Functions / **関数**: `notify` / **Method**: POST
2. **名前**: `notify-closure` / **テーブル**: `public.onsens` / **イベント**: Update のみ /
   **Webhookの種類**: Supabase Edge Functions / **関数**: `notify` / **Method**: POST

Edge Function選択時、HTTPヘッダーに`Authorization: Bearer <service_role JWT>`が自動追加されますが、
これは削除しないでください（Webhook呼び出しの認証に必須です）。

※ Supabase Dashboardの表示言語がブラウザの自動翻訳機能で日本語化されている場合、
「POST」が「役職」、「GET」が「得る」、テーブル名の一部が直訳されるなど紛らわしい表示になることがあります。
迷ったら自動翻訳をオフにして英語表示で作業することを推奨します。

## 4-1. Web版でのログイン（Apple Developer Programなしで検証したい場合）

`@react-native-google-signin/google-signin`はネイティブ専用のため、Web（`expo start --web`）では
Supabaseの標準的なOAuthリダイレクトフロー（`signInWithOAuth`）にフォールバックする実装にしてあります
（`context/AuthContext.tsx`・`app/auth/callback.tsx`）。iPhone実機がなくAndroidも無い場合、
これでログイン・データ表示・レビュー投稿など（GPS/プッシュ通知以外）をブラウザだけで検証できます。

設定が必要な箇所:

1. **Supabase > Authentication > URL Configuration > Redirect URLs** に
   `http://localhost:8081/**` を追加
2. **Google Cloud Console** の `Web client` について:
   - 「承認済みのリダイレクト URI」に `https://<project-ref>.supabase.co/auth/v1/callback` が登録済みか確認
   - **クライアント シークレットは作成時に一度しか全文表示されない**（Googleの仕様）。
     `****`のようなマスク表示しか無く、元の値が分からなくなった場合は「+ シークレットを追加」で
     新しいシークレットを発行し、Supabase側のClient Secret欄を新しい値で上書きする
3. ログイン時に `Unable to exchange external code` エラーが出る場合は、上記のClient Secret不一致が
   ほぼ確実な原因

## 5. 実機での動作確認について

`@react-native-google-signin/google-signin` ・GPSジオフェンシング（`expo-location` + `expo-task-manager`）・
プッシュ通知トークン取得は **いずれもExpo Goでは動作しないネイティブモジュール** です。
実機検証には以下のいずれかが必要です:

- `npx expo run:ios` / `npx expo run:android`（ローカルビルド、Xcode/Android Studioが必要）
- または [EAS Build](https://docs.expo.dev/build/introduction/) で開発用ビルド（`expo-dev-client`）を作成

## 6. 動作確認チェックリスト

- [x] Supabaseプロジェクト作成・DBスキーマ/RLS/RPC適用・施設データ10件投入
- [x] pg_cron有効化・TTL自動チェックアウトのスケジュール登録
- [x] Google OAuth（Web client）・Supabase Auth連携・`mobile/.env.local`設定
- [x] Edge Function `notify` デプロイ・Database Webhooks 2件設定
- [x] `mobile/.env.local` 設定後、アプリ起動時に自動的に `/login` へ遷移する（Web版で確認済み）
- [x] Googleでログインでき、`profiles` テーブルに自分の行が作成される（Web版で確認済み）
- [x] ホーム/探す/混雑状況画面がSupabaseの `onsens` / `onsen_live_status` から実データを表示する（Web版で確認済み）
- [ ] 温泉地に近づく（またはGPSオフ時は詳細画面の「チェックインする」ボタン）でチェックインが記録される（実機ビルドが必要）
- [ ] チェックイン/チェックアウトでプッシュ通知が届く
- [ ] レビュー投稿・通報（3件到達 or 誹謗中傷1件で「審査中」に自動切替）が機能する

## 7. 管理者ダッシュボード（`admin/`）

Vite + React + TypeScriptの別プロジェクト。モバイルアプリと同じSupabaseプロジェクトに接続する。

```bash
cd admin
npm install
```

`admin/.env.example` を `admin/.env.local` としてコピーし、モバイルと同じ値を設定:
```
VITE_SUPABASE_URL=https://iyufzbisigosqomitsct.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_...
```

起動:
```bash
npm run dev
```
（デフォルトで `http://localhost:5173`）

### 初回セットアップで必要な作業

1. **Redirect URL登録**: Supabase > Authentication > URL Configuration に `http://localhost:5173/**` を追加
   （本番デプロイ時は実際のドメインも追加する）
2. **最初の管理者を作る**: 新規ユーザーは自動的に`role='user'`になり、しかも自分自身では
   `role`を昇格できない安全装置（`guard_profile_role_change`トリガー）が入っているため、
   最初の1人だけはSQL Editorでトリガーを一時無効化して昇格させる必要がある:
   ```sql
   alter table public.profiles disable trigger profiles_guard_role_change;
   update public.profiles set role = 'admin' where id = (select id from auth.users where email = '管理者のメールアドレス');
   alter table public.profiles enable trigger profiles_guard_role_change;
   ```
   2人目以降の管理者は、role='admin'になった人がダッシュボード経由（または同様のSQL）で追加できる。

### 機能

- 温泉地の一覧・新規追加・編集・削除、おすすめ/休業フラグの切替
- レビューのモデレーション（審査中/公開中/削除済みのフィルタ、通報件数表示、公開・削除操作）

## 既知の未実装事項

- ユーザーアイコンの「端末フォトライブラリから選択→圧縮→Supabase Storageへアップロード」は未実装
  （現在はプリセット画像を切り替えるスタブ動作）
- オーナー申請フロー・情報修正提案フロー（ユーザーからの変更提案→管理者承認）は未実装
- 管理者ダッシュボードからの写真アップロード（Supabase Storage連携・自動圧縮）は未実装
  （現在は写真URLを直接テキストで入力する形）
