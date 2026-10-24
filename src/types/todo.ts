/** 「リクエスト」リストの 1件分（DB の todo_items。名前は「今週作る」だった頃のまま：HANDOFF 22 章） */
export type TodoItem = {
  id         : string;
  recipeId   : string;
  // 作る予定日（YYYY-MM-DD）。無ければ「日付未定」
  plannedOn? : string;
  // 「🙋 食べたい！」した人のユーザー id（シークレットモードの人が押す）。押されていなければ undefined
  requestedBy?: string;
};
