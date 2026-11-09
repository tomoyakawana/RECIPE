/** 材料 1行分（例：豚ロース 300g） */
export type Ingredient = {
  name  : string;
  amount: string;
};

/**
 * レシピ 1件分の形
 *
 * 画面で使う形（camelCase）。DB の行（snake_case）からの変換は src/api/recipes.ts で行う。
 * もともとはモックの段階で画面から逆算した形で、DB のテーブル設計の下書きにも使った。
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
  // 写真のパス（Storage の recipe-images バケットの中。詳細用 1200px のもの）。写真がなければ undefined
  imagePath?  : string;
};

/**
 * 追加・編集フォームから渡す内容
 * `Omit<Recipe, 'id' | 'isFavorite' | 'note'>` は「Recipe から id・isFavorite・note を除いた型」。
 * id は保存時に採番し、お気に入りとひとことメモは詳細画面で直接変えるので、フォームでは扱わない。
 */
export type RecipeInput = Omit<Recipe, 'id' | 'isFavorite' | 'note'>;
