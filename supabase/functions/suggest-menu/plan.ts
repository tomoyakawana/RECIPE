/**
 * 献立提案の「ルールの部分」（AI を使わない）
 * DB も Deno も使わない、ただの計算だけにしておく。入力が同じなら結果も同じなので、テストを書きやすい（#37 で Vitest の題材にする）
 */

const MAX_CANDIDATES     = 30;   // AI に渡す候補の上限（画面には出ない）
export const RECENT_DAYS = 5;    // 最近何日以内に作ったものを外すか（index.ts で、読む作った記録の範囲にも使う）

// 候補のレシピ（AI に渡す項目だけ。手順の文章は渡さない）
export type CandidateRecipe = {
  id         : string;
  title      : string;
  tags       : string[];
  cookMinutes: number | null;
  ingredients: string[];   // 主な材料の名前（先頭から数個）
};

export type PlanInput = {
  today   : string;   // 今日（'YYYY-MM-DD'、日本時間）
  days    : number;   // 明日から何日分を考えるか
  recipes : CandidateRecipe[];
  cookLogs: { recipeId: string; cookedOn: string }[];
  todo    : { recipeId: string; plannedOn: string | null }[];
};

export type Plan = {
  count       : number;              // 提案する品数（0 なら AI を呼ばない）
  undatedCount: number;              // 日付未定のリクエストの数（0品のときの文言に使う）
  candidates  : CandidateRecipe[];   // AI に渡す候補（最大30品）
  decided     : CandidateRecipe[];   // もう決まっているもの（期間内の予定・日付未定）。似たものを避けてもらう
  recent      : CandidateRecipe[];   // 最近作ったもの。続けて同じ系統にならないよう AI に渡す
};

// 'YYYY-MM-DD' に n 日足す。UTC として計算するので、どこで動いても日付がずれない
export const addDays = (ymd: string, n: number): string => {
  const d = new Date(`${ymd}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

// 並びをランダムに入れ替える（フィッシャー–イェーツのシャッフル）。元の配列は変えない
const shuffle = <T>(items: T[], random: () => number): T[] => {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};

/**
 * 品数を数えて、候補を絞る
 * random：並べ替えに使う乱数。ふだんは Math.random。テストでは決まった値を返す関数を渡して、結果を固定する
 */
export const planMenu = (input: PlanInput, random: () => number = Math.random): Plan => {
  const { today, days, recipes, cookLogs, todo } = input;
  const first = addDays(today, 1);      // 明日
  const last  = addDays(today, days);   // 5日後
  const inPeriod = (ymd: string) => ymd >= first && ymd <= last;

  // 品数：期間の日数 − もう予定が入っている日（同じ日に2品あっても1日） − 日付未定の数
  const bookedDays   = new Set(todo.flatMap(t => (t.plannedOn && inPeriod(t.plannedOn) ? [t.plannedOn] : [])));
  const undatedCount = todo.filter(t => t.plannedOn === null).length;
  const count        = Math.max(0, days - bookedDays.size - undatedCount);

  // 最近作ったもの（さかのぼって5日〜今日）
  const since     = addDays(today, -RECENT_DAYS);
  const recentIds = new Set(cookLogs.filter(l => l.cookedOn >= since && l.cookedOn <= today).map(l => l.recipeId));
  // もう決まっているもの（期間内の予定と、日付未定）
  const decidedIds = new Set(todo.filter(t => t.plannedOn === null || inPeriod(t.plannedOn)).map(t => t.recipeId));
  // リクエストに入っているものは、日付に関係なく候補から外す
  const todoIds = new Set(todo.map(t => t.recipeId));

  const candidates = shuffle(recipes.filter(r => !recentIds.has(r.id) && !todoIds.has(r.id)), random).slice(0, MAX_CANDIDATES);

  return {
    count,
    undatedCount,
    candidates,
    decided: recipes.filter(r => decidedIds.has(r.id)),
    recent : recipes.filter(r => recentIds.has(r.id)),
  };
};
