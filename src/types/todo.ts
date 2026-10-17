/** 「今週作る」リストの 1件分 */
export type TodoItem = {
  id      : string;
  recipeId: string;
  // リストに追加した日（YYYY-MM-DD）
  addedOn : string;
};
