import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { MOCK_HISTORY } from '../mocks/history';
import { MOCK_RECIPES } from '../mocks/recipes';
import { MOCK_NOTE, MOCK_SHOPPING } from '../mocks/shopping';
import { MOCK_TODO } from '../mocks/todo';
import type { Recipe, RecipeInput } from '../types/recipe';
import type { ShoppingItem } from '../types/shopping';
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
  const [shopping, setShopping] = useState<ShoppingItem[]>(MOCK_SHOPPING);
  const [note,     setNote]     = useState(MOCK_NOTE);
  const [secretMode, setSecretMode] = useState(false);

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
    // id・isFavorite・note は元のまま、それ以外をフォームの内容で上書き
    setRecipes(prev => prev.map(r => (r.id === recipeId ? { ...input, id: r.id, isFavorite: r.isFavorite, note: r.note } : r)));
  }, []);

  const setRecipeNote = useCallback((recipeId: string, note: string) => {
    setRecipes(prev => prev.map(r => (r.id === recipeId ? { ...r, note: note.trim() || undefined } : r)));
  }, []);

  // ---- 買い物・メモ ----
  const addShoppingItem = useCallback((name: string, amount?: string) => {
    setShopping(prev => [...prev, { id: newId('s'), name, amount, checked: false }]);
  }, []);

  const toggleShoppingItem = useCallback((itemId: string) => {
    setShopping(prev => prev.map(i => (i.id === itemId ? { ...i, checked: !i.checked } : i)));
  }, []);

  const removeShoppingItem = useCallback((itemId: string) => {
    setShopping(prev => prev.filter(i => i.id !== itemId));
  }, []);

  const clearCheckedShopping = useCallback(() => {
    setShopping(prev => prev.filter(i => !i.checked));
  }, []);

  const addTodoIngredients = useCallback(() => {
    // 今週作るのレシピ（同じレシピが複数の日に入っていても1回分として扱う）
    const recipeIds = [...new Set(todo.map(t => t.recipeId))];
    const additions: ShoppingItem[] = [];
    for (const recipeId of recipeIds) {
      const recipe = recipes.find(r => r.id === recipeId);
      if (!recipe) continue;
      for (const ing of recipe.ingredients) {
        const exists = shopping.some(i => !i.checked && i.recipeId === recipeId && i.name === ing.name);
        if (!exists) additions.push({ id: newId('s'), name: ing.name, amount: ing.amount || undefined, checked: false, recipeId });
      }
    }
    if (additions.length > 0) setShopping(prev => [...prev, ...additions]);
    return additions.length;
  }, [todo, recipes, shopping]);

  const value: MockStore = useMemo(
    () => ({
      recipes, todo, history, shopping, note, secretMode,
      toggleFavorite, addToTodo, removeFromTodo, setPlannedOn, markCooked, addRecipe, updateRecipe, setRecipeNote,
      addShoppingItem, toggleShoppingItem, removeShoppingItem, clearCheckedShopping, addTodoIngredients, setNote, setSecretMode,
    }),
    [
      recipes, todo, history, shopping, note, secretMode,
      toggleFavorite, addToTodo, removeFromTodo, setPlannedOn, markCooked, addRecipe, updateRecipe, setRecipeNote,
      addShoppingItem, toggleShoppingItem, removeShoppingItem, clearCheckedShopping, addTodoIngredients, setNote, setSecretMode,
    ],
  );

  return <MockStoreContext.Provider value={value}>{children}</MockStoreContext.Provider>;
};
