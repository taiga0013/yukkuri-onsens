# 湯っくり（旧: 湯めぐり新潟）— 引き継ぎドキュメント

最終更新：2026-07-28（本セッション完了時点、同日2回目のセッション）

新しいセッションで作業を再開する際は、まずこのファイルを読んでください。詳細な技術仕様は [spec.md](../spec.md)、環境構築の手順は [SETUP.md](../SETUP.md) を参照してください（このファイルはそれらを読む前の「地図」の役割です）。

---

## 1. プロジェクト概要

新潟県内の温泉地に特化した、混雑状況をリアルタイムに把握できるモバイルアプリ。コアコンセプトは「GPSチェックインによる混雑可視化」。

- **アプリ表示名**: 「湯っくり」（本セッションで「湯めぐり新潟」から変更。表示名のみで、`slug`/`scheme`/bundle ID/EAS project IDなどのインフラ識別子は未変更）
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

## 3. 現在の実装状況

### ✅ 完成・動作確認済み

- **モバイルUI**: ホーム・探す・混雑状況・マイページの4タブ、温泉地詳細画面（写真スライダー・設備・料金・宿泊有無・休業情報・説明・口コミ・宿泊プラン）
- **Supabaseバックエンド**: 全スキーマ・RLS・RPC関数・pg_cronによるTTL自動チェックアウト
- **Google認証**: **Web版で動作確認済み**（`signInWithOAuth`のリダイレクトフロー、`/auth/callback`経由）。ネイティブ版（`@react-native-google-signin`）はコードのみで実機未検証
- **初回ログイン後の性別設定オンボーディング**（本セッションで追加）: `profiles.gender_prompted`が未設定のユーザーを`/onboarding/gender`へ強制誘導。「設定しない」を選んでも二度と出ない。男女別の混雑表示の精度向上が目的
- **口コミ機能**: 投稿・4種ソート・通報（3件到達 or 誹謗中傷1件で自動的に「審査中」化）・自分の投稿の編集/削除
- **お気に入り**: 動作確認済み
- **アイコンアップロード**: 端末の写真ライブラリ → 圧縮（最大1280px・80%）→ Supabase Storage。Web版でも動作
- **手動チェックイン/チェックアウトボタン**（本セッションで機能強化）:
  - **施設から半径100m以内でないとチェックインできない**（`expo-location`で現在地取得→距離判定、`mobile/hooks/useCheckin.ts`）
  - 範囲外・位置情報権限なし・現在地取得失敗時は、詳細画面下部にアプリ内バナー（`colors.danger`、3.5秒で自動消去）で警告。ブラウザネイティブAlertは使っていない
- **温泉地詳細画面のナビゲーション改善**（本セッションで追加）: 左上の×ボタンはスクロールしても固定表示。画面下部に「ホーム/探す/混雑状況/マイページ」への直接ジャンプバーを追加
- **宿泊プラン機能**（本セッションで追加）: `lodging_plans`テーブル。プランごとに食事内容・決済方法・1〜4名利用時の料金（自由記述、範囲表記可）・チェックイン/アウト時間・写真（複数）。管理者・オーナー双方が直接RLSで編集可（`admin/src/components/LodgingPlansEditor.tsx`、RPCなし）
- **温泉地情報の拡充**（本セッションで追加、すべて`onsens`テーブルの追加カラム）:
  - `payment_method`（日帰り入浴の決済方法）
  - `access_info`（手書きのアクセス案内。Google Maps自動リンクの代わり）
  - `regular_hours`（電話対応時間）
  - `lodger_bath_hours`（宿泊者の入浴時間）
  - `private_bath_hours` / `private_bath_price`（貸し切り風呂の営業時間・料金）
  - `has_day_trip`（日帰り入浴の有無フラグ。falseなら日帰り関連情報をアプリ側で非表示）
  - モバイル詳細画面での表示順: 電話対応 → 日帰り者の入浴時間 → 宿泊者の入浴時間 → 貸切風呂の営業時間・料金
