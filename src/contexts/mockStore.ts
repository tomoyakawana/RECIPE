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
  // 「今週作る」に追加（すでに入っていたら何もしない）
  addToTodo     : (recipeId: string) => void;
  removeFromTodo: (todoId: string) => void;
  // 「作った！」→ 今週作るから外して、履歴に今日の日付で追加
  markCooked    : (todoId: string) => void;
  // レシピを追加して、採番した id を返す
  addRecipe     : (input: RecipeInput) => string;
  // レシピの内容を書き換える（お気に入りはそのまま）
  updateRecipe  : (recipeId: string, input: RecipeInput) => void;
};

// Provider の外で使われたら null になる（useMockStore でチェックする）
export const MockStoreContext = createContext<MockStore | null>(null);
