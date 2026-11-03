import { FunctionsHttpError } from '@supabase/supabase-js';
import type { Ingredient } from '../types/recipe';
import { supabase } from './supabaseClient';

/** AI が読み取ったレシピの下書き（Edge Function「parse-recipe」の返り値と同じ形） */
export type RecipeDraft = {
  title      : string;
  cookMinutes: number | null;
  servings   : number | null;
  tags       : string[];
  ingredients: Ingredient[];
  steps      : string[];
};

// 文章・画像・URL のどれかを送る（URL は Edge Function がページを取りに行く）
export type ParseInput = { text: string } | { imageBase64: string; mimeType: 'image/jpeg' } | { url: string };

// 成功なら draft、失敗なら画面に出すメッセージ（どちらか一方だけが入る）
type ParseResult = { draft: RecipeDraft; error?: undefined } | { draft?: undefined; error: string };

/**
 * AI でレシピを読み取る（フロントから AI を呼ぶ唯一の窓口）
 * 実際に Gemini を呼ぶのは Edge Function 側。API キーはフロントには来ない
 */
export const parseRecipe = async (input: ParseInput, existingTags: string[] = []): Promise<ParseResult> => {
  // 今あるタグも一緒に送り、AI になるべく同じタグを使わせる（「和食」と「和風」のような表記ゆれを防ぐ）
  const { data, error } = await supabase.functions.invoke<{ draft: RecipeDraft }>('parse-recipe', {
    // Edge Function の入口の上限（20文字・100個）に合わせて、送る前にそろえておく（はみ出すと読み取り自体が失敗するため）
    body: { ...input, existingTags: existingTags.filter(t => t.trim() && t.length <= 20).slice(0, 100) },
  });

  if (error) {
    // 関数がエラーを返したときは、本文に日本語のメッセージ（{ error }）が入っている
    if (error instanceof FunctionsHttpError) {
      const body = await error.context.json().catch(() => null);
      if (typeof body?.error === 'string') return { error: body.error };
    }
    return { error: '通信に失敗しました。電波の良いところでもう一度お試しください' };
  }
  if (!data?.draft) return { error: '読み取り結果が空でした。もう一度お試しください' };
  return { draft: data.draft };
};
