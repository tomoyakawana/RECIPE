/**
 * suggest-menu：明日から5日分の献立を、AI に提案してもらう（#11）
 *
 * ① DB からレシピ・作った記録・リクエストを読む（ログイン中の本人の権限で読むので、RLS がそのまま効く）
 * ② 品数を数え、ルールで候補を絞る（ここは AI を使わない）
 * ③ 候補だけを Gemini に渡して選ばせ、答えを確かめる
 * 結果は返すだけで、DB には保存しない（リクエストに入れるのは、画面の ＋）
 *
 * 呼び出し：supabase.functions.invoke('suggest-menu', { body: { today: '2026-11-16' } })
 * 返り値  ：成功 { picks: MenuPick[], notice?: 提案しなかった理由 } ／ 失敗 { error: '日本語のメッセージ' }
 */
import '@supabase/functions-js/edge-runtime.d.ts';
import { withSupabase } from '@supabase/server';
import { z } from 'zod';
import { addDays, planMenu, RECENT_DAYS, type CandidateRecipe } from './plan.ts';

// ────────────────────────────────────────────────
// 定数
// ────────────────────────────────────────────────
const DAYS             = 5;   // 明日から何日分を考えるか（HANDOFF 15）
const MAIN_INGREDIENTS = 3;   // AI に渡す「主な材料」の数（材料の先頭から）

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
  fetch: withSupabase({ auth: 'user' }, async (req, ctx) => {
    if (req.method !== 'POST') return Response.json({ error: 'POST で呼んでください' }, { status: 405 });

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return Response.json({ error: 'リクエストの形が正しくありません' }, { status: 400 });
    }

    const input = InputSchema.safeParse(body);
    if (!input.success) return Response.json({ error: '日付の形が正しくありません' }, { status: 400 });

    const today = input.data.today;

    // 3つの読み込みはお互いに関係ないので、同時に投げて待つ（順番に待つより速い）
    // ctx.supabase：ログイン中の本人の権限の窓口。RLS がそのまま効く
    const [recipesRes, logsRes, todoRes] = await Promise.all([
      ctx.supabase.from('recipes').select('id, title, tags, cook_minutes, recipe_ingredients ( name, position )').is('deleted_at', null),
      ctx.supabase.from('cook_logs').select('recipe_id, cooked_on').gte('cooked_on', addDays(today, -RECENT_DAYS)),
      ctx.supabase.from('todo_items').select('recipe_id, planned_on'),
    ]);
    const dbError = recipesRes.error ?? logsRes.error ?? todoRes.error;
    if (dbError) {
      console.error('[suggest-menu] db error', dbError.message);
      return Response.json({ error: 'レシピを読み込めませんでした。もう一度お試しください' }, { status: 500 });
    }

    // DB の形（スネークケース）から、計算用の形（キャメルケース）に直す
    const recipes: CandidateRecipe[] = (recipesRes.data ?? []).map(r => ({
      id         : r.id,
      title      : r.title,
      tags       : r.tags,
      cookMinutes: r.cook_minutes,
      ingredients: [...r.recipe_ingredients].sort((a, b) => a.position - b.position).slice(0, MAIN_INGREDIENTS).map(i => i.name),
    }));
    const plan = planMenu({
      today,
      days    : DAYS,
      recipes,
      cookLogs: (logsRes.data ?? []).map(l => ({ recipeId: l.recipe_id, cookedOn: l.cooked_on })),
      todo    : (todoRes.data ?? []).map(t => ({ recipeId: t.recipe_id, plannedOn: t.planned_on })),
    });

    // 提案する枠がないときは、AI を呼ばずに知らせる（無料枠も使わない）
    if (plan.count === 0) {
      const notice = plan.undatedCount > 0
        ? `日付未定のリクエストが${plan.undatedCount}品あります。先に日付を決めてみましょう`
        : `明日から${DAYS}日分の予定は、もう埋まっています`;
      return Response.json({ picks: [], notice });
    }

    // 段階3で Gemini を呼ぶ。今は、計算の結果を確かめるために返す（段階3で消す）
    const picks: MenuPick[] = [];
    return Response.json({
      picks,
      debug: {
        count     : plan.count,
        candidates: plan.candidates.map(c => c.title),
        decided   : plan.decided.map(c => c.title),
        recent    : plan.recent.map(c => c.title),
      },
    });
  }),
};
