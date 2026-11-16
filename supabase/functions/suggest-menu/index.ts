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
import { addDays, planMenu, RECENT_DAYS, type CandidateRecipe, type Plan } from './plan.ts';

// ────────────────────────────────────────────────
// 定数
// ────────────────────────────────────────────────
const DAYS             = 5;   // 明日から何日分を考えるか（HANDOFF 15）
const MAIN_INGREDIENTS = 3;   // AI に渡す「主な材料」の数（材料の先頭から）

// 使うモデル。Secrets の SUGGEST_MENU_MODEL に文字列で入れると、コードを直さずに切り替えられる（parse-recipe と同じ形。#71）
// 入れていない（空も含む）ときは、既定のモデルを使う
const DEFAULT_MODEL = 'gemini-3.5-flash-lite';
const MODEL         = Deno.env.get('SUGGEST_MENU_MODEL')?.trim() || DEFAULT_MODEL;
const GEMINI_URL    = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(MODEL)}:generateContent`;
const TIMEOUT_MS    = 60_000;   // Gemini を待つ時間。渡すのは短い文章だけなので、parse-recipe（90秒）より短くする

// AI への指示。この機能の出来は、ほとんどここ次第。使いながら直していく（HANDOFF 15）
const PROMPT = `あなたは、夫婦2人の家庭の献立係です。これから数日分の夕食の主菜を、指定された品数だけ提案して JSON で返してください。
ルール：
- 基本は「候補」の中から選ぶ。候補から選ぶときは kind を existing にし、no に候補の番号を入れる
- 合う候補が足りないとき、候補だけではバランスが取れないときは、候補にない料理（新作）を提案してよい。kind を new にし、dishName に一般的な料理名を書き、no は null にする
- 同じ料理を2回選ばない。「もう決まっているもの」「最近作ったもの」と同じ系統（主な食材・味付け・ジャンル）が続かないようにする
- 肉・魚・野菜、和・洋・中のバランスを考える
- 今日の日付から季節を考え、旬の食材を使った料理を選ぶとよい
- reason には、選んだ理由を20〜40文字くらいで、やさしい言葉で書く（旬のこと、バランスのことなど）`;

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

// Gemini に返させる答えの形。「どちらか一方」は書けるか分からないので、平らな形にする（HANDOFF 15）
const GEMINI_RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    picks: {
      type : 'ARRAY',
      items: {
        type      : 'OBJECT',
        properties: {
          kind    : { type: 'STRING', enum: ['existing', 'new'], description: '候補から選んだら existing、新作なら new' },
          no      : { type: 'INTEGER', nullable: true, description: '候補から選んだときの番号。新作なら null' },
          dishName: { type: 'STRING', description: '料理名（候補ならその料理名、新作なら一般的な料理名）' },
          reason  : { type: 'STRING', description: '選んだ理由（20〜40文字）' },
        },
        required: ['kind', 'no', 'dishName', 'reason'],
      },
    },
  },
  required: ['picks'],
};

// Gemini の答えを確かめる形。Gemini は指定した形をたまに守らないので、使う前に必ず確かめる
const GeminiAnswerSchema = z.object({
  picks: z.array(z.object({
    kind    : z.enum(['existing', 'new']),
    no      : z.number().int().nullable(),
    dishName: z.string(),
    reason  : z.string(),
  })),
});
type GeminiAnswer = z.infer<typeof GeminiAnswerSchema>;

// ────────────────────────────────────────────────
// Gemini を呼ぶ
// ────────────────────────────────────────────────
// 画面にそのまま出せるエラー。status は返すときの HTTP の番号
class UserFacingError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

// レシピ1品を、AI に渡す1行にする（例：豚の生姜焼き（#和食 #豚肉／20分／豚ロース・玉ねぎ・生姜））
const describe = (r: CandidateRecipe): string => {
  const parts = [
    r.tags.map(t => `#${t}`).join(' '),
    r.cookMinutes ? `${r.cookMinutes}分` : '',
    r.ingredients.join('・'),
  ].filter(Boolean);   // 空の項目は外す
  return parts.length > 0 ? `${r.title}（${parts.join('／')}）` : r.title;
};

