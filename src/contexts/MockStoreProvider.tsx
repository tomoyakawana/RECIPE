import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { MOCK_HISTORY } from '../mocks/history';
import { MOCK_RECIPES } from '../mocks/recipes';
import { MOCK_TODO } from '../mocks/todo';
import type { Recipe } from '../types/recipe';
import { todayYmd } from '../utils/date';
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
  const [todo,    setTodo]    = useState(MOCK_TODO);    // 初期値から型が推論されるので省略可
  const [history, setHistory] = useState(MOCK_HISTORY);

  const toggleFavorite = useCallback((recipeId: string) => {
    setRecipes(prev => prev.map(r => (r.id === recipeId ? { ...r, isFavorite: !r.isFavorite } : r)));
  }, []);

  const addToTodo = useCallback((recipeId: string) => {
    setTodo(prev =>
      prev.some(t => t.recipeId === recipeId)
        ? prev
        : [...prev, { id: newId('t'), recipeId, addedOn: todayYmd() }],
    );
  }, []);

  const removeFromTodo = useCallback((todoId: string) => {
    setTodo(prev => prev.filter(t => t.id !== todoId));
  }, []);

  const markCooked = useCallback((todoId: string) => {
    const item = todo.find(t => t.id === todoId);
    if (!item) return;
    setTodo(prev => prev.filter(t => t.id !== todoId));
    setHistory(prev => [{ id: newId('h'), recipeId: item.recipeId, cookedOn: todayYmd() }, ...prev]);
  }, [todo]);

  const addRecipe = useCallback((recipe: Omit<Recipe, 'id'>) => {
    const id = newId('r');
    setRecipes(prev => [{ ...recipe, id }, ...prev]);
    return id;
  }, []);

  const value: MockStore = useMemo(
    () => ({ recipes, todo, history, toggleFavorite, addToTodo, removeFromTodo, markCooked, addRecipe }),
    [recipes, todo, history, toggleFavorite, addToTodo, removeFromTodo, markCooked, addRecipe],
  );

  return <MockStoreContext.Provider value={value}>{children}</MockStoreContext.Provider>;
};
