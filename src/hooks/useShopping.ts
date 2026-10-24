import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  addShoppingItem, addTodoIngredients, deleteCheckedItems, deleteShoppingItem,
  fetchSharedNote, fetchShoppingItems, updateChecked, updateSharedNote,
} from '../api/shopping';
import type { ShoppingItem } from '../types/shopping';
import { dbErrorMessage } from '../utils/dbError';
import { useToast } from './useToast';

export const shoppingKeys = {
  items: ['shoppingItems'] as const,
  note : ['sharedNote'] as const,
};

/** 買い物リスト */
export const useShoppingItems = () => useQuery({ queryKey: shoppingKeys.items, queryFn: fetchShoppingItems });

/**
 * 買い物リストを書き換える操作の共通部分（保存が終わったら読み直し、失敗したらトースト）
 * <Vars, Result>：引数と戻り値の型を、渡した関数から受け取る（ジェネリクス）
 */
const useShoppingMutation = <Vars, Result>(mutationFn: (vars: Vars) => Promise<Result>) => {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: shoppingKeys.items }),
    onError  : error => toast.error(dbErrorMessage(error)),
  });
};

export const useAddShoppingItem    = () => useShoppingMutation(addShoppingItem);
export const useRemoveShoppingItem = () => useShoppingMutation(deleteShoppingItem);
export const useClearChecked       = () => useShoppingMutation(deleteCheckedItems);
/** 「🙋 リクエストの材料から追加」。mutate の onSuccess で追加した件数を受け取れる */
export const useAddTodoIngredients = () => useShoppingMutation(addTodoIngredients);

/**
 * 買った／まだ のチェック
 * お店で次々に付けていくので、タップした瞬間に変え（楽観的更新）、失敗したら元に戻す
 */
export const useToggleChecked = () => {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: updateChecked,
    onMutate  : async ({ itemId, checked }) => {
      await queryClient.cancelQueries({ queryKey: shoppingKeys.items });
      const previous = queryClient.getQueryData<ShoppingItem[]>(shoppingKeys.items);
      queryClient.setQueryData<ShoppingItem[]>(shoppingKeys.items, old =>
        old?.map(i => (i.id === itemId ? { ...i, checked } : i)),
      );
      return { previous };
    },
    onError   : (error, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(shoppingKeys.items, context.previous);
      toast.error(dbErrorMessage(error));
    },
    onSettled : () => queryClient.invalidateQueries({ queryKey: shoppingKeys.items }),
  });
};

/** 共有メモの本文 */
export const useSharedNote = () => useQuery({ queryKey: shoppingKeys.note, queryFn: fetchSharedNote });

/**
 * 共有メモの保存
 * 成功したら、読み直さずに保存した本文をそのまま置き場に入れる
 * （読み直しを待つ間に、古い本文が一瞬表示されるのを防ぐ）
 */
export const useSaveSharedNote = () => {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: updateSharedNote,
    onSuccess : (_data, body) => queryClient.setQueryData(shoppingKeys.note, body),
    onError   : error => toast.error(dbErrorMessage(error)),
  });
};
