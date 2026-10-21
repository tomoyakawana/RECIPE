import { createClient } from '@supabase/supabase-js';

/**
 * Supabase への唯一の窓口（SSAM の apiClient と同じ考え方）
 * 他のファイルは、ここで作った supabase を import して使う。
 *
 * URL と公開用キー（publishable key）は、ローカルでは .env.local、
 * 本番・プレビューでは Cloudflare Pages の環境変数から読む。
 * どちらもブラウザに渡る前提のもので、秘密のキーではない（守りは RLS と GRANT が担う）。
 */
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!url || !key) {
  // 設定漏れに早く気づけるよう、黙って動かさずに止める
  throw new Error('Supabase の接続情報がありません。.env.local（本番は Cloudflare の環境変数）を確認してください');
}

export const supabase = createClient(url, key);
