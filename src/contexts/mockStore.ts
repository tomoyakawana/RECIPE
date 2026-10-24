import { createContext } from 'react';
import type { Recipe, RecipeInput } from '../types/recipe';

/**
 * モック用のデータ置き場の「形」
 *
 * 画面のボタンを押したら何が起きるか（＝DB に対する操作）をここに並べている。
 * Supabase につなぐときは、この関数たちの中身を API 呼び出しに差し替える。
 */
export type MockStore = {
  recipes : Recipe[];
  // シークレットモード（オンのとき「リクエスト」を表示しない。予定を見ないためのモード）
  // ※ 本来はユーザーごとの設定として DB に保存する。モックの間はメモリ上だけ（リロードでオフに戻る）
  secretMode: boolean;
  // お気に入りの ON/OFF
  toggleFavorite: (recipeId: string) => void;
  // レシピを追加して、採番した id を返す
  addRecipe     : (input: RecipeInput) => string;
  // レシピの内容を書き換える（お気に入りとひとことメモはそのまま）
  updateRecipe  : (recipeId: string, input: RecipeInput) => void;
  // ひとことメモを書き換える（空文字なら消す）
  setRecipeNote : (recipeId: string, note: string) => void;
  setSecretMode : (on: boolean) => void;
};

// Provider の外で使われたら null になる（useMockStore でチェックする）
export const MockStoreContext = createContext<MockStore | null>(null);
