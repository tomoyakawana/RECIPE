import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import ImagePlaceholder from '../../components/common/ImagePlaceholder';
import { useMockStore } from '../../hooks/useMockStore';
import { fmtYmd } from '../../utils/date';

/* ---- ひとことメモ（タップしてその場で書ける） ---- */
const RecipeNote = ({ note, onSave }: { note?: string; onSave: (v: string) => void }) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft]     = useState('');

  const startEdit = () => {
    setDraft(note ?? '');
    setEditing(true);
  };

  const save = () => {
    onSave(draft);
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="mt-3 rounded-2xl bg-amber-50 p-3">
        <textarea
          value={draft}
          onChange={e => setDraft(e.target.value)}
          autoFocus
          rows={2}
          placeholder="例：玉ねぎ多めが好き、辛さ控えめで"
          // iOS の自動ズームを避けるため text-base（16px）
          className="w-full resize-none rounded-xl border border-amber-200 bg-white p-2 text-base outline-none focus:ring-2 focus:ring-brand/40"
        />
        <div className="mt-2 flex justify-end gap-2">
          <button type="button" onClick={() => setEditing(false)} className="min-h-9 px-3 text-sm text-stone-500">
            キャンセル
          </button>
          <button type="button" onClick={save} className="min-h-9 rounded-full bg-brand px-4 text-sm font-bold text-white">
            保存
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={startEdit}
      className={`mt-3 flex w-full items-start gap-2 rounded-2xl px-3 py-2.5 text-left text-sm ${
        note ? 'bg-amber-50 text-stone-700' : 'border border-dashed border-stone-300 text-stone-400'
      }`}
    >
      <span>💬</span>
      {/* whitespace-pre-wrap：改行をそのまま表示する */}
      <span className="flex-1 whitespace-pre-wrap">{note ?? 'ひとことメモ（例：玉ねぎ多め）'}</span>
      {note && <span className="shrink-0 text-xs text-stone-400">編集</span>}
    </button>
  );
};

