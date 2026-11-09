import { useState } from 'react';
import { Link, Navigate } from 'react-router';
import AddPlanSheet from '../../components/common/AddPlanSheet';
import DatePill from '../../components/common/DatePill';
import LoadError from '../../components/common/LoadError';
import Loading from '../../components/common/Loading';
import MonthCalendar from '../../components/common/MonthCalendar';
import { useRecipes } from '../../hooks/useRecipes';
import { useSecretMode } from '../../hooks/useSettings';
import { useMarkCooked, useRemoveTodo, useSetPlannedOn, useTodoItems } from '../../hooks/useTodo';
import { useToast } from '../../hooks/useToast';
import { dbErrorMessage } from '../../utils/dbError';
import type { Recipe } from '../../types/recipe';
import type { TodoItem } from '../../types/todo';
import { addDays, fmtYmd, todayYmd } from '../../utils/date';
import { pickRecipeStyle } from '../../utils/recipeStyle';
import RecipePhoto from '../../components/common/RecipePhoto';

/* ---- リクエストの 1件 ---- */
type CardProps = {
  item     : TodoItem;
  recipe   : Recipe;
  onDate   : (v: string | undefined) => void;
  onRemove : () => void;
  onCooked : () => void;
  // 保存中は「作った！」「✕」を押せなくする（二重に押されるのを防ぐ）
  busy     : boolean;
};

// 上の段：料理名と ✕／下の段：予定日と「作った！」（狭い iPhone でも料理名が切れにくいように2段にする）
const TodoCard = ({ item, recipe, onDate, onRemove, onCooked, busy }: CardProps) => (
  <li className="flex gap-3 rounded-2xl bg-white p-2.5 shadow-sm shadow-stone-900/5">
    <Link to={`/recipes/${recipe.id}`} className="shrink-0">
      <RecipePhoto imagePath={recipe.imagePath} tags={recipe.tags} size="small" className="size-18 rounded-xl" emojiSize="text-3xl" />
    </Link>
    <div className="flex min-w-0 flex-1 flex-col justify-between gap-1.5">
      <div className="flex items-start gap-1">
        <div className="min-w-0 flex-1 pt-1">
          <Link to={`/recipes/${recipe.id}`} className="block truncate font-bold">{recipe.title}</Link>
          {/* レシピのひとことメモ（作るときに思い出せるように、1行だけ小さく） */}
          {item.requestedBy && (
            <span className="mt-0.5 inline-block rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-700">🙋 食べたい！</span>
          )}
          {recipe.note && <p className="truncate text-xs text-stone-500">💬 {recipe.note}</p>}
        </div>
        <button
          type="button"
          onClick={onRemove}
          disabled={busy}
          aria-label="リストから外す"
          className="-mt-1 -mr-1 flex size-9 shrink-0 items-center justify-center rounded-full text-sm text-stone-400"
        >
          ✕
        </button>
      </div>
      <div className="flex items-center justify-between gap-2">
        <DatePill value={item.plannedOn} onChange={onDate} />
        <button
          type="button"
          onClick={onCooked}
          disabled={busy}
          className="min-h-9 shrink-0 rounded-full bg-brand px-4 text-sm font-bold text-white disabled:opacity-50"
        >
          作った！
        </button>
      </div>
    </div>
  </li>
);

