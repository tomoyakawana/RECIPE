import { QueryClient } from '@tanstack/react-query';

/**
 * DB から読んだデータの置き場（TanStack Query）
 *
 * 画面は「どのデータが欲しいか（queryKey）」と「どう読むか（queryFn）」を渡すだけで、
 * 読み込み中・エラー・読み直しはここで管理してもらう。
 * ※ ここに置くのは画面表示用のキャッシュ。正はあくまで DB（ローカルストレージには保存しない）
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 読んでから 30 秒は「新しい」とみなし、画面を行き来するたびに読み直さない
      // 30 秒を過ぎていれば、画面を開いたときやアプリに戻ってきたときに読み直す（#23）
      staleTime: 30_000,
      // 読み込みに失敗したら 1 回だけやり直す（電波が一瞬切れた程度なら、これで読める）
      retry: 1,
      // アプリに戻ってきたとき（画面が表示されたとき）に読み直す。既定でも true だが、#23 の要なので明示しておく
      refetchOnWindowFocus: true,
    },
  },
});
