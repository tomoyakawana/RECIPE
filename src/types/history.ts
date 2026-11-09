/**
 * 作ったご飯の履歴 1件分の形
 *
 * `type` は「このデータはこういう形をしている」という宣言。
 * 実行時には消えて、書いている最中のチェックにだけ使われる（JS の出力には残らない）。
 */
export type HistoryEntry = {
  id      : string;
  // どのレシピを作ったか（Recipe の id を指す。DB でいう外部キー）
  recipeId: string;
  // 作った日（'2026-10-16' のような YYYY-MM-DD 形式の文字列）
  cookedOn: string;
  // `?` 付きは「無くてもよい」項目。中身は string か undefined のどちらか
  memo?   : string;
  // 作ったレシピの名前とタグ（履歴と一緒に読む。レシピが論理削除されていても名前は出せる）
  recipe  : {
    title  : string;
    tags   : string[];
    // 論理削除されたレシピなら true（詳細画面には飛べない）
    deleted: boolean;
    // 写真のパス（詳細用）。写真がなければ undefined
    imagePath?: string;
  };
};
