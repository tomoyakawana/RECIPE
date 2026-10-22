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