- **ホーム画面のおすすめ表示**（本セッションで変更）: 管理者が手動選定する`is_recommended`方式をやめ、**画面を開くたびに全施設からランダムに5件選ぶ**方式に変更（`mobile/lib/random.ts`の`sampleRandom`）。DBの`is_recommended`列自体は残置（未使用）
- **プレミアムプラン（サブスク）モック画面**（本セッションで追加）: ホーム「すべての温泉地」は9件まで無料表示、10件目以降があれば「＋もっとみる」→`mobile/app/subscription.tsx`。**UIのみで実際の決済処理は一切なし**
- **マイページ**: アバター編集バッジを新しいイラスト調ロゴ（温泉旅館・山・湯気・植物の円形バッジ、テキスト部分は除いたアイコンのみをクロップ）に変更（`mobile/assets/avatar-edit-badge.png`、160x160）。ダークモードスイッチが「システム設定に追従して結果的にダーク表示」の状態を正しく反映するよう修正済み
- **新ロゴへの差し替え**（次セッションで完了）: ユーザーがチャットに貼り付けた画像を`Downloads\Image (19).jpg`から発見して使用。(1) `mobile/assets/avatar-edit-badge.png`を新ロゴのクロップ済みPNGに置換、(2) プレゼン資料（`C:\Users\taiga yamamoto\Desktop\湯っくり_プレゼン資料.pptx`）内の自社ロゴ2箇所（サムネスライド・比較表スライド、旧`kiai.png`部分）も同じ画像に置換。LibreOffice→PDF→PyMuPDFで両スライドを画像化して視覚確認済み
- **管理者ダッシュボード**（`admin/`、role='admin'でログイン）:
  - 温泉地の一覧・新規追加・編集・削除、おすすめ/休業フラグの切替
  - 写真アップロード（ブラウザcanvasで圧縮 → Supabase Storage）
  - レビューモデレーション（審査中/公開中/削除済みフィルタ、通報件数表示）
  - オーナー申請の承認/却下、情報修正提案の承認/却下
  - オーナー管理（誰がどの施設を担当しているか一覧・手動割り当て・解除）
  - 宿泊プラン管理（`LodgingPlansEditor`、上記参照）
- **オーナー専用ダッシュボード**（role='owner'、同じ`admin/`アプリ内）: 自分の担当施設のみ表示、日帰り入浴の料金・営業時間・決済方法・休業情報・宿泊プランを編集可
- **プッシュ通知のデフォルトOFF**（本セッションで追加）: `profiles.notifications_enabled`の列デフォルトを`true`→`false`に変更（新規ユーザーのみ対象、既存ユーザーの設定は不変）。マイページのトグルはこれまで通り任意でON可能
- **GPS自動チェックイン（Web版）**（本セッションで追加）: `mobile/components/DeviceCapabilities.tsx`に、Web版向けのフォアグラウンド位置監視ロジックを追加。ログイン後（マイページの「GPS」設定がON、デフォルトON）、ブラウザの位置情報許可ポップアップが自動的に表示され、許可すると`Location.watchPositionAsync`で20秒間隔・20m移動ごとに現在地を監視、半径100m圏内への出入りで自動的に`checkin_onsen`/`checkout_onsen`RPCを呼ぶ（ネイティブのバックグラウンドジオフェンシングと違い、タブを開いている間だけ有効なフォアグラウンド監視）。型チェック通過・Web版起動でエラーなし・正常レンダリングまでは確認済みだが、**この開発環境のブラウザでは位置情報許可が既に"denied"状態だったため、実際の許可ポップアップ表示〜自動チェックイン成功までのフルフローは未検証**（ユーザー自身の環境、または位置情報のサイト設定をリセットした状態での確認が必要）

### ⚠️ コードはあるが実機未検証

- **GPSジオフェンシング（ネイティブ版）**（自動チェックイン/アウト）: `expo-location` + `expo-task-manager`で実装済み。Expo Goでは動作しない仕様のため、**実機の開発ビルドでしか検証できない**（Web版は上記「✅ 完成」の別実装で対応済み）
- **プッシュ通知**: Edge Function `notify` をデプロイ済み、Database Webhooks設定済み。プッシュトークン登録もネイティブ専用のため**実機でしか検証できない**

### ❌ 未着手・未完了

