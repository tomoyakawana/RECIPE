import { useState } from 'react';
import { fmtYmd, todayYmd } from '../../utils/date';
import type { TodoItem } from '../../types/todo';
import type { Recipe } from '../../types/recipe';
import { useSetPlannedOn } from '../../hooks/useTodo';
import { useToast } from '../../hooks/useToast';
import { dbErrorMessage } from '../../utils/dbError';
  
type Props = {
  // ✕ を押したとき（シートを閉じる関数を、呼ぶ側から受け取る）
  onClose: () => void;
  // 初期表示する日付（YYYY-MM-DD）を渡す。選んだ日付があればそれを、なければ今日の日付を渡す
  initialDate: string;
  // 予定を入れる候補のリスト（リクエストとレシピの組み合わせ）
  requests: { item: TodoItem; recipe: Recipe }[];
};

/** 予定を入れるシート（日付を選んで、リクエストやレシピから、その日の予定を入れる） */
const AddPlanSheet = ({ onClose, initialDate, requests }: Props) => {
  const [date, setDate] = useState(initialDate);
  const setPlannedOn = useSetPlannedOn();
  const toast = useToast();
  // 「選ぶ」の通信中かどうか（通信はこのファイルで呼んでいるので、ここで分かる）
  const busy = setPlannedOn.isPending;

  const handlePick = (todoId: string , title: string) => {
    setPlannedOn.mutate({ todoId, plannedOn: date }, {
        onSuccess: () => { toast.success(`${fmtYmd(date)} に ${title} を入れました`) ; onClose()},
        onError: error => {
            if ((error as { code?: string }).code === '23505') toast.error(`その日にはすでに同じレシピが入っています`);
            else toast.error(dbErrorMessage(error));
          },
        });
  };

  return (
    <div className="fixed inset-0 z-40 bg-black/40">
      <div className="absolute inset-x-0 bottom-0 rounded-t-3xl bg-white p-4 max-w-lg mx-auto">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold">予定を入れる</h2>
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
            min={todayYmd()}
            aria-label="予定を入れる日付"
          />
          <button
            type="button"
            onClick={onClose}
            aria-label="閉じる"
            className="flex size-9 items-center justify-center rounded-full text-stone-400"
          >
          ✕
          </button>
        </div>
        <section>
          <h2 className="mb-2 text-sm font-bold text-stone-500">🙋 リクエストから選ぶ</h2>
          {requests.length === 0 ? (
            <p className="text-sm text-stone-500">日付未定のリクエストはありません</p>
          ) : (
            <ul className="grid gap-2">
              {requests.map(({ item, recipe }) => (
                <li key={item.id} className="flex items-center gap-2 rounded-xl bg-stone-50 px-3 py-2">
                  <span className="min-w-0 flex-1 truncate font-bold">{recipe.title}</span>
                  <button
                    type="button"
                    onClick={() => handlePick(item.id, recipe.title)}
                    disabled={busy}
                    className="min-h-9 shrink-0 rounded-full bg-brand px-4 text-sm font-bold text-white disabled:opacity-50"
                  >
                    選ぶ
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
     </div>
  );
};

export default AddPlanSheet;
