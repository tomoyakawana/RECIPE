import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { MOCK_HISTORY } from '../mocks/history';
import { MOCK_RECIPES } from '../mocks/recipes';
import type { Recipe, RecipeInput } from '../types/recipe';
import { MockStoreContext, type MockStore } from './mockStore';

// モック用の簡易採番（DB につないだら DB 側で採番する）
let _nextId = 0;
const newId = (prefix: string) => `${prefix}-new-${++_nextId}`;

/**
 * モックのデータをメモリ上に持つ Provider
 * ※ リロードすると初期データに戻る。保存はしない（サーバーを正にする方針のため、ローカル保存はしない）
 */
export const MockStoreProvider = ({ children }: { children: ReactNode }) => {
  // useState<Recipe[]> の <> は「この state に入るものの型」の指定
  const [recipes, setRecipes] = useState<Recipe[]>(MOCK_RECIPES);
  const [history] = useState(MOCK_HISTORY);   // 初期値から型が推論されるので、<> は省略できる
  const [secretMode, setSecretMode] = useState(false);

  const toggleFavorite = useCallback((recipeId: string) => {
    setRecipes(prev => prev.map(r => (r.id === recipeId ? { ...r, isFavorite: !r.isFavorite } : r)));
  }, []);

  const addRecipe = useCallback((input: RecipeInput) => {
    const id = newId('r');
    setRecipes(prev => [{ ...input, id, isFavorite: false }, ...prev]);
    return id;
  }, []);

  const updateRecipe = useCallback((recipeId: string, input: RecipeInput) => {
    // id・isFavorite・note は元のまま、それ以外をフォームの内容で上書き
    setRecipes(prev => prev.map(r => (r.id === recipeId ? { ...input, id: r.id, isFavorite: r.isFavorite, note: r.note } : r)));
  }, []);

  const setRecipeNote = useCallback((recipeId: string, note: string) => {
    setRecipes(prev => prev.map(r => (r.id === recipeId ? { ...r, note: note.trim() || undefined } : r)));
  }, []);

  const value: MockStore = useMemo(
    () => ({
      recipes, history, secretMode,
      toggleFavorite, addRecipe, updateRecipe, setRecipeNote, setSecretMode,
    }),
    [
      recipes, history, secretMode,
      toggleFavorite, addRecipe, updateRecipe, setRecipeNote, setSecretMode,
    ],
  );

  return <MockStoreContext.Provider value={value}>{children}</MockStoreContext.Provider>;
};
