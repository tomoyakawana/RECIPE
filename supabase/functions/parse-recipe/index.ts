/**
 * parse-recipe：文章や写真から、レシピの下書き（料理名・材料・手順など）を作る
 *
 * Gemini を呼ぶのはこの関数の1か所だけ（SSAM の ai_service.py と同じ考え方）。
 * API キーは Supabase の Secrets（GEMINI_API_KEY）にだけ置き、フロントには渡さない。
 * 結果は「下書き」として返すだけで、DB には保存しない（人が確認してから保存する）。
 *
 * 呼び出し：supabase.functions.invoke('parse-recipe', { body: { text } または { imageBase64, mimeType } })
 * 返り値  ：成功 { draft: RecipeDraft } ／ 失敗 { error: '日本語のメッセージ' }
 */
import '@supabase/functions-js/edge-runtime.d.ts';
import { withSupabase } from '@supabase/server';
import { z } from 'zod';

// ────────────────────────────────────────────────
// 定数
// ────────────────────────────────────────────────
const MODEL           = 'gemini-3.5-flash-lite';   // 無料枠の対象（2026-10-21 公式の料金ページで確認）
const GEMINI_URL      = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;
const TIMEOUT_MS      = 30_000;
const MAX_TEXT_CHARS  = 8_000;                     // 長すぎる文章は受け付けない（無料枠の節約）
const MAX_IMAGE_CHARS = 4_000_000;                 // base64 で約 3MB まで（アプリ側で縮小してから送る前提）
const IMAGE_TYPES     = ['image/jpeg', 'image/png', 'image/webp'] as const;

// ────────────────────────────────────────────────
// 入力の検証：文章か画像のどちらか
// ────────────────────────────────────────────────
const InputSchema = z.union([
  z.object({ text: z.string().trim().min(1).max(MAX_TEXT_CHARS) }),
  z.object({ imageBase64: z.string().min(1).max(MAX_IMAGE_CHARS), mimeType: z.enum(IMAGE_TYPES) }),
]);

// ────────────────────────────────────────────────
// 出力の検証：Gemini の答えを、そのまま信用しない
// ────────────────────────────────────────────────
const RecipeDraftSchema = z.object({
  isRecipe   : z.boolean(),
  title      : z.string(),
  cookMinutes: z.number().int().positive().nullable(),
  servings   : z.number().int().positive().nullable(),
  tags       : z.array(z.string()).max(10),
  ingredients: z.array(z.object({ name: z.string().min(1), amount: z.string() })).max(60),
  steps      : z.array(z.string().min(1)).max(40),
});

// フロントに返す下書きの型（isRecipe は判定用なので返さない）
type RecipeDraft = Omit<z.infer<typeof RecipeDraftSchema>, 'isRecipe'>;

// Gemini に「この形の JSON で答えて」と指定する（OpenAPI 形式のスキーマ）
const GEMINI_RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    isRecipe   : { type: 'BOOLEAN', description: '入力が料理のレシピなら true' },
    title      : { type: 'STRING',  description: '料理名' },
    cookMinutes: { type: 'INTEGER', nullable: true, description: '調理時間（分）。書かれていなければ null' },
    servings   : { type: 'INTEGER', nullable: true, description: '何人分か。書かれていなければ null' },
    tags       : { type: 'ARRAY', items: { type: 'STRING' }, description: '和食・洋食・中華・豚肉・魚・パスタ・スープ・作り置き などから当てはまるもの' },
    ingredients: {
      type : 'ARRAY',
      items: {
        type      : 'OBJECT',
        properties: { name: { type: 'STRING' }, amount: { type: 'STRING' } },
        required  : ['name', 'amount'],
      },
    },
    steps: { type: 'ARRAY', items: { type: 'STRING' }, description: '作り方。1要素 = 1ステップ' },
  },
  required: ['isRecipe', 'title', 'cookMinutes', 'servings', 'tags', 'ingredients', 'steps'],
};

const PROMPT = `あなたは料理レシピの整理係です。与えられた文章または画像から、レシピを読み取って JSON で返してください。
ルール：
- 書かれていないことを推測で足さない（分量が書かれていなければ amount は空文字、時間や人数がなければ null）
- 材料は「名前」と「分量」に分ける（例：「豚ロース 300g」→ name: 豚ロース, amount: 300g）
- 作り方は1ステップずつに分け、先頭の番号（1. や ①）は外す。1つのステップの中では改行しない
- 広告・関連レシピ・コメントなど、レシピ本体以外は無視する
- 料理のレシピとして読み取れない場合は isRecipe を false にする`;

// ────────────────────────────────────────────────
// Gemini 呼び出し
// ────────────────────────────────────────────────
class UserFacingError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

const callGemini = async (input: z.infer<typeof InputSchema>): Promise<RecipeDraft> => {
  const apiKey = Deno.env.get('GEMINI_API_KEY');
  if (!apiKey) throw new Error('GEMINI_API_KEY が設定されていません');

  // 'text' in input：文章で来たか画像で来たかを見分ける（TS はこれで型を絞り込める）
  const userPart = 'text' in input
    ? { text: input.text }
    : { inline_data: { mime_type: input.mimeType, data: input.imageBase64 } };

  const res = await fetch(GEMINI_URL, {
    method : 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body   : JSON.stringify({
      contents        : [{ role: 'user', parts: [{ text: PROMPT }, userPart] }],
      generationConfig: { responseMimeType: 'application/json', responseSchema: GEMINI_RESPONSE_SCHEMA, temperature: 0.2 },
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  if (res.status === 429) throw new UserFacingError('AI の利用回数の上限に達しました。しばらく時間をおいてお試しください', 429);
  if (!res.ok) {
    console.error('[parse-recipe] Gemini error', res.status, (await res.text()).slice(0, 500));
    throw new UserFacingError('AI での読み取りに失敗しました。もう一度お試しください', 502);
  }

  const body = await res.json();
  const raw  = body?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (typeof raw !== 'string') throw new UserFacingError('AI から答えが返ってきませんでした', 502);

  // JSON として読めるか → 期待した形か、の順に確かめる
  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(raw);
  } catch {
    throw new UserFacingError('AI の答えを読み取れませんでした。もう一度お試しください', 502);
  }
  const result = RecipeDraftSchema.safeParse(parsedJson);
  if (!result.success) {
    console.error('[parse-recipe] invalid shape', result.error.issues.slice(0, 5));
    throw new UserFacingError('AI の答えが想定と違う形でした。もう一度お試しください', 502);
  }

  const { isRecipe, ...draft } = result.data;
  if (!isRecipe || (!draft.title && draft.ingredients.length === 0)) {
    throw new UserFacingError('レシピとして読み取れませんでした。料理名や材料が写っているか確認してください', 422);
  }
  return draft;
};

// ────────────────────────────────────────────────
// エントリポイント：ログインしている人だけが呼べる（auth: 'user'）
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
    if (!input.success) {
      return Response.json({ error: `文章は${MAX_TEXT_CHARS}文字まで、画像は JPEG / PNG / WebP で約3MBまでです` }, { status: 400 });
    }

    try {
      const draft = await callGemini(input.data);
      return Response.json({ draft });
    } catch (e) {
      if (e instanceof UserFacingError) return Response.json({ error: e.message }, { status: e.status });
      console.error('[parse-recipe] unexpected', e);
      return Response.json({ error: 'うまく読み取れませんでした。時間をおいてもう一度お試しください' }, { status: 500 });
    }
  }),
};
