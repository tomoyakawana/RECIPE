import { useState } from 'react';
import { Link } from 'react-router';
import ImagePlaceholder from '../../components/common/ImagePlaceholder';
import MonthCalendar from '../../components/common/MonthCalendar';
import { useMockStore } from '../../hooks/useMockStore';
import type { Recipe } from '../../types/recipe';
import type { TodoItem } from '../../types/todo';
import { addDays, fmtYmd, todayYmd } from '../../utils/date';
import { pickRecipeStyle } from '../../utils/recipeStyle';

/* ---- 予定日を選ぶボタン（中身はブラウザ標準の日付入力） ---- */
// 透明な <input type="date"> をボタンに重ねて、タップで iOS 標準のカレンダーを開く
const DatePill = ({ value, onChange }: { value?: string; onChange: (v: string | undefined) => void }) => (
  <label
    className={`relative inline-flex min-h-9 items-center whitespace-nowrap rounded-full px-3 text-xs font-bold ${
      value ? 'bg-stone-100 text-stone-700' : 'bg-brand/10 text-brand'
    }`}
  >
    📅 {value ? fmtYmd(value) : '日付を決める'}
    <input
      type="date"
      value={value ?? ''}
      // iOS の「消去」で空文字になる → 日付未定に戻す
      onChange={e => onChange(e.target.value || undefined)}
      // PC の Chrome は入力欄をクリックしただけではカレンダーが開かないので、明示的に開く
      onClick={e => {
        try { e.currentTarget.showPicker(); } catch { /* 未対応のブラウザは標準の動きに任せる */ }
      }}
      aria-label="作る予定日"
      className="absolute inset-0 opacity-0"
    />
  </label>
);

/* ---- 今週作るの 1件 ---- */
type CardProps = {
  item     : TodoItem;
  recipe   : Recipe;
  onDate   : (v: string | undefined) => void;
  onRemove : () => void;
  onCooked : () => void;
};

// 上の段：料理名と ✕／下の段：予定日と「作った！」（狭い iPhone でも料理名が切れにくいように2段にする）
const TodoCard = ({ item, recipe, onDate, onRemove, onCooked }: CardProps) => (
  <li className="flex gap-3 rounded-2xl bg-white p-2.5 shadow-sm shadow-stone-900/5">
    <Link to={`/recipes/${recipe.id}`} className="shrink-0">
      <ImagePlaceholder tags={recipe.tags} className="size-18 rounded-xl" emojiSize="text-3xl" />
    </Link>
    <div className="flex min-w-0 flex-1 flex-col justify-between">
      <div className="flex items-start gap-1">
        <Link to={`/recipes/${recipe.id}`} className="min-w-0 flex-1 truncate pt-1 font-bold">{recipe.title}</Link>
        <button
          type="button"
          onClick={onRemove}
          aria-label="リストから外す"
          className="-mt-1 -mr-1 flex size-9 shrink-0 items-center justify-center rounded-full text-sm text-stone-400"
        >
          ✕
        </button>
      </div>
      <div className="flex items-center justify-between gap-2">
        <DatePill value={item.plannedOn} onChange={onDate} />
        <button type="button" onClick={onCooked} className="min-h-9 shrink-0 rounded-full bg-brand px-4 text-sm font-bold text-white">
          作った！
        </button>
      </div>
    </div>
  </li>
);

const TodoPage = () => {
  const { todo, recipes, setPlannedOn, markCooked, removeFromTodo } = useMockStore();
  const [selected, setSelected] = useState<string>();
  const [notice, setNotice]     = useState('');

  const today = todayYmd();

  // レシピが消えていた場合（DB につないだら起こりうる）は表示しない
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
    const ok = setPlannedOn(todoId, value);
    setNotice(ok ? '' : 'その日にはすでに同じレシピが入っています');
  };

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
          onRemove={() => removeFromTodo(item.id)}
          onCooked={() => markCooked(item.id)}
        />
      ))}
    </ul>
  );

  return (
    <>
      <h1 className="text-3xl font-extrabold tracking-tight">今週作る</h1>
      <p className="mt-1 mb-4 text-sm text-stone-500">
        {rows.length > 0 ? `${rows.length}品。日付を決めて、作ったら「作った！」` : '作りたいものを入れておこう'}
      </p>

      <div className="md:grid md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] md:items-start md:gap-6">
        <div className="mb-5 md:sticky md:top-4 md:mb-0">
          <MonthCalendar today={today} marks={marks} selected={selected} onSelect={handleSelect} />
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
    </>
  );
};

export default TodoPage;
