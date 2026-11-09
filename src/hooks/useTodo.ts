import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { addTodoItem, deleteTodoItem, fetchTodoItems, markCooked, requestRecipe, updatePlannedOn } from '../api/todo';
import { dbErrorMessage } from '../utils/dbError';
import { historyKeys } from './useHistory';
import { recipeKeys } from './useRecipes';
import { useToast } from './useToast';

export const todoKeys = {
  all: ['todoItems'] as const,
};

/** リクエストの一覧（リクエスト画面・レシピ一覧・詳細で共有する） */
export const useTodoItems = () => useQuery({ queryKey: todoKeys.all, queryFn: fetchTodoItems });

/**
 * リクエストを書き換える操作の共通部分
 * 保存が終わったら一覧を読み直し、失敗したらトーストで知らせる
 */
// Result は保存の結果の型（追加した行の id など）。何も返さない操作は void のまま
const useTodoMutation = <Vars, Result = void>(mutationFn: (vars: Vars) => Promise<Result>) => {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: todoKeys.all }),
    onError  : error => toast.error(dbErrorMessage(error)),
  });
};

/** リクエストに追加（plannedOn を省くと日付未定） */
export const useAddTodo = () => useTodoMutation(
  ({ recipeId, plannedOn }: { recipeId: string; plannedOn: string | undefined }) => addTodoItem(recipeId, plannedOn)
);

/** 「🙋 食べたい！」 */
export const useRequestRecipe = () => useTodoMutation(requestRecipe);

/** ✕ でリクエストから外す */
export const useRemoveTodo = () => useTodoMutation(deleteTodoItem);

/**
 * 予定日の変更
 * 同じ日に同じ料理があるとき（23505）は、トーストではなく画面の中で知らせたいので、
 * エラーの扱いは呼び出す側（リクエスト画面）に任せる
 */
export const useSetPlannedOn = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ todoId, plannedOn }: { todoId: string; plannedOn: string | undefined }) => updatePlannedOn(todoId, plannedOn),
    onSuccess : () => queryClient.invalidateQueries({ queryKey: todoKeys.all }),
  });
};

/** 「作った！」：リクエストから外れ、作った回数・作ったご飯も変わるので、まとめて読み直す */
export const useMarkCooked = () => {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: markCooked,
    // Promise.all：読み直しを同時に始めて、全部終わるまで待つ
    onSuccess : () => Promise.all([
      queryClient.invalidateQueries({ queryKey: todoKeys.all }),
      // ['cookedDates'] で始まる名札を全部（どのレシピの分も）読み直す
      queryClient.invalidateQueries({ queryKey: recipeKeys.cookedDatesAll }),
      queryClient.invalidateQueries({ queryKey: historyKeys.all }),
    ]),
    onError   : error => toast.error(dbErrorMessage(error)),
  });
};
