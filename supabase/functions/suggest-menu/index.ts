/**
 * suggest-menu：明日から5日分の献立を、AI に提案してもらう（#11）
 *
 * ① DB からレシピ・作った記録・リクエストを読む（ログイン中の本人の権限で読むので、RLS がそのまま効く）
 * ② 品数を数え、ルールで候補を絞る（ここは AI を使わない）
 * ③ 候補だけを Gemini に渡して選ばせ、答えを確かめる
 * 結果は返すだけで、DB には保存しない（リクエストに入れるのは、画面の ＋）
 *
 * 呼び出し：supabase.functions.invoke('suggest-menu', { body: { today: '2026-11-16' } })
 * 返り値  ：成功 { picks: MenuPick[] } ／ 失敗 { error: '日本語のメッセージ' }
 */
import '@supabase/functions-js/edge-runtime.d.ts';
import { withSupabase } from '@supabase/server';
import { z } from 'zod';

// ────────────────────────────────────────────────
// 定数
// ────────────────────────────────────────────────
const DAYS = 5;   // 明日から何日分を考えるか（HANDOFF 15）

// ────────────────────────────────────────────────
// 入力と答えの形
// ────────────────────────────────────────────────
// 画面から、今日の日付（日本時間）を受け取る。Edge Function は UTC で動くので、自分では計算しない
const InputSchema = z.object({
  today: z.iso.date(),   // 'YYYY-MM-DD' の形か確かめる
});

// 提案の1品。既存のレシピか、新作か（kind を見れば、どちらか分かる）
type MenuPick =
  | { kind: 'existing'; recipeId: string; reason: string }
  | { kind: 'new';      dishName: string; reason: string };

// ────────────────────────────────────────────────
// 入口
// ────────────────────────────────────────────────
export default {
  fetch: withSupabase({ auth: 'user' }, async (req, _ctx) => {
    if (req.method !== 'POST') return Response.json({ error: 'POST で呼んでください' }, { status: 405 });

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return Response.json({ error: 'リクエストの形が正しくありません' }, { status: 400 });
    }

    const input = InputSchema.safeParse(body);
    if (!input.success) return Response.json({ error: '日付の形が正しくありません' }, { status: 400 });

    // まだ枠だけ。段階2で、DB を読んで品数と候補を計算する
    const picks: MenuPick[] = [];
    return Response.json({ picks });
  }),
};
