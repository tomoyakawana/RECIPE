/** 「リクエスト」（今週作る）リストの 1件分 */
export type TodoItem = {
  id        : string;
  recipeId  : string;
  // リストに追加した日（YYYY-MM-DD）
  addedOn   : string;
  // 作る予定日（YYYY-MM-DD）。無ければ「日付未定」
  plannedOn?: string;
  // シークレットモードの人が「🙋 食べたい！」で入れた（リクエストした）もの
  requested?: boolean;
};
