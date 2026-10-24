/**
 * DB（Supabase）のエラーを、画面に出す日本語に変える
 *
 * 保存の失敗はトースト（toast.error）、読み込みの失敗は LoadError に、この文言を出す。
 * 画面ごとに言い方を変えたいときは、code を見て個別に書く（例：重複のときだけ「同じ日にもう入っています」）
 */

// Supabase（PostgREST）が返すエラーの形のうち、使うところだけ
type DbError = { code?: string; message?: string };

export const dbErrorMessage = (error: unknown): string => {
  // unknown のままでは中を見られないので、「この形のはず」と型を当てはめる（as：型アサーション）
  const { code, message = '' } = (error ?? {}) as DbError;

  // 電波がない・サーバーに届かない（fetch 自体の失敗）
  if (message.includes('Failed to fetch') || message.includes('Load failed')) {
    return '通信できませんでした。電波のよいところでもう一度お試しください';
  }

  switch (code) {
    // 一意制約（同じ日に同じ料理、など）
    case '23505': return 'すでに入っています';
    // 外部キー（履歴があるレシピを消そうとした、など）
    case '23503': return 'ほかのデータから使われているため、変更できません';
    // 権限がない（RLS・GRANT）。ログインが切れたときもここに来る
    case '42501': return '権限がありません。ログインし直してください';
    // DB 関数の raise exception。今ある2つはどちらも「見つからない」（文言には id が入るので、そのままは出さない）
    case 'P0001': return '見つかりませんでした。ほかの人が先に変更したかもしれません';
    // ログインの期限切れ（JWT が古い）
    case 'PGRST301':
    case 'PGRST303': return 'ログインの期限が切れました。ログインし直してください';
    default     : return 'うまくいきませんでした。時間をおいてもう一度お試しください';
  }
};
