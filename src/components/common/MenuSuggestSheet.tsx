import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import type { Recipe } from '../../types/recipe';
import { suggestMenu, type MenuPick } from '../../utils/suggestMenu';
import RecipePhoto from './RecipePhoto';
import { useAddTodo, useTodoItems } from '../../hooks/useTodo';

type Props = {
  // ✕ やシートの外を押したとき（シートを閉じる関数を、呼ぶ側から受け取る）
  onClose: () => void;
  // 提案に出てきた id から、写真や料理名を引くための全レシピ
  recipes: Recipe[];
};

// 提案の今の状態（考え中・結果が出た・失敗した）
// 状態ごとに持つものが違うので、useState を3つに分けず、1つのユニオン型にまとめる
type State =
  | { status: 'loading' }
  | { status: 'done'; picks: MenuPick[]; notice?: string }
  | { status: 'error'; message: string };

type PickCardProps = {
  pick     : MenuPick;
  recipes  : Recipe[];
  // リクエストに入っているレシピの id（入っていれば「✓」、なければ「＋」を出す）
  inTodoIds: Set<string>;
  onAdd    : (recipeId: string) => void;
  // 保存中は「＋」を押せなくする（二重に押されるのを防ぐ）
  busy     : boolean;
};

// 提案の1品。既存のレシピは写真と調理時間つき、新作は名前と理由だけ
const PickCard = ({ pick, recipes, inTodoIds, onAdd, busy }: PickCardProps) => {
  if (pick.kind === 'new') {
    return (
      <li className="flex gap-3 rounded-2xl bg-cream p-2.5">
        <div className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-white text-2xl">🆕</div>
        <div className="min-w-0 flex-1 pt-0.5">
          <p className="font-bold">{pick.dishName}</p>
          <p className="mt-0.5 text-xs text-stone-500">{pick.reason}</p>
        </div>
      </li>
    );
  }

  // ここまで来たら pick.kind は 'existing' に絞り込まれているので、recipeId が使える
  const recipe = recipes.find(r => r.id === pick.recipeId);
  // 提案の後でレシピが消された場合は出さない
  if (!recipe) return null;
  return (
    <li className="flex gap-3 rounded-2xl bg-cream p-2.5">
      <Link to={`/recipes/${recipe.id}`} className="shrink-0">
        <RecipePhoto imagePath={recipe.imagePath} tags={recipe.tags} size="small" className="size-14 rounded-xl" emojiSize="text-2xl" />
      </Link>
      <div className="min-w-0 flex-1 pt-0.5">
        <Link to={`/recipes/${recipe.id}`} className="block truncate font-bold">{recipe.title}</Link>
        {recipe.cookMinutes ? <p className="text-xs text-stone-500">⏱ {recipe.cookMinutes}分</p> : null}
        <p className="mt-0.5 text-xs text-stone-500">{pick.reason}</p>
      </div>
      {inTodoIds.has(recipe.id) ? (
        <span className="flex size-9 shrink-0 items-center justify-center self-center rounded-full bg-stone-100 text-sm text-stone-500">✓</span>
      ) : (
        <button
          type="button"
          onClick={() => onAdd(recipe.id)}
          disabled={busy}
          aria-label="リクエストに入れる"
          className="flex size-9 shrink-0 items-center justify-center self-center rounded-full bg-brand text-lg font-bold text-white disabled:opacity-50"
        >
          ＋
        </button>
      )}
    </li>
  );
};

/**
 * 献立の提案のシート（開くとすぐ AI に聞き、結果をカードで出す）
 * 中身が短いので、「予定を入れる」と違って、どの幅でも画面の真ん中に出す
 */