const RecipeDetailPage = () => {
  // URL の /recipes/:id の :id 部分。見つからない可能性もあるので型は string | undefined
  const { id } = useParams();
  const navigate = useNavigate();
  const { recipes, todo, history, toggleFavorite, addToTodo, setRecipeNote } = useMockStore();

  const recipe = recipes.find(r => r.id === id);
  if (!recipe) {
    return (
      <div className="py-10 text-center">
        <p className="mb-4 text-stone-500">レシピが見つかりません</p>
        <Link to="/" className="text-brand underline">レシピ一覧へ</Link>
      </div>
    );
  }

  // 日付未定で入っていれば「追加済み」。日付が決まっているものとは別に、もう一度追加できる
  const inTodo = todo.some(t => t.recipeId === recipe.id && !t.plannedOn);
  // このレシピを作った記録（新しい順）
  const cookedDates = history
    .filter(h => h.recipeId === recipe.id)
    .map(h => h.cookedOn)
    .sort((a, b) => b.localeCompare(a));

  return (
    <article>
      {/* 写真（iPhone は画面幅いっぱい）。戻る・お気に入りは写真の上に重ねる */}
      <div className="relative -mx-4 -mt-6 mb-5 md:mx-0 md:mt-0">
        <ImagePlaceholder tags={recipe.tags} className="aspect-[4/3] w-full md:aspect-[16/7] md:rounded-3xl" emojiSize="text-8xl" />
        <button
          type="button"
          onClick={() => navigate(-1)}
          aria-label="戻る"
          className="absolute top-4 left-4 flex size-11 items-center justify-center rounded-full bg-white/85 text-xl shadow backdrop-blur"
        >
          ‹
        </button>
        <button
          type="button"
          onClick={() => toggleFavorite(recipe.id)}
          aria-label="お気に入り"
          className={`absolute top-4 right-4 flex size-11 items-center justify-center rounded-full bg-white/85 text-xl shadow backdrop-blur ${
            recipe.isFavorite ? 'text-amber-400' : 'text-stone-300'
          }`}
        >
          ★
        </button>
      </div>

      <div className="flex items-start gap-2">
        <h1 className="flex-1 text-2xl font-extrabold tracking-tight">{recipe.title}</h1>
        <Link
          to={`/recipes/${recipe.id}/edit`}
          className="flex min-h-9 shrink-0 items-center rounded-full bg-white px-3 text-sm text-stone-600 shadow-sm shadow-stone-900/5"
        >
          ✏️ 編集
        </Link>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {recipe.tags.map(t => (
          <span key={t} className="rounded-full bg-white px-3 py-1 text-xs text-stone-600 shadow-sm shadow-stone-900/5">#{t}</span>
        ))}
      </div>

      {/* key：別のレシピに移ったとき、編集中の状態を持ち越さないようにする */}
      <RecipeNote key={recipe.id} note={recipe.note} onSave={v => setRecipeNote(recipe.id, v)} />

      {/* 数字の情報をタイルで */}
      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-2xl bg-white p-3 shadow-sm shadow-stone-900/5">
          <p className="text-xs text-stone-500">調理時間</p>
          <p className="font-bold">{recipe.cookMinutes ? `${recipe.cookMinutes}分` : '—'}</p>
        </div>
        <div className="rounded-2xl bg-white p-3 shadow-sm shadow-stone-900/5">
          <p className="text-xs text-stone-500">分量</p>
          <p className="font-bold">{recipe.servings ? `${recipe.servings}人分` : '—'}</p>
        </div>
        <div className="rounded-2xl bg-white p-3 shadow-sm shadow-stone-900/5">
          <p className="text-xs text-stone-500">作った回数</p>
          <p className="font-bold">{cookedDates.length}回</p>
        </div>
      </div>
      <p className="mt-2 text-xs text-stone-500">
        {cookedDates.length > 0 ? `最後に作った日：${fmtYmd(cookedDates[0])}` : 'まだ作ったことがない'}
      </p>

      <div className="mt-6 md:grid md:grid-cols-[2fr_3fr] md:gap-6">
        <section className="mb-6 rounded-2xl bg-white p-4 shadow-sm shadow-stone-900/5 md:mb-0 md:self-start">
          <h2 className="mb-2 text-lg font-bold">材料</h2>
          <ul>
            {recipe.ingredients.map((ing, i) => (
              <li key={i} className="flex justify-between gap-2 border-b border-stone-100 py-2 last:border-b-0">
                <span>{ing.name}</span>
                <span className="shrink-0 text-stone-500">{ing.amount}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="mb-6">
          <h2 className="mb-3 text-lg font-bold">作り方</h2>
          <ol className="space-y-3">
            {recipe.steps.map((step, i) => (
              <li key={i} className="flex gap-3 rounded-2xl bg-white p-3 shadow-sm shadow-stone-900/5">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-brand text-sm font-bold text-white">
                  {i + 1}
                </span>
                <span className="pt-0.5">{step}</span>
              </li>
            ))}
          </ol>
          {recipe.sourceUrl && (
            <p className="mt-4 text-sm text-stone-500">
              参考：<a href={recipe.sourceUrl} target="_blank" rel="noreferrer" className="break-all text-brand underline">{recipe.sourceUrl}</a>
            </p>
          )}
        </section>
      </div>

      {/* 今週作るボタン（iPhone ではタブバーの上に浮かせる） */}
      <div className="sticky bottom-24 md:static">
        <button
          type="button"
          disabled={inTodo}
          onClick={() => addToTodo(recipe.id)}
          className="min-h-13 w-full rounded-full bg-brand font-bold text-white shadow-lg shadow-brand/30 disabled:bg-stone-200 disabled:text-stone-500 disabled:shadow-none md:max-w-sm"
        >
          {inTodo ? '✓ 今週作るに追加済み（日付未定）' : '＋ 今週作るに追加'}
        </button>
      </div>
    </article>
  );
};

export default RecipeDetailPage;
