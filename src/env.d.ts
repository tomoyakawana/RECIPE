/**
 * .env.local の環境変数の型
 * `import.meta.env.VITE_xxx` で読むと、ここに書いた名前と型で補完・チェックが効く
 * （VITE_ で始まるものだけがブラウザ側のコードに渡される）
 */
interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL            : string;
  readonly VITE_SUPABASE_PUBLISHABLE_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

/** アプリのバージョン（package.json の version。vite.config.ts の define でビルド時に埋め込む） */
declare const __APP_VERSION__: string;
