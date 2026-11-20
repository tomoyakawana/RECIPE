# 本番に出す前のセキュリティチェックリスト（2026-10-21 作成）

[← 目次（HANDOFF.md）](../../HANDOFF.md)

Supabase のような BaaS では、自前のサーバーのコードで守っていたもの（SSAM の FastAPI 側の認証・権限チェック）が、**RLS・GRANT・認証の設定に移る**。設定は「動かす分には困らない」ので、知らないと漏れる。機能を足したとき・main にマージする前に確認する。

## 認証
- [ ] 新規登録が閉じている（`POST /auth/v1/signup` が 422 `signup_disabled` を返す）
- [ ] ユーザーは夫婦の2人だけ（`select count(*) from auth.users` が **2**。2026-10-24 に奥さんのアカウントを作って2人になった）

## DB（新しいテーブル・関数を足したとき）
- [ ] 新しいテーブルに **RLS が有効**になっている
- [ ] 新しいテーブルに、必要な分だけ **GRANT** を付けている（`anon` には付けない）
- [ ] 新しい DB 関数に `security invoker` と `set search_path = ''` を付け、`public` と `anon` から実行権限を外している
- [ ] `npx supabase db advisors --linked --type security` が **0件**

## Edge Functions
- [ ] ユーザーが使う関数は `verify_jwt = true`（`supabase/config.toml`）で、関数内も `withSupabase({ auth: 'user' })` になっている
- [ ] 未ログインで呼ぶと 401 になる（`curl` で公開用キーだけを付けて確認）
- [ ] 外部 API のキーは Supabase の Secrets にだけ置いている（`npx supabase secrets list` で名前を確認）

## 秘密情報
- [ ] **service_role キー**、**DB のパスワード**、**Gemini の API キー**が、フロントのコード・`.env.local` 以外の場所・git に入っていない
- [ ] フロントに置くのは **URL と公開用キー（publishable key）だけ**（これは見られる前提のもの）
- [ ] `.env.local` が git に入っていない（`.gitignore` の `*.local`）

## 運用
- [ ] **CI（GitHub Actions）が ✅** になっている（PR の画面、または Actions タブ）
- [ ] マイグレーションはコミット済みのものだけを `db push` している
- [ ] マイグレーションを足したら、[docs/internal/DATABASE.md](../../docs/internal/DATABASE.md) も直している
- [ ] ダッシュボードや DBeaver でスキーマを直接変えていない
- [ ] 画面を足したり、画面の移り方を変えたりしたら、[docs/external/DESIGN.md](../../docs/external/DESIGN.md) も直している
- [ ] 機能を足したり、機能のルール・文言を変えたりしたら、[docs/external/features/](../../docs/external/features/) も直している（機能を足したら [FEATURES.md](../../docs/external/FEATURES.md) の一覧にも1行足す）
