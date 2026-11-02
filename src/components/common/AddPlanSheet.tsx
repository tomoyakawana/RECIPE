import { useState } from 'react';
import { todayYmd } from '../../utils/date';
import type { TodoItem } from '../../types/todo';
import type { Recipe } from '../../types/recipe';
import { useSetPlannedOn } from '../../hooks/useTodo';
  
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

  const handlePick = (todoId: string) => {
    setPlannedOn.mutate({ todoId, plannedOn: date }, {
          onSuccess: () => onClose(),
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
        <ul>
        {requests.map(({ item, recipe }) => (
          <li key={item.id}>
          <button type="button" onClick={() => handlePick(item.id)}>
            {recipe.title}
          </button>
          </li>
        ))}
        </ul>
      </div>
     </div>
  );
};

export default AddPlanSheet;
