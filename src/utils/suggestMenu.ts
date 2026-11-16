import { FunctionsHttpError } from '@supabase/supabase-js';
import { todayYmd } from './date';
import { supabase } from './supabaseClient';

/** AI が選んだ献立の1品（Edge Function「suggest-menu」の返り値と同じ形） */
// kind で見分ける：existing＝登録済みのレシピ（id で指す）／new＝まだ登録していない新作（名前だけ）
export type MenuPick =
  | { kind: 'existing'; recipeId: string; reason: string }
  | { kind: 'new';      dishName: string; reason: string };

// 成功なら picks（品数が 0 のときは、提案しなかった理由の notice も付く）、失敗なら画面に出すメッセージ
type SuggestResult =
  | { picks: MenuPick[]; notice?: string; error?: undefined }
  | { picks?: undefined; notice?: undefined; error: string };

/**
 * AI に明日からの献立を提案してもらう
 * 「今日」は端末の日付を送る（Edge Function は UTC で動くので、日本の朝 9 時前だと前の日になってしまうため）
 */
export const suggestMenu = async (): Promise<SuggestResult> => {
  const { data, error } = await supabase.functions.invoke<{ picks: MenuPick[]; notice?: string }>('suggest-menu', {
    body: { today: todayYmd() },
  });

  if (error) {
    // 関数がエラーを返したときは、本文に日本語のメッセージ（{ error }）が入っている
    if (error instanceof FunctionsHttpError) {
      const body = await error.context.json().catch(() => null);
      if (typeof body?.error === 'string') return { error: body.error };
    }
    return { error: '通信に失敗しました。電波の良いところでもう一度お試しください' };
  }
  if (!data?.picks) return { error: '提案が空でした。もう一度お試しください' };
  return { picks: data.picks, notice: data.notice };
};
