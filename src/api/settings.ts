import { supabase } from '../utils/supabaseClient';

/**
 * ユーザーごとの設定（user_settings）の読み書き
 * RLS で「自分の行だけ」読める・書けるようにしてあるので、相手の設定は見えない
 */

/** シークレットモードを読む。まだ設定の行がなければ（一度も切り替えていなければ）オフ */
export const fetchSecretMode = async (): Promise<boolean> => {
  const { data, error } = await supabase
    .from('user_settings')
    .select('secret_mode')
    // maybeSingle：0件なら null、1件ならその行（single と違い、0件でもエラーにしない）
    .maybeSingle();
  if (error) throw error;
  return data?.secret_mode ?? false;
};

/**
 * シークレットモードを保存する
 * upsert：自分の行がなければ作り、あれば書き換える（onConflict：user_id が同じなら書き換え）
 */
export const saveSecretMode = async ({ userId, on }: { userId: string; on: boolean }): Promise<void> => {
  const { error } = await supabase
    .from('user_settings')
    .upsert({ user_id: userId, secret_mode: on }, { onConflict: 'user_id' });
  if (error) throw error;
};
