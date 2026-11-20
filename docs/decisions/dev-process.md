# 開発の進め方（CI・SQL のテスト・バージョン・ローカルの開発環境）

[← 目次（HANDOFF.md）](../../HANDOFF.md)

## CI（GitHub Actions）（2026-10-23 導入）

ファイル：[.github/workflows/ci.yml](../../.github/workflows/ci.yml)

| ジョブ | 中身 | いつ動くか |
|---|---|---|
| フロント（lint・ビルド） | `npm ci` → `npm run lint` → `npm run build`（ビルドの中で TypeScript の型チェックも走る） | PR を出したとき・更新したとき、develop に push したとき |
| Edge Function（型チェック） | Deno で `deno check`（`supabase/functions/parse-recipe`） | 同上 |

| 判断 | 理由 |
|---|---|
| 入れた | Claude が毎回手元でやっていたビルド・lint の確認を、GitHub でも二重に行う。**手元に Deno がなく、Edge Function の型チェックが一度もできていなかった**穴を埋める。現場ではほぼ必ずある仕組みで、練習にもなる |
| Issue にしなかった | その場で作って終わる作業だったため（CLAUDE.md ルール8） |
| Node は `.node-version` を読む | 手元・Cloudflare・GitHub の3か所でバージョンをそろえる |
| 権限は読み取りだけ、10分で打ち切り、同じブランチの古い実行は止める | 安全と、無料枠の節約 |
| SQL のテストは、まだ CI には入れていない | 2026-10-24 にテストはリポジトリに入った（下記）。CI に入れるには、GitHub 上で PostgreSQL を立ち上げる設定が要る。必要になったら足す |

**CI とデプロイの関係（混同しやすいので注意）**
| | CI（GitHub Actions） | デプロイ（Cloudflare Pages） |
|---|---|---|
| 役割 | 壊れていないかを**確かめるだけ**（どこにも公開しない） | 画面を**公開する** |
| develop に push | lint・ビルド・型チェック | プレビュー環境（develop.recipe-dph.pages.dev）に反映 |
| main に push | （PR の時点で実行済み） | 本番（recipe-dph.pages.dev）に反映 |

- **2つはつながっていない。CI が ❌ でも Cloudflare は公開する。** なので、main にマージする前に PR の画面で CI が ✅ か必ず見る
- **画面は本番とプレビューで分かれているが、Supabase（DB・Edge Function）は1つだけ**（[database.md](database.md)「Supabase の構築」：プロジェクトは1つ）。DB につないだ後は、プレビューで試した操作も本物のデータに入る。Edge Function はデプロイした時点で本番にも効く。DB への差し替え（#18〜）のときに、テストデータの扱いを決める

**無料枠（2026-10-23 公式で確認）：** private リポジトリは月 **2,000分**。使い切っても、支払い方法が登録されていなければ止まるだけで課金されない。1回あたり1分弱（フロント約32秒、Edge Function 約13秒）なので、十分に収まる

**使った部品の版：** `actions/checkout@v7`、`actions/setup-node@v7`、`denoland/setup-deno@v2`（Deno 2.x）

**手元で Edge Function の型チェックをしたいとき（Deno を入れずに Docker で）：**
```bash
# 一時フォルダにコピーしてから（deno.lock がリポジトリにできないように）
docker run --rm -v "$PWD:/app" -w /app denoland/deno:2.9.8 deno check index.ts
```

**未確認：** private リポジトリの無料プランで「CI が ✅ にならないとマージできない」設定（ブランチ保護）が使えるか。使えなくても、PR に結果が出るだけで十分役に立つ

## SQL のテスト（2026-10-24〜）

**実行：** `bash supabase/tests/run.sh`（Docker と psql が必要。本番の Supabase には一切つながない）

