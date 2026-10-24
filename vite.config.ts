import { readFileSync } from 'node:fs';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// package.json の version（例：1.0.0）
const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8')) as { version: string };

// https://vite.dev/config/
export default defineConfig({
  // ビルドのときに、アプリのコードの __APP_VERSION__ を package.json のバージョンに置き換える
  // （バージョンを書くのは package.json の1か所だけにする。上げるのは本番に出すとき：HANDOFF 23 章）
  define: {
    __APP_VERSION__: JSON.stringify(version),
  },
  plugins: [
    react(),
    // Tailwind CSS v4（設定ファイル不要。index.css の @import で読み込む）
    tailwindcss(),
    VitePWA({
      // 新しいバージョンをデプロイしたら Service Worker を自動で更新する
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'なに食べたい？',
        short_name: 'なに食べたい？',
        description: '夫婦で共有する料理レシピアプリ',
        lang: 'ja',
        start_url: '/',
        // URLバーを消してネイティブアプリのように表示する
        display: 'standalone',
        background_color: '#fdf8ec',
        theme_color: '#e8743b',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
  server: {
    // iPhone から Mac の名前（例：MacBook-Pro-TK.local）で開けるようにする。
    // IP アドレスは DHCP で変わるが、.local の名前（Bonjour）は変わらない。
    // Vite は DNS リバインディング対策で、localhost と IP 以外のホスト名を既定で断るため、家の中だけで使う .local だけを許可する。
    // ※ 開発サーバー（npm run dev）だけの設定。本番・プレビューには影響しない
    allowedHosts: ['.local'],
  },
});
