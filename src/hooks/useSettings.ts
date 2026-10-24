import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchSecretMode, saveSecretMode } from '../api/settings';
import { dbErrorMessage } from '../utils/dbError';
import { useAuth } from './useAuth';
import { useToast } from './useToast';

export const settingsKeys = {
  secretMode: ['secretMode'] as const,
};

/**
 * シークレットモードの読み込み
 * 画面の枠（MainLayout）が読み終わるまで待つので、各画面では読み込み中を気にしなくてよい
 * ※ ログアウトすると置き場ごと消える（AuthProvider）ので、同じ端末で別の人がログインしても前の人の設定は残らない
 */
export const useSecretModeQuery = () => useQuery({ queryKey: settingsKeys.secretMode, queryFn: fetchSecretMode });

/** 各画面用：シークレットモードがオンか（MainLayout が読み終えてから画面を出すので、ここでは true / false のどちらか） */
export const useSecretMode = (): boolean => useSecretModeQuery().data ?? false;

/** シークレットモードの切り替え（スイッチはタップした瞬間に変え、失敗したら戻す） */
export const useSetSecretMode = () => {
  const queryClient = useQueryClient();
  const toast = useToast();
  const userId = useAuth().session?.user.id;

  return useMutation({
    mutationFn: (on: boolean) => {
      // ログイン中の画面からしか呼ばれないので、ふつうは起きない
      if (!userId) throw new Error('ログインしていません');
      return saveSecretMode({ userId, on });
    },
    onMutate: async on => {
      await queryClient.cancelQueries({ queryKey: settingsKeys.secretMode });
      const previous = queryClient.getQueryData<boolean>(settingsKeys.secretMode);
      queryClient.setQueryData(settingsKeys.secretMode, on);
      return { previous };
    },
    onError: (error, _on, context) => {
      if (context?.previous !== undefined) queryClient.setQueryData(settingsKeys.secretMode, context.previous);
      toast.error(dbErrorMessage(error));
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: settingsKeys.secretMode }),
  });
};
