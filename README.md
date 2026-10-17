# レシピ

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

設計方針や経緯は [HANDOFF.md](HANDOFF.md)、作業ルールは [CLAUDE.md](CLAUDE.md) を参照。
