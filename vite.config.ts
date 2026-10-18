import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// https://vite.dev/config/
export default defineConfig({
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
});