// AI に渡す材料の文章を作る（候補には 1 から番号を振る。AI はこの番号で答える）
const buildRequestText = (plan: Plan, today: string): string => {
  const list = (items: CandidateRecipe[]) => (items.length > 0 ? items.map(r => `- ${describe(r)}`).join('\n') : '- なし');
  return [
    `今日：${today}`,
    `提案する品数：${plan.count}`,
    '',
    '■ 候補（番号：料理）',
    plan.candidates.length > 0 ? plan.candidates.map((r, i) => `${i + 1}：${describe(r)}`).join('\n') : '- なし（すべて新作で提案する）',
    '',
    '■ もう決まっているもの（似たものを避ける）',
    list(plan.decided),
    '',
    '■ 最近作ったもの（似たものを避ける）',
    list(plan.recent),
  ].join('\n');
};

// Gemini に献立を選んでもらい、答えの形を確かめて返す
const callGemini = async (text: string): Promise<GeminiAnswer> => {
  const apiKey = Deno.env.get('GEMINI_API_KEY');
  if (!apiKey) throw new UserFacingError('AI の設定がされていません', 500);

  const started = Date.now();
  let res: Response;
  try {
    res = await fetch(GEMINI_URL, {
      method : 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body   : JSON.stringify({
        contents        : [{ role: 'user', parts: [{ text: PROMPT }, { text }] }],
        // temperature：答えのばらつき。読み取り（parse-recipe）は 0.2 で正確さ重視。献立は出し直すたびに違う案がほしいので高めにする
        generationConfig: { responseMimeType: 'application/json', responseSchema: GEMINI_RESPONSE_SCHEMA, temperature: 0.8 },
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (e) {
    if (e instanceof DOMException && e.name === 'TimeoutError') {
      console.error(`[suggest-menu] timeout ms=${Date.now() - started}`);
      throw new UserFacingError('AI の返事に時間がかかりすぎました。少し時間をおいてもう一度お試しください', 504);
    }
    throw e;
  }

  if (res.status === 429) throw new UserFacingError('AI の利用回数の上限に達しました。しばらく時間をおいてお試しください', 429);
  if (!res.ok) {
    console.error('[suggest-menu] Gemini error', `model=${MODEL}`, res.status, (await res.text()).slice(0, 500));
    throw new UserFacingError('AI が献立を考えられませんでした。もう一度お試しください', 502);
  }

  const body = await res.json();
  // かかった時間と、使ったトークン数を残す（見積もりが合っているかを確かめる。HANDOFF 15）
  const usage = body?.usageMetadata ?? {};
  console.log(
    `[suggest-menu] ok model=${MODEL} ms=${Date.now() - started} ` +
    `prompt=${usage.promptTokenCount} output=${usage.candidatesTokenCount} thoughts=${usage.thoughtsTokenCount ?? 0}`,
  );
  const raw = body?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (typeof raw !== 'string') throw new UserFacingError('AI から答えが返ってきませんでした', 502);

  // JSON として読めるか → 期待した形か、の順に確かめる
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    throw new UserFacingError('AI の答えを読み取れませんでした。もう一度お試しください', 502);
  }
  const result = GeminiAnswerSchema.safeParse(json);
  if (!result.success) {
    console.error('[suggest-menu] invalid shape', result.error.issues.slice(0, 5));
    throw new UserFacingError('AI の答えを読み取れませんでした。もう一度お試しください', 502);
  }
  return result.data;
};

// Gemini の答えを、画面に返す形（MenuPick）に直す
// 候補にない番号・同じものの2回目・空の料理名は捨てる。品数を超えた分も捨てる
const toPicks = (answer: GeminiAnswer, plan: Plan): MenuPick[] => {
  const picks: MenuPick[] = [];
  const usedIds   = new Set<string>();
  const usedNames = new Set<string>();

  for (const p of answer.picks) {
    const reason = p.reason.trim();
    if (p.kind === 'existing') {
      // 番号は 1 から振ったので、配列の位置は 1 引く。範囲の外なら undefined になる
      const recipe = p.no === null ? undefined : plan.candidates[p.no - 1];
      if (!recipe || usedIds.has(recipe.id)) continue;
      usedIds.add(recipe.id);
      picks.push({ kind: 'existing', recipeId: recipe.id, reason });
    } else {
      const name = p.dishName.trim();
      if (!name || usedNames.has(name)) continue;
      usedNames.add(name);
      picks.push({ kind: 'new', dishName: name, reason });
    }
  }
  return picks.slice(0, plan.count);
};

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

    try {
      const answer = await callGemini(buildRequestText(plan, today));
      return Response.json({ picks: toPicks(answer, plan) });
    } catch (e) {
      if (e instanceof UserFacingError) return Response.json({ error: e.message }, { status: e.status });
      console.error('[suggest-menu] unexpected', e);
      return Response.json({ error: '献立を考えられませんでした。時間をおいてもう一度お試しください' }, { status: 500 });
    }
  }),
};
