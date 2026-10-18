import { createContext } from 'react';
import type { HistoryEntry } from '../types/history';
import type { Recipe, RecipeInput } from '../types/recipe';
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
  // レシピの内容を書き換える（お気に入りはそのまま）
  updateRecipe  : (recipeId: string, input: RecipeInput) => void;
};

// Provider の外で使われたら null になる（useMockStore でチェックする）
export const MockStoreContext = createContext<MockStore | null>(null);