const TodoPage = () => {
  const todoQuery    = useTodoItems();
  const recipesQuery = useRecipes();
  const setPlannedOn = useSetPlannedOn();
  const markCooked   = useMarkCooked();
  const removeTodo   = useRemoveTodo();
  const toast        = useToast();
  const secretMode = useSecretMode();
  const [selected, setSelected] = useState<string>();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [notice, setNotice]     = useState('');

  // シークレットモードのときは、URL を直接開いても見せない（フックを呼び終えた後で判定する）
  if (secretMode) return <Navigate to="/" replace />;

  // リクエストとレシピの両方が読めてから表示する
  if (todoQuery.isPending || recipesQuery.isPending) return <Loading />;
  if (todoQuery.isError || recipesQuery.isError) {
    return <LoadError error={todoQuery.error ?? recipesQuery.error} onRetry={() => { todoQuery.refetch(); recipesQuery.refetch(); }} />;
  }
  // ここまで来れば両方とも読めている。isPending・isError を1つずつ確かめたので、TS も data があると分かる（型の絞り込み）
  const todo    = todoQuery.data;
  const recipes = recipesQuery.data;

  const today = todayYmd();

  // レシピが消えていた（論理削除された）場合は表示しない
  // `flatMap` で「見つかったものだけ」を { item, recipe } の組にする
  const rows = todo.flatMap(item => {
    const recipe = recipes.find(r => r.id === item.recipeId);
    return recipe ? [{ item, recipe }] : [];
  });

  // 日付順に並べて、過ぎた予定・これからの予定・日付未定に分ける
  const dated    = rows.filter(r => r.item.plannedOn).sort((a, b) => a.item.plannedOn!.localeCompare(b.item.plannedOn!));
  const overdue  = dated.filter(r => r.item.plannedOn! < today);
  const upcoming = dated.filter(r => r.item.plannedOn! >= today);
  const undated  = rows.filter(r => !r.item.plannedOn);

  // これからの予定を日付ごとにまとめる（Map は追加順を保つので、日付順のまま）
  const byDate = new Map<string, typeof upcoming>();
  for (const r of upcoming) byDate.set(r.item.plannedOn!, [...(byDate.get(r.item.plannedOn!) ?? []), r]);

  // カレンダーに出す絵文字（過ぎた予定も含める）
  const marks = new Map<string, string[]>();
  for (const r of dated) {
    marks.set(r.item.plannedOn!, [...(marks.get(r.item.plannedOn!) ?? []), pickRecipeStyle(r.recipe.tags).emoji]);
  }

  const handleDate = (todoId: string, value: string | undefined) => {
    setPlannedOn.mutate({ todoId, plannedOn: value }, {
      onSuccess: () => setNotice(''),
      // 同じ日に同じ料理がある（DB の一意制約 23505）ときは、画面の中で知らせる。それ以外はトースト
      onError  : error => {
        if ((error as { code?: string }).code === '23505') setNotice('その日にはすでに同じレシピが入っています');
        else toast.error(dbErrorMessage(error));
      },
    });
  };

  // 「作った！」「✕」の保存中は、どのカードのボタンも押せなくする
  const busy = markCooked.isPending || removeTodo.isPending;

  // カレンダーの日付をタップ → その日の予定までスクロール
  const handleSelect = (ymd: string) => {
    setSelected(ymd);
    document.getElementById(`day-${ymd}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const dayLabel = (ymd: string) =>
    ymd === today ? `今日 ${fmtYmd(ymd)}` : ymd === addDays(today, 1) ? `明日 ${fmtYmd(ymd)}` : fmtYmd(ymd);

  const renderCards = (list: typeof rows) => (
    <ul className="grid grid-cols-1 gap-2.5">
      {list.map(({ item, recipe }) => (
        <TodoCard
          key={item.id}
          item={item}
          recipe={recipe}
          onDate={v => handleDate(item.id, v)}
          onRemove={() => removeTodo.mutate(item.id)}
          onCooked={() => markCooked.mutate(item.id)}
          busy={busy}
        />
      ))}
    </ul>
  );

  return (
    <>
      <h1 className="text-3xl font-extrabold tracking-tight">リクエスト</h1>
      <p className="mt-1 mb-4 text-sm text-stone-500">
        {rows.length > 0 ? `${rows.length}品。日付を決めて、作ったら「作った！」` : '作りたいもの・食べたいものを入れておこう'}
      </p>

      <div className="md:grid md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] md:items-start md:gap-6">
        <div className="mb-5 md:sticky md:top-4 md:mb-0">
          <MonthCalendar today={today} marks={marks} selected={selected} onSelect={handleSelect} />
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="mt-3 min-h-11 w-full rounded-full bg-brand/10 px-4 text-sm font-bold text-brand"
          >
            ＋ 予定を入れる
          </button>
        </div>

        <div>
          {notice && <p className="mb-3 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-700">{notice}</p>}

          {rows.length === 0 && (
            <div className="rounded-3xl bg-white px-6 py-12 text-center shadow-sm shadow-stone-900/5">
              <p className="mb-1 text-4xl">🗒️</p>
              <p className="mb-4 text-stone-500">まだ何も入っていません</p>
              <Link to="/" className="inline-flex min-h-11 items-center rounded-full bg-brand px-5 font-bold text-white">
                レシピから選ぶ
              </Link>
            </div>
          )}

          {overdue.length > 0 && (
            <section className="mb-5">
              <h2 className="mb-2 text-sm font-bold text-amber-600">過ぎた予定（作ったら「作った！」を）</h2>
              {renderCards(overdue)}
            </section>
          )}

          {[...byDate].map(([ymd, list]) => (
            <section
              key={ymd}
              id={`day-${ymd}`}
              // scroll-mt：スクロールで止まったとき、上に少し余白を残す
              className={`mb-5 scroll-mt-4 rounded-2xl transition-colors ${ymd === selected ? 'bg-brand/5 p-2 -m-2' : ''}`}
            >
              <h2 className={`mb-2 text-sm font-bold ${ymd === today ? 'text-brand' : 'text-stone-500'}`}>{dayLabel(ymd)}</h2>
              {renderCards(list)}
            </section>
          ))}

          {undated.length > 0 && (
            <section className="mb-5">
              <h2 className="mb-2 text-sm font-bold text-stone-500">日付未定</h2>
              {renderCards(undated)}
            </section>
          )}

          {/* 選んだ日に予定がないとき */}
          {selected && !marks.has(selected) && (
            <p className="rounded-xl bg-white px-3 py-2 text-sm text-stone-500 shadow-sm shadow-stone-900/5">
              {fmtYmd(selected)} の予定はまだありません。各カードの「📅」から日付を入れられます
            </p>
          )}
        </div>
      </div>
      {/* シートは画面のいちばん外側に置く。PC の幅ではカレンダーの列が sticky になり、その中に置くと、右の列のカードより前に出られないため */}
      {pickerOpen && <AddPlanSheet onClose={() => setPickerOpen(false)} initialDate={selected && selected >= today ? selected : today} requests={rows} recipes={recipes} />}
    </>
  );
};

export default TodoPage;