const MenuSuggestSheet = ({ onClose, recipes }: Props) => {
  const [state, setState] = useState<State>({ status: 'loading' });
  // 「別の案」を押した回数。これが変わると、下の useEffect がもう一度動いて AI に聞き直す
  const [round, setRound] = useState(0);
  // リクエストの一覧はレシピ一覧などと共有しているので、ここで読んでも通信は増えない（キャッシュから出る）
  const { data: todo = [] } = useTodoItems();
  const addTodo = useAddTodo();

  // シートを開いたら（画面に出たら）、AI に聞く
  useEffect(() => {
    // 返事が届く前にシートが閉じられたら、その返事は捨てる（閉じた後に画面を書き換えないように）
    let ignore = false;
    suggestMenu().then(result => {
      if (ignore) return;
      if (result.error !== undefined) setState({ status: 'error', message: result.error });
      else setState({ status: 'done', picks: result.picks, notice: result.notice });
    });
    // 後片付け：シートが閉じられた（画面から消えた）ときに React が呼ぶ
    return () => { ignore = true; };
  }, [round]);

  const inTodoIds = new Set(todo.map(t => t.recipeId));
  // 提案のうち、まだリクエストに入れていない既存のレシピ（「まとめて入れる」の対象）
  const restIds = state.status === 'done'
    ? state.picks.flatMap(p => (p.kind === 'existing' && !inTodoIds.has(p.recipeId) ? [p.recipeId] : []))
    : [];

  // ＋：日付未定でリクエストに入れる（失敗したときのトーストは useAddTodo の中で出す）
  const handleAdd = (recipeId: string) => addTodo.mutate({ recipeId, plannedOn: undefined });

  // まとめて：残りを同時に入れる。失敗のトーストは useAddTodo が出すので、ここでは失敗を握りつぶすだけ
  // （catch しないと「誰も受け取らなかったエラー」がコンソールに出るため）
  const handleAddAll = () => {
    Promise.all(restIds.map(recipeId => addTodo.mutateAsync({ recipeId, plannedOn: undefined }))).catch(() => {});
  };

  // 別の案：考え中に戻して、round を1つ進める（→ useEffect がもう一度動く）
  const handleRetry = () => {
    setState({ status: 'loading' });
    setRound(r => r + 1);
  };

  return (
    <div
      // どの幅でも画面の真ん中に出す（周りに少し余白を残す）
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4 md:p-6"
      // シートの外（暗いところ）を押したら閉じる。シートの中を押したときは閉じない
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* 高さは画面の 85% まで。見出しは止めておき、その下だけスクロールする */}
      <div className="flex max-h-[85dvh] w-full max-w-lg flex-col rounded-3xl bg-white">
        <div className="flex shrink-0 items-center justify-between p-4 pb-3">
          <h2 className="text-lg font-bold">🤖 献立の提案</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="閉じる"
            className="flex size-9 items-center justify-center rounded-full text-stone-400"
          >
            ✕
          </button>
        </div>

        {/* スクロールする部分。端まで行っても、後ろの画面はスクロールさせない（overscroll-contain） */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4">
          {state.status === 'loading' && <p className="py-10 text-center text-sm text-stone-500">考えています…（数秒かかります）</p>}
          {state.status === 'error' && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{state.message}</p>}
          {state.status === 'done' && state.notice && (
            <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-700">{state.notice}</p>
          )}
          {state.status === 'done' && state.picks.length > 0 && (
            <ul className="grid grid-cols-1 gap-2.5">
              {/* 名前と id は Edge Function で重なりを除いてあるので、key に使える */}
              {state.picks.map(pick => (
                <PickCard
                  key={pick.kind === 'existing' ? pick.recipeId : pick.dishName}
                  pick={pick}
                  recipes={recipes}
                  inTodoIds={inTodoIds}
                  onAdd={handleAdd}
                  busy={addTodo.isPending}
                />
              ))}
            </ul>
          )}
        </div>
        {/* 下の段（スクロールしない）。結果が出たとき・失敗したときだけ出す */}
        {(state.status === 'error' || (state.status === 'done' && state.picks.length > 0)) && (
          <div className="flex shrink-0 gap-2 border-t border-stone-100 p-4">
            <button
              type="button"
              onClick={handleRetry}
              className="min-h-11 flex-1 rounded-full bg-stone-100 px-4 text-sm font-bold text-stone-600"
            >
              {state.status === 'error' ? 'もう一度' : '↻ 別の案'}
            </button>
            {restIds.length > 0 && (
              <button
                type="button"
                onClick={handleAddAll}
                disabled={addTodo.isPending}
                className="min-h-11 flex-2 rounded-full bg-brand px-4 text-sm font-bold text-white disabled:opacity-50"
              >
                まとめて入れる（{restIds.length}品）
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MenuSuggestSheet;
