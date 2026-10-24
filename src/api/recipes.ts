import type { QueryData } from '@supabase/supabase-js';
import type { Recipe } from '../types/recipe';
import { supabase } from '../utils/supabaseClient';

/**
 * レシピの読み書き（DB とのやりとりは、画面からではなくここに集める）
 *
 * DB の列名は snake_case（cook_minutes）、画面の型は camelCase（cookMinutes）。
 * その変換もここでやるので、画面は Recipe 型のまま使える。
 */

// レシピ本体に、材料と手順をぶら下げて1回で読む（外部キーをたどって結合してくれる、PostgREST の書き方）
const RECIPE_COLUMNS = `
  id, title, cook_minutes, servings, tags, is_favorite, source_url, note,
  recipe_ingredients ( position, name, amount ),
  recipe_steps ( position, body )
`;

// 全レシピを新しい順に（論理削除したものは出さない）
const recipesQuery = () =>
  supabase
    .from('recipes')
    .select(RECIPE_COLUMNS)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

// recipesQuery が返す1行の型。select の文字列から Supabase が推論した型を取り出している
// QueryData<…> は結果の配列の型、[number] は「その配列の1要素の型」
type RecipeRow = QueryData<ReturnType<typeof recipesQuery>>[number];

/** 全レシピを読む */
export const fetchRecipes = async (): Promise<Recipe[]> => {
  const { data, error } = await recipesQuery();
  // エラーは投げる。TanStack Query が受け取って、画面の error に入れてくれる
  if (error) throw error;
  return data.map(toRecipe);
};

/** DB の1行 → 画面の Recipe 型 */
const toRecipe = (row: RecipeRow): Recipe => ({
  id         : row.id,
  title      : row.title,
  // DB の null は、画面では「値なし（undefined）」として扱う
  cookMinutes: row.cook_minutes ?? undefined,
  servings   : row.servings ?? undefined,
  // 材料・手順は表示順（position）に並べ直す（結合した側の並び順は保証されないため）
  ingredients: [...row.recipe_ingredients]
    .sort((a, b) => a.position - b.position)
    .map(i => ({ name: i.name, amount: i.amount })),
  steps      : [...row.recipe_steps]
    .sort((a, b) => a.position - b.position)
    .map(s => s.body),
  tags       : row.tags,
  isFavorite : row.is_favorite,
  sourceUrl  : row.source_url ?? undefined,
  note       : row.note ?? undefined,
});

/** お気に入りの ON/OFF（夫婦共通） */
export const updateFavorite = async (recipeId: string, isFavorite: boolean): Promise<void> => {
  const { error } = await supabase.from('recipes').update({ is_favorite: isFavorite }).eq('id', recipeId);
  if (error) throw error;
};

/** ひとことメモを書き換える（空なら消す） */
export const updateNote = async (recipeId: string, note: string): Promise<void> => {
  const { error } = await supabase.from('recipes').update({ note: note.trim() || null }).eq('id', recipeId);
  if (error) throw error;
};

/** そのレシピを作った日（新しい順）。詳細画面の「作った回数・最後に作った日」に使う */
export const fetchCookedDates = async (recipeId: string): Promise<string[]> => {
  const { data, error } = await supabase
    .from('cook_logs')
    .select('cooked_on')
    .eq('recipe_id', recipeId)
    .order('cooked_on', { ascending: false });
  if (error) throw error;
  return data.map(l => l.cooked_on);
};
