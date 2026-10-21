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
| ローカル | http://localhost:5173 / iPhone からは `http://<Mac の IP>:5173` | 実装しながら確認する |
| プレビュー（develop） | https://develop.recipe-dph.pages.dev | PWA としての動作を iPhone で確かめる |
| 本番（main） | https://recipe-dph.pages.dev | 夫婦で実際に使う |

- iPhone からローカルを見るときは `npm run dev -- --host` で起動し、表示された `Network:` の URL を使う（同じ Wi-Fi に接続すること）
- develop / main に push すると Cloudflare Pages が自動でデプロイする
- ブランチ運用は develop で実装 → ローカル検証 → main にマージ（詳細は [CLAUDE.md](CLAUDE.md)）

設計方針や経緯は [HANDOFF.md](HANDOFF.md)、作業ルールは [CLAUDE.md](CLAUDE.md) を参照。
