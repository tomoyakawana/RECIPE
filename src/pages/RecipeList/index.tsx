import { useState } from 'react';
import { Link } from 'react-router';
import ImagePlaceholder from '../../components/common/ImagePlaceholder';
import { useMockStore } from '../../hooks/useMockStore';
import { fmtYmd, todayYmd } from '../../utils/date';

// 絞り込みチップの「すべて」と「お気に入り」（タグ以外の特別な選択肢）
const ALL   = 'すべて';
const FAV   = '★ お気に入り';
const QUICK = '⏱ 20分以内';
// 「時短」とみなす調理時間（分）。タグではなく調理時間から自動で判定する（時間を直したときにずれないように）
const QUICK_MINUTES = 20;

const RecipeListPage = () => {
  const { recipes, todo, toggleFavorite, addToTodo, requestRecipe, secretMode } = useMockStore();
  const [keyword, setKeyword] = useState('');
  const [chip, setChip]       = useState(ALL);

  // 全レシピのタグを重複なしで集めてチップにする
  const allTags = [...new Set(recipes.flatMap(r => r.tags))];

  const filtered = recipes.filter(r => {
    if (chip === FAV && !r.isFavorite) return false;
    // 調理時間が分からないレシピは、20分以内には含めない
    if (chip === QUICK && !(r.cookMinutes && r.cookMinutes <= QUICK_MINUTES)) return false;
    if (chip !== ALL && chip !== FAV && chip !== QUICK && !r.tags.includes(chip)) return false;
    if (!keyword) return true;
    return r.title.includes(keyword) || r.tags.some(t => t.includes(keyword));
  });

  // 「日付未定」でリクエストに入っているレシピの id（ボタンの表示切り替え用）
  // 日付が決まっているものは別の日にもう一度入れられるので、未定のものだけ見る
  const undatedRecipeIds = new Set(todo.filter(t => !t.plannedOn).map(t => t.recipeId));
  // シークレットモードでは、自分が「食べたい！」したものだけを見る（奥さんの予定は見せない）
  const requestedRecipeIds = new Set(todo.filter(t => t.requested).map(t => t.recipeId));

  return (
    <>
      {/* ヘッダー：日付 + タイトル + 追加ボタン */}
      <div className="mb-4 flex items-end justify-between">
        <div>
          <p className="text-sm text-stone-500">{fmtYmd(todayYmd())}</p>
          <h1 className="text-3xl font-extrabold tracking-tight">今日なに作る？</h1>
        </div>
        <Link
            to="/recipes/new"
            aria-label="レシピを追加"
            className="flex size-12 items-center justify-center rounded-full bg-brand text-2xl text-white shadow-md shadow-brand/30"
          >
          ＋
        </Link>
      </div>

      {/* 検索 */}
      <div className="relative mb-3">
        <span className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-stone-400">🔍</span>
        <input
          type="search"
          value={keyword}
          onChange={e => setKeyword(e.target.value)}
          placeholder="料理名・タグで検索"
          // iOS は 16px 未満の入力欄にフォーカスすると勝手に拡大するので text-base（16px）にする
          className="min-h-12 w-full rounded-full bg-white pr-4 pl-11 text-base shadow-sm shadow-stone-900/5 outline-none focus:ring-2 focus:ring-brand/40"
        />
      </div>

      {/* 絞り込みチップ（横スクロール） */}
      <div className="-mx-4 mb-5 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] md:mx-0 md:flex-wrap md:px-0">
        {[ALL, FAV, QUICK, ...allTags].map(c => (
          <button
            key={c}
            type="button"
            onClick={() => setChip(c)}
            className={`min-h-9 shrink-0 rounded-full px-4 text-sm transition-colors ${
              chip === c ? 'bg-stone-800 font-bold text-white' : 'bg-white text-stone-600 shadow-sm shadow-stone-900/5'
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {filtered.length === 0 && <p className="py-10 text-center text-stone-500">該当するレシピがありません</p>}

      {/* 写真が主役のカード。iPhone は2列、PC は3列 */}
      <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
        {filtered.map(r => (
          <li key={r.id} className="overflow-hidden rounded-2xl bg-white shadow-sm shadow-stone-900/5">
            <div className="relative">
              <Link to={`/recipes/${r.id}`}>
                <ImagePlaceholder tags={r.tags} className="aspect-square w-full md:aspect-[4/3]" emojiSize="text-5xl" />
              </Link>
              <button
                type="button"
                onClick={() => toggleFavorite(r.id)}
                aria-label="お気に入り"
                className={`absolute top-2 right-2 flex size-9 items-center justify-center rounded-full bg-white/80 text-lg backdrop-blur ${
                  r.isFavorite ? 'text-amber-400' : 'text-stone-300'
                }`}
              >
                ★
              </button>
            </div>
            <div className="p-3">
              <Link to={`/recipes/${r.id}`} className="line-clamp-2 leading-snug font-bold">
                {r.title}
              </Link>
              <p className="mt-1 text-xs text-stone-500">{r.cookMinutes ? `⏱ ${r.cookMinutes}分` : ''}</p>
              {secretMode ? (
                requestedRecipeIds.has(r.id) ? (
                  <p className="mt-2 flex min-h-9 items-center justify-center rounded-full bg-stone-100 text-xs text-stone-500">
                    ✓ リクエスト済み
                  </p>
                ) : (
                  <button
                    type="button"
                    onClick={() => requestRecipe(r.id)}
                    className="mt-2 min-h-9 w-full rounded-full bg-brand/10 text-xs font-bold text-brand"
                  >
                    🙋 食べたい！
                  </button>
                )
              ) : undatedRecipeIds.has(r.id) ? (
                <p className="mt-2 flex min-h-9 items-center justify-center rounded-full bg-stone-100 text-xs text-stone-500">
                  ✓ リクエスト済み
                </p>
              ) : (
                <button
                  type="button"
                  onClick={() => addToTodo(r.id)}
                  className="mt-2 min-h-9 w-full rounded-full bg-brand/10 text-xs font-bold text-brand"
                >
                  ＋ リクエスト
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </>
  );
};

export default RecipeListPage;
