import type { HistoryEntry } from '../types/history';
import { supabase } from '../utils/supabaseClient';

/**
 * 作ったご飯（cook_logs）の読み込み
 * 書き込みは「作った！」（api/todo.ts の markCooked）で行う
 */

/**
 * 履歴を新しい順に読む。レシピの名前・タグも結合して一緒に読む
 * （レシピ一覧のデータは論理削除したものを含まないので、そこから探すと削除したレシピの名前が出せないため）
 */
export const fetchHistory = async (): Promise<HistoryEntry[]> => {
  const { data, error } = await supabase
    .from('cook_logs')
    .select('id, recipe_id, cooked_on, memo, recipes ( title, tags, deleted_at, image_path )')
    // 同じ日に2回作ったときは、後から記録した方を上に
    .order('cooked_on', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data.map(row => ({
    id      : row.id,
    recipeId: row.recipe_id,
    cookedOn: row.cooked_on,
    memo    : row.memo ?? undefined,
    // recipe_id は必須の外部キーなので、結合したレシピは必ず1件ある（配列ではなく1件で返ってくる）
    recipe  : {
      title  : row.recipes.title,
      tags   : row.recipes.tags,
      deleted: row.recipes.deleted_at !== null,
      imagePath: row.recipes.image_path ?? undefined,
    },
  }));
};
