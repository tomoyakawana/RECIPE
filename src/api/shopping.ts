import type { ShoppingItem } from '../types/shopping';
import { supabase } from '../utils/supabaseClient';

/**
 * メモ画面の読み書き（買い物リスト shopping_items と、共有メモ shared_notes）
 */

/** 買い物リストを追加した順に読む */
export const fetchShoppingItems = async (): Promise<ShoppingItem[]> => {
  const { data, error } = await supabase
    .from('shopping_items')
    .select('id, name, amount, is_checked, recipe_id')
    .order('created_at');
  if (error) throw error;
  return data.map(row => ({
    id      : row.id,
    name    : row.name,
    amount  : row.amount ?? undefined,
    checked : row.is_checked,
    recipeId: row.recipe_id ?? undefined,
  }));
};

/** 手入力で1品追加する */
export const addShoppingItem = async ({ name, amount }: { name: string; amount?: string }): Promise<void> => {
  const { error } = await supabase.from('shopping_items').insert({ name, amount: amount ?? null });
  if (error) throw error;
};

/** 買った／まだ のチェックを付け外しする */
export const updateChecked = async ({ itemId, checked }: { itemId: string; checked: boolean }): Promise<void> => {
  const { error } = await supabase.from('shopping_items').update({ is_checked: checked }).eq('id', itemId);
  if (error) throw error;
};

/** 1品消す */
export const deleteShoppingItem = async (itemId: string): Promise<void> => {
  const { error } = await supabase.from('shopping_items').delete().eq('id', itemId);
  if (error) throw error;
};

/** チェック済み（買ったもの）をまとめて消す */
export const deleteCheckedItems = async (): Promise<void> => {
  const { error } = await supabase.from('shopping_items').delete().eq('is_checked', true);
  if (error) throw error;
};

/**
 * リクエストに入っている料理の材料を、買い物リストに追加する（DB 関数 add_todo_ingredients_to_shopping）
 * まだ買っていない同じもの（同じ料理の同じ材料）は重ねない。追加した件数を返す
 */
export const addTodoIngredients = async (): Promise<number> => {
  const { data, error } = await supabase.rpc('add_todo_ingredients_to_shopping');
  if (error) throw error;
  return data;
};

/** 共有メモ（1行だけ、id = 1）の本文を読む */
export const fetchSharedNote = async (): Promise<string> => {
  const { data, error } = await supabase.from('shared_notes').select('body').eq('id', 1).single();
  if (error) throw error;
  return data.body;
};

/** 共有メモの本文を書き換える */
export const updateSharedNote = async (body: string): Promise<void> => {
  const { error } = await supabase.from('shared_notes').update({ body }).eq('id', 1);
  if (error) throw error;
};