- **iOS実機ビルド**: Macでの`npx expo run:ios`、または Apple Developer Program登録＋EAS Buildのどちらかが必要。本セッション時点でユーザーからは「今回はそこまで必要ない」と明言されており、優先度は保留中
- **Android実機での動作確認**: 同上、保留中
- **App Store/Google Play申請**: 未着手
- **温泉地データの拡充**: 現在DBには10件（初期シードとは異なり、管理者が実データを個別に追加・編集した状態。`supabase/migrations/20260708000011_seed_onsens_2.sql`で追加10件分のシードを用意したが、**ユーザーの判断で意図的に未適用のまま**。今後増やす場合は管理者ダッシュボード経由が想定される運用）
（新しい温泉地イラストロゴへの差し替えは完了。上記「✅ 完成」欄参照）

---

## 4. 次にやるべきこと（優先順位順）

1. **iOS実機ビルド・検証**（Macが使えるようになったら。優先度は保留中との申し出あり、着手前に必要かどうか本人に確認すること）
   - `git clone` → `mobile/.env.local`を再作成（値はSupabase/Google Cloud Dashboardから取得、SETUP.md参照）→ `npx expo run:ios`
   - GPS自動チェックイン、Googleネイティブログイン、プッシュ通知の3つをまとめて検証できる
2. Android実機があれば、EAS Buildで作ったAPKをインストールして同様に検証
3. 温泉地データの拡充、App Store/Google Play申請の準備

## 5. PowerPointプレゼン資料について

本セッションで、ポートフォリオ発表用のプレゼン資料を作成した。

