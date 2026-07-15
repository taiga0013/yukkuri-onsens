# 湯めぐり新潟 — 引き継ぎドキュメント

最終更新：2026-07-15（前セッション完了時点）

新しいセッションで作業を再開する際は、まずこのファイルを読んでください。詳細な技術仕様は [spec.md](../spec.md)、環境構築の手順は [SETUP.md](../SETUP.md) を参照してください（このファイルはそれらを読む前の「地図」の役割です）。

---

## 1. プロジェクト概要

新潟県内の温泉地に特化した、混雑状況をリアルタイムに把握できるモバイルアプリ。コアコンセプトは「GPSチェックインによる混雑可視化」。

- **リポジトリ**: https://github.com/taiga0013/yukkuri-onsens
- **ローカルパス**: `C:\Users\taiga yamamoto\Desktop\onsen`
- **Supabaseプロジェクト**: `iyufzbisigosqomitsct`（東京リージョン）
- **Google Cloud プロジェクト**: `yumeguri-niigata`
- **EASプロジェクト**: `@taigayamamoto/yumeguri-niigata`

## 2. リポジトリ構成

```
onsen/
├── mobile/     React Native (Expo Router) アプリ本体
├── admin/      React (Vite) 管理者/オーナー用ダッシュボード
├── supabase/   DBマイグレーション・Edge Function
├── spec.md     機能仕様書（決定事項サマリー付き）
├── SETUP.md    環境構築の詳細手順（Supabase/Google OAuth/EAS Build等）
└── docs/HANDOVER.md   このファイル
```

## 3. 現在の実装状況（体感 85〜90%）

### ✅ 完成・動作確認済み

- **モバイルUI**: ホーム・探す・混雑状況・マイページの4タブ、温泉地詳細画面（写真スライダー・設備・料金・宿泊有無・休業情報・説明・口コミ）
- **Supabaseバックエンド**: 全スキーマ・RLS・RPC関数・pg_cronによるTTL自動チェックアウト
- **Google認証**: **Web版で動作確認済み**（`signInWithOAuth`のリダイレクトフロー、`/auth/callback`経由）。ネイティブ版（`@react-native-google-signin`）はコードのみで実機未検証
- **口コミ機能**: 投稿・4種ソート・通報（3件到達 or 誹謗中傷1件で自動的に「審査中」化）・**自分の投稿の編集/削除**（「…」メニューで own/others を判定して分岐）
- **お気に入り**: 動作確認済み
- **アイコンアップロード**: 端末の写真ライブラリ → 圧縮（最大1280px・80%）→ Supabase Storage。**Web版でも動作**（`expo-image-picker`/`expo-image-manipulator`がWeb対応していたため）
- **管理者ダッシュボード**（`admin/`、role='admin'でログイン）:
  - 温泉地の一覧・新規追加・編集・削除、おすすめ/休業フラグの切替
  - 写真アップロード（ブラウザcanvasで圧縮 → Supabase Storage）
  - レビューモデレーション（審査中/公開中/削除済みフィルタ、通報件数表示）
  - オーナー申請の承認/却下
  - 情報修正提案の承認（反映）/却下
  - **オーナー管理**（誰がどの施設を担当しているか一覧・手動割り当て・解除）
- **オーナー専用ダッシュボード**（role='owner'でログイン、同じ`admin/`アプリ内）:
  - 自分の担当施設のみ表示、料金・営業時間・休業情報だけ編集可（`owner_update_onsen` RPC経由）
- **手動チェックイン/チェックアウトボタン**（詳細画面）：Web版でも動作確認済み

### ⚠️ コードはあるが実機未検証

- **GPSジオフェンシング**（自動チェックイン/アウト）: `expo-location` + `expo-task-manager`で実装済み。Web/Expo Goでは動作しない仕様のため、**実機の開発ビルドでしか検証できない**
- **プッシュ通知**: Edge Function `notify` をデプロイ済み、Database Webhooks設定済み。プッシュトークン登録もネイティブ専用のため**実機でしか検証できない**

### ❌ 未着手

- **iOS実機ビルド**: Macでの`npx expo run:ios`（無料の個人チーム署名、7日で失効）または Apple Developer Program登録＋EAS Buildのどちらかが必要。**これが最大の残タスク**
- **Android実機での動作確認**: EAS Buildで開発用APKは1本作成済みだが、Android実機がないためインストール未確認

---

## 4. 次にやるべきこと（優先順位順）

1. **iOS実機ビルド・検証**（最優先・最大の残作業）
   - Macが使えるようになったら: `git clone` → `mobile/.env.local`を再作成（値はSupabase/Google Cloud Dashboardから取得、SETUP.md参照）→ `npx expo run:ios`
   - GPS自動チェックイン、Googleネイティブログイン、プッシュ通知の3つをまとめて検証できる
2. Android実機があれば、EAS Buildで作ったAPK（`eas build --platform android --profile development`）をインストールして同様に検証
3. 上記が終われば、機能面はほぼ完成。あとは実際の温泉地データ拡充（今は10件のみ）や、App Store/Google Play申請の準備

## 5. 重要な注意点（このセッションで学んだこと）

### 技術的な落とし穴

- **`Alert.alert()`はreact-native-webで空実装**（何も表示されない）。複数選択肢のメニューは自作の`ActionSheet`コンポーネント（`mobile/components/ActionSheet.tsx`）、単一メッセージは`mobile/lib/platformAlert.ts`の`showAlert()`を使うこと。新しく確認ダイアログを追加する際は`Alert.alert`を直接使わないよう注意
- **PostgRESTで同じテーブルへのFKが複数あると`select('*, profiles(...)')`が曖昧エラーになる**（例: `owner_applications`は`user_id`と`reviewed_by`の2つが`profiles`を参照）。`profiles!<制約名>(...)`で明示する必要がある
- **最初の管理者を作る際、`profiles.role`変更を防ぐトリガー(`profiles_guard_role_change`)が自分自身にもブロックをかける**。SQL Editorで`alter table ... disable trigger ...`→`update`→`enable trigger`の順で一時解除する必要がある（2人目以降はダッシュボードのオーナー承認機能や、既存管理者のセッション経由なら普通に変更できる）
- **Supabase Dashboard/Google Cloud Consoleをブラウザの自動翻訳で日本語化すると表示が壊れる**（例: POSTが「役職」と誤訳される）。作業時は自動翻訳をオフにして英語のまま見ること

### 環境・作業手順の注意

- Windows環境（Git Bash / WSL 併用）。WSLは`/mnt/c/Users/...`、Git Bashは`/c/Users/...`とパス形式が違うので注意
- `supabase` CLIコマンドは、必ずリポジトリ直下（`onsen/`）に`cd`してから実行すること（リンク情報が`supabase/.temp/`にローカル保存されているため）
- `.env.local`（`mobile/`・`admin/`両方）は`.gitignore`済みでリポジトリに含まれていない。新しいセッション/別マシンでは`.env.example`を参考に再作成が必要（実際の値はSupabase DashboardのProject Settings > APIから取得）
- 開発サーバーは`.claude/launch.json`に`mobile-web`（ポート8081）・`admin-web`（ポート5173）を登録済み
- `git remote`はHTTPS + Personal Access Token方式。トークンは都度発行して使い捨てる運用にしている（GitHubアカウント: `taiga0013`）

## 6. 参考ドキュメント

- [spec.md](../spec.md) — 全機能仕様・データ構造・決定事項サマリー
- [SETUP.md](../SETUP.md) — Supabase/Google OAuth/EAS Build/管理者ダッシュボードの詳細な構築手順とチェックリスト
