/**
 * 作ったご飯の履歴 1件分の形
 *
 * `type` は「このデータはこういう形をしている」という宣言。
 * 実行時には消えて、書いている最中のチェックにだけ使われる（JS の出力には残らない）。
 */
export type HistoryEntry = {
  id        : string;
  recipeName: string;
  // 作った日（'2026-10-17' のような YYYY-MM-DD 形式の文字列）
  cookedOn  : string;
  // `?` 付きは「無くてもよい」項目。中身は string か undefined のどちらか
  memo?     : string;
};