| ファイル | 中身 |
|---|---|
| `00_supabase_stub.sql` | 素の PostgreSQL の中に、**本物の Supabase に近い環境**を作る（anon / authenticated / service_role、`auth.uid()`、postgres の既定の権限 `anon=Dxtm`、テーブルへの自動 GRANT なし）。テスト用の道具（`test.ok`、`test.expect_error`、`test.login` など）もここ |
| `01_recipes.sql` | save_recipe（追加・編集・途中で失敗したら全部取り消し）、お気に入り（夫婦共通）、ひとことメモ、論理削除 |
| `02_todo_and_cooked.sql` | リクエストの重複ルール、「作った！」の日付ルール、履歴があるレシピは消せない |
| `03_shopping_and_notes.sql` | 材料から追加（重複しない・買ったら再追加）、共有メモ（1行固定） |
| `04_privileges.sql` | 未ログインは何もできない、TRUNCATE できない、既定の権限、全テーブル RLS |
| `05_requests_and_settings.sql` | #18：食べたい！、user_settings（自分の行だけ）、set_updated_at の権限 |

- 流れ：Docker で PostgreSQL 17 を起動 → `00_supabase_stub.sql` → `supabase/migrations/` を全部 → `01_` 以降のテスト → 後片付け
- **合わない項目があれば、その場で止まって終了コード 1**（`test.ok` が `FAIL:` を出してエラーにする）。2026-10-24 時点で **58項目**
- 期待するエラーは SQLSTATE で確かめる：`42501`（権限なし・RLS 違反）、`23505`（一意制約）、`23503`（外部キー）、`23514`（check）、`P0001`（関数の raise）

**経緯（反省）：** それまではテスト SQL を Claude の一時フォルダに置いていたが、**日が経って一時フォルダごと消え**、#18 の検証の準備ができなかった。そこでリポジトリに入れ、「目で見て判断」から「自動で合否が出る」形に書き直した。書き直した直後、**わざと失敗するテストを入れても「すべて通りました」と出るバグ**が見つかった（パイプの後ろの `|| true` で psql の終了コードを見失っていた）。テストの仕組み自体も、わざと失敗させて確かめること

**マイグレーションを足したら：** 対応するテストを `supabase/tests/` に足し、`run.sh` が通ってからコミットする

## バージョン（2026-10-24 決定）

- **正は `package.json` の `version`**（3つの数字：`1.0.0`）。`vite.config.ts` が package.json を読み、`define` で `__APP_VERSION__` としてビルドに埋め込む（型は `src/env.d.ts`）。書き換えるのは package.json の1か所だけ
- 設定画面の「このアプリについて」に、**最初の2つの数字だけ**出す（`バージョン 1.0`）
- **上げるのは本番に出すとき（main にマージするとき）だけ**。develop の途中では上げない
  - 機能の追加・直し：1.0 → 1.1 → 1.2 …
  - 大きく変わったとき：2.0
  - **小さい要望・直しを急いで出すとき：3つ目の数字（パッチ版、1.2 → 1.2.1）**（2026-11-14、#63 から）。画面には最初の2つの数字しか出ないので、奥さんから見たバージョンは変わらない（package.json・タグ・Release で区別できる）。**マイルストーンは作らない**（中身が1つ2つで、進み具合を見る必要がないため）
- **リリースのときに、main のそのコミットに Git のタグを付ける**（`v1.0` など）。GitHub でどのコミットがどのバージョンか分かるようにするため
- **1.0 ＝ 奥さんに渡す最初のリリース**（#34）
- **GitHub の Release も作る**（タグにリリースノートを付けたページ）。v1.0 は手で書いた（できること・入ったもの・技術）。次からは「Generate release notes」で、前のタグからの PR の一覧を元に作れる
- **マイルストーン（2026-10-24〜）**：GitHub のマイルストーンを**バージョンごと**に作り（`v1.1` など）、そのリリースに入れる Issue を入れる。マイルストーンの画面で、そのバージョンの進み具合（◯/◯）が見られる。優先度ラベル・親子（sub-issue）とは別の軸で、「**いつ出すか**」を表す
  - `v1.1`：#42（URL 取り込み）・#44（ローカルの開発環境）。当初は #29・#14 の予定だったが、奥さんの「フルページのスクショは大変」から #42 を急ぎ、**できたものから出す**（終わっていないものは次の番号へ送る）形にした（2026-11-03）
  - `v1.2`：#14（写真）・#29（カレンダーから予定を入れる）。#15（縦長のスクショ）は、今の取り込みで足りているため外し、優先度：低にした（2026-11-07）

