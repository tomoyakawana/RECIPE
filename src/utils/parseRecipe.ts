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

// 文章か画像のどちらかを送る
export type ParseInput = { text: string } | { imageBase64: string; mimeType: 'image/jpeg' };

// 成功なら draft、失敗なら画面に出すメッセージ（どちらか一方だけが入る）
type ParseResult = { draft: RecipeDraft; error?: undefined } | { draft?: undefined; error: string };

/**
 * AI でレシピを読み取る（フロントから AI を呼ぶ唯一の窓口）
 * 実際に Gemini を呼ぶのは Edge Function 側。API キーはフロントには来ない
 */
export const parseRecipe = async (input: ParseInput): Promise<ParseResult> => {
  const { data, error } = await supabase.functions.invoke<{ draft: RecipeDraft }>('parse-recipe', { body: input });

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
