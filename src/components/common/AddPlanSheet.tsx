type Props = {
  // ✕ を押したとき（シートを閉じる関数を、呼ぶ側から受け取る）
  onClose: () => void;
};

/** 予定を入れるシート（日付を選んで、リクエストやレシピから、その日の予定を入れる） */
const AddPlanSheet = ({ onClose }: Props) => {
  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-bold">予定を入れる</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="閉じる"
          className="flex size-9 items-center justify-center rounded-full text-stone-400"
        >
          ✕
        </button>
      </div>
    </div>
  );
};

export default AddPlanSheet;
