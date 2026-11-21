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

// その日の提案を、スマホに覚えておく（「別の案」を押すまで同じ提案を出すため）
// 消えても AI に聞き直せば済むので、localStorage（キャッシュ）で十分。形を変えたら v2 にする
const SAVED_KEY = 'menu-suggestion-v1';

type SavedMenu = { date: string; picks: MenuPick[]; notice?: string };

// 今日の提案が保存されていれば返す。なければ（日付が違う・壊れている・読めない）null
const loadSaved = (): SavedMenu | null => {
  try {
    const raw = localStorage.getItem(SAVED_KEY);
    if (!raw) return null;
    // JSON.parse の結果は何が入っているか分からないので、unknown として受けて、中身を確かめる
    const saved: unknown = JSON.parse(raw);
    if (typeof saved !== 'object' || saved === null) return null;
    const { date, picks, notice } = saved as Partial<SavedMenu>;
    if (date !== todayYmd() || !Array.isArray(picks)) return null;
    return { date, picks, notice };
  } catch {
    // プライベートブラウズなどで読めないときは、保存がないものとして扱う
    return null;
  }
};

const save = (menu: SavedMenu) => {
  try {
    localStorage.setItem(SAVED_KEY, JSON.stringify(menu));
  } catch {
    // 保存できなくても、提案は画面に出せるので何もしない
  }
};

/**
 * AI に明日からの献立を提案してもらう
 * 「今日」は端末の日付を送る（Edge Function は UTC で動くので、日本の朝 9 時前だと前の日になってしまうため）
 * refresh：true なら保存を使わず、必ず AI に聞き直す（「別の案」のとき）
 */
export const suggestMenu = async ({ refresh = false } = {}): Promise<SuggestResult> => {
  // 「別の案」でなければ、今日の提案が残っていればそれを使う（AI には聞かない）
  if (!refresh) {
    const saved = loadSaved();
    if (saved) return { picks: saved.picks, notice: saved.notice };
  }

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
  // 品数が 0 のときは覚えない（レシピを足した後に開き直したら、すぐ提案が出るように）
  if (data.picks.length > 0) save({ date: todayYmd(), picks: data.picks, notice: data.notice });
  return { picks: data.picks, notice: data.notice };
};
