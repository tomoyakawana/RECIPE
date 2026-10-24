import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchCookedDates, fetchRecipes, saveRecipe, updateFavorite, updateNote } from '../api/recipes';
import type { Recipe, RecipeInput } from '../types/recipe';
import { dbErrorMessage } from '../utils/dbError';
import { useToast } from './useToast';

/**
 * データの「名札」（queryKey）。同じ名札のデータは、画面をまたいで使い回される
 * as const：配列の中身を文字列ではなく、この値そのものの型にする（打ち間違いを防ぐ）
 */
export const recipeKeys = {
  all       : ['recipes'] as const,
  cookedDates: (recipeId: string) => ['cookedDates', recipeId] as const,
};

/** 全レシピ（一覧・詳細で共有する） */
export const useRecipes = () => useQuery({ queryKey: recipeKeys.all, queryFn: fetchRecipes });

/**
 * 1件のレシピ。一覧と同じデータから取り出すので、一覧から開いたときは読み込みを待たない
 * select：読んだデータを、この画面で使う形に絞る
 */
export const useRecipe = (recipeId: string | undefined) =>
  useQuery({
    queryKey: recipeKeys.all,
    queryFn : fetchRecipes,
    select  : recipes => recipes.find(r => r.id === recipeId),
  });

/** そのレシピを作った日（新しい順） */
export const useCookedDates = (recipeId: string | undefined) =>
  useQuery({
    queryKey: recipeKeys.cookedDates(recipeId ?? ''),
    queryFn : () => fetchCookedDates(recipeId!),
    // id がないとき（URL がおかしいとき）は読みに行かない
    enabled : !!recipeId,
  });

/**
 * お気に入りの切り替え
 * ★はタップした瞬間に変え（楽観的更新）、保存に失敗したら元に戻す
 */
export const useToggleFavorite = () => {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: ({ recipeId, isFavorite }: { recipeId: string; isFavorite: boolean }) => updateFavorite(recipeId, isFavorite),

    // 保存の前：画面のデータを先に書き換える
    onMutate: async ({ recipeId, isFavorite }) => {
      // 読み直しの途中なら止める（古いデータで上書きされないように）
      await queryClient.cancelQueries({ queryKey: recipeKeys.all });
      const previous = queryClient.getQueryData<Recipe[]>(recipeKeys.all);
      queryClient.setQueryData<Recipe[]>(recipeKeys.all, old =>
        old?.map(r => (r.id === recipeId ? { ...r, isFavorite } : r)),
      );
      // ここで返したものが、onError の context に渡る
      return { previous };
    },

    // 失敗したら元に戻して知らせる
    onError: (error, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(recipeKeys.all, context.previous);
      toast.error(dbErrorMessage(error));
    },

    // 成功・失敗どちらでも、最後に DB の内容で読み直して揃える
    onSettled: () => queryClient.invalidateQueries({ queryKey: recipeKeys.all }),
  });
};

/**
 * レシピの追加・編集の保存
 * 保存のあと一覧を読み直し、それが終わってから mutateAsync が返る
 * （待たずに詳細画面へ移ると、追加したばかりのレシピがまだなく「見つかりません」が一瞬出るため）
 */
export const useSaveRecipe = () => {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: ({ recipeId, input }: { recipeId: string | null; input: RecipeInput }) => saveRecipe(recipeId, input),
    // Promise を返すと、それが終わるまで「保存中」が続く
    onSuccess : () => queryClient.invalidateQueries({ queryKey: recipeKeys.all }),
    onError   : error => toast.error(dbErrorMessage(error)),
  });
};

/** ひとことメモの保存（保存が終わってから画面を更新する） */
export const useUpdateNote = () => {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: ({ recipeId, note }: { recipeId: string; note: string }) => updateNote(recipeId, note),
    onSuccess : () => queryClient.invalidateQueries({ queryKey: recipeKeys.all }),
    onError   : error => toast.error(dbErrorMessage(error)),
  });
};