- **成果物**: `C:\Users\taiga yamamoto\Desktop\湯っくり_プレゼン資料.pptx`（7分発表＋アプリ実演を想定、7枚構成: サムネ／他社サービスとの違い（楽天トラベル・じゃらん・Yahoo!トラベルとの実名比較表）／チェックインの説明／アプリ概要／技術スタック／将来性／まとめ）
- **生成方法**: `pptxgenjs`スクリプトで生成 → LibreOffice（本セッションでwinget経由インストール済み、`C:\Program Files\LibreOffice\`）でPDF変換 → PyMuPDFで画像化して視覚確認、という手順を確立した
- **重要**: 生成に使ったNode.jsスクリプト（`build6.js`）・アイコン画像（会社ロゴ含む）は**このセッションのスクラッチパッドディレクトリに置かれており、セッション終了とともに消える**。完成品の`.pptx`ファイル自体はDesktopに残るので閲覧・PowerPoint上での手動編集は可能だが、**スクリプト経由でさらに自動編集したい場合は、新しいセッションで一から作り直す必要がある**
- 技術スタックのロゴ（Expo/React/Vite/Supabase/PostgreSQL）は`react-icons`のSimple Icons、競合3社（楽天トラベル・じゃらん・Yahoo!トラベル）のロゴはユーザーが提供した実際のロゴ画像を使用。自社ロゴは新セッションで`kiai.png`（渦巻きロゴ）から新イラストロゴに差し替え済み（サムネスライドshape_id=5、比較表スライドshape_id=18。**`build6.js`を作り直さず、`python-pptx`で該当Pictureシェイプを削除→同じ位置・サイズで`add_picture`し直す方法で直接編集**。この方法ならNode.jsスクリプトが失われていても既存pptxをピンポイントで修正できる）
- PowerPointのオブジェクトアニメーション（フェードイン等）は生成ツールでは直接付与できない（OOXMLのタイミングノードを手動編集する必要があり壊れるリスクが高い）ため、**あえて実装していない**。ユーザー自身がPowerPoint上で追加する方針で合意済み

## 6. 重要な注意点（このセッションで学んだこと）

### 技術的な落とし穴

- **`Alert.alert()`はreact-native-webで空実装**（何も表示されない）。複数選択肢のメニューは自作の`ActionSheet`コンポーネント（`mobile/components/ActionSheet.tsx`）、単一メッセージは`mobile/lib/platformAlert.ts`の`showAlert()`を使うこと
- **PostgRESTで同じテーブルへのFKが複数あると`select('*, profiles(...)')`が曖昧エラーになる**。`profiles!<制約名>(...)`で明示する必要がある
- **最初の管理者を作る際、`profiles.role`変更を防ぐトリガーが自分自身にもブロックをかける**。SQL Editorで`alter table ... disable trigger ...`→`update`→`enable trigger`の順で一時解除する必要がある
- **Supabase Dashboardをブラウザの自動翻訳で日本語化すると表示が壊れる**（例: `true`が「真実」と誤訳される）。boolean値の確認など、正確性が必要な作業では自動翻訳を必ずオフにすること
- **Reactの状態（`profile`など）がnullの一瞬を「不要」と誤判定しないこと**: 本セッションで、セッション復元直後に`profile`がまだnullの間に「性別設定は不要」と誤って判定し、`/onboarding/gender`から即座に弾き返してしまうバグが発生した（`mobile/app/_layout.tsx`）。非同期で読み込むデータに依存する画面遷移ガードは、「まだ読み込み中（null）」と「読み込み完了して不要と判明した」を明確に区別すること
- **`pptxgenjs`でreact-iconsをラスタライズする際、SVGの`viewBox`を独自の値で上書きしないこと**。react-iconsが返す`<svg>`タグには元々そのアイコンセット固有の正しい`viewBox`が入っているので、それを保持したままrasterizeする（変に書き換えると、パスのスケールが合わず極小・位置ズレした画像になる）
- **このPCの`AppData\Roaming\Claude\...`配下はアプリのサンドボックス化されたパッケージフォルダへのジャンクション**で、Pythonなど一部のプロセスから直接読めないことがある（PowerShellのGet-Item等では見えるのに`python`が`FileNotFoundError`になる）。該当ファイルを別の書き込み可能な場所（スクラッチパッド等）にコピーしてから使うと解決する
- **Windows上でPythonスクリプトが日本語を含むXML/JSONを読むと`cp932`コーデックエラーになることがある**。`PYTHONUTF8=1`環境変数を付けて実行すると解決する（pptxの`validate.py`実行時に必要だった）
- **ブラウザのGeolocation Permissions APIは一度`granted`/`denied`が決まると、再度`requestForegroundPermissionsAsync()`を呼んでもポップアップを再表示しない**（expo-locationの`ExpoLocation.web.ts`が`navigator.permissions.query`の状態を見て、`prompt`状態の時だけ`getCurrentPosition`でポップアップを出す実装のため）。動作確認時にポップアップが出ない場合は、まずブラウザのサイト設定で位置情報の許可状態をリセットすること

### 環境・作業手順の注意

- Windows環境（Git Bash / WSL 併用）。WSLは`/mnt/c/Users/...`、Git Bashは`/c/Users/...`とパス形式が違うので注意
- **`supabase` CLIは`supabase login`が必要だが、このセッション環境では対話的なブラウザOAuthフローを実行できないため`supabase db push`は使えない**。新しいマイグレーションは必ずSQLをチャットに全文出力し、ユーザーに[SQL Editor](https://supabase.com/dashboard/project/iyufzbisigosqomitsct/sql/new)で直接実行してもらう運用で通している
- 上記の運用に伴い、**ユーザーがSQL実行を確認したら、追加の確認なしにそのままコミット・プッシュしてよい**（本セッション中にユーザーから明示された運用ルール）
- `.env.local`（`mobile/`・`admin/`両方）は`.gitignore`済みでリポジトリに含まれていない。新しいセッション/別マシンでは`.env.example`を参考に再作成が必要
- 開発サーバーは`.claude/launch.json`に`mobile-web`（ポート8081）・`admin-web`（ポート5173）を登録済み
- `git remote`はHTTPS + Personal Access Token方式（GitHubアカウント: `taiga0013`）
- ユーザーが画像をチャットに貼り付けても、そのままではファイルとして参照できない。`C:\Users\taiga yamamoto\Pictures\Screenshots\`や`Pictures\Saved Pictures\`に保存してもらうよう案内し、`find ... -newer <目印のファイル>`等で探すと見つかることが多い

## 7. 参考ドキュメント

- [spec.md](../spec.md) — 全機能仕様・データ構造・決定事項サマリー
- [SETUP.md](../SETUP.md) — Supabase/Google OAuth/EAS Build/管理者ダッシュボードの詳細な構築手順とチェックリスト
