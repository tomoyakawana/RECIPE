/** 買い物リストの 1品 */
export type ShoppingItem = {
  id       : string;
  name     : string;
  amount?  : string;
  // 買ったらチェック
  checked  : boolean;
  // 「リクエストの材料から追加」で入ったときの、元のレシピ（手入力なら無し）
  recipeId?: string;
};
