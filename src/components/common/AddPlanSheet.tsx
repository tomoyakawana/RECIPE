import { useState } from 'react';
import DatePill from './DatePill';
import { addDays, fmtYmd, todayYmd } from '../../utils/date';
import type { TodoItem } from '../../types/todo';
import type { Recipe } from '../../types/recipe';
import { useAddTodo, useSetPlannedOn } from '../../hooks/useTodo';
import { useToast } from '../../hooks/useToast';
import { dbErrorMessage } from '../../utils/dbError';

type Props = {
  // ✕ を押したとき（シートを閉じる関数を、呼ぶ側から受け取る）
  onClose: () => void;
  // 初期表示する日付（YYYY-MM-DD）を渡す。選んだ日付があればそれを、なければ今日の日付を渡す
  initialDate: string;
  // リクエストの全件（リクエストとレシピの組み合わせ）。出すのは、日付未定のものと、このシートで入れたもの
  requests: { item: TodoItem; recipe: Recipe }[];
  // 全部のレシピ（「ほかのレシピから探す」で使う）
  recipes: Recipe[];
};

/** 予定を入れるシート（日付を選んで、リクエストやレシピから、その日の予定を入れる） */
const AddPlanSheet = ({ onClose, initialDate, requests, recipes }: Props) => {
  const [date, setDate] = useState(initialDate);
  const [keyword, setKeyword] = useState('');
  const today = todayYmd();
  const setPlannedOn = useSetPlannedOn();
  const addTodo = useAddTodo();
  const toast = useToast();
  // 「選ぶ」の通信中かどうか（通信はこのファイルで呼んでいるので、ここで分かる）
  const busy = setPlannedOn.isPending || addTodo.isPending;
  // このシートで入れた予定。日付が入ると「日付未定」ではなくなるが、閉じるまでは一覧に残して、日付を直せるようにする
  const [pickedIds, setPickedIds] = useState<Set<string>>(new Set());
  const list = requests.filter(({ item }) => !item.plannedOn || pickedIds.has(item.id));

  // ほかのレシピ：料理名・タグで絞り込む（レシピ一覧の検索と同じ）
  const foundRecipes = recipes.filter(r => !keyword || r.title.includes(keyword) || r.tags.some(t => t.includes(keyword)));
  // 選んでいる日に、もう入っているレシピ（同じ日に同じ料理は入れられない）
  const plannedRecipeIds = new Set(requests.filter(({ item }) => item.plannedOn === date).map(({ recipe }) => recipe.id));

  const handlePick = (todoId: string , title: string) => {
    setPlannedOn.mutate({ todoId, plannedOn: date }, {
        // シートは閉じない（続けて別の日の分も選べるように）。閉じるのは ✕
        onSuccess: () => {
          setPickedIds(prev => new Set(prev).add(todoId));
          toast.success(`${fmtYmd(date)} に ${title} を入れました`);
        },
        onError: error => {
            if ((error as { code?: string }).code === '23505') toast.error(`その日にはすでに同じレシピが入っています`);
            else toast.error(dbErrorMessage(error));
          },
        });
  };

  // ほかのレシピから、その日の予定として新しく入れる。入れたものは上の一覧に出して、日付を直せるようにする
  // （失敗したときのトーストは useAddTodo の中で出す）
  const handleAdd = (recipeId: string, title: string) => {
    addTodo.mutate({ recipeId, plannedOn: date }, {
      onSuccess: todoId => {
        setPickedIds(prev => new Set(prev).add(todoId));
        toast.success(`${fmtYmd(date)} に ${title} を入れました`);
      },
    });
  };

  // 入れた後に、行の 📅 で日付を変える（「消去」なら日付未定に戻る）
  const handleChangeDate = (todoId: string, title: string, value: string | undefined) => {
    setPlannedOn.mutate({ todoId, plannedOn: value }, {
      onSuccess: () => toast.success(value ? `${title} を ${fmtYmd(value)} に変えました` : `${title} を日付未定に戻しました`),
      onError: error => {
        if ((error as { code?: string }).code === '23505') toast.error('その日にはすでに同じレシピが入っています');
        else toast.error(dbErrorMessage(error));
      },
    });
  };

  return (
    <div
      className="fixed inset-0 z-40 bg-black/40"
      // シートの外（暗いところ）を押したら閉じる。シートの中を押したときは閉じない
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* 高さは画面の 85% まで。見出しと日付は止めておき、その下だけスクロールする */}
      <div className="absolute inset-x-0 bottom-0 mx-auto flex max-h-[85dvh] max-w-lg flex-col rounded-t-3xl bg-white">
        <div className="flex shrink-0 items-center justify-between p-4 pb-3">
          <h2 className="text-lg font-bold">予定を入れる</h2>
          {/* ‹ › で1日ずつ動かす（シートを開いたまま、何日分かをまとめて決められるように） */}
          <div className="flex items-center">
            <button
              type="button"
              onClick={() => setDate(addDays(date, -1))}
              // 今日より前には戻れない
              disabled={date <= today}
              aria-label="前の日"
              className="flex size-9 items-center justify-center rounded-full text-xl text-stone-500 disabled:opacity-30"
            >
              ‹
            </button>
            <input
              type="date"
              value={date}
              // 空なら何もしない（日付は必ず要るので、元の日付のままにする）
              onChange={e => {
                if (e.target.value) setDate(e.target.value);
              }}
              // PC の Chrome は入力欄をクリックしただけではカレンダーが開かないので、明示的に開く
              onClick={e => {
                try { e.currentTarget.showPicker(); } catch { /* 未対応のブラウザは標準の動きに任せる */ }
              }}
              min={today}
              aria-label="予定を入れる日付"
            />
            <button
              type="button"
              onClick={() => setDate(addDays(date, 1))}
              aria-label="次の日"
              className="flex size-9 items-center justify-center rounded-full text-xl text-stone-500"
            >
              ›
            </button>
          </div>
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
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <section className="mb-5">
            <h2 className="mb-2 text-sm font-bold text-stone-500">🙋 リクエストから選ぶ</h2>
            {list.length === 0 ? (
              <p className="text-sm text-stone-500">日付未定のリクエストはありません</p>
            ) : (
              <ul className="grid gap-2">
                {list.map(({ item, recipe }) => {
                  // 日付が入っていれば「入れた」状態（日付を消去すれば、また選べる）
                  const picked = !!item.plannedOn;
                  return (
                    <li key={item.id} className="flex items-center gap-2 rounded-xl bg-stone-50 px-3 py-2">
                      <span className="min-w-0 flex-1 truncate font-bold">{recipe.title}</span>
                      <span className="shrink-0">
                        <DatePill
                          value={item.plannedOn}
                          onChange={v => handleChangeDate(item.id, recipe.title, v)}
                          min={today}
                          disabled={!picked || busy}
                        />
                      </span>
                      <button
                        type="button"
                        onClick={() => handlePick(item.id, recipe.title)}
                        disabled={picked || busy}
                        className={`min-h-9 shrink-0 rounded-full px-4 text-sm font-bold ${
                          picked ? 'bg-stone-100 text-stone-400' : 'bg-brand text-white disabled:opacity-50'
                        }`}
                      >
                        {picked ? '入れた' : '選ぶ'}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section>
            {/* 見出しと検索の欄は、スクロールしても上に貼り付ける */}
            <div className="sticky top-0 z-10 bg-white pb-2">
              <h2 className="mb-2 text-sm font-bold text-stone-500">📖 ほかのレシピから探す</h2>
              <div className="relative">
                <span className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-stone-400">🔍</span>
                <input
                  type="search"
                  value={keyword}
                  onChange={e => setKeyword(e.target.value)}
                  placeholder="料理名・タグで検索"
                  // iOS は 16px 未満の入力欄にフォーカスすると勝手に拡大するので text-base（16px）にする
                  className="min-h-11 w-full rounded-full bg-stone-100 pr-4 pl-11 text-base outline-none focus:ring-2 focus:ring-brand/40"
                />
              </div>
            </div>
            {foundRecipes.length === 0 ? (
              <p className="text-sm text-stone-500">見つかりませんでした</p>
            ) : (
              <ul className="grid gap-2">
                {foundRecipes.map(recipe => {
                  const planned = plannedRecipeIds.has(recipe.id);
                  return (
                    <li key={recipe.id} className="flex items-center gap-2 rounded-xl bg-stone-50 px-3 py-2">
                      <span className="min-w-0 flex-1 truncate font-bold">{recipe.title}</span>
                      {planned ? (
                        <span className="shrink-0 text-xs text-stone-400">この日に入っています</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleAdd(recipe.id, recipe.title)}
                          disabled={busy}
                          className="min-h-9 shrink-0 rounded-full bg-brand px-4 text-sm font-bold text-white disabled:opacity-50"
                        >
                          選ぶ
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      </div>
     </div>
  );
};

export default AddPlanSheet;
