import type { TodoItem } from '../types/todo';
import { supabase } from '../utils/supabaseClient';

/**
 * リクエスト（todo_items）の読み書き
 * 「作った！」「食べたい！」は複数の書き込みをまとめた DB 関数を呼ぶ
 */

/** リクエストを全部読む（並べ替えは画面側で、予定日ごとに行う） */
export const fetchTodoItems = async (): Promise<TodoItem[]> => {
  const { data, error } = await supabase
    .from('todo_items')
    .select('id, recipe_id, planned_on, requested_by')
    .order('created_at');
  if (error) throw error;
  return data.map(row => ({
    id         : row.id,
    recipeId   : row.recipe_id,
    plannedOn  : row.planned_on ?? undefined,
    requestedBy: row.requested_by ?? undefined,
  }));
};

/** 日付未定で追加する（日付未定の同じ料理がすでにあれば、DB の一意制約で 23505 になる） */
export const addTodoItem = async (recipeId: string): Promise<void> => {
  const { error } = await supabase.from('todo_items').insert({ recipe_id: recipeId });
  if (error) throw error;
};

/** 予定日を変える（undefined で日付未定に戻す）。同じ日に同じ料理があれば 23505 */
export const updatePlannedOn = async (todoId: string, plannedOn: string | undefined): Promise<void> => {
  const { error } = await supabase.from('todo_items').update({ planned_on: plannedOn ?? null }).eq('id', todoId);
  if (error) throw error;
};

/** リクエストから外す */
export const deleteTodoItem = async (todoId: string): Promise<void> => {
  const { error } = await supabase.from('todo_items').delete().eq('id', todoId);
  if (error) throw error;
};

/**
 * 「作った！」：リクエストから外して、作ったご飯（cook_logs）に記録する（DB 関数 mark_cooked）
 * 記録する日付：予定日が今日以前ならその予定日、未来か未定なら今日（日本時間、DB 側で決める）
 */
export const markCooked = async (todoId: string): Promise<void> => {
  const { error } = await supabase.rpc('mark_cooked', { p_todo_id: todoId });
  if (error) throw error;
};

/**
 * 「🙋 食べたい！」（DB 関数 request_recipe）
 * 日付未定の同じ料理があれば、増やさずにその1件に自分の印を付ける。なければ印付きで追加する
 */
export const requestRecipe = async (recipeId: string): Promise<void> => {
  const { error } = await supabase.rpc('request_recipe', { p_recipe_id: recipeId });
  if (error) throw error;
};
