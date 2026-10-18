import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { MOCK_HISTORY } from '../mocks/history';
import { MOCK_RECIPES } from '../mocks/recipes';
import { MOCK_TODO } from '../mocks/todo';
import type { Recipe, RecipeInput } from '../types/recipe';
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
      // 同じレシピの「日付未定」がすでにあれば増やさない（日付が決まっているものは別扱い）
      prev.some(t => t.recipeId === recipeId && !t.plannedOn)
        ? prev
        : [...prev, { id: newId('t'), recipeId, addedOn: todayYmd() }],
    );
  }, []);

  const removeFromTodo = useCallback((todoId: string) => {
    setTodo(prev => prev.filter(t => t.id !== todoId));
  }, []);

  const setPlannedOn = useCallback((todoId: string, plannedOn: string | undefined) => {
    const item = todo.find(t => t.id === todoId);
    if (!item) return false;
    // 同じレシピ・同じ日付（未定同士も含む）がほかにあれば重複になるので変更しない（DB の unique と同じルール）
    const duplicated = todo.some(t => t.id !== todoId && t.recipeId === item.recipeId && t.plannedOn === plannedOn);
    if (duplicated) return false;
    setTodo(prev => prev.map(t => (t.id === todoId ? { ...t, plannedOn } : t)));
    return true;
  }, [todo]);

  const markCooked = useCallback((todoId: string) => {
    const item = todo.find(t => t.id === todoId);
    if (!item) return;
    const today = todayYmd();
    // 予定日が今日以前ならその日に作ったとみなす（押し忘れ対策）。未来・未定なら今日
    const cookedOn = item.plannedOn && item.plannedOn <= today ? item.plannedOn : today;
    setTodo(prev => prev.filter(t => t.id !== todoId));
    setHistory(prev => [{ id: newId('h'), recipeId: item.recipeId, cookedOn }, ...prev]);
  }, [todo]);

  const addRecipe = useCallback((input: RecipeInput) => {
    const id = newId('r');
    setRecipes(prev => [{ ...input, id, isFavorite: false }, ...prev]);
    return id;
  }, []);

  const updateRecipe = useCallback((recipeId: string, input: RecipeInput) => {
    // id と isFavorite は元のまま、それ以外をフォームの内容で上書き
    setRecipes(prev => prev.map(r => (r.id === recipeId ? { ...input, id: r.id, isFavorite: r.isFavorite } : r)));
  }, []);

  const value: MockStore = useMemo(
    () => ({ recipes, todo, history, toggleFavorite, addToTodo, removeFromTodo, setPlannedOn, markCooked, addRecipe, updateRecipe }),
    [recipes, todo, history, toggleFavorite, addToTodo, removeFromTodo, setPlannedOn, markCooked, addRecipe, updateRecipe],
  );

  return <MockStoreContext.Provider value={value}>{children}</MockStoreContext.Provider>;
};
