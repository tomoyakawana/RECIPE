/** 材料 1行分（例：豚ロース 300g） */
export type Ingredient = {
  name  : string;
  amount: string;
};

/**
 * レシピ 1件分の形
 *
 * モックの段階なので、画面に必要な項目から逆算して置いている。
 * DB（Supabase）を作るときは、この型をテーブル設計の下書きとして使う。
 */
export type Recipe = {
  id          : string;
  title       : string;
  // 調理時間（分）。わからないこともあるので任意
  cookMinutes?: number;
  servings?   : number;
  // `Ingredient[]` は「Ingredient の配列」
  ingredients : Ingredient[];
  // 手順。1要素 = 1ステップ
  steps       : string[];
  tags        : string[];
  isFavorite  : boolean;
  // 参考にしたサイトや本など
  sourceUrl?  : string;
};
