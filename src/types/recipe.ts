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
  // ひとことメモ（「玉ねぎ多めが好き」など、作るときのコツや好み）。夫婦で共通
  note?       : string;
};

/**
 * 追加・編集フォームから渡す内容
 * `Omit<Recipe, 'id' | 'isFavorite' | 'note'>` は「Recipe から id・isFavorite・note を除いた型」。
 * id は保存時に採番し、お気に入りとひとことメモは詳細画面で直接変えるので、フォームでは扱わない。
 */
export type RecipeInput = Omit<Recipe, 'id' | 'isFavorite' | 'note'>;
