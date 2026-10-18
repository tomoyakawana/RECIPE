import { createContext } from 'react';
import type { HistoryEntry } from '../types/history';
import type { Recipe, RecipeInput } from '../types/recipe';
import type { ShoppingItem } from '../types/shopping';
import type { TodoItem } from '../types/todo';

/**
 * モック用のデータ置き場の「形」
 *
 * 画面のボタンを押したら何が起きるか（＝DB に対する操作）をここに並べている。
 * Supabase につなぐときは、この関数たちの中身を API 呼び出しに差し替える。
 */
export type MockStore = {
  recipes : Recipe[];
  todo    : TodoItem[];
  history : HistoryEntry[];
  shopping: ShoppingItem[];
  // 夫婦で共有するメモ（1枚）
  note    : string;
  // お気に入りの ON/OFF
  toggleFavorite: (recipeId: string) => void;
  // 「今週作る」に日付未定で追加（同じレシピの日付未定がすでにあれば何もしない）
  addToTodo     : (recipeId: string) => void;
  removeFromTodo: (todoId: string) => void;
  // 予定日を設定・変更する（undefined で日付未定に戻す）
  // 同じレシピが同じ日にすでに入っていたら変更しない（false を返す）
  setPlannedOn  : (todoId: string, plannedOn: string | undefined) => boolean;
  // 「作った！」→ 今週作るから外して、履歴に追加
  // 記録する日付：予定日が今日以前ならその予定日、未来か未定なら今日
  markCooked    : (todoId: string) => void;
  // レシピを追加して、採番した id を返す
  addRecipe     : (input: RecipeInput) => string;
  // レシピの内容を書き換える（お気に入りとひとことメモはそのまま）
  updateRecipe  : (recipeId: string, input: RecipeInput) => void;
  // ひとことメモを書き換える（空文字なら消す）
  setRecipeNote : (recipeId: string, note: string) => void;

  // ---- 買い物・メモ ----
  addShoppingItem     : (name: string, amount?: string) => void;
  toggleShoppingItem  : (itemId: string) => void;
  removeShoppingItem  : (itemId: string) => void;
  // チェック済み（買ったもの）をまとめて消す
  clearCheckedShopping: () => void;
  // 今週作るに入っているレシピの材料を、買い物リストに追加する。追加した件数を返す
  // 同じレシピの同じ材料が、まだ買っていない状態で入っていれば重ねて入れない
  addTodoIngredients  : () => number;
  setNote             : (note: string) => void;
};

// Provider の外で使われたら null になる（useMockStore でチェックする）
export const MockStoreContext = createContext<MockStore | null>(null);
