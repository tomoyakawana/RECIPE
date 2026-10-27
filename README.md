# なに食べたい？

夫婦で共有する料理レシピアプリ（React + TypeScript + PWA）。

## 開発

```bash
npm install      # 初回のみ
npm run dev      # 開発サーバー（http://localhost:5173）
npm run build    # 本番ビルド（dist/ に出力。PWA の Service Worker もここで生成）
npm run preview  # ビルド結果をローカルで確認
npm run lint     # oxlint による静的チェック
```

PWA（Service Worker）は `npm run dev` では動かない。確認するときは `build` → `preview` を使う。

## ローカルの DB（Supabase）

`npm run dev` は**ローカルの Supabase**（Docker）につなぐ。本番の DB には触らない（理由は [HANDOFF.md](HANDOFF.md) の 24）。
`npm run build`（本番）は今までどおり本番の DB を使う。

```bash
npx supabase start -x logflare,vector  # 起動（Docker Desktop を先に起動しておく。初回はダウンロードで時間がかかる）
npx supabase stop                      # 停止（データは残る）
npx supabase db reset                  # 初期状態に戻す（マイグレーション → supabase/seed.sql のダミーデータ）
npx supabase status                    # URL などの確認
```

- テスト用のユーザー（ローカル専用）：夫役 `otto@example.com`／妻役 `tsuma@example.com`、パスワードはどちらも `password123`
- 管理画面（Studio）：http://127.0.0.1:54323
- **どちらにつながっているかの見分け方**：設定画面のメールアドレスが `@example.com` ならローカル

### 初回の設定（`.env.development.local`、Git には入れない）

`npm run dev` のときだけ読まれ、`.env.local`（本番の接続先）より優先される。

```bash
eval "$(npx supabase status -o env | grep -E '^(API_URL|PUBLISHABLE_KEY)=')"
printf 'VITE_SUPABASE_URL=http://%s.local:54321\nVITE_SUPABASE_PUBLISHABLE_KEY=%s\n' "$(scutil --get LocalHostName)" "$PUBLISHABLE_KEY" > .env.development.local
```

URL を `127.0.0.1` ではなく Mac の名前にしているのは、iPhone（`npm run dev -- --host`）からも同じ設定でつながるようにするため。

### AI 取り込みをローカルで使うとき（任意）

キーを置かなければ、AI 取り込みだけ使えない（ほかは動く）。使うときは、キーを画面に出さずにファイルへ書いてから、Supabase を起動し直す。

```bash
read -rs "KEY?Gemini の API キー: " && printf 'GEMINI_API_KEY=%s\n' "$KEY" > supabase/functions/.env && unset KEY
npx supabase stop && npx supabase start -x logflare,vector
```

`supabase/functions/.env` は Git に入れない（`.gitignore` 済み）。

## 環境

| 環境 | URL | 使いどころ |
|---|---|---|
| ローカル | http://localhost:5173 / iPhone からは http://MacBook-Pro-TK.local:5173 | 実装しながら確認する |
| プレビュー（develop） | https://develop.recipe-dph.pages.dev | PWA としての動作を iPhone で確かめる |
| 本番（main） | https://recipe-dph.pages.dev | 夫婦で実際に使う |

- iPhone からローカルを見るときは `npm run dev -- --host` で起動し、**http://MacBook-Pro-TK.local:5173** を開く（同じ Wi-Fi に接続すること）
  - Mac の名前（Bonjour）で開くので、IP アドレスが変わっても使える。名前は `scutil --get LocalHostName` で確認できる
  - 開けないときは、起動時に表示される `Network:` の URL（IP アドレス）を使う
- develop / main に push すると Cloudflare Pages が自動でデプロイする
- ブランチ運用は develop で実装 → ローカル検証 → main にマージ（詳細は [CLAUDE.md](CLAUDE.md)）

設計方針や経緯は [HANDOFF.md](HANDOFF.md)、作業ルールは [CLAUDE.md](CLAUDE.md) を参照。