### リリースの手順（2026-11-03、v1.1 の上げ忘れから）
1. develop で `npm version 1.x.0 --no-git-tag-version`（package.json と package-lock.json の version を上げる）→ PR → develop にマージ
2. **Edge Function を変えたときは、先に本番へ反映**（`npx supabase functions deploy parse-recipe --use-api` → `functions list` で版と verify_jwt を確認）→ develop のプレビューで確認
3. **マイグレーションがあるときは、`db push` を先に**（確認を取ってから）
4. develop → main の PR（本文に Closes #…）→ CI が通ったらマージ
5. 本番の画面で確認（設定画面のバージョンも）
6. main のマージコミットにタグ `v1.x` を付け、GitHub の Release を作る（Generate release notes を元に）
7. [release-log.md](release-log.md) に書く

## ローカルの開発環境（#44、2026-10-27 決定）

**ローカルの開発は、本番の DB につながない。** 手元の Docker で Supabase を動かし（`npx supabase start`）、ダミーデータ（`supabase/seed.sql`）で開発する。

**なぜ**
- それまでローカルのアプリも本番の DB につないでいた。シークレットモードは「画面に出さない」だけなので、リクエスト画面を開発するときに奥さんの予定が見えてしまう
- 開発中のコードやバグで、本番のデータを書き換える危険がある（確認で入れたデータの消し忘れも含む）
- 現場でいう「開発環境と本番環境を分ける」の練習。E2E テスト（#41）が本番に触らずに済む土台にもなる

**決めたこと**

| 項目 | 決めたこと | 理由 |
|---|---|---|
| 接続先の切り替え | `.env.development.local`（Git に入れない）に、ローカルの URL と公開用キーを書く | Vite は `npm run dev` のとき、これを `.env.local` より優先して読む。`npm run build`（本番）は読まないので、本番のビルドは今までどおり `.env.local`／Cloudflare の環境変数を使う。コードは変えずに済む |
| ローカルの URL | `http://<Mac の名前>.local:54321`（127.0.0.1 ではなく Mac の名前） | iPhone から `npm run dev -- --host` で見るとき、127.0.0.1 は iPhone 自身を指してしまう。Mac の名前なら Mac・iPhone の両方からつながる（Kong は 0.0.0.0 で待ち受けている。2026-10-27 に Mac から速度に差がないことを確認） |
| ダミーデータ | テスト用のユーザー2人（夫役 `otto@example.com`・妻役 `tsuma@example.com`、パスワードは `password123`）、レシピ8品＋削除済み1品、リクエスト（昨日・今日・数日後・日付未定・食べたい！）、作ったご飯、買い物リスト、共有メモ | 画面のどの状態も、リセット直後から確かめられるように。日付は「今日（日本時間）」からの相対なので、いつリセットしてもカレンダーに予定が出る。ユーザーはローカル専用なので、パスワードを書いてよい |
| 新規登録 | ローカルも閉じる（`config.toml` の `[auth] enable_signup = false`） | 本番に合わせる。ローカルのユーザーは seed で作る |
| AI 取り込み | `supabase start` で Edge Function もローカルで動く。Gemini のキーは `supabase/functions/.env`（Git に入れない）に置く。**置かなければ AI 取り込みだけ使えない** | 最初は置かずに始める。キーの置き方は README |
| 起動しないもの | `-x logflare,vector`（ログの集計） | メモリの節約。開発には使わない |
| プレビュー（develop.recipe-dph.pages.dev） | **本番の DB のまま**（2026-10-27 川名さん了承） | 今回の範囲外。分けるなら Supabase のプロジェクトを増やすことになるので、無料枠を一次情報で確かめてから別に考える |

**注意**
- `npm run gen:types` は今までどおり本番（`--linked`）のスキーマから型を作る。マイグレーションを足したら、ローカルで確かめてから `db push` → `gen:types` の順は変わらない
- `npx supabase db reset` で、ローカルの DB は**いつでも初期状態（マイグレーション＋seed）に戻せる**。開発中にデータを壊しても気にしなくてよい
- 設定画面のメールアドレスが `@example.com` なら、ローカルにつながっている
